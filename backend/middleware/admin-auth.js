const logger = require('../utils/logger');

/**
 * Middleware to validate admin API key
 */
function requireAdminKey(req, res, next) {
  const providedKey = req.headers['x-admin-key'];
  const adminKey = process.env.ADMIN_API_KEY;
  
  if (!adminKey) {
    logger.error('ADMIN_API_KEY not configured in environment');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  
  if (!providedKey) {
    return res.status(401).json({ error: 'Admin key required' });
  }
  
  if (providedKey !== adminKey) {
    logger.warn(`Invalid admin key attempt from ${req.ip}`);
    return res.status(401).json({ error: 'Invalid admin key' });
  }
  
  next();
}

module.exports = requireAdminKey;
