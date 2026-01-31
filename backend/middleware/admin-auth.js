const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Middleware to validate admin API key
 * Uses crypto.timingSafeEqual to prevent timing attacks
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

  // Use constant-time comparison to prevent timing attacks
  const providedBuffer = Buffer.from(String(providedKey));
  const adminBuffer = Buffer.from(adminKey);

  // If lengths differ, still perform comparison with admin key against itself
  // This ensures consistent timing regardless of key length mismatch
  if (providedBuffer.length !== adminBuffer.length) {
    crypto.timingSafeEqual(adminBuffer, adminBuffer);
    logger.warn(`Invalid admin key attempt from ${req.ip} (length mismatch)`);
    return res.status(401).json({ error: 'Invalid admin key' });
  }

  if (!crypto.timingSafeEqual(providedBuffer, adminBuffer)) {
    logger.warn(`Invalid admin key attempt from ${req.ip}`);
    return res.status(401).json({ error: 'Invalid admin key' });
  }

  next();
}

module.exports = requireAdminKey;

