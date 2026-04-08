import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import dbPlugin from './plugins/db.js';
import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import adminRoutes from './routes/admin.js';

const fastify = Fastify({ logger: true });

// Plugins
await fastify.register(cors, {
  origin: (process.env.FRONTEND_URL || 'http://localhost:5173').split(','),
  credentials: true,
});
await fastify.register(formbody);
await fastify.register(dbPlugin);
await fastify.register(authPlugin);

// Routes
await fastify.register(authRoutes);
await fastify.register(chatRoutes);
await fastify.register(adminRoutes);

// Health check
fastify.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// Start
const port = parseInt(process.env.PORT || '3001');
const host = process.env.HOST || '0.0.0.0';

try {
  await fastify.listen({ port, host });
  fastify.log.info(`🚀 Server running on http://${host}:${port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
