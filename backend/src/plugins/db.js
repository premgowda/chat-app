import mysql from 'mysql2/promise';
import fp from 'fastify-plugin';

async function dbPlugin(fastify) {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'thrivewell_chatbot',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // Test connection
  try {
    const conn = await pool.getConnection();
    fastify.log.info('✅ MySQL connected');
    conn.release();
  } catch (err) {
    fastify.log.error('❌ MySQL connection failed:', err.message);
    throw err;
  }

  fastify.decorate('db', pool);

  fastify.addHook('onClose', async () => {
    await pool.end();
  });
}

export default fp(dbPlugin);
