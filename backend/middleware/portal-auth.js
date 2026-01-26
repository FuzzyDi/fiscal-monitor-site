const pool = require('../utils/db');
const logger = require('../utils/logger');

/**
 * Middleware to validate portal access token and attach shopInn
 */
async function requirePortalToken(req, res, next) {
  const token = req.headers['x-token'];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    const result = await pool.query(
      `UPDATE access_tokens 
       SET last_used_at = NOW() 
       WHERE token = $1 
       RETURNING shop_inn, label`,
      [token]
    );
    
    if (result.rows.length === 0) {
      logger.warn(`Invalid token attempt from ${req.ip}`);
      return res.status(401).json({ error: 'Invalid access token' });
    }
    
    const tokenData = result.rows[0];
    
    // Check if registration is still active
    const regCheck = await pool.query(
      'SELECT is_active FROM registrations WHERE shop_inn = $1',
      [tokenData.shop_inn]
    );
    
    if (regCheck.rows.length === 0 || !regCheck.rows[0].is_active) {
      return res.status(403).json({ error: 'Registration inactive' });
    }
    
    // Attach shopInn to request for use in routes
    req.shopInn = tokenData.shop_inn;
    req.tokenLabel = tokenData.label;
    
    next();
  } catch (err) {
    logger.error('Portal auth error:', err);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

module.exports = requirePortalToken;
