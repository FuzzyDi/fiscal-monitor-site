/**
 * Analyze fiscal data and generate alerts based on thresholds
 * 
 * Thresholds aligned with sbg-fiscal-agent:
 * 
 * Z_REMAINING (shifts until FM replacement):
 *   <= 2  -> CRITICAL
 *   <= 5  -> DANGER
 *   <= 10 -> WARN
 *   <= 20 -> INFO
 * 
 * UNSENT (documents waiting to send to OFD):
 *   >= 20 -> CRITICAL
 *   >= 15 -> DANGER
 *   >= 10 -> WARN
 *   >= 5  -> INFO
 * 
 * FM_FILL (ReceiptCount / ReceiptMaxCount percentage):
 *   >= 50% -> CRITICAL
 *   >= 20% -> DANGER
 *   >= 10% -> WARN
 *   >= 5%  -> INFO
 */
function analyzeAndGenerateAlerts(fiscal) {
  if (!fiscal) return [];
  
  const alerts = [];
  
  // Z_REMAINING - shifts remaining until FM needs replacement
  // 1 shift ≈ 1 day, so these thresholds are in days
  if (fiscal.zRemaining !== undefined && fiscal.zRemaining !== null) {
    const zRemaining = fiscal.zRemaining;
    
    if (zRemaining <= 2) {
      alerts.push({
        type: 'Z_REMAINING_CRITICAL',
        severity: 'CRITICAL',
        value: zRemaining,
        message: `CRITICAL: Only ${zRemaining} shifts remaining! Replace FM immediately!`
      });
    } else if (zRemaining <= 5) {
      alerts.push({
        type: 'Z_REMAINING_DANGER',
        severity: 'DANGER',
        value: zRemaining,
        message: `Danger: Only ${zRemaining} shifts remaining. Urgent replacement needed.`
      });
    } else if (zRemaining <= 10) {
      alerts.push({
        type: 'Z_REMAINING_WARN',
        severity: 'WARN',
        value: zRemaining,
        message: `Warning: ${zRemaining} shifts remaining. Order replacement FM.`
      });
    } else if (zRemaining <= 20) {
      alerts.push({
        type: 'Z_REMAINING_INFO',
        severity: 'INFO',
        value: zRemaining,
        message: `Info: ${zRemaining} shifts remaining. Plan replacement.`
      });
    }
  }
  
  // UNSENT - documents in FiscalDriveAPI DB waiting to send to OFD
  if (fiscal.unsentCount !== undefined && fiscal.unsentCount !== null) {
    const unsentCount = fiscal.unsentCount;
    
    if (unsentCount >= 20) {
      alerts.push({
        type: 'UNSENT_CRITICAL',
        severity: 'CRITICAL',
        value: unsentCount,
        message: `CRITICAL: ${unsentCount} unsent documents! Check OFD connection!`
      });
    } else if (unsentCount >= 15) {
      alerts.push({
        type: 'UNSENT_DANGER',
        severity: 'DANGER',
        value: unsentCount,
        message: `Danger: ${unsentCount} unsent documents. Connection issues.`
      });
    } else if (unsentCount >= 10) {
      alerts.push({
        type: 'UNSENT_WARN',
        severity: 'WARN',
        value: unsentCount,
        message: `Warning: ${unsentCount} unsent documents pending.`
      });
    } else if (unsentCount >= 5) {
      alerts.push({
        type: 'UNSENT_INFO',
        severity: 'INFO',
        value: unsentCount,
        message: `Info: ${unsentCount} unsent documents.`
      });
    }
  }

  // FM_FILL - FM memory fill percentage (receiptCount / receiptMaxCount)
  // This is CRITICAL - if FM memory fills up, POS cannot register receipts!
  if (fiscal.fmFillPercent !== undefined && fiscal.fmFillPercent !== null) {
    const fmFill = fiscal.fmFillPercent;
    
    if (fmFill >= 50) {
      alerts.push({
        type: 'FM_FILL_CRITICAL',
        severity: 'CRITICAL',
        value: fmFill,
        message: `CRITICAL: FM memory ${fmFill}% full! POS may stop working!`
      });
    } else if (fmFill >= 20) {
      alerts.push({
        type: 'FM_FILL_DANGER',
        severity: 'DANGER',
        value: fmFill,
        message: `Danger: FM memory ${fmFill}% full. Check OFD connection.`
      });
    } else if (fmFill >= 10) {
      alerts.push({
        type: 'FM_FILL_WARN',
        severity: 'WARN',
        value: fmFill,
        message: `Warning: FM memory ${fmFill}% full.`
      });
    } else if (fmFill >= 5) {
      alerts.push({
        type: 'FM_FILL_INFO',
        severity: 'INFO',
        value: fmFill,
        message: `Info: FM memory ${fmFill}% used.`
      });
    }
  }
  
  return alerts;
}

/**
 * Merge client alerts with auto-generated alerts
 * Auto-generated alerts have priority
 */
function mergeAlerts(clientAlerts, autoAlerts) {
  const alertMap = new Map();
  
  // Add client alerts first
  if (clientAlerts && Array.isArray(clientAlerts)) {
    clientAlerts.forEach(alert => {
      if (alert.type) {
        alertMap.set(alert.type, alert);
      }
    });
  }
  
  // Override with auto-generated alerts (they have priority)
  autoAlerts.forEach(alert => {
    alertMap.set(alert.type, alert);
  });
  
  return Array.from(alertMap.values());
}

module.exports = {
  analyzeAndGenerateAlerts,
  mergeAlerts
};
