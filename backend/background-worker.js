require('dotenv').config();
const cron = require('node-cron');
const db = require('./utils/db');
const logger = require('./utils/logger');
const { sender, formatMessage } = require('./utils/telegram-sender');

logger.info('Background worker started...');

// Обработка очереди уведомлений (каждую минуту)
cron.schedule('* * * * *', async () => {
  try {
    await processNotificationQueue();
  } catch (error) {
    logger.error('Error processing notification queue:', error);
  }
});

// Проверка истечения подписок (каждый день в 09:00)
cron.schedule('0 9 * * *', async () => {
  try {
    await checkExpiringSubscriptions();
  } catch (error) {
    logger.error('Error checking expiring subscriptions:', error);
  }
});

// Очистка старых данных (каждое воскресенье в 03:00)
cron.schedule('0 3 * * 0', async () => {
  try {
    await cleanupOldData();
  } catch (error) {
    logger.error('Error cleaning up old data:', error);
  }
});

// Основная функция обработки очереди
async function processNotificationQueue() {
  logger.debug('Processing notification queue...');

  // Получить все pending уведомления, сгруппированные по подписке
  const queueResult = await db.query(`
    SELECT 
      subscription_id,
      COUNT(*) as alerts_count,
      ARRAY_AGG(
        json_build_object(
          'state_key', state_key,
          'severity', severity,
          'event_type', event_type,
          'alert_summary', alert_summary,
          'shop_number', shop_number,
          'pos_number', pos_number
        )
      ) as alerts
    FROM notification_queue
    WHERE processed = false
    GROUP BY subscription_id
  `);

  if (queueResult.rows.length === 0) {
    logger.debug('Notification queue is empty');
    return;
  }

  logger.info(`Processing ${queueResult.rows.length} subscription queues`);

  for (const item of queueResult.rows) {
    const { subscription_id, alerts_count, alerts } = item;

    try {
      // Проверить активна ли подписка
      const subResult = await db.query(`
        SELECT status, expires_at
        FROM notification_subscriptions
        WHERE id = $1
      `, [subscription_id]);

      if (subResult.rows.length === 0) {
        logger.warn(`Subscription ${subscription_id} not found, skipping`);
        continue;
      }

      const subscription = subResult.rows[0];

      if (subscription.status !== 'active' || new Date(subscription.expires_at) < new Date()) {
        logger.warn(`Subscription ${subscription_id} is not active, skipping`);
        continue;
      }

      // Получить активное подключение
      const connResult = await db.query(`
        SELECT id, telegram_chat_id, last_notification_at
        FROM telegram_connections
        WHERE subscription_id = $1 AND is_active = true
      `, [subscription_id]);

      if (connResult.rows.length === 0) {
        logger.warn(`No active connection for subscription ${subscription_id}, skipping`);
        continue;
      }

      const connection = connResult.rows[0];

      // Определить приоритет
      const hasCritical = alerts.some(a => a.severity === 'CRITICAL');

      // Решение об отправке:
      // 1. Если есть CRITICAL - отправляем немедленно
      // 2. Если накопилось >= 3 алертов - отправляем
      // 3. Если прошло >= 5 минут с последнего уведомления - отправляем
      const lastSent = connection.last_notification_at;
      const minutesSinceLastSent = lastSent
        ? (Date.now() - new Date(lastSent).getTime()) / 60000
        : Infinity;

      const shouldSend = hasCritical || alerts_count >= 3 || minutesSinceLastSent >= 5;

      if (!shouldSend) {
        logger.debug(`Not time to send for subscription ${subscription_id} yet`);
        continue;
      }

      // Формировать сообщение
      const message = formatMessage(alerts);

      // Отправить через Telegram
      const result = await sender.send(connection.telegram_chat_id, message);

      if (result.success) {
        // Пометить как обработанные
        await db.query(`
          DELETE FROM notification_queue
          WHERE subscription_id = $1 AND processed = false
        `, [subscription_id]);

        // Обновить время последней отправки
        await db.query(`
          UPDATE telegram_connections
          SET last_notification_at = NOW()
          WHERE id = $1
        `, [connection.id]);

        // Логировать в историю
        await db.query(`
          INSERT INTO notification_history
            (connection_id, subscription_id, message_text, alerts_count, telegram_message_id, delivered)
          VALUES ($1, $2, $3, $4, $5, true)
        `, [connection.id, subscription_id, message, alerts_count, result.message_id]);

        logger.info(`Notification sent: subscription=${subscription_id}, alerts=${alerts_count}`);
      } else {
        // Логировать ошибку
        await db.query(`
          INSERT INTO notification_history
            (connection_id, subscription_id, message_text, alerts_count, delivered, error_message)
          VALUES ($1, $2, $3, $4, false, $5)
        `, [connection.id, subscription_id, message, alerts_count, result.error]);

        logger.error(`Failed to send notification: subscription=${subscription_id}, error=${result.error}`);
      }
    } catch (error) {
      logger.error(`Error processing subscription ${subscription_id}:`, error);
    }
  }
}

// Проверка истечения подписок
async function checkExpiringSubscriptions() {
  logger.info('Checking expiring subscriptions...');

  // Предупреждения за 3 дня
  const expiringSoonResult = await db.query(`
    SELECT ns.id, ns.shop_inn, ns.expires_at, tc.telegram_chat_id
    FROM notification_subscriptions ns
    JOIN telegram_connections tc ON tc.subscription_id = ns.id
    WHERE ns.status = 'active'
      AND tc.is_active = true
      AND ns.expires_at BETWEEN NOW() AND NOW() + INTERVAL '3 days'
      AND ns.expires_at > NOW() + INTERVAL '2 days'
  `);

  for (const row of expiringSoonResult.rows) {
    const daysLeft = Math.ceil(
      (new Date(row.expires_at) - new Date()) / (1000 * 60 * 60 * 24)
    );

    const message = `
ВНИМАНИЕ: Подписка истекает

Ваша подписка истекает через ${daysLeft} дн.
Для продления обратитесь к администратору.

Дата окончания: ${new Date(row.expires_at).toLocaleDateString('ru-RU')}
    `.trim();

    await sender.send(row.telegram_chat_id, message);
    logger.info(`Expiry warning sent: subscription=${row.id}, days_left=${daysLeft}`);
  }

  // Истекшие подписки
  const expiredResult = await db.query(`
    SELECT ns.id, ns.shop_inn, tc.telegram_chat_id
    FROM notification_subscriptions ns
    JOIN telegram_connections tc ON tc.subscription_id = ns.id
    WHERE ns.status = 'active'
      AND tc.is_active = true
      AND ns.expires_at < NOW()
  `);

  for (const row of expiredResult.rows) {
    // Изменить статус
    await db.query(`
      UPDATE notification_subscriptions
      SET status = 'expired'
      WHERE id = $1
    `, [row.id]);

    // Уведомить
    const message = `
ПОДПИСКА ИСТЕКЛА

Ваша подписка на уведомления истекла.
Для продления обратитесь к администратору.
    `.trim();

    await sender.send(row.telegram_chat_id, message);
    logger.info(`Subscription expired: subscription=${row.id}`);
  }

  logger.info(`Checked subscriptions: warned=${expiringSoonResult.rows.length}, expired=${expiredResult.rows.length}`);
}

// Очистка старых данных
async function cleanupOldData() {
  logger.info('Cleaning up old data...');

  // Удалить истекшие коды (старше 1 дня)
  const codesResult = await db.query(`
    DELETE FROM telegram_connect_codes
    WHERE expires_at < NOW() - INTERVAL '1 day'
    RETURNING id
  `);

  // Удалить старую историю (старше 6 месяцев)
  const historyResult = await db.query(`
    DELETE FROM notification_history
    WHERE sent_at < NOW() - INTERVAL '6 months'
    RETURNING id
  `);

  // Очистить обработанные из очереди (старше 1 часа)
  const queueResult = await db.query(`
    DELETE FROM notification_queue
    WHERE processed = true 
      AND created_at < NOW() - INTERVAL '1 hour'
    RETURNING id
  `);

  // Очистить старые cooldowns (старше 7 дней)
  const cooldownResult = await db.query(`
    DELETE FROM notification_cooldowns
    WHERE last_notified_at < NOW() - INTERVAL '7 days'
    RETURNING id
  `);

  logger.info(`Cleanup completed: codes=${codesResult.rows.length}, history=${historyResult.rows.length}, queue=${queueResult.rows.length}, cooldowns=${cooldownResult.rows.length}`);
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Stopping background worker...');
  await db.pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Stopping background worker...');
  await db.pool.end();
  process.exit(0);
});
