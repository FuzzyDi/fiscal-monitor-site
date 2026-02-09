/**
 * Alert Analyzer - анализирует fiscal данные и генерирует алерты
 * ЕДИНЫЙ ИСТОЧНИК ИСТИНЫ для фильтрации алертов
 * 
 * Пороги алертов:
 * 
 * Z_REMAINING (оставшиеся Z-отчёты):
 *   CRITICAL: <= 5
 *   DANGER: <= 15
 *   WARN: <= 30
 *   INFO: <= 50
 * 
 * FM_FILL (заполненность памяти ФМ):
 *   CRITICAL: >= 95%
 *   DANGER: >= 85%
 *   WARN: >= 75%
 * 
 * UNSENT (неотправленные документы):
 *   CRITICAL: >= 20
 *   DANGER: >= 10
 *   WARN: >= 5
 *   INFO: >= 1
 * 
 * OFFLINE (время без связи с ОФД) - ОТКЛЮЧЕНО:
 *   Поле LastOnlineTime от FiscalDriveService ненадёжно
 */

function analyzeAndGenerateAlerts(fiscal) {
  const alerts = [];
  
  if (!fiscal || typeof fiscal !== 'object') {
    return alerts;
  }

  // Z_REMAINING - оставшиеся Z-отчёты
  const zRemaining = fiscal.zRemaining ?? fiscal.zReportsRemaining ?? fiscal.z_reports_remaining;
  if (typeof zRemaining === 'number') {
    if (zRemaining <= 5) {
      alerts.push({
        type: 'Z_REMAINING_CRITICAL',
        severity: 'CRITICAL',
        value: zRemaining,
        message: `КРИТИЧНО: Осталось ${zRemaining} смен! Срочно замените ФМ!`
      });
    } else if (zRemaining <= 15) {
      alerts.push({
        type: 'Z_REMAINING_DANGER',
        severity: 'DANGER',
        value: zRemaining,
        message: `Опасно: Осталось ${zRemaining} смен. Запланируйте замену ФМ.`
      });
    } else if (zRemaining <= 30) {
      alerts.push({
        type: 'Z_REMAINING_WARN',
        severity: 'WARN',
        value: zRemaining,
        message: `Внимание: Осталось ${zRemaining} смен.`
      });
    } else if (zRemaining <= 50) {
      alerts.push({
        type: 'Z_REMAINING_INFO',
        severity: 'INFO',
        value: zRemaining,
        message: `Инфо: Осталось ${zRemaining} смен. Запланируйте замену.`
      });
    }
  }

  // FM_FILL - заполненность памяти
  const fmFillPercent = fiscal.fmFillPercent ?? fiscal.fm_fill_percent;
  if (typeof fmFillPercent === 'number') {
    if (fmFillPercent >= 95) {
      alerts.push({
        type: 'FM_FILL_CRITICAL',
        severity: 'CRITICAL',
        value: fmFillPercent,
        message: `КРИТИЧНО: Память ФМ заполнена на ${fmFillPercent}%!`
      });
    } else if (fmFillPercent >= 85) {
      alerts.push({
        type: 'FM_FILL_DANGER',
        severity: 'DANGER',
        value: fmFillPercent,
        message: `Опасно: Память ФМ заполнена на ${fmFillPercent}%.`
      });
    } else if (fmFillPercent >= 75) {
      alerts.push({
        type: 'FM_FILL_WARN',
        severity: 'WARN',
        value: fmFillPercent,
        message: `Внимание: Память ФМ заполнена на ${fmFillPercent}%.`
      });
    }
  }

  // UNSENT - неотправленные документы
  const unsentCount = fiscal.unsentCount ?? fiscal.unsent_count ?? 0;
  if (typeof unsentCount === 'number' && unsentCount > 0) {
    if (unsentCount >= 20) {
      alerts.push({
        type: 'UNSENT_CRITICAL',
        severity: 'CRITICAL',
        value: unsentCount,
        message: `КРИТИЧНО: ${unsentCount} неотправленных документов! Проверьте связь с ОФД!`
      });
    } else if (unsentCount >= 10) {
      alerts.push({
        type: 'UNSENT_DANGER',
        severity: 'DANGER',
        value: unsentCount,
        message: `Опасно: ${unsentCount} неотправленных документов. Проблемы со связью.`
      });
    } else if (unsentCount >= 5) {
      alerts.push({
        type: 'UNSENT_WARN',
        severity: 'WARN',
        value: unsentCount,
        message: `Внимание: ${unsentCount} неотправленных документов.`
      });
    } else {
      alerts.push({
        type: 'UNSENT_INFO',
        severity: 'INFO',
        value: unsentCount,
        message: `Инфо: ${unsentCount} документ(ов) ожидает отправки.`
      });
    }
  }

  // OFFLINE алерт ОТКЛЮЧЕН
  // Причина: поле LastOnlineTime из FiscalDriveService НЕ отражает реальную связь с ОФД
  // Факты:
  // - Кассы с lastOnlineTime "75 часов назад" имеют unsent=0 (всё отправлено)
  // - Кассы с реальными неотправленными имеют ПУСТОЙ lastOnlineTime
  // Вывод: это поле означает что-то другое (не время последней успешной отправки)
  // 
  // Для определения проблем со связью используйте алерт UNSENT (неотправленные документы)

  return alerts;
}

/**
 * Generate alerts from agent error
 */
function generateErrorAlerts(error) {
  if (!error) return [];
  
  const errorMessage = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
  
  return [{
    type: 'AGENT_ERROR',
    severity: 'DANGER',
    message: `Ошибка агента: ${errorMessage}`
  }];
}

/**
 * Объединение алертов от клиента и авто-генерированных
 * Авто-генерированные имеют приоритет
 * ЕДИНЫЙ ИСТОЧНИК ИСТИНЫ - вся фильтрация алертов происходит здесь
 */

// Типы алертов, которые игнорируются от клиента (агента)
// OFFLINE алерты отключены т.к. поле LastOnlineTime ненадёжное
const IGNORED_ALERT_TYPES = [
  'OFFLINE_CRITICAL',
  'OFFLINE_DANGER', 
  'OFFLINE_WARN',
  'OFFLINE_INFO'
];

// Паттерны в тексте алертов, которые нужно игнорировать
const IGNORED_ALERT_PATTERNS = [
  /OFD connection/i,
  /без связи с ОФД/i,
  /No OFD/i,
  /Нет связи с ОФД/i
];

function isIgnoredAlert(alert) {
  // Проверка по типу
  if (alert.type && IGNORED_ALERT_TYPES.includes(alert.type)) {
    return true;
  }
  
  // Проверка по тексту сообщения
  const message = alert.message || '';
  for (const pattern of IGNORED_ALERT_PATTERNS) {
    if (pattern.test(message)) {
      return true;
    }
  }
  
  return false;
}

function mergeAlerts(clientAlerts, autoAlerts) {
  const alertMap = new Map();
  
  // Добавляем алерты от клиента (кроме игнорируемых)
  if (clientAlerts && Array.isArray(clientAlerts)) {
    clientAlerts.forEach(alert => {
      if (alert.type && !isIgnoredAlert(alert)) {
        alertMap.set(alert.type, alert);
      }
    });
  }
  
  // Перезаписываем авто-генерированными (приоритет)
  autoAlerts.forEach(alert => {
    alertMap.set(alert.type, alert);
  });
  
  return Array.from(alertMap.values());
}

module.exports = {
  analyzeAndGenerateAlerts,
  generateErrorAlerts,
  mergeAlerts
};
