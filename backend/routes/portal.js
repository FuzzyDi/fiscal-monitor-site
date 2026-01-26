const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const logger = require('../utils/logger');
const requirePortalToken = require('../middleware/portal-auth');
const { isStale } = require('../utils/helpers');

// All portal routes require authentication
router.use(requirePortalToken);

/**
 * GET /api/v1/portal/state
 * Get detailed state for all POS of authenticated client
 */
router.get('/state', async (req, res) => {
  try {
    const shopInn = req.shopInn;
    const staleMinutes = parseInt(process.env.STALE_MINUTES) || 15;
    
    const result = await pool.query(
      `SELECT * FROM fiscal_last_state
       WHERE shop_inn = $1
       ORDER BY 
         CASE severity
           WHEN 'CRITICAL' THEN 1
           WHEN 'DANGER' THEN 2
           WHEN 'WARN' THEN 3
           WHEN 'INFO' THEN 4
           ELSE 5
         END,
         updated_at DESC`,
      [shopInn]
    );
    
    // Add stale flag to each state
    const states = result.rows.map(state => ({
      ...state,
      isStale: isStale(state.updated_at, staleMinutes)
    }));
    
    res.json({ 
      states,
      staleMinutes 
    });
  } catch (err) {
    logger.error('Error fetching portal state:', err);
    res.status(500).json({ error: 'Failed to fetch state' });
  }
});

/**
 * GET /api/v1/portal/summary
 * Get summary statistics for authenticated client
 */
router.get('/summary', async (req, res) => {
  try {
    const shopInn = req.shopInn;
    const staleMinutes = parseInt(process.env.STALE_MINUTES) || 15;
    const staleThreshold = new Date(Date.now() - staleMinutes * 60 * 1000);
    
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_pos,
        COUNT(*) FILTER (WHERE severity = 'CRITICAL') as critical_count,
        COUNT(*) FILTER (WHERE severity = 'DANGER') as danger_count,
        COUNT(*) FILTER (WHERE severity = 'WARN') as warn_count,
        COUNT(*) FILTER (WHERE severity = 'INFO') as info_count,
        COUNT(*) FILTER (WHERE updated_at < $2) as stale_count,
        MAX(updated_at) as last_update
       FROM fiscal_last_state
       WHERE shop_inn = $1`,
      [shopInn, staleThreshold]
    );
    
    const stats = result.rows[0];
    
    res.json({
      shopInn,
      totalPos: parseInt(stats.total_pos) || 0,
      criticalCount: parseInt(stats.critical_count) || 0,
      dangerCount: parseInt(stats.danger_count) || 0,
      warnCount: parseInt(stats.warn_count) || 0,
      infoCount: parseInt(stats.info_count) || 0,
      staleCount: parseInt(stats.stale_count) || 0,
      lastUpdate: stats.last_update,
      staleMinutes
    });
  } catch (err) {
    logger.error('Error fetching portal summary:', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

module.exports = router;
