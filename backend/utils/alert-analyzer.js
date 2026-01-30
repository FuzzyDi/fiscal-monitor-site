/**
 * Анализ данных ФМ и генерация алертов
 * 
 * Пороги:
 * 
 * Z_REMAINING (смен до замены ФМ):
 *   <= 5   -> CRITICAL
 *   <= 15  -> DANGER  
 *   <= 30  -> WARN
 *   <= 50  -> INFO
 * 
 * UNSENT (неотправленные документы в ОФД):
 *   >= 20 -> CRITICAL
 *   >= 10 -> DANGER
 *   >= 5  -> WARN
 *   >= 1  -> INFO
 * 
 * FM_FILL (заполнение памяти ФМ):
 *   >= 30% -> CRITICAL
 *   >= 20% -> DANGER
 *   >= 10% -> WARN
 *   >= 5%  -> INFO
 * 
 * OFFLINE (время без связи с ОФД при наличии неотправленных):
 *   >= 720 мин (12ч) -> CRITICAL
 *   >= 240 мин (4ч)  -> DANGER
 *   >= 60 мин (1ч)   -> WARN
 */
function analyzeAndGenerateAlerts(fiscal) {
  if (!fiscal) return [];
  
  const alerts = [];
  
  // Z_REMAINING - смен до замены ФМ (1 смена ≈ 1 день)
  if (fiscal.zRemaining !== undefined && fiscal.zRemaining !== null) {
    const zRemaining = fiscal.zRemaining;
    
    if (zRemaining <= 5) {
      alerts.push({
        type: 'Z_REMAINING_CRITICAL',
        severity: 'CRITICAL',
        value: zRemaining,
        message: `КРИТИЧНО: Осталось ${zRemaining} смен! Срочно заменить ФМ!`
      });
    } else if (zRemaining <= 15) {
      alerts.push({
        type: 'Z_REMAINING_DANGER',
        severity: 'DANGER',
        value: zRemaining,
        message: `Опасно: Осталось ${zRemaining} смен. Требуется замена ФМ.`
      });
    } else if (zRemaining <= 30) {
      alerts.push({
        type: 'Z_REMAINING_WARN',
        severity: 'WARN',
        value: zRemaining,
        message: `Внимание: Осталось ${zRemaining} смен. Закажите замену ФМ.`
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
  
  // UNSENT - неотправленные документы в ОФД
  const unsentCount = fiscal.unsentCount;
  if (unsentCount !== undefined && unsentCount !== null && unsentCount > 0) {
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

  // FM_FILL - заполнение памяти ФМ
  if (fiscal.fmFillPercent !== undefined && fiscal.fmFillPercent !== null) {
    const fmFill = fiscal.fmFillPercent;
    
    if (fmFill >= 30) {
      alerts.push({
        type: 'FM_FILL_CRITICAL',
        severity: 'CRITICAL',
        value: fmFill,
        message: `КРИТИЧНО: Память ФМ заполнена на ${fmFill}%! Касса может остановиться!`
      });
    } else if (fmFill >= 20) {
      alerts.push({
        type: 'FM_FILL_DANGER',
        severity: 'DANGER',
        value: fmFill,
        message: `Опасно: Память ФМ заполнена на ${fmFill}%. Проверьте связь с ОФД.`
      });
    } else if (fmFill >= 10) {
      alerts.push({
        type: 'FM_FILL_WARN',
        severity: 'WARN',
        value: fmFill,
        message: `Внимание: Память ФМ заполнена на ${fmFill}%.`
      });
    } else if (fmFill >= 5) {
      alerts.push({
        type: 'FM_FILL_INFO',
        severity: 'INFO',
        value: fmFill,
        message: `Инфо: Память ФМ использована на ${fmFill}%.`
      });
    }
  }
  
  // OFFLINE - время без связи с ОФД (только если есть неотправленные)
  if (fiscal.lastOnlineTime && unsentCount > 0) {
    const lastOnline = new Date(fiscal.lastOnlineTime);
    if (!isNaN(lastOnline.getTime())) {
      const offlineMinutes = Math.floor((Date.now() - lastOnline.getTime()) / 60000);
      
      if (offlineMinutes >= 720) { // 12 часов
        alerts.push({
          type: 'OFFLINE_CRITICAL',
          severity: 'CRITICAL',
          value: offlineMinutes,
          message: `КРИТИЧНО: Нет связи с ОФД ${Math.floor(offlineMinutes / 60)} часов! ${unsentCount} неотправленных.`
        });
      } else if (offlineMinutes >= 240) { // 4 часа
        alerts.push({
          type: 'OFFLINE_DANGER',
          severity: 'DANGER',
          value: offlineMinutes,
          message: `Опасно: Нет связи с ОФД ${Math.floor(offlineMinutes / 60)} часов. ${unsentCount} неотправленных.`
        });
      } else if (offlineMinutes >= 60) { // 1 час
        alerts.push({
          type: 'OFFLINE_WARN',
          severity: 'WARN',
          value: offlineMinutes,
          message: `Внимание: Нет связи с ОФД ${offlineMinutes} мин. ${unsentCount} неотправленных.`
        });
      }
    }
  }
  
  return alerts;
}

/**
 * Генерация алертов для ошибок агента
 */
function generateErrorAlerts(error) {
  if (!error) return [];
  
  const errorMessages = {
    'RPC_ERROR': 'Ошибка связи с FiscalDriveService',
    'NO_FISCAL_DRIVE': 'Фискальный модуль не найден',
    'FM_NOT_FOUND': 'Фискальный модуль не обнаружен'
  };
  
  const message = errorMessages[error.type] || error.message || 'Неизвестная ошибка';
  
  return [{
    type: error.type || 'AGENT_ERROR',
    severity: 'CRITICAL',
    message: `${message}: ${error.message || ''}`
  }];
}

/**
 * Объединение алертов от клиента и авто-генерированных
 * Авто-генерированные имеют приоритет
 */
function mergeAlerts(clientAlerts, autoAlerts) {
  const alertMap = new Map();
  
  // Добавляем алерты от клиента
  if (clientAlerts && Array.isArray(clientAlerts)) {
    clientAlerts.forEach(alert => {
      if (alert.type) {
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
