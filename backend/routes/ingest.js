const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const logger = require('../utils/logger');
const { 
  generateStateKey, 
  calculateMaxSeverity, 
  validateSnapshot 
} = require('../utils/helpers');
const { 
  analyzeAndGenerateAlerts, 
  mergeAlerts 
} = require('../utils/alert-analyzer');

function pickClientIp(req) {
  const xRealIp = req.header('x-real-ip');
  if (xRealIp) return String(xRealIp).trim();
  const xff = req.header('x-forwarded-for');
  if (xff) {
    // First IP is the original client.
    const first = String(xff).split(',')[0].trim();
    if (first) return first;
  }
  return (req.socket && req.socket.remoteAddress) ? String(req.socket.remoteAddress) : null;
}

function maxSeverity(a, b) {
  const order = { CRITICAL: 4, DANGER: 3, WARN: 2, INFO: 1 };
  const an = a ? String(a).toUpperCase() : null;
  const bn = b ? String(b).toUpperCase() : null;
  const av = order[an] || 0;
  const bv = order[bn] || 0;
  if (!av && !bv) return null;
  return av >= bv ? an : bn;
}

function enrichFiscal(fiscal) {
  if (!fiscal || typeof fiscal !== 'object') return fiscal;
  const out = { ...fiscal };

  // Backward-compatible: compute zRemaining for both old and new field names.
  if (out.zRemaining === undefined) {
    if (typeof out.zReportMaxCount === 'number' && typeof out.zReportCount === 'number') {
      out.zRemaining = out.zReportMaxCount - out.zReportCount;
    } else if (typeof out.zMax === 'number' && typeof out.zCount === 'number') {
      out.zRemaining = out.zMax - out.zCount;
    }
  }

  // Optional metric: FM fill percent.
  if (out.fmFillPercent === undefined) {
    const max = typeof out.receiptMaxCount === 'number' ? out.receiptMaxCount : null;
    const cnt = typeof out.receiptCount === 'number' ? out.receiptCount : null;
    if (max && max > 0 && cnt !== null) {
      out.fmFillPercent = Math.round((cnt / max) * 1000) / 10; // 0.1%
    }
  }

  return out;
}

/**
 * POST /api/v1/fiscal/snapshot
 * Accept POS snapshots without authentication
 * Always returns 204 to never block POS
 */
router.post('/snapshot', async (req, res) => {
  try {
    const snapshot = req.body;

    // --- Normalization helpers (не ломаем POS, но делаем типы предсказуемыми)
    const toIntOrNull = (v) => {
      if (v === undefined || v === null || v === '') return null;
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      return parseInt(String(v), 10);
    };
    const toStrOrNull = (v) => {
      if (v === undefined || v === null) return null;
      const s = String(v).trim();
      return s.length ? s : null;
    };
    
    // Validate snapshot
    const validation = validateSnapshot(snapshot);
    if (!validation.valid) {
      logger.warn('Invalid snapshot received:', validation.error);
      return res.status(204).send(); // Still return 204
    }
    if (validation.warnings && validation.warnings.length) {
      logger.warn('Snapshot warnings:', { warnings: validation.warnings });
    }
    
    const {
      shopInn,
      shopNumber,
      shopName,
      posNumber,
      posIp,
      alerts: clientAlerts,
      fiscal,
      severity: clientSeverity
    } = snapshot;

    const shopInnNorm = toStrOrNull(shopInn);
    const shopNameNorm = toStrOrNull(shopName);

    const shopNumberRaw = toStrOrNull(shopNumber);
    const posNumberRaw = toStrOrNull(posNumber);
    const shopNumberNorm = toIntOrNull(shopNumberRaw);
    const posNumberNorm = toIntOrNull(posNumberRaw);

    const posIpNorm = toStrOrNull(posIp) || toStrOrNull(pickClientIp(req));
    
    const fiscalEnriched = enrichFiscal(fiscal);

    // Optional server-side alerts from fiscal metrics. Off by default; agent usually sends alerts.
    const autoAlertsEnabled = String(process.env.AUTO_ALERTS_ENABLED || 'false').toLowerCase() === 'true';
    const autoAlerts = autoAlertsEnabled ? analyzeAndGenerateAlerts(fiscalEnriched) : [];
    
    // Merge client alerts with auto-generated alerts
    const alerts = mergeAlerts(clientAlerts, autoAlerts);
    
    // Generate state key (prefer the raw identifiers from agent contract: shopNumber/posNumber are strings)
    const stateKey = generateStateKey(shopInnNorm, shopNumberRaw, posNumberRaw);
    
    // Calculate severity (agent provides top-level severity; we also compute from alerts and take the max)
    const derivedSeverity = calculateMaxSeverity(alerts);
    const severity = maxSeverity(clientSeverity, derivedSeverity);
    
    // Update snapshot with merged alerts + enriched fiscal
    const updatedSnapshot = {
      ...snapshot,
      fiscal: fiscalEnriched,
      alerts,
      severity
    };
    
    // Check if INN is registered
    const regResult = await pool.query(
      'SELECT is_active FROM registrations WHERE shop_inn = $1',
      [shopInnNorm]
    );
    const isRegistered = regResult.rows.length > 0 && regResult.rows[0].is_active;
    
    // Upsert to fiscal_last_state
    await pool.query(
      `INSERT INTO fiscal_last_state (
        state_key,
        shop_inn,
        shop_number,
        shop_name,
        pos_number,
        pos_ip,
        snapshot,
        severity,
        is_registered,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (state_key) DO UPDATE SET
        shop_inn = EXCLUDED.shop_inn,
        shop_number = EXCLUDED.shop_number,
        shop_name = EXCLUDED.shop_name,
        pos_number = EXCLUDED.pos_number,
        pos_ip = EXCLUDED.pos_ip,
        snapshot = EXCLUDED.snapshot,
        severity = EXCLUDED.severity,
        is_registered = EXCLUDED.is_registered,
        updated_at = NOW()`,
      [
        stateKey,
        shopInnNorm,
        shopNumberNorm,
        shopNameNorm,
        posNumberNorm,
        posIpNorm,
        JSON.stringify(updatedSnapshot),
        severity,
        isRegistered
      ]
    );

    // Optional event history (disabled by default to avoid unbounded growth)
    const eventLogEnabled = String(process.env.EVENT_LOG_ENABLED || 'false').toLowerCase() === 'true';
    if (eventLogEnabled) {
      try {
        await pool.query(
          `INSERT INTO fiscal_events (state_key, shop_inn, event_type, snapshot, severity)
           VALUES ($1, $2, $3, $4, $5)`,
          [stateKey, shopInnNorm, toStrOrNull(snapshot.eventType), JSON.stringify(updatedSnapshot), severity]
        );
      } catch (e) {
        logger.warn('Event log insert failed (ignored):', String(e));
      }
    }
    
    logger.info(`Snapshot ingested: ${stateKey} (severity: ${severity || 'none'}, alerts: ${alerts.length})`);
    
    // Always return 204
    res.status(204).send();
    
  } catch (err) {
    logger.error('Error processing snapshot:', err);
    // Always return 204 even on error to never block POS
    res.status(204).send();
  }
});

module.exports = router;
