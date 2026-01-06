const crypto = require('crypto');

// Encryption key - In production, use environment variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Derive encryption key from password using PBKDF2
 */
function getKey(salt) {
  return crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha512');
}

/**
 * Encrypt sensitive data
 * @param {string} text - Text to encrypt
 * @returns {string} - Encrypted string (base64)
 */
function encrypt(text) {
  if (!text) return null;

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = getKey(salt);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const tag = cipher.getAuthTag();

    // Combine salt + iv + tag + encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'base64')
    ]);

    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedText - Encrypted string (base64)
 * @returns {string} - Decrypted text
 */
function decrypt(encryptedText) {
  if (!encryptedText) return null;

  try {
    const combined = Buffer.from(encryptedText, 'base64');

    // Extract components
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, TAG_POSITION);
    const tag = combined.slice(TAG_POSITION, ENCRYPTED_POSITION);
    const encrypted = combined.slice(ENCRYPTED_POSITION);

    const key = getKey(salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

/**
 * Hash sensitive data (one-way, for passwords, etc.)
 * @param {string} text - Text to hash
 * @returns {string} - Hashed string
 */
function hash(text) {
  if (!text) return null;
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Encrypt object fields
 * @param {object} obj - Object to encrypt
 * @param {string[]} fields - Fields to encrypt
 * @returns {object} - Object with encrypted fields
 */
function encryptFields(obj, fields) {
  if (!obj || !fields || !Array.isArray(fields)) return obj;

  const encrypted = { ...obj };
  fields.forEach(field => {
    if (encrypted[field]) {
      encrypted[field] = encrypt(encrypted[field]);
    }
  });

  return encrypted;
}

/**
 * Decrypt object fields
 * @param {object} obj - Object to decrypt
 * @param {string[]} fields - Fields to decrypt
 * @returns {object} - Object with decrypted fields
 */
function decryptFields(obj, fields) {
  if (!obj || !fields || !Array.isArray(fields)) return obj;

  const decrypted = { ...obj };
  fields.forEach(field => {
    if (decrypted[field]) {
      decrypted[field] = decrypt(decrypted[field]);
    }
  });

  return decrypted;
}

module.exports = {
  encrypt,
  decrypt,
  hash,
  encryptFields,
  decryptFields
};

