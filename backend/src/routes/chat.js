import { isNegativeResponse } from '../utils/negativeDetector.js';
import { detectTopic } from '../utils/topicDetector.js';
import { detectCampus } from '../utils/campusDetector.js';
import bcrypt from 'bcrypt';

export default async function chatRoutes(fastify) {
  // POST /api/chat/register - register visitor with campus selection
  fastify.post('/api/chat/register', async (request) => {
    const { visitorId, campus } = request.body || {};
    if (!visitorId) return { error: 'visitorId is required' };

    const email = `${visitorId}@visitor.local`;
    const [existing] = await fastify.db.query('SELECT id FROM users WHERE email = ?', [email]);

    if (existing.length > 0) {
      if (campus) {
        await fastify.db.query('UPDATE users SET campus = ? WHERE id = ?', [campus, existing[0].id]);
      }
      return { userId: existing[0].id, returning: true };
    }

    const dummyHash = await bcrypt.hash(`visitor_${Date.now()}`, 4);
    const [ins] = await fastify.db.query(
      'INSERT INTO users (email, password_hash, display_name, campus, role) VALUES (?, ?, ?, ?, ?)',
      [email, dummyHash, `Visitor`, campus || null, 'user']
    );
    return { userId: ins.insertId, returning: false };
  });

  // POST /api/chat - public chat endpoint
  fastify.post('/api/chat', async (request, reply) => {
    const { text, sessionId, visitorId, formCampus } = request.body || {};

    if (!text && text !== '') return reply.code(400).send({ error: 'text is required' });
    if (!visitorId) return reply.code(400).send({ error: 'visitorId is required' });

    const email = `${visitorId}@visitor.local`;

    // Find or create user
    let userId;
    const [existingUser] = await fastify.db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      userId = existingUser[0].id;
    } else {
      const dummyHash = await bcrypt.hash(`visitor_${Date.now()}`, 4);
      const [ins] = await fastify.db.query(
        'INSERT INTO users (email, password_hash, display_name, campus, role) VALUES (?, ?, ?, ?, ?)',
        [email, dummyHash, 'Visitor', formCampus || null, 'user']
      );
      userId = ins.insertId;
    }

    // Resolve or create session
    let sessionDbId;
    const sessionKey = sessionId || `sess_${Date.now()}_${userId}`;
    const [existingSession] = await fastify.db.query(
      'SELECT id, topic, chat_campus_name FROM sessions WHERE session_key = ?',
      [sessionKey]
    );

    if (existingSession.length > 0) {
      sessionDbId = existingSession[0].id;

      // Re-detect topic if still General or null
      const currentTopic = existingSession[0].topic;
      if (!currentTopic || currentTopic === 'General') {
        const newTopic = detectTopic(text);
        if (newTopic !== 'General') {
          await fastify.db.query('UPDATE sessions SET topic = ? WHERE id = ?', [newTopic, sessionDbId]);
        }
      }

      // Detect campus from message if not yet set
      if (!existingSession[0].chat_campus_name) {
        const chatCampus = detectCampus(text);
        if (chatCampus) {
          await fastify.db.query('UPDATE sessions SET chat_campus_name = ? WHERE id = ?', [chatCampus, sessionDbId]);
        }
      }
    } else {
      const topic = detectTopic(text);
      const chatCampus = detectCampus(text);
      const [ins] = await fastify.db.query(
        'INSERT INTO sessions (session_key, user_id, status, outcome, topic, form_campus_name, chat_campus_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [sessionKey, userId, 'active', 'pending', topic, formCampus || null, chatCampus]
      );
      sessionDbId = ins.insertId;
    }

    // Log user message
    await fastify.db.query(
      'INSERT INTO messages (session_id, sender, content) VALUES (?, ?, ?)',
      [sessionDbId, 'user', text]
    );

    // Call Personal AI
    const API_KEY = process.env.PERSONAL_AI_API_KEY;
    const API_URL = process.env.PERSONAL_AI_API_URL || 'https://api-enterprise.personal.ai/v1/message/stream';
    const DOMAIN = process.env.DOMAIN_NAME;

    if (!API_KEY || !DOMAIN) return reply.code(500).send({ error: 'Service not configured' });

    try {
      const aiResponse = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({
          Text: text,
          UserName: email,
          SourceName: 'WebChat',
          SessionId: sessionKey,
          DomainName: DOMAIN,
          is_draft: false,
        }),
      });

      if (!aiResponse.ok) return reply.code(502).send({ error: 'AI service error' });

      // Collect full response
      const reader = aiResponse.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]' || data === '') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.ai_message && (!parsed.ai_score || parsed.ai_score === 0)) {
              fullText += parsed.ai_message;
            }
          } catch {}
        }
      }

      // Detect campus from bot response too
      const botCampus = detectCampus(fullText);
      if (botCampus) {
        const [[session]] = await fastify.db.query('SELECT chat_campus_name FROM sessions WHERE id = ?', [sessionDbId]);
        if (!session.chat_campus_name) {
          await fastify.db.query('UPDATE sessions SET chat_campus_name = ? WHERE id = ?', [botCampus, sessionDbId]);
        }
      }

      // Log bot response & update session
      const negative = isNegativeResponse(fullText);
      await fastify.db.query(
        'INSERT INTO messages (session_id, sender, content, is_negative) VALUES (?, ?, ?, ?)',
        [sessionDbId, 'bot', fullText || '[empty response]', negative]
      );

      if (negative) {
        await fastify.db.query(
          'UPDATE sessions SET outcome = ?, escalated_to_hr = TRUE, status = ? WHERE id = ? AND outcome = ?',
          ['unanswered', 'escalated', sessionDbId, 'pending']
        );
      } else if (fullText) {
        await fastify.db.query(
          'UPDATE sessions SET outcome = ?, status = ? WHERE id = ? AND outcome = ?',
          ['answered', 'resolved', sessionDbId, 'pending']
        );
      }

      return {
        sessionId: sessionKey,
        message: fullText || 'No response received',
        isNegative: negative,
        escalated: negative,
      };

    } catch (err) {
      fastify.log.error('Chat error:', err);
      return reply.code(500).send({ error: 'Failed to get AI response' });
    }
  });
}
