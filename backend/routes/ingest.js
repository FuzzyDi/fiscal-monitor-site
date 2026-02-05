const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const logger = require('../utils/logger');
const {
  generateStateKey,
  calculateMaxSeverity,
  validateSnapshot,
  pickClientIp
} = require('../utils/helpers');
const {
  analyzeAndGenerateAlerts,
  generateErrorAlerts,
  mergeAlerts
} = require('../utils/alert-analyzer');

// maxSeverity helper for comparing two severities (uses calculateMaxSeverity internally)
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

  // lastOnlineTime остаётся как есть для OFFLINE проверки

  return out;
}

/**
 * Queue notifications for active Telegram subscriptions
 * Checks cooldowns to avoid spam
 * @param {string} eventType - Type of event: 'new_alert', 'recovery', 'stale', 'return'
 */
async function queueNotifications(shopInn, stateKey, severity, alerts, shopNumber, posNumber, eventType = 'new_alert') {
  const COOLDOWN_MINUTES = 30;

  // Find active subscriptions with matching severity filter
  // Also load notification preferences for filtering
  const subsResult = await pool.query(`
    SELECT ns.id as subscription_id, 
           np.severity_filter,
           np.notify_on_recovery,
           np.notify_on_stale,
           np.notify_on_return
    FROM notification_subscriptions ns
    JOIN notification_preferences np ON np.subscription_id = ns.id
    JOIN telegram_connections tc ON tc.subscription_id = ns.id AND tc.is_active = true
    WHERE ns.shop_inn = $1 
      AND ns.status = 'active'
      AND ns.expires_at > NOW()
      AND $2 = ANY(np.severity_filter)
  `, [shopInn, severity]);

  if (subsResult.rows.length === 0) {
    return; // No active subscriptions for this INN/severity
  }

  // Store full alerts as JSON for consistent display (same data as page shows)
  const alertSummary = JSON.stringify(alerts);

  for (const sub of subsResult.rows) {
    // Apply notification preferences based on event type
    if (eventType === 'recovery' && sub.notify_on_recovery === false) {
      logger.debug(`Skipping recovery notification for subscription ${sub.subscription_id} (disabled in preferences)`);
      continue;
    }
    if (eventType === 'stale' && sub.notify_on_stale === false) {
      logger.debug(`Skipping stale notification for subscription ${sub.subscription_id} (disabled in preferences)`);
      continue;
    }
    if (eventType === 'return' && sub.notify_on_return === false) {
      logger.debug(`Skipping return notification for subscription ${sub.subscription_id} (disabled in preferences)`);
      continue;
    }

    // Check cooldown - don't spam the same terminal
    // Fixed: Using parameterized query instead of string interpolation
    const cooldownResult = await pool.query(`
      SELECT id FROM notification_cooldowns
      WHERE subscription_id = $1 
        AND state_key = $2
        AND last_notified_at > NOW() - make_interval(mins => $4)
        AND last_severity = $3
    `, [sub.subscription_id, stateKey, severity, COOLDOWN_MINUTES]);

    if (cooldownResult.rows.length > 0) {
      logger.debug(`Cooldown active for subscription ${sub.subscription_id}, state ${stateKey}`);
      continue;
    }

    // Add to notification queue
    await pool.query(`
      INSERT INTO notification_queue 
        (subscription_id, state_key, severity, event_type, alert_summary, shop_number, pos_number)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [sub.subscription_id, stateKey, severity, eventType, alertSummary, shopNumber, posNumber]);

    // Update cooldown
    await pool.query(`
      INSERT INTO notification_cooldowns (subscription_id, state_key, last_notified_at, last_severity)
      VALUES ($1, $2, NOW(), $3)
      ON CONFLICT (subscription_id, state_key) 
      DO UPDATE SET last_notified_at = NOW(), last_severity = EXCLUDED.last_severity
    `, [sub.subscription_id, stateKey, severity]);

    logger.debug(`Queued ${eventType} notification for subscription ${sub.subscription_id}`);
  }
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
      severity: clientSeverity,
      error: agentError,  // Agent v2 error field
      agentVersion        // Agent version for logging
    } = snapshot;

    const shopInnNorm = toStrOrNull(shopInn);
    const shopNameNorm = toStrOrNull(shopName);

    const shopNumberRaw = toStrOrNull(shopNumber);
    const posNumberRaw = toStrOrNull(posNumber);
    const shopNumberNorm = toIntOrNull(shopNumberRaw);
    const posNumberNorm = toIntOrNull(posNumberRaw);

    const posIpNorm = toStrOrNull(posIp) || toStrOrNull(pickClientIp(req));

    const fiscalEnriched = enrichFiscal(fiscal);

    // Server-side alerts from fiscal metrics. Enabled by default - agent sends raw data only.
    const autoAlertsEnabled = String(process.env.AUTO_ALERTS_ENABLED || 'true').toLowerCase() === 'true';
    let autoAlerts = autoAlertsEnabled ? analyzeAndGenerateAlerts(fiscalEnriched) : [];

    // Handle agent error (v2 format)
    if (agentError) {
      const errorAlerts = generateErrorAlerts(agentError);
      autoAlerts = [...autoAlerts, ...errorAlerts];
    }

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

    logger.info(`Snapshot ingested: ${stateKey} (severity: ${severity || 'none'}, alerts: ${alerts.length}${agentVersion ? ', agent: ' + agentVersion : ''})`);

    // Queue notifications for Telegram (async, don't block response)
    if (isRegistered && severity && severity !== 'INFO' && alerts.length > 0) {
      queueNotifications(shopInnNorm, stateKey, severity, alerts, shopNumberNorm, posNumberNorm)
        .catch(err => logger.warn('Failed to queue notifications:', err.message));
    }

    // Always return 204
    res.status(204).send();

  } catch (err) {
    logger.error('Error processing snapshot:', err);
    // Always return 204 even on error to never block POS
    res.status(204).send();
  }
});

module.exports = router;
