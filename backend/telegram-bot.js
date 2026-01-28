require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const db = require('./utils/db');
const logger = require('./utils/logger');

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  logger.error('TELEGRAM_BOT_TOKEN is not set in environment variables');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

logger.info('Telegram bot started...');

// Rate limiting для /connect (защита от брутфорса)
const connectAttempts = new Map();

function checkRateLimit(chatId) {
  const now = Date.now();
  const attempts = connectAttempts.get(chatId) || [];
  const recentAttempts = attempts.filter(t => now - t < 10 * 60 * 1000); // 10 минут
  
  if (recentAttempts.length >= 5) {
    return false;
  }
  
  recentAttempts.push(now);
  connectAttempts.set(chatId, recentAttempts);
  return true;
}

// Периодическая очистка старых записей rate limiter (предотвращение memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [chatId, attempts] of connectAttempts) {
    const recent = attempts.filter(t => now - t < 10 * 60 * 1000);
    if (recent.length === 0) {
      connectAttempts.delete(chatId);
    } else {
      connectAttempts.set(chatId, recent);
    }
  }
}, 60 * 1000); // Каждую минуту

// /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  
  const welcomeMessage = `
Добро пожаловать в Fiscal Monitor Bot!

Этот бот отправляет уведомления о проблемах с кассовыми терминалами.

Для подключения используйте код из портала:
/connect ВАШ_КОД

Доступные команды:
/status - текущее состояние терминалов
/disconnect - отключить уведомления
/help - справка
  `.trim();
  
  bot.sendMessage(chatId, welcomeMessage);
});

// /connect CODE
bot.onText(/\/connect\s+(\d{6})/, async (msg, match) => {
  const chatId = msg.chat.id;
  const chatType = msg.chat.type; // 'private', 'group', 'supergroup'
  const chatTitle = msg.chat.title || null;
  const username = msg.from?.username || null;
  const code = match[1].trim();
  
  // Rate limiting
  if (!checkRateLimit(chatId)) {
    bot.sendMessage(chatId, 
      'Слишком много попыток подключения. Подождите 10 минут.'
    );
    return;
  }
  
  try {
    // 1. Проверить код
    const codeResult = await db.query(`
      SELECT subscription_id, expires_at, used
      FROM telegram_connect_codes
      WHERE code = $1
    `, [code]);
    
    if (codeResult.rows.length === 0) {
      bot.sendMessage(chatId, 'Код не найден. Проверьте правильность кода.');
      return;
    }
    
    const codeData = codeResult.rows[0];
    
    // 2. Проверить не истек ли
    if (new Date(codeData.expires_at) < new Date()) {
      bot.sendMessage(chatId, 
        'Код истек. Получите новый код в портале (код действителен 10 минут).'
      );
      return;
    }
    
    // 3. Проверить не использован ли
    if (codeData.used) {
      bot.sendMessage(chatId, 'Этот код уже использован.');
      return;
    }
    
    // 4. Проверить не подключен ли уже этот chat_id к этой же подписке
    const existingConnection = await db.query(`
      SELECT tc.id, ns.shop_inn, r.title
      FROM telegram_connections tc
      JOIN notification_subscriptions ns ON ns.id = tc.subscription_id
      JOIN registrations r ON r.shop_inn = ns.shop_inn
      WHERE tc.telegram_chat_id = $1 
        AND tc.subscription_id = $2
        AND tc.is_active = true
    `, [chatId, codeData.subscription_id]);
    
    if (existingConnection.rows.length > 0) {
      const existing = existingConnection.rows[0];
      bot.sendMessage(chatId, 
        `Этот чат уже подключен к аккаунту: ${existing.title} (ИНН: ${existing.shop_inn}).\n\n` +
        `Используйте команду /disconnect для отключения или подключите другой чат.`
      );
      return;
    }
    
    // 5. Создать новое подключение (НЕ деактивируя старые - разрешаем несколько)
    await db.query(`
      INSERT INTO telegram_connections
        (subscription_id, telegram_chat_id, telegram_chat_type, telegram_chat_title, telegram_username, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
    `, [codeData.subscription_id, chatId, chatType, chatTitle, username]);
    
    // 6. Пометить код как использованный
    await db.query(`
      UPDATE telegram_connect_codes
      SET used = true, used_at = NOW(), telegram_chat_id = $1
      WHERE code = $2
    `, [chatId, code]);
    
    logger.info(`Telegram connected: subscription_id=${codeData.subscription_id}, chat_id=${chatId}, type=${chatType}, user=${username}`);
    
    const successMessage = `
✅ Уведомления подключены!

Вы будете получать алерты о проблемах с терминалами.
Настроить уведомления можно в портале.

💡 К одному аккаунту можно подключить несколько Telegram (себя, бухгалтера, директора и т.д.)

Доступные команды:
/status - текущее состояние
/disconnect - отключить уведомления
/help - справка
    `.trim();
    
    bot.sendMessage(chatId, successMessage);
    
  } catch (error) {
    logger.error('Error connecting telegram:', error);
    bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.');
  }
});

// /status
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    // Найти подписку по chat_id
    const connectionResult = await db.query(`
      SELECT subscription_id
      FROM telegram_connections
      WHERE telegram_chat_id = $1 AND is_active = true
    `, [chatId]);
    
    if (connectionResult.rows.length === 0) {
      bot.sendMessage(chatId, 
        'Уведомления не подключены. Используйте /connect КОД для подключения.'
      );
      return;
    }
    
    const subscriptionId = connectionResult.rows[0].subscription_id;
    
    // Получить ИНН
    const subResult = await db.query(`
      SELECT ns.shop_inn, r.title
      FROM notification_subscriptions ns
      JOIN registrations r ON r.shop_inn = ns.shop_inn
      WHERE ns.id = $1
    `, [subscriptionId]);
    
    if (subResult.rows.length === 0) {
      bot.sendMessage(chatId, 'Подписка не найдена.');
      return;
    }
    
    const shopInn = subResult.rows[0].shop_inn;
    const companyName = subResult.rows[0].title;
    
    // Статистика по терминалам
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE severity = 'INFO') as ok_count,
        COUNT(*) FILTER (WHERE severity = 'CRITICAL') as critical_count,
        COUNT(*) FILTER (WHERE severity = 'DANGER') as danger_count,
        COUNT(*) FILTER (WHERE severity = 'WARN') as warn_count,
        COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '15 minutes') as stale_count
      FROM fiscal_last_state
      WHERE shop_inn = $1
    `, [shopInn]);
    
    const stats = statsResult.rows[0];
    const problemCount = parseInt(stats.critical_count) + parseInt(stats.danger_count) + parseInt(stats.warn_count);
    
    // Топ проблемных магазинов
    const topShopsResult = await db.query(`
      SELECT shop_number, shop_name, COUNT(*) as problem_count
      FROM fiscal_last_state
      WHERE shop_inn = $1 
        AND severity IN ('CRITICAL', 'DANGER', 'WARN')
      GROUP BY shop_number, shop_name
      ORDER BY problem_count DESC
      LIMIT 3
    `, [shopInn]);
    
    let message = `
СТАТУС СИСТЕМЫ
${companyName}

Работают нормально: ${stats.ok_count}
Требуют внимания: ${problemCount}`;
    
    if (problemCount > 0) {
      message += `
  КРИТИЧЕСКИХ: ${stats.critical_count}
  ОПАСНЫХ: ${stats.danger_count}
  ПРЕДУПРЕЖДЕНИЙ: ${stats.warn_count}`;
    }
    
    message += `
Не на связи: ${stats.stale_count}`;
    
    if (topShopsResult.rows.length > 0) {
      message += `\n\nМагазины с проблемами:`;
      topShopsResult.rows.forEach(shop => {
        const shopName = shop.shop_name || `Магазин №${shop.shop_number}`;
        message += `\n- ${shopName}: ${shop.problem_count} касс`;
      });
    }
    
    message += `\n\nПодробнее: ${process.env.PORTAL_URL || 'https://fiscaldrive.sbg.network'}/portal`;
    
    bot.sendMessage(chatId, message.trim());
    
  } catch (error) {
    logger.error('Error getting status:', error);
    bot.sendMessage(chatId, 'Произошла ошибка при получении статуса.');
  }
});

// /disconnect
bot.onText(/\/disconnect/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const result = await db.query(`
      UPDATE telegram_connections
      SET is_active = false
      WHERE telegram_chat_id = $1 AND is_active = true
      RETURNING id
    `, [chatId]);
    
    if (result.rows.length === 0) {
      bot.sendMessage(chatId, 'Уведомления не были подключены.');
      return;
    }
    
    logger.info(`Telegram disconnected: chat_id=${chatId}`);
    
    const message = `
Уведомления отключены.

Для повторного подключения получите новый код в портале.
    `.trim();
    
    bot.sendMessage(chatId, message);
    
  } catch (error) {
    logger.error('Error disconnecting telegram:', error);
    bot.sendMessage(chatId, 'Произошла ошибка при отключении.');
  }
});

// /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  
  const helpMessage = `
ДОСТУПНЫЕ КОМАНДЫ:

/status - текущее состояние терминалов
/disconnect - отключить уведомления
/help - эта справка

Вы получаете уведомления только о важных изменениях.
Подробная информация всегда доступна в портале.

Поддержка: ${process.env.SUPPORT_EMAIL || 'support@fiscaldrive.sbg.network'}
  `.trim();
  
  bot.sendMessage(chatId, helpMessage);
});

// Неизвестная команда
bot.on('message', (msg) => {
  if (msg.text && msg.text.startsWith('/')) {
    const command = msg.text.split(' ')[0];
    const knownCommands = ['/start', '/connect', '/status', '/disconnect', '/help'];
    
    if (!knownCommands.includes(command)) {
      bot.sendMessage(msg.chat.id, 
        'Команда не распознана. Используйте /help для списка команд.'
      );
    }
  }
});

// Обработка ошибок
bot.on('polling_error', (error) => {
  logger.error('Telegram polling error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Stopping Telegram bot...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Stopping Telegram bot...');
  bot.stopPolling();
  process.exit(0);
});

// Экспорт для использования в worker
module.exports = bot;
