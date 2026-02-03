const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const logger = require('../utils/logger');

// Генерация 6-значного кода
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// GET /api/v1/portal/telegram/status - Получить статус подписки и подключения
router.get('/status', async (req, res) => {
  try {
    const shopInn = req.shopInn; // from portal-auth middleware

    // Получить подписку
    const subResult = await db.query(`
      SELECT 
        ns.*,
        np.severity_filter,
        np.notify_on_recovery,
        np.notify_on_stale,
        np.notify_on_return,
        np.quiet_hours_enabled,
        np.quiet_hours_start,
        np.quiet_hours_end
      FROM notification_subscriptions ns
      LEFT JOIN notification_preferences np ON np.subscription_id = ns.id
      WHERE ns.shop_inn = $1 AND ns.status = 'active' AND ns.expires_at > NOW()
    `, [shopInn]);

    if (subResult.rows.length === 0) {
      // Проверить есть ли pending запрос
      const requestResult = await db.query(`
        SELECT id, status, requested_at, client_comment
        FROM notification_subscription_requests
        WHERE shop_inn = $1 AND status = 'pending'
      `, [shopInn]);

      return res.json({
        subscription: null,
        request: requestResult.rows[0] || null,
        connection: null,
        preferences: null
      });
    }

    const subscription = subResult.rows[0];

    // Получить все активные подключения (может быть несколько)
    const connResult = await db.query(`
      SELECT 
        id,
        telegram_chat_id,
        telegram_chat_type,
        telegram_chat_title,
        telegram_username,
        connected_at,
        last_notification_at
      FROM telegram_connections
      WHERE subscription_id = $1 AND is_active = true
      ORDER BY connected_at ASC
    `, [subscription.id]);

    // Получить активный код (если есть)
    const codeResult = await db.query(`
      SELECT code, expires_at, used
      FROM telegram_connect_codes
      WHERE subscription_id = $1 
        AND used = false 
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `, [subscription.id]);

    res.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        started_at: subscription.started_at,
        expires_at: subscription.expires_at
      },
      // Для обратной совместимости оставляем connection (первое), добавляем connections (все)
      connection: connResult.rows[0] || null,
      connections: connResult.rows,
      preferences: {
        severity_filter: subscription.severity_filter || ['DANGER', 'CRITICAL'],
        notify_on_recovery: subscription.notify_on_recovery !== null ? subscription.notify_on_recovery : true,
        notify_on_stale: subscription.notify_on_stale !== null ? subscription.notify_on_stale : true,
        notify_on_return: subscription.notify_on_return !== null ? subscription.notify_on_return : true,
        quiet_hours_enabled: subscription.quiet_hours_enabled || false,
        quiet_hours_start: subscription.quiet_hours_start || '23:00',
        quiet_hours_end: subscription.quiet_hours_end || '08:00'
      },
      active_code: codeResult.rows[0] || null
    });

  } catch (error) {
    logger.error('Error getting telegram status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/portal/telegram/request-subscription - Запросить активацию подписки
router.post('/request-subscription', async (req, res) => {
  try {
    const shopInn = req.shopInn;
    const { comment } = req.body;

    // Проверить нет ли уже активной подписки
    const existingSub = await db.query(`
      SELECT id FROM notification_subscriptions
      WHERE shop_inn = $1 AND status = 'active'
    `, [shopInn]);

    if (existingSub.rows.length > 0) {
      return res.status(400).json({ error: 'У вас уже есть активная подписка' });
    }

    // Проверить нет ли pending запроса
    const existingRequest = await db.query(`
      SELECT id FROM notification_subscription_requests
      WHERE shop_inn = $1 AND status = 'pending'
    `, [shopInn]);

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ error: 'Ваш запрос уже обрабатывается' });
    }

    // Создать запрос
    const result = await db.query(`
      INSERT INTO notification_subscription_requests 
        (shop_inn, client_comment)
      VALUES ($1, $2)
      RETURNING id, requested_at
    `, [shopInn, comment || null]);

    logger.info(`Subscription request created: ${shopInn}`);

    res.json({
      success: true,
      request_id: result.rows[0].id,
      requested_at: result.rows[0].requested_at,
      message: 'Запрос отправлен администратору'
    });

  } catch (error) {
    logger.error('Error creating subscription request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/portal/telegram/cancel-request - Отменить запрос
router.delete('/cancel-request', async (req, res) => {
  try {
    const shopInn = req.shopInn;

    const result = await db.query(`
      DELETE FROM notification_subscription_requests
      WHERE shop_inn = $1 AND status = 'pending'
      RETURNING id
    `, [shopInn]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Запрос не найден' });
    }

    logger.info(`Subscription request cancelled: ${shopInn}`);

    res.json({
      success: true,
      message: 'Запрос отменен'
    });

  } catch (error) {
    logger.error('Error cancelling request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/portal/telegram/generate-code - Сгенерировать код подключения
router.post('/generate-code', async (req, res) => {
  try {
    const shopInn = req.shopInn;

    // Получить активную подписку
    const subResult = await db.query(`
      SELECT id FROM notification_subscriptions
      WHERE shop_inn = $1 AND status = 'active' AND expires_at > NOW()
    `, [shopInn]);

    if (subResult.rows.length === 0) {
      return res.status(403).json({ error: 'Нет активной подписки' });
    }

    const subscriptionId = subResult.rows[0].id;

    // Проверить есть ли активный неиспользованный код
    const existingCode = await db.query(`
      SELECT code, expires_at FROM telegram_connect_codes
      WHERE subscription_id = $1 AND used = false AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `, [subscriptionId]);

    if (existingCode.rows.length > 0) {
      // Вернуть существующий код
      const code = existingCode.rows[0];
      const expiresIn = Math.floor((new Date(code.expires_at) - new Date()) / 1000);
      
      return res.json({
        code: code.code,
        expires_in_seconds: expiresIn,
        expires_at: code.expires_at,
        bot_username: process.env.TELEGRAM_BOT_USERNAME || 'FiscalMonitorBot',
        instructions: `Напишите боту: /connect ${code.code}`
      });
    }

    // Генерировать новый код с атомарной проверкой уникальности
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    let code;
    let inserted = false;
    let attempts = 0;
    
    while (!inserted && attempts < 10) {
      code = generateCode();
      attempts++;
      
      try {
        // Атомарная вставка - если код уже существует, constraint сработает
        await db.query(`
          INSERT INTO telegram_connect_codes 
            (subscription_id, code, expires_at)
          VALUES ($1, $2, $3)
        `, [subscriptionId, code, expiresAt]);
        inserted = true;
      } catch (err) {
        // Unique violation - попробуем другой код
        if (err.code === '23505') {
          continue;
        }
        throw err;
      }
    }

    if (!inserted) {
      return res.status(500).json({ error: 'Не удалось сгенерировать уникальный код' });
    }

    // Получить количество текущих подключений
    const connCount = await db.query(`
      SELECT COUNT(*) as cnt FROM telegram_connections
      WHERE subscription_id = $1 AND is_active = true
    `, [subscriptionId]);
    
    const currentConnections = parseInt(connCount.rows[0].cnt) || 0;

    logger.info(`Telegram connect code generated: ${shopInn}, current connections: ${currentConnections}`);

    res.json({
      code,
      expires_in_seconds: 600,
      expires_at: expiresAt,
      bot_username: process.env.TELEGRAM_BOT_USERNAME || 'FiscalMonitorBot',
      instructions: `Напишите боту: /connect ${code}`,
      current_connections: currentConnections
    });

  } catch (error) {
    logger.error('Error generating code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/portal/telegram/disconnect - Отключить Telegram
// Body: { connection_id?: number } - если указан, отключает конкретное подключение
router.post('/disconnect', async (req, res) => {
  try {
    const shopInn = req.shopInn;
    const { connection_id } = req.body;

    // Получить подписку
    const subResult = await db.query(`
      SELECT id FROM notification_subscriptions
      WHERE shop_inn = $1 AND status = 'active'
    `, [shopInn]);

    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: 'Подписка не найдена' });
    }

    const subscriptionId = subResult.rows[0].id;

    let result;
    if (connection_id) {
      // Отключить конкретное подключение
      result = await db.query(`
        UPDATE telegram_connections
        SET is_active = false
        WHERE id = $1 AND subscription_id = $2 AND is_active = true
        RETURNING id, telegram_chat_title, telegram_username
      `, [connection_id, subscriptionId]);
    } else {
      // Отключить все подключения (backward compatibility)
      result = await db.query(`
        UPDATE telegram_connections
        SET is_active = false
        WHERE subscription_id = $1 AND is_active = true
        RETURNING id
      `, [subscriptionId]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Активное подключение не найдено' });
    }

    const disconnectedCount = result.rows.length;
    logger.info(`Telegram disconnected: ${shopInn}, count: ${disconnectedCount}`);

    res.json({
      success: true,
      message: connection_id 
        ? `Telegram ${result.rows[0].telegram_username || result.rows[0].telegram_chat_title || ''} отключен`
        : `Отключено подключений: ${disconnectedCount}`,
      disconnected_count: disconnectedCount
    });

  } catch (error) {
    logger.error('Error disconnecting telegram:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/v1/portal/telegram/preferences - Обновить настройки
router.put('/preferences', async (req, res) => {
  try {
    const shopInn = req.shopInn;
    const { 
      severity_filter, 
      notify_on_recovery, 
      notify_on_stale, 
      notify_on_return,
      quiet_hours_enabled,
      quiet_hours_start,
      quiet_hours_end
    } = req.body;

    // Валидация
    const validSeverities = ['INFO', 'WARN', 'DANGER', 'CRITICAL'];
    if (!Array.isArray(severity_filter) || 
        !severity_filter.every(s => validSeverities.includes(s))) {
      return res.status(400).json({ 
        error: 'Invalid severity_filter. Must be array of: INFO, WARN, DANGER, CRITICAL' 
      });
    }

    // Валидация времени тихих часов (принимаем любой формат HH:MM или HH:MM:SS)
    let qhStart = quiet_hours_start || '23:00';
    let qhEnd = quiet_hours_end || '08:00';
    
    // Обрезать секунды если есть (23:00:00 -> 23:00)
    if (qhStart && qhStart.length > 5) qhStart = qhStart.substring(0, 5);
    if (qhEnd && qhEnd.length > 5) qhEnd = qhEnd.substring(0, 5);
    
    // Простая проверка формата
    const isValidTime = (t) => /^\d{1,2}:\d{2}$/.test(t);
    
    if (quiet_hours_enabled && (!isValidTime(qhStart) || !isValidTime(qhEnd))) {
      logger.warn(`Invalid quiet hours format: start=${quiet_hours_start}, end=${quiet_hours_end}, parsed: ${qhStart}, ${qhEnd}`);
      // Используем значения по умолчанию вместо ошибки
      qhStart = '23:00';
      qhEnd = '08:00';
    }

    // Получить подписку
    const subResult = await db.query(`
      SELECT id FROM notification_subscriptions
      WHERE shop_inn = $1 AND status = 'active'
    `, [shopInn]);

    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: 'Подписка не найдена' });
    }

    const subscriptionId = subResult.rows[0].id;

    // Обновить или создать настройки (UPSERT)
    await db.query(`
      INSERT INTO notification_preferences 
        (subscription_id, severity_filter, notify_on_recovery, notify_on_stale, notify_on_return,
         quiet_hours_enabled, quiet_hours_start, quiet_hours_end)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (subscription_id) 
      DO UPDATE SET
        severity_filter = EXCLUDED.severity_filter,
        notify_on_recovery = EXCLUDED.notify_on_recovery,
        notify_on_stale = EXCLUDED.notify_on_stale,
        notify_on_return = EXCLUDED.notify_on_return,
        quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
        quiet_hours_start = EXCLUDED.quiet_hours_start,
        quiet_hours_end = EXCLUDED.quiet_hours_end,
        updated_at = NOW()
    `, [
      subscriptionId,
      severity_filter,
      notify_on_recovery !== undefined ? notify_on_recovery : true,
      notify_on_stale !== undefined ? notify_on_stale : true,
      notify_on_return !== undefined ? notify_on_return : true,
      quiet_hours_enabled || false,
      qhStart,
      qhEnd
    ]);

    logger.info(`Telegram preferences updated: ${shopInn}`);

    res.json({
      success: true,
      preferences: {
        severity_filter,
        notify_on_recovery,
        notify_on_stale,
        notify_on_return,
        quiet_hours_enabled,
        quiet_hours_start: qhStart,
        quiet_hours_end: qhEnd
      }
    });

  } catch (error) {
    logger.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/portal/telegram/test - Отправить тестовое уведомление
router.post('/test', async (req, res) => {
  try {
    const shopInn = req.shopInn;

    // Получить подписку
    const subResult = await db.query(`
      SELECT ns.id, r.title
      FROM notification_subscriptions ns
      JOIN registrations r ON r.shop_inn = ns.shop_inn
      WHERE ns.shop_inn = $1 AND ns.status = 'active' AND ns.expires_at > NOW()
    `, [shopInn]);

    if (subResult.rows.length === 0) {
      return res.status(403).json({ error: 'Нет активной подписки' });
    }

    const subscription = subResult.rows[0];

    // Получить все активные подключения
    const connResult = await db.query(`
      SELECT id, telegram_chat_id, telegram_username, telegram_chat_title
      FROM telegram_connections
      WHERE subscription_id = $1 AND is_active = true
    `, [subscription.id]);

    if (connResult.rows.length === 0) {
      return res.status(400).json({ error: 'Нет активных Telegram подключений' });
    }

    // Динамический импорт telegram-sender
    const { sender } = require('../utils/telegram-sender');
    
    const portalUrl = process.env.PORTAL_URL || 'https://fiscaldrive.sbg.network';
    const testMessage = `
✅ ТЕСТОВОЕ УВЕДОМЛЕНИЕ

Организация: ${subscription.title}
ИНН: ${shopInn}
Время: ${new Date().toLocaleString('ru-RU')}

Это тестовое сообщение для проверки работы уведомлений.
Если вы его видите — всё работает!

Портал: ${portalUrl}/portal
    `.trim();

    let sentCount = 0;
    const errors = [];

    for (const conn of connResult.rows) {
      const result = await sender.send(conn.telegram_chat_id, testMessage);
      if (result.success) {
        sentCount++;
      } else {
        errors.push(conn.telegram_username || conn.telegram_chat_title || conn.telegram_chat_id);
      }
    }

    logger.info(`Test notification sent: ${shopInn}, success: ${sentCount}/${connResult.rows.length}`);

    res.json({
      success: true,
      sent_count: sentCount,
      total_connections: connResult.rows.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    logger.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/portal/telegram/history - История уведомлений
router.get('/history', async (req, res) => {
  try {
    const shopInn = req.shopInn;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    // Получить подписку
    const subResult = await db.query(`
      SELECT id FROM notification_subscriptions
      WHERE shop_inn = $1 AND status = 'active'
    `, [shopInn]);

    if (subResult.rows.length === 0) {
      return res.status(403).json({ error: 'Нет активной подписки' });
    }

    const subscriptionId = subResult.rows[0].id;

    // Получить историю
    const historyResult = await db.query(`
      SELECT 
        nh.id,
        nh.message_text,
        nh.alerts_count,
        nh.delivered,
        nh.sent_at,
        tc.telegram_username,
        tc.telegram_chat_title,
        tc.telegram_chat_type
      FROM notification_history nh
      LEFT JOIN telegram_connections tc ON tc.id = nh.connection_id
      WHERE nh.subscription_id = $1
      ORDER BY nh.sent_at DESC
      LIMIT $2 OFFSET $3
    `, [subscriptionId, limit, offset]);

    // Получить общее количество
    const countResult = await db.query(`
      SELECT COUNT(*) as total
      FROM notification_history
      WHERE subscription_id = $1
    `, [subscriptionId]);

    res.json({
      history: historyResult.rows.map(h => ({
        id: h.id,
        message: h.message_text,
        alerts_count: h.alerts_count,
        delivered: h.delivered,
        sent_at: h.sent_at,
        recipient: h.telegram_chat_type === 'private' 
          ? (h.telegram_username ? `@${h.telegram_username}` : 'Личный чат')
          : (h.telegram_chat_title || 'Группа')
      })),
      total: parseInt(countResult.rows[0].total),
      limit,
      offset
    });

  } catch (error) {
    logger.error('Error fetching history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
