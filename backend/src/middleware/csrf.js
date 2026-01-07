// CSRF Protection Middleware
// Note: Install 'csrf' package with: npm install csrf
// For cookie-based CSRF tokens

const Tokens = require('csrf');

// Initialize CSRF token generator
const tokens = new Tokens();

// Generate CSRF secret and token
function generateCsrfToken(req, res, next) {
  if (!req.session) {
    return next(new Error('Session middleware required for CSRF protection'));
  }

  // Generate secret if not exists
  if (!req.session.csrfSecret) {
    req.session.csrfSecret = tokens.secretSync();
  }

  // Generate token
  req.csrfToken = () => tokens.create(req.session.csrfSecret);

  next();
}

// Verify CSRF token
function verifyCsrfToken(req, res, next) {
  // Skip GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Get token from header or body
  const token = req.headers['x-csrf-token'] ||
                req.headers['csrf-token'] ||
                req.body._csrf;

  if (!token) {
    return res.status(403).json({
      error: 'CSRF token missing',
      message: 'Include CSRF token in X-CSRF-Token header or _csrf body field'
    });
  }

  // Verify token
  const secret = req.session?.csrfSecret;
  if (!secret || !tokens.verify(secret, token)) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'CSRF token verification failed'
    });
  }

  next();
}

// Endpoint to get CSRF token
function getCsrfToken(req, res) {
  if (typeof req.csrfToken !== 'function') {
    return res.status(500).json({ error: 'CSRF not initialized' });
  }

  res.json({
    csrfToken: req.csrfToken(),
    message: 'Include this token in X-CSRF-Token header for POST/PUT/DELETE/PATCH requests'
  });
}

module.exports = {
  generateCsrfToken,
  verifyCsrfToken,
  getCsrfToken
};
