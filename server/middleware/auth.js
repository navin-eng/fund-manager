const { db } = require('../db');

/**
 * Authentication middleware
 * Checks Authorization header for Bearer token, validates session, attaches user to req
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.slice(7);

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Find valid session
    const session = db.prepare(
      'SELECT * FROM sessions WHERE token = ? AND expires_at > datetime(\'now\')'
    ).get(token);

    if (!session) {
      return res.status(401).json({ message: 'Session expired or invalid. Please log in again.' });
    }

    // Get user
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND status = \'active\'').get(session.user_id);

    if (!user) {
      // Clean up orphaned session
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      return res.status(401).json({ message: 'User account not found or inactive' });
    }

    req.user = user;
    req.session = session;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Role authorization middleware
 * Checks if the authenticated user has one of the specified roles
 * Must be used after authenticate middleware
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
}

module.exports = { authenticate, requireRole };
