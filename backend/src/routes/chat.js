import { isNegativeResponse } from '../utils/negativeDetector.js';
import { detectTopic } from '../utils/topicDetector.js';
import bcrypt from 'bcrypt';

export default async function chatRoutes(fastify) {
  // POST /api/chat/register - register visitor from contact form
  fastify.post('/api/chat/register', async (request) => {
    const { email, firstName, lastName, phone } = request.body || {};
    if (!email) return { error: 'email is required' };

    const displayName = [firstName, lastName].filter(Boolean).join(' ') || email;
    const [existing] = await fastify.db.query('SELECT id, display_name FROM users WHERE email = ?', [email]);

    if (existing.length > 0) {
      if (firstName || lastName) {
        await fastify.db.query(
          'UPDATE users SET display_name = ?, phone = COALESCE(?, phone) WHERE id = ?',
          [displayName, phone || null, existing[0].id]
        );
      }
      return { userId: existing[0].id, displayName, email, returning: true };
    }

    const dummyHash = await bcrypt.hash(`visitor_${Date.now()}`, 4);
    const [ins] = await fastify.db.query(
      'INSERT INTO users (email, password_hash, display_name, phone, role) VALUES (?, ?, ?, ?, ?)',
      [email, dummyHash, displayName, phone || null, 'user']
    );
    return { userId: ins.insertId, displayName, email, returning: false };
  });

  // POST /api/chat - public, streams SSE back
  fastify.post('/api/chat', async (request, reply) => {
    const { text, sessionId, email, firstName, lastName } = request.body || {};

    if (!text && text !== '') return reply.code(400).send({ error: 'text is required' });
    if (!email) return reply.code(400).send({ error: 'email is required' });

    // Find or create user
    let userId;
    const [existingUser] = await fastify.db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      userId = existingUser[0].id;
    } else {
      const displayName = [firstName, lastName].filter(Boolean).join(' ') || email;
      const dummyHash = await bcrypt.hash(`visitor_${Date.now()}`, 4);
      const [ins] = await fastify.db.query(
        'INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)',
        [email, dummyHash, displayName, 'user']
      );
      userId = ins.insertId;
    }

    // Resolve or create session
    let sessionDbId;
    const sessionKey = sessionId || `sess_${Date.now()}_${userId}`;
    const [existingSession] = await fastify.db.query('SELECT id FROM sessions WHERE session_key = ?', [sessionKey]);

    if (existingSession.length > 0) {
      sessionDbId = existingSession[0].id;
    } else {
      const topic = detectTopic(text);
      const [ins] = await fastify.db.query(
        'INSERT INTO sessions (session_key, user_id, status, outcome, topic) VALUES (?, ?, ?, ?, ?)',
        [sessionKey, userId, 'active', 'pending', topic]
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

      // Stream SSE passthrough
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Session-Id': sessionKey,
      });

      const reader = aiResponse.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        reply.raw.write(chunk);

        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]' || data === '') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.ai_message) fullText += parsed.ai_message;
          } catch {}
        }
      }

      reply.raw.end();

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

    } catch (err) {
      fastify.log.error('Chat error:', err);
      if (!reply.raw.headersSent) return reply.code(500).send({ error: 'Failed to get AI response' });
      reply.raw.end();
    }
  });
}
