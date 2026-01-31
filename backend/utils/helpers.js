/**
 * Generate unique state key for upsert
 */
function generateStateKey(shopInn, shopNumber, posNumber) {
  const norm = (v) => {
    if (v === undefined || v === null) return '0';
    const s = String(v).trim();
    return s.length ? s : '0';
  };
  return `${norm(shopInn)}:${norm(shopNumber)}:${norm(posNumber)}`;
}

/**
 * Calculate maximum severity from alerts array
 */
function calculateMaxSeverity(alerts) {
  const order = { CRITICAL: 4, DANGER: 3, WARN: 2, INFO: 1 };
  let max = null;

  for (const alert of alerts || []) {
    const severity = alert.severity?.toUpperCase();
    if (order[severity] > (order[max] || 0)) {
      max = severity;
    }
  }

  return max;
}

/**
 * Check if state is stale based on updated_at timestamp
 */
function isStale(updatedAt, minutes = 15) {
  const diff = Date.now() - new Date(updatedAt).getTime();
  return diff > minutes * 60 * 1000;
}

/**
 * Validate required fields in snapshot
 */
function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return { valid: false, error: 'Snapshot must be an object' };
  }

  if (!snapshot.shopInn || typeof snapshot.shopInn !== 'string' || snapshot.shopInn.trim().length === 0) {
    return { valid: false, error: 'shopInn is required and must be a non-empty string' };
  }

  // Additional (soft) validation according to the agent contract.
  // We do NOT reject the payload based on these fields, but warnings help diagnosing agent issues.
  const warnings = [];
  const recommendedRequired = ['eventType', 'eventTime', 'shopName', 'shopNumber', 'posNumber', 'alerts', 'severity'];
  for (const f of recommendedRequired) {
    if (!(f in snapshot)) warnings.push(`${f} is missing`);
  }

  if ('eventTime' in snapshot && typeof snapshot.eventTime !== 'number') {
    warnings.push('eventTime should be a number (ms)');
  }

  if ('alerts' in snapshot && !Array.isArray(snapshot.alerts)) {
    warnings.push('alerts should be an array');
  }

  if (warnings.length) {
    return { valid: true, warnings };
  }

  return { valid: true };
}

/**
 * Generate cryptographically secure random token
 */
function generateToken() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Extract client IP from request (handles proxies)
 * Checks x-real-ip, x-forwarded-for, then socket.remoteAddress
 */
function pickClientIp(req) {
  const xRealIp = req.header('x-real-ip');
  if (xRealIp) return String(xRealIp).trim();
  const xff = req.header('x-forwarded-for');
  if (xff) {
    // First IP is the original client
    const first = String(xff).split(',')[0].trim();
    if (first) return first;
  }
  return (req.socket && req.socket.remoteAddress) ? String(req.socket.remoteAddress) : 'unknown';
}

module.exports = {
  generateStateKey,
  calculateMaxSeverity,
  isStale,
  validateSnapshot,
  generateToken,
  pickClientIp
};
