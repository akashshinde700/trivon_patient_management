const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('Testing database connection...');

  try {
    // First, try to connect without specifying a database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      connectTimeout: 10000 // 10 seconds
    });

    console.log('✅ Connected to MySQL server');

    // Check if database exists
    const [databases] = await connection.query('SHOW DATABASES');
    console.log('\nAvailable databases:');
    databases.forEach(db => console.log(' -', db.Database));

    const dbExists = databases.some(db => db.Database === 'patient_management');

    if (!dbExists) {
      console.log('\n⚠️  Database "patient_management" does not exist');
      console.log('Creating database...');
      await connection.query('CREATE DATABASE patient_management');
      console.log('✅ Database created successfully');
    } else {
      console.log('\n✅ Database "patient_management" exists');
    }

    await connection.end();

    // Now test connection with the database
    const dbConnection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'patient_management',
      connectTimeout: 10000
    });

    await dbConnection.query('SELECT 1');
    console.log('✅ Successfully connected to patient_management database');
    await dbConnection.end();

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    process.exit(1);
  }
}

testConnection();
