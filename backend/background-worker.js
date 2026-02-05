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
        SELECT ns.status, ns.expires_at, 
               np.quiet_hours_enabled, np.quiet_hours_start, np.quiet_hours_end
        FROM notification_subscriptions ns
        LEFT JOIN notification_preferences np ON np.subscription_id = ns.id
        WHERE ns.id = $1
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

      // Проверка тихих часов
      if (subscription.quiet_hours_enabled) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;

        const [startHour, startMinute] = (subscription.quiet_hours_start || '23:00').split(':').map(Number);
        const [endHour, endMinute] = (subscription.quiet_hours_end || '08:00').split(':').map(Number);
        const startTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;

        let isQuietTime = false;
        if (startTime > endTime) {
          // Период переходит через полночь (например, 23:00 - 08:00)
          isQuietTime = currentTime >= startTime || currentTime < endTime;
        } else {
          // Период в пределах одного дня
          isQuietTime = currentTime >= startTime && currentTime < endTime;
        }

        if (isQuietTime) {
          // Не критические уведомления откладываем
          const hasCriticalAlert = alerts.some(a => a.severity === 'CRITICAL');
          if (!hasCriticalAlert) {
            logger.debug(`Quiet hours active for subscription ${subscription_id}, skipping non-critical alerts`);
            continue;
          }
          logger.info(`Quiet hours active but sending CRITICAL alert for subscription ${subscription_id}`);
        }
      }

      // Получить ВСЕ активные подключения для этой подписки
      const connResult = await db.query(`
        SELECT id, telegram_chat_id, telegram_username, last_notification_at
        FROM telegram_connections
        WHERE subscription_id = $1 AND is_active = true
      `, [subscription_id]);

      if (connResult.rows.length === 0) {
        logger.warn(`No active connections for subscription ${subscription_id}, skipping`);
        continue;
      }

      // Определить приоритет
      const hasCritical = alerts.some(a => a.severity === 'CRITICAL');

      // Решение об отправке:
      // 1. Если есть CRITICAL - отправляем немедленно
      // 2. Если накопилось >= 3 алертов - отправляем
      // 3. Если прошло >= 5 минут с любого последнего уведомления - отправляем
      const oldestLastSent = connResult.rows
        .map(c => c.last_notification_at)
        .filter(Boolean)
        .sort()[0];

      const minutesSinceLastSent = oldestLastSent
        ? (Date.now() - new Date(oldestLastSent).getTime()) / 60000
        : Infinity;

      const shouldSend = hasCritical || alerts_count >= 3 || minutesSinceLastSent >= 5;

      if (!shouldSend) {
        logger.debug(`Not time to send for subscription ${subscription_id} yet`);
        continue;
      }

      // Формировать сообщение
      const message = formatMessage(alerts);

      // Если нет алертов - пропускаем (алерты фильтруются в alert-analyzer.js)
      if (!message) {
        logger.debug(`No alerts to send for subscription ${subscription_id}`);
        await db.query('DELETE FROM notification_queue WHERE subscription_id = $1', [subscription_id]);
        continue;
      }

      // Отправить ВСЕМ подключённым пользователям
      let sentCount = 0;
      let lastError = null;
      let lastConnectionId = null;

      for (const connection of connResult.rows) {
        lastConnectionId = connection.id;
        const result = await sender.send(connection.telegram_chat_id, message);

        if (result.success) {
          sentCount++;

          // Обновить время последней отправки для этого подключения
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
        } else {
          lastError = result.error;
          logger.warn(`Failed to send to chat ${connection.telegram_chat_id}: ${result.error}`);
        }
      }

      if (sentCount > 0) {
        // Пометить как обработанные только если хотя бы одно сообщение отправлено
        await db.query(`
          DELETE FROM notification_queue
          WHERE subscription_id = $1 AND processed = false
        `, [subscription_id]);

        logger.info(`Notification sent: subscription=${subscription_id}, alerts=${alerts_count}, recipients=${sentCount}/${connResult.rows.length}`);
      } else if (lastError) {
        // Логировать ошибку (fixed: use lastConnectionId and lastError instead of out-of-scope variables)
        await db.query(`
          INSERT INTO notification_history
            (connection_id, subscription_id, message_text, alerts_count, delivered, error_message)
          VALUES ($1, $2, $3, $4, false, $5)
        `, [lastConnectionId, subscription_id, message, alerts_count, lastError]);

        logger.error(`Failed to send notification: subscription=${subscription_id}, error=${lastError}`);
      }
    } catch (error) {
      logger.error(`Error processing subscription ${subscription_id}:`, error);
    }
  }
}

// Проверка истечения подписок (улучшенная версия)
async function checkExpiringSubscriptions() {
  logger.info('Checking expiring subscriptions...');

  const portalUrl = process.env.PORTAL_URL || 'https://fiscaldrive.sbg.network';

  // Напоминания за 7, 3 и 1 день
  const reminderDays = [7, 3, 1];

  for (const days of reminderDays) {
    const result = await db.query(`
      SELECT 
        ns.id, 
        ns.shop_inn, 
        ns.expires_at,
        r.title,
        ARRAY_AGG(tc.telegram_chat_id) as chat_ids
      FROM notification_subscriptions ns
      JOIN telegram_connections tc ON tc.subscription_id = ns.id AND tc.is_active = true
      LEFT JOIN registrations r ON r.shop_inn = ns.shop_inn
      WHERE ns.status = 'active'
        AND ns.expires_at::date = (CURRENT_DATE + make_interval(days => $1))::date
      GROUP BY ns.id, ns.shop_inn, ns.expires_at, r.title
    `, [days]);

    for (const row of result.rows) {
      const expiryDate = new Date(row.expires_at).toLocaleDateString('ru-RU');
      const orgName = row.title || `ИНН ${row.shop_inn}`;

      let urgency = '';
      if (days === 1) urgency = '⚠️ СРОЧНО: ';
      else if (days === 3) urgency = '⚠️ ';

      const message = `
${urgency}Подписка истекает через ${days} дн.

      Организация: ${orgName}
Дата окончания: ${expiryDate}

Для продления обратитесь к администратору.
      Портал: ${portalUrl}/portal
      `.trim();

      // Отправить всем подключённым
      for (const chatId of row.chat_ids) {
        await sender.send(chatId, message);
      }

      logger.info(`Expiry reminder(${days}d): ${row.shop_inn}, sent to ${row.chat_ids.length} chats`);
    }
  }

  // Обработка истекших подписок
  const expiredResult = await db.query(`
    SELECT
    ns.id,
      ns.shop_inn,
      r.title,
      ARRAY_AGG(tc.telegram_chat_id) as chat_ids
    FROM notification_subscriptions ns
    JOIN telegram_connections tc ON tc.subscription_id = ns.id AND tc.is_active = true
    LEFT JOIN registrations r ON r.shop_inn = ns.shop_inn
    WHERE ns.status = 'active'
      AND ns.expires_at < NOW()
    GROUP BY ns.id, ns.shop_inn, r.title
      `);

  for (const row of expiredResult.rows) {
    // Изменить статус
    await db.query(`
      UPDATE notification_subscriptions
      SET status = 'expired'
      WHERE id = $1
      `, [row.id]);

    const orgName = row.title || `ИНН ${row.shop_inn} `;

    const message = `
❌ ПОДПИСКА ИСТЕКЛА

    Организация: ${orgName}
Уведомления приостановлены.

Для продления обратитесь к администратору.
    `.trim();

    // Отправить всем подключённым
    for (const chatId of row.chat_ids) {
      await sender.send(chatId, message);
    }

    logger.info(`Subscription expired: ${row.shop_inn} `);
  }

  logger.info('Expiring subscriptions check completed');
}

// Ежедневный отчёт (в 18:00)
cron.schedule('0 18 * * *', async () => {
  try {
    await sendDailyReports();
  } catch (error) {
    logger.error('Error sending daily reports:', error);
  }
});

async function sendDailyReports() {
  logger.info('Sending daily reports...');

  const portalUrl = process.env.PORTAL_URL || 'https://fiscaldrive.sbg.network';

  // Получить статистику за сегодня для каждой активной подписки
  const subsResult = await db.query(`
    SELECT
    ns.id,
      ns.shop_inn,
      r.title,
      ns.expires_at,
      ARRAY_AGG(DISTINCT tc.telegram_chat_id) as chat_ids
    FROM notification_subscriptions ns
    JOIN telegram_connections tc ON tc.subscription_id = ns.id AND tc.is_active = true
    LEFT JOIN registrations r ON r.shop_inn = ns.shop_inn
    WHERE ns.status = 'active' AND ns.expires_at > NOW()
    GROUP BY ns.id, ns.shop_inn, r.title, ns.expires_at
      `);

  for (const sub of subsResult.rows) {
    // Статистика за сегодня
    const todayStats = await db.query(`
    SELECT
    COUNT(*) as notifications,
      COALESCE(SUM(alerts_count), 0) as total_alerts
      FROM notification_history
      WHERE subscription_id = $1
        AND sent_at:: date = CURRENT_DATE
      `, [sub.id]);

    // Текущие проблемы
    const currentProblems = await db.query(`
      SELECT COUNT(*) as count
      FROM fiscal_last_state
      WHERE shop_inn = $1
        AND severity IN('DANGER', 'CRITICAL')
        AND is_registered = true
      `, [sub.shop_inn]);

    const notifications = parseInt(todayStats.rows[0].notifications) || 0;
    const alerts = parseInt(todayStats.rows[0].total_alerts) || 0;
    const problems = parseInt(currentProblems.rows[0].count) || 0;

    const orgName = sub.title || `ИНН ${sub.shop_inn} `;
    const daysLeft = Math.ceil((new Date(sub.expires_at) - new Date()) / (1000 * 60 * 60 * 24));

    let statusLine = '';
    if (problems === 0) {
      statusLine = '✅ Все терминалы работают нормально';
    } else {
      statusLine = `⚠️ Требуют внимания: ${problems} терминалов`;
    }

    const message = `
📊 ДНЕВНОЙ ОТЧЁТ

${orgName}
${new Date().toLocaleDateString('ru-RU')}

${statusLine}

За сегодня:
• Уведомлений: ${notifications}
• Алертов: ${alerts}

Подписка активна ещё ${daysLeft} дн.

      Подробнее: ${portalUrl}/portal
    `.trim();

    // Отправить всем подключённым
    for (const chatId of sub.chat_ids) {
      await sender.send(chatId, message);
    }

    logger.debug(`Daily report sent: ${sub.shop_inn} `);
  }

  logger.info(`Daily reports sent to ${subsResult.rows.length} subscriptions`);
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

  logger.info(`Cleanup completed: codes = ${codesResult.rows.length}, history = ${historyResult.rows.length}, queue = ${queueResult.rows.length}, cooldowns = ${cooldownResult.rows.length} `);
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
