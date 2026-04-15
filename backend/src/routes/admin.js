export default async function adminRoutes(fastify) {
  // GET /api/admin/stats - dashboard statistics
  fastify.get('/api/admin/stats', { preHandler: [fastify.requireAdmin] }, async () => {
    const [[{ totalUsers }]] = await fastify.db.query(
      'SELECT COUNT(*) AS totalUsers FROM users WHERE is_active = TRUE'
    );

    const [[{ totalSessions }]] = await fastify.db.query('SELECT COUNT(*) AS totalSessions FROM sessions');

    const [[{ answered }]] = await fastify.db.query(
      "SELECT COUNT(*) AS answered FROM sessions WHERE outcome = 'answered'"
    );

    const [[{ unanswered }]] = await fastify.db.query(
      "SELECT COUNT(*) AS unanswered FROM sessions WHERE outcome = 'unanswered'"
    );

    const [[{ pending }]] = await fastify.db.query(
      "SELECT COUNT(*) AS pending FROM sessions WHERE outcome = 'pending'"
    );

    const [[{ escalated }]] = await fastify.db.query(
      'SELECT COUNT(*) AS escalated FROM sessions WHERE escalated_to_hr = TRUE'
    );

    const successRate = totalSessions > 0 ? Math.round((answered / totalSessions) * 100) : 0;

    return {
      totalUsers,
      totalSessions,
      answered,
      unanswered,
      pending,
      escalated,
      successRate,
    };
  });

  // GET /api/admin/stats/daily - daily breakdown (last 30 days)
  fastify.get('/api/admin/stats/daily', { preHandler: [fastify.requireAdmin] }, async () => {
    const [rows] = await fastify.db.query(`
      SELECT 
        DATE(created_at) AS date,
        COUNT(*) AS total,
        SUM(outcome = 'answered') AS answered,
        SUM(outcome = 'unanswered') AS unanswered
      FROM sessions
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    return rows;
  });

  // GET /api/admin/sessions - all sessions with user info
  fastify.get('/api/admin/sessions', { preHandler: [fastify.requireAdmin] }, async (request) => {
    const page = parseInt(request.query.page || '1');
    const limit = parseInt(request.query.limit || '20');
    const offset = (page - 1) * limit;
    const outcome = request.query.outcome; // filter: answered, unanswered, pending

    let where = '';
    const params = [];
    if (outcome) {
      where = 'WHERE s.outcome = ?';
      params.push(outcome);
    }

    const [[{ total }]] = await fastify.db.query(
      `SELECT COUNT(*) AS total FROM sessions s ${where}`,
      params
    );

    const [rows] = await fastify.db.query(
      `SELECT s.id, s.session_key, s.status, s.outcome, s.topic, s.form_campus_name, s.chat_campus_name, s.escalated_to_hr, s.created_at,
              u.email, u.display_name,
              COUNT(m.id) AS message_count,
              SUM(m.is_negative) AS negative_messages
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN messages m ON m.session_id = s.id
       ${where}
       GROUP BY s.id
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { sessions: rows, total, page, limit, pages: Math.ceil(total / limit) };
  });

  // GET /api/admin/users - all users
  fastify.get('/api/admin/users', { preHandler: [fastify.requireAdmin] }, async () => {
    const [rows] = await fastify.db.query(`
      SELECT u.id, u.email, u.display_name, u.campus, u.role, u.is_active, u.created_at,
             COUNT(DISTINCT s.id) AS session_count
      FROM users u
      LEFT JOIN sessions s ON s.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    return rows;
  });

  // GET /api/admin/negative-messages - all negative/escalated messages
  fastify.get('/api/admin/negative-messages', { preHandler: [fastify.requireAdmin] }, async () => {
    const [rows] = await fastify.db.query(`
      SELECT m.id, m.content, m.created_at, s.session_key, u.email, u.display_name
      FROM messages m
      JOIN sessions s ON s.id = m.session_id
      JOIN users u ON u.id = s.user_id
      WHERE m.is_negative = TRUE
      ORDER BY m.created_at DESC
      LIMIT 100
    `);
    return rows;
  });

  // GET /api/admin/stats/topics - topic breakdown with answered/unanswered
  fastify.get('/api/admin/stats/topics', { preHandler: [fastify.requireAdmin] }, async () => {
    const [rows] = await fastify.db.query(`
      SELECT 
        COALESCE(topic, 'General') AS topic,
        COUNT(*) AS total,
        SUM(outcome = 'answered') AS answered,
        SUM(outcome = 'unanswered') AS unanswered,
        SUM(outcome = 'pending') AS pending,
        SUM(escalated_to_hr = TRUE) AS escalated
      FROM sessions
      GROUP BY topic
      ORDER BY total DESC
    `);
    return rows;
  });

  // GET /api/admin/stats/hourly - messages grouped by hour of day
  fastify.get('/api/admin/stats/hourly', { preHandler: [fastify.requireAdmin] }, async () => {
    const [rows] = await fastify.db.query(`
      SELECT 
        HOUR(created_at) AS hour,
        COUNT(*) AS count
      FROM messages
      WHERE sender = 'user'
      GROUP BY HOUR(created_at)
      ORDER BY hour ASC
    `);
    // Fill missing hours with 0
    const hourMap = Object.fromEntries(rows.map(r => [r.hour, r.count]));
    return Array.from({ length: 24 }, (_, i) => ({ hour: i, count: hourMap[i] || 0 }));
  });

  // GET /api/admin/stats/users-top - top 10 users by session count
  fastify.get('/api/admin/stats/users-top', { preHandler: [fastify.requireAdmin] }, async () => {
    const [rows] = await fastify.db.query(`
      SELECT u.display_name, u.email, COUNT(s.id) AS sessions,
             SUM(s.outcome = 'answered') AS answered,
             SUM(s.outcome = 'unanswered') AS unanswered
      FROM users u
      JOIN sessions s ON s.user_id = u.id
      WHERE u.role = 'user'
      GROUP BY u.id
      ORDER BY sessions DESC
      LIMIT 10
    `);
    return rows;
  });

  // GET /api/admin/stats/weekly - weekly aggregates (last 12 weeks)
  fastify.get('/api/admin/stats/weekly', { preHandler: [fastify.requireAdmin] }, async () => {
    const [rows] = await fastify.db.query(`
      SELECT 
        YEARWEEK(created_at, 1) AS week,
        MIN(DATE(created_at)) AS week_start,
        COUNT(*) AS total,
        SUM(outcome = 'answered') AS answered,
        SUM(outcome = 'unanswered') AS unanswered
      FROM sessions
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 WEEK)
      GROUP BY YEARWEEK(created_at, 1)
      ORDER BY week ASC
    `);
    return rows;
  });
}
