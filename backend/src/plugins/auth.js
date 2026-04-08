import fp from 'fastify-plugin';

async function authPlugin(fastify) {
  await fastify.register(import('@fastify/jwt'), {
    secret: process.env.JWT_SECRET || 'change-this-secret',
    sign: { expiresIn: '24h' },
  });

  // Auth decorator
  fastify.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // Admin-only decorator
  fastify.decorate('requireAdmin', async (request, reply) => {
    try {
      await request.jwtVerify();
      if (request.user.role !== 'admin') {
        reply.code(403).send({ error: 'Admin access required' });
      }
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });
}

export default fp(authPlugin);
