// Utility script to generate bcrypt password hashes
// Usage: node generate-password.js <password>

const bcrypt = require('bcryptjs');

const password = process.argv[2] || 'admin123';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }

  console.log('\n=================================');
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('=================================\n');

  console.log('Copy this hash to your SQL file:');
  console.log(`'${hash}'`);
  console.log('\n');
});
