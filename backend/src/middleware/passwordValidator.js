/**
 * Password Validation Middleware
 * Enforces strong password policy
 */

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Array} Array of error messages (empty if valid)
 */
function validatePasswordStrength(password) {
  const errors = [];

  if (!password) {
    errors.push('Password is required');
    return errors;
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z)');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number (0-9)');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', 'password123', '12345678', 'qwerty123',
    'admin123', 'welcome123', 'letmein', 'monkey123'
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a stronger password');
  }

  return errors;
}

/**
 * Middleware to validate password on registration/password change
 */
function validatePassword(req, res, next) {
  const { password } = req.body;

  const errors = validatePasswordStrength(password);

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Password does not meet security requirements',
      details: errors
    });
  }

  next();
}

/**
 * Middleware to validate password strength for specific routes
 * Use this for optional password strength checking with warnings
 */
function checkPasswordStrength(req, res, next) {
  const { password } = req.body;

  if (!password) {
    return next();
  }

  const errors = validatePasswordStrength(password);

  if (errors.length > 0) {
    // Attach warnings to request for informational purposes
    req.passwordWarnings = errors;
  }

  next();
}

module.exports = {
  validatePassword,
  validatePasswordStrength,
  checkPasswordStrength
};
