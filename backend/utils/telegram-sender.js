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
/**
 * Форматирует алерты для отправки в Telegram
 * ЕДИНАЯ ЛОГИКА с отображением на странице
 * @param {Array} queueItems - элементы из очереди уведомлений
 */
function formatMessage(queueItems) {
  if (!queueItems || queueItems.length === 0) {
    return null;
  }
  
  const portalUrl = process.env.PORTAL_URL || 'https://fiscaldrive.sbg.network';

  // Один терминал
  if (queueItems.length === 1) {
    const item = queueItems[0];
    const severityText = getSeverityText(item.severity);
    
    // Парсим JSON алертов (единый источник данных с страницей)
    let alertsList = '';
    try {
      const alerts = JSON.parse(item.alert_summary || '[]');
      alertsList = alerts.map(a => {
        const msg = a.message || a.type;
        return `• ${msg}`;
      }).join('\n');
    } catch (e) {
      // Fallback для старого формата (текстовая строка)
      alertsList = `• ${item.alert_summary}`;
    }
    
    return `
АЛЕРТ: ${severityText}

Терминал: Магазин ${item.shop_number}, Касса ${item.pos_number}
Проблемы:
${alertsList}

Время: ${formatDateTime(new Date())}
Подробнее: ${portalUrl}/portal
    `.trim();
  }

  // 2-5 терминалов (показываем все)
  if (queueItems.length <= 5) {
    let message = `НОВЫЕ ПРОБЛЕМЫ (${queueItems.length} терминалов)\n\n`;
    
    queueItems.forEach(item => {
      const symbol = getSeveritySymbol(item.severity);
      message += `${symbol} Магазин ${item.shop_number}, Касса ${item.pos_number}\n`;
      
      // Парсим JSON алертов
      try {
        const alerts = JSON.parse(item.alert_summary || '[]');
        alerts.slice(0, 3).forEach(a => {
          const msg = a.message || a.type;
          message += `   • ${msg}\n`;
        });
        if (alerts.length > 3) {
          message += `   + ещё ${alerts.length - 3}\n`;
        }
      } catch (e) {
        message += `   • ${item.alert_summary}\n`;
      }
      message += '\n';
    });
    
    message += `Подробнее: ${portalUrl}/portal`;
    return message.trim();
  }

  // Больше 5 терминалов (группировка)
  const bySeverity = groupBySeverity(queueItems);
  const byShop = groupByShop(queueItems);
  
  let message = `ТРЕБУЮТ ВНИМАНИЯ (${queueItems.length} терминалов)\n\n`;
  
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
