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

// Cooldown in minutes to avoid notification spam for same terminal
const COOLDOWN_MINUTES = parseInt(process.env.NOTIFICATION_COOLDOWN_MINUTES) || 15;

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
 * Queue notifications for active Telegram subscriptions
 * Checks cooldowns to avoid spam
 * @param {string} eventType - Type of event: 'new_alert', 'recovery', 'stale', 'return'
 */
async function queueNotifications(shopInn, stateKey, severity, alerts, shopNumber, posNumber, eventType = 'new_alert') {
  try {
    // Find active subscriptions with matching severity filter
    const subsResult = await pool.query(`
      SELECT ns.id as subscription_id, 
             np.severity_filter,
             np.notify_on_recovery,
             np.notify_on_stale,
             np.notify_on_return
      FROM notification_subscriptions ns
      JOIN notification_preferences np ON np.subscription_id = ns.id
      WHERE ns.shop_inn = $1 
        AND ns.status = 'active'
        AND (ns.expires_at IS NULL OR ns.expires_at > NOW())
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

      logger.debug(`Queued notification for subscription ${sub.subscription_id}, state ${stateKey}`);
    }
  } catch (err) {
    logger.error('Error queueing notifications:', err);
    // Don't throw - notification failure shouldn't break ingestion
  }
}

// Helper to convert value to string or null
function toStrOrNull(v) {
  if (v === undefined || v === null) return null;
  return String(v);
}

/**
 * POST /api/v1/fiscal/snapshot
 * Ingest a snapshot from an agent
 */
router.post('/snapshot', async (req, res) => {
  try {
    const snapshot = req.body;

    // Validate
    const validationError = validateSnapshot(snapshot);
    if (validationError) {
      logger.warn(`Invalid snapshot: ${validationError}`);
      return res.status(400).json({ error: validationError });
    }

    // Extract fields (v2 agent format)
    const shopInnRaw = snapshot.shopInn ?? snapshot.shop_inn;
    const shopNumberRaw = snapshot.shopNumber ?? snapshot.shop_number;
    const posNumberRaw = snapshot.posNumber ?? snapshot.pos_number;
    const shopName = snapshot.shopName ?? snapshot.shop_name ?? null;
    const fiscal = snapshot.fiscal ?? {};
    const clientAlerts = snapshot.alerts ?? [];
    const agentError = snapshot.error ?? null;
    const agentVersion = snapshot.agentVersion ?? snapshot.agent_version ?? null;

    // Normalise identifiers
    const shopInnNorm = String(shopInnRaw).trim();
    const shopNumberNorm = parseInt(shopNumberRaw, 10) || 0;
    const posNumberNorm = parseInt(posNumberRaw, 10) || 0;

    // Client IP
    const posIp = pickClientIp(req);

    // Enrich fiscal data (zRemaining, fmFillPercent, etc.)
    const fiscalEnriched = enrichFiscal(fiscal);

    // Server-side alerts from fiscal metrics. Enabled by default - agent sends raw data only.
    const autoAlertsEnabled = process.env.AUTO_ALERTS_ENABLED !== 'false';
    let autoAlerts = autoAlertsEnabled ? analyzeAndGenerateAlerts(fiscalEnriched) : [];

    // Handle agent error (v2 format)
    if (agentError) {
      const errorAlerts = generateErrorAlerts(agentError);
      autoAlerts = [...autoAlerts, ...errorAlerts];
    }

    // Merge client alerts with auto-generated alerts
    // ВАЖНО: mergeAlerts фильтрует OFFLINE алерты
    const alerts = mergeAlerts(clientAlerts, autoAlerts);

    // Generate state key
    const stateKey = generateStateKey(shopInnNorm, shopNumberRaw, posNumberRaw);

    // Calculate severity AFTER filtering
    // НЕ использовать clientSeverity - он включает отфильтрованные OFFLINE алерты
    // Severity должен соответствовать реальным алертам которые будут показаны
    const severity = alerts.length > 0 ? calculateMaxSeverity(alerts) : null;

    // Update snapshot with merged alerts + enriched fiscal + recalculated severity
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
        state_key, shop_inn, shop_number, pos_number, shop_name, pos_ip, 
        snapshot, severity, is_registered, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (state_key) DO UPDATE SET
        shop_name = COALESCE(EXCLUDED.shop_name, fiscal_last_state.shop_name),
        pos_ip = EXCLUDED.pos_ip,
        snapshot = EXCLUDED.snapshot,
        severity = EXCLUDED.severity,
        is_registered = EXCLUDED.is_registered,
        updated_at = NOW()`,
      [
        stateKey,
        shopInnNorm,
        shopNumberNorm,
        posNumberNorm,
        shopName,
        posIp,
        JSON.stringify(updatedSnapshot),
        severity,
        isRegistered
      ]
    );

    // Log event for history (only if severity changed or significant)
    if (severity) {
      try {
        await pool.query(
          `INSERT INTO fiscal_events (state_key, shop_inn, event_type, snapshot, severity)
           VALUES ($1, $2, $3, $4, $5)`,
          [stateKey, shopInnNorm, toStrOrNull(snapshot.eventType), JSON.stringify(updatedSnapshot), severity]
        );
      } catch (eventErr) {
        logger.warn('Failed to log fiscal event:', eventErr.message);
      }
    }

    logger.info(`Snapshot ingested: ${stateKey} (severity: ${severity || 'none'}, alerts: ${alerts.length}${agentVersion ? ', agent: ' + agentVersion : ''})`);

    // Queue Telegram notifications (only for registered INNs with non-INFO severity)
    if (isRegistered && severity && severity !== 'INFO' && alerts.length > 0) {
      queueNotifications(shopInnNorm, stateKey, severity, alerts, shopNumberNorm, posNumberNorm)
        .catch(err => logger.error('Notification queue error:', err));
    }

    res.json({ 
      success: true, 
      stateKey,
      severity: severity || 'OK',
      alertsCount: alerts.length
    });

  } catch (err) {
    logger.error('Snapshot ingestion error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/fiscal/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
