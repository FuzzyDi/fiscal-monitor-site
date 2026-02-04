const axios = require('axios');
const logger = require('./logger');
const db = require('./db');

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const SEND_DELAY_MS = parseInt(process.env.TELEGRAM_SEND_DELAY_MS) || 100; // 10 msg/sec

// Очередь отправки с rate limiting
class TelegramSender {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  async send(chatId, text) {
    return new Promise((resolve) => {
      this.queue.push({ chatId, text, resolve });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const { chatId, text, resolve } = this.queue.shift();
      
      try {
        const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
          chat_id: chatId,
          text: text,
          disable_web_page_preview: true
        });

        resolve({
          success: true,
          message_id: response.data.result.message_id
        });

      } catch (error) {
        const errorCode = error.response?.status;
        const errorDescription = error.response?.data?.description;

        logger.error(`Telegram send error (${errorCode}): ${errorDescription}`, {
          chat_id: chatId,
          error: errorDescription
        });

        // Обработка специфичных ошибок
        if (errorCode === 403) {
          // Бот заблокирован пользователем
          await this.deactivateConnection(chatId);
          logger.info(`Connection deactivated due to bot block: chat_id=${chatId}`);
        } else if (errorCode === 400 || errorCode === 404) {
          // Чат не найден
          await this.deactivateConnection(chatId);
          logger.info(`Connection deactivated due to chat not found: chat_id=${chatId}`);
        } else if (errorCode === 429) {
          // Rate limit
          const retryAfter = error.response?.data?.parameters?.retry_after || 30;
          logger.warn(`Rate limit hit, waiting ${retryAfter}s`);
          await this.sleep(retryAfter * 1000);
          // Вернуть в очередь
          this.queue.unshift({ chatId, text, resolve });
          continue;
        }

        resolve({
          success: false,
          error: errorDescription || error.message
        });
      }

      // Задержка между сообщениями для rate limiting
      if (this.queue.length > 0) {
        await this.sleep(SEND_DELAY_MS);
      }
    }

    this.processing = false;
  }

  async deactivateConnection(chatId) {
    try {
      await db.query(`
        UPDATE telegram_connections
        SET is_active = false
        WHERE telegram_chat_id = $1
      `, [chatId]);
    } catch (error) {
      logger.error('Error deactivating connection:', error);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
const sender = new TelegramSender();

// Форматирование сообщений (строгий стиль без emoji)
function formatMessage(alerts) {
  // Фильтруем OFFLINE алерты (поле LastOnlineTime ненадёжное)
  const filteredAlerts = alerts.filter(a => 
    !a.alert_summary?.includes('OFD connection') && 
    !a.alert_summary?.includes('без связи с ОФД') &&
    !(a.type && a.type.startsWith('OFFLINE'))
  );
  
  // Если после фильтрации нет алертов - возвращаем null
  if (filteredAlerts.length === 0) {
    return null;
  }
  
  const count = filteredAlerts.length;
  const portalUrl = process.env.PORTAL_URL || 'https://fiscaldrive.sbg.network';

  // Один алерт
  if (count === 1) {
    const alert = filteredAlerts[0];
    const severityText = getSeverityText(alert.severity);
    
    return `
АЛЕРТ: ${severityText}

Терминал: Магазин ${alert.shop_number}, Касса ${alert.pos_number}
Проблема: ${alert.alert_summary}
Время: ${formatDateTime(new Date())}

Подробнее: ${portalUrl}/portal
    `.trim();
  }

  // 2-5 алертов (показываем все)
  if (count <= 5) {
    let message = `НОВЫЕ ПРОБЛЕМЫ (${count})\n\n`;
    
    filteredAlerts.forEach(alert => {
      const symbol = getSeveritySymbol(alert.severity);
      message += `${symbol} Магазин ${alert.shop_number}, Касса ${alert.pos_number}\n`;
      message += `   ${alert.alert_summary}\n\n`;
    });
    
    message += `Подробнее: ${portalUrl}/portal`;
    return message.trim();
  }

  // Больше 5 алертов (группировка)
  const bySeverity = groupBySeverity(filteredAlerts);
  const byShop = groupByShop(filteredAlerts);
  
  let message = `ТРЕБУЮТ ВНИМАНИЯ (${count} терминалов)\n\n`;
  
  // По severity
  if (bySeverity.CRITICAL > 0) {
    message += `КРИТИЧЕСКИХ: ${bySeverity.CRITICAL}\n`;
  }
  if (bySeverity.DANGER > 0) {
    message += `ОПАСНЫХ: ${bySeverity.DANGER}\n`;
  }
  if (bySeverity.WARN > 0) {
    message += `ПРЕДУПРЕЖДЕНИЙ: ${bySeverity.WARN}\n`;
  }
  
  message += `\nПо магазинам:\n`;
  
  // Топ-5 магазинов
  const topShops = Object.entries(byShop)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  topShops.forEach(([shop, count]) => {
    message += `Магазин ${shop}: ${count} проблем\n`;
  });
  
  if (Object.keys(byShop).length > 5) {
    message += `+ еще ${Object.keys(byShop).length - 5} магазинов\n`;
  }
  
  message += `\nПодробнее: ${portalUrl}/portal`;
  return message.trim();
}

function getSeverityText(severity) {
  const map = {
    'CRITICAL': 'КРИТИЧЕСКИЙ',
    'DANGER': 'ОПАСНЫЙ',
    'WARN': 'ПРЕДУПРЕЖДЕНИЕ',
    'INFO': 'ИНФОРМАЦИЯ'
  };
  return map[severity] || severity;
}

function getSeveritySymbol(severity) {
  const map = {
    'CRITICAL': '[!!!]',
    'DANGER': '[!!]',
    'WARN': '[!]',
    'INFO': '[i]'
  };
  return map[severity] || '[-]';
}

function formatDateTime(date) {
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function groupBySeverity(alerts) {
  return alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {});
}

function groupByShop(alerts) {
  return alerts.reduce((acc, alert) => {
    acc[alert.shop_number] = (acc[alert.shop_number] || 0) + 1;
    return acc;
  }, {});
}

module.exports = {
  sender,
  formatMessage
};
