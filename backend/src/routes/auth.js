import bcrypt from 'bcrypt';

export default async function authRoutes(fastify) {
  // POST /api/admin/login
  fastify.post('/api/admin/login', async (request, reply) => {
    const { email, password } = request.body || {};
    if (!email || !password) return reply.code(400).send({ error: 'Email and password required' });

    const [rows] = await fastify.db.query(
      "SELECT id, email, password_hash, display_name, role FROM users WHERE email = ? AND role = 'admin' AND is_active = TRUE",
      [email]
    );

    if (rows.length === 0) return reply.code(401).send({ error: 'Invalid credentials' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return reply.code(401).send({ error: 'Invalid credentials' });

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.display_name,
    });

    return {
      token,
      user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role },
    };
  });

  // GET /api/admin/me
  fastify.get('/api/admin/me', { preHandler: [fastify.authenticate] }, async (request) => {
    if (request.user.role !== 'admin') return { error: 'Not admin' };
    return { id: request.user.id, email: request.user.email, displayName: request.user.displayName, role: request.user.role };
  });
}
