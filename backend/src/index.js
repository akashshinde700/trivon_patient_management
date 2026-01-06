const app = require('./app');
const env = require('./config/env');
const { initDb } = require('./config/db');

async function start() {
  try {
    console.log('Initializing database...');
    await initDb();
    console.log('Database initialized successfully');
    app.listen(env.port, () => {
      console.log(`API server listening on port ${env.port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    console.error('Error details:', err.message);
    process.exit(1);
  }
}

start();

