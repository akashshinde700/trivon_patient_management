const { encryptFields, decryptFields } = require('../utils/encryption');

/**
 * Middleware to encrypt sensitive fields before saving to database
 * Configure which fields to encrypt per route
 */
function encryptDataMiddleware(fieldsToEncrypt = []) {
  return (req, res, next) => {
    if (req.body && fieldsToEncrypt.length > 0) {
      req.body = encryptFields(req.body, fieldsToEncrypt);
    }
    next();
  };
}

/**
 * Middleware to decrypt sensitive fields after fetching from database
 * Configure which fields to decrypt per route
 */
function decryptDataMiddleware(fieldsToDecrypt = []) {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json;

    // Override json method to decrypt before sending
    res.json = function(data) {
      if (data && fieldsToDecrypt.length > 0) {
        if (Array.isArray(data)) {
          data = data.map(item => decryptFields(item, fieldsToDecrypt));
        } else if (typeof data === 'object') {
          data = decryptFields(data, fieldsToDecrypt);
        }
      }
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Sensitive fields configuration
 * Define which fields should be encrypted for each entity
 */
const SENSITIVE_FIELDS = {
  patients: ['phone', 'email', 'address', 'emergency_contact', 'emergency_phone'],
  users: ['email', 'phone'],
  bills: ['payment_method', 'transaction_id'],
  prescriptions: ['notes'], // If notes contain sensitive info
  medical_records: ['description'] // If description contains sensitive info
};

/**
 * Get sensitive fields for an entity
 */
function getSensitiveFields(entity) {
  return SENSITIVE_FIELDS[entity] || [];
}

module.exports = {
  encryptDataMiddleware,
  decryptDataMiddleware,
  getSensitiveFields,
  SENSITIVE_FIELDS
};

