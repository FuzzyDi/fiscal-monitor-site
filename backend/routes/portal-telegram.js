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
        np.notify_on_return
      FROM notification_subscriptions ns
      LEFT JOIN notification_preferences np ON np.subscription_id = ns.id
      WHERE ns.shop_inn = $1 AND ns.status = 'active'
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

    // Получить активное подключение
    const connResult = await db.query(`
      SELECT 
        id,
        telegram_chat_id,
        telegram_chat_type,
        telegram_chat_title,
        connected_at,
        last_notification_at
      FROM telegram_connections
      WHERE subscription_id = $1 AND is_active = true
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
      connection: connResult.rows[0] || null,
      preferences: {
        severity_filter: subscription.severity_filter,
        notify_on_recovery: subscription.notify_on_recovery,
        notify_on_stale: subscription.notify_on_stale,
        notify_on_return: subscription.notify_on_return
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

    // Проверить есть ли уже активное подключение
    const connResult = await db.query(`
      SELECT id FROM telegram_connections
      WHERE subscription_id = $1 AND is_active = true
    `, [subscriptionId]);

    if (connResult.rows.length > 0) {
      return res.status(400).json({ error: 'Telegram уже подключен. Сначала отключите.' });
    }

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

    // Генерировать новый код
    let code;
    let attempts = 0;
    while (attempts < 10) {
      code = generateCode();
      
      // Проверить уникальность
      const check = await db.query(`
        SELECT id FROM telegram_connect_codes WHERE code = $1
      `, [code]);
      
      if (check.rows.length === 0) break;
      attempts++;
    }

    if (attempts >= 10) {
      return res.status(500).json({ error: 'Не удалось сгенерировать уникальный код' });
    }

    // Сохранить код (TTL = 10 минут)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    await db.query(`
      INSERT INTO telegram_connect_codes 
        (subscription_id, code, expires_at)
      VALUES ($1, $2, $3)
    `, [subscriptionId, code, expiresAt]);

    logger.info(`Telegram connect code generated: ${shopInn}`);

    res.json({
      code,
      expires_in_seconds: 600,
      expires_at: expiresAt,
      bot_username: process.env.TELEGRAM_BOT_USERNAME || 'FiscalMonitorBot',
      instructions: `Напишите боту: /connect ${code}`
    });

  } catch (error) {
    logger.error('Error generating code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/portal/telegram/disconnect - Отключить Telegram
router.post('/disconnect', async (req, res) => {
  try {
    const shopInn = req.shopInn;

    // Получить подписку
    const subResult = await db.query(`
      SELECT id FROM notification_subscriptions
      WHERE shop_inn = $1 AND status = 'active'
    `, [shopInn]);

    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: 'Подписка не найдена' });
    }

    const subscriptionId = subResult.rows[0].id;

    // Деактивировать подключение
    const result = await db.query(`
      UPDATE telegram_connections
      SET is_active = false
      WHERE subscription_id = $1 AND is_active = true
      RETURNING id
    `, [subscriptionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Активное подключение не найдено' });
    }

    logger.info(`Telegram disconnected: ${shopInn}`);

    res.json({
      success: true,
      message: 'Telegram отключен'
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
      notify_on_return 
    } = req.body;

    // Валидация
    const validSeverities = ['INFO', 'WARN', 'DANGER', 'CRITICAL'];
    if (!Array.isArray(severity_filter) || 
        !severity_filter.every(s => validSeverities.includes(s))) {
      return res.status(400).json({ 
        error: 'Invalid severity_filter. Must be array of: INFO, WARN, DANGER, CRITICAL' 
      });
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

    // Обновить настройки
    await db.query(`
      UPDATE notification_preferences
      SET 
        severity_filter = $1,
        notify_on_recovery = $2,
        notify_on_stale = $3,
        notify_on_return = $4,
        updated_at = NOW()
      WHERE subscription_id = $5
    `, [
      severity_filter,
      notify_on_recovery !== undefined ? notify_on_recovery : true,
      notify_on_stale !== undefined ? notify_on_stale : true,
      notify_on_return !== undefined ? notify_on_return : true,
      subscriptionId
    ]);

    logger.info(`Telegram preferences updated: ${shopInn}`);

    res.json({
      success: true,
      preferences: {
        severity_filter,
        notify_on_recovery,
        notify_on_stale,
        notify_on_return
      }
    });

  } catch (error) {
    logger.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
