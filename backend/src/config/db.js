const mysql = require('mysql2/promise');
const env = require('./env');

let pool;

async function initDb() {
  if (pool) return pool;

  pool = mysql.createPool({
    host: env.db.host,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    waitForConnections: true,
    connectionLimit: env.db.connectionLimit,
    queueLimit: 0,
    connectTimeout: 10000, // 10 seconds
    acquireTimeout: 10000,
    timeout: 10000
  });

  await pool.query('SELECT 1');
  console.log('✅ Database connection established');

  // Note: Admin user should be created using the setup-admin script
  // Run: npm run setup-admin
  // This ensures secure password is set on first setup

  return pool;
}

function getDb() {
  if (!pool) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return pool;
}

module.exports = { initDb, getDb };

