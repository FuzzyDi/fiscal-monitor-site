const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const logger = require('../utils/logger');
const ExcelJS = require('exceljs');

// GET /api/v1/admin/telegram/requests - Получить список запросов
router.get('/requests', async (req, res) => {
  try {
    const { status } = req.query; // 'pending', 'approved', 'rejected', 'all'

    let query = `
      SELECT 
        nsr.id,
        nsr.shop_inn,
        nsr.status,
        nsr.requested_at,
        nsr.client_comment,
        nsr.reviewed_by,
        nsr.reviewed_at,
        nsr.admin_comment,
        nsr.subscription_id,
        r.title as company_name,
        (SELECT COUNT(*) FROM fiscal_last_state WHERE shop_inn = nsr.shop_inn) as terminals_count
      FROM notification_subscription_requests nsr
      JOIN registrations r ON r.shop_inn = nsr.shop_inn
    `;

    const params = [];
    if (status && status !== 'all') {
      query += ` WHERE nsr.status = $1`;
      params.push(status);
    }

    query += ` ORDER BY nsr.requested_at DESC`;

    const result = await db.query(query, params);

    res.json({
      requests: result.rows
    });

  } catch (error) {
    logger.error('Error getting requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/admin/telegram/approve-request/:requestId - Одобрить запрос
router.post('/approve-request/:requestId', async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const { requestId } = req.params;
    const { duration_months, admin_comment } = req.body;
    const adminKey = req.get('X-Admin-Key');

    if (!duration_months || duration_months <= 0) {
      return res.status(400).json({ error: 'Invalid duration_months' });
    }

    await client.query('BEGIN');

    // Получить запрос
    const requestResult = await client.query(`
      SELECT shop_inn, status FROM notification_subscription_requests
      WHERE id = $1
    `, [requestId]);

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Запрос не найден' });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Запрос уже обработан' });
    }

    // Проверить нет ли активной подписки
    const existingSub = await client.query(`
      SELECT id FROM notification_subscriptions
      WHERE shop_inn = $1 AND status = 'active'
    `, [request.shop_inn]);

    if (existingSub.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'У клиента уже есть активная подписка' });
    }

    // Создать подписку
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + parseFloat(duration_months));

    const subResult = await client.query(`
      INSERT INTO notification_subscriptions 
        (shop_inn, expires_at, approved_by, approved_at, payment_note)
      VALUES ($1, $2, $3, NOW(), $4)
      RETURNING id, started_at, expires_at
    `, [request.shop_inn, expiresAt, adminKey, admin_comment || null]);

    const subscription = subResult.rows[0];

    // Обновить запрос
    await client.query(`
      UPDATE notification_subscription_requests
      SET 
        status = 'approved',
        reviewed_by = $1,
        reviewed_at = NOW(),
        admin_comment = $2,
        subscription_id = $3
      WHERE id = $4
    `, [adminKey, admin_comment || null, subscription.id, requestId]);

    await client.query('COMMIT');

    logger.info(`Subscription approved: ${request.shop_inn} by ${adminKey}`);

    res.json({
      success: true,
      subscription_id: subscription.id,
      started_at: subscription.started_at,
      expires_at: subscription.expires_at,
      message: 'Подписка активирована'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error approving request:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// POST /api/v1/admin/telegram/reject-request/:requestId - Отклонить запрос
router.post('/reject-request/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { admin_comment } = req.body;
    const adminKey = req.get('X-Admin-Key');

    const result = await db.query(`
      UPDATE notification_subscription_requests
      SET 
        status = 'rejected',
        reviewed_by = $1,
        reviewed_at = NOW(),
        admin_comment = $2
      WHERE id = $3 AND status = 'pending'
      RETURNING shop_inn
    `, [adminKey, admin_comment || null, requestId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Запрос не найден или уже обработан' });
    }

    logger.info(`Subscription request rejected: ${result.rows[0].shop_inn} by ${adminKey}`);

    res.json({
      success: true,
      message: 'Запрос отклонен'
    });

  } catch (error) {
    logger.error('Error rejecting request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/admin/telegram/subscriptions - Список активных подписок
router.get('/subscriptions', async (req, res) => {
  try {
    const { status } = req.query; // 'active', 'expired', 'cancelled', 'all'

    let query = `
      SELECT 
        ns.id,
        ns.shop_inn,
        ns.status,
        ns.started_at,
        ns.expires_at,
        ns.approved_by,
        ns.approved_at,
        ns.payment_note,
        r.title as company_name,
        tc.telegram_chat_id IS NOT NULL as telegram_connected,
        tc.telegram_chat_type,
        tc.telegram_chat_title,
        tc.connected_at,
        (SELECT COUNT(*) 
         FROM notification_history 
         WHERE subscription_id = ns.id) as notifications_sent
      FROM notification_subscriptions ns
      JOIN registrations r ON r.shop_inn = ns.shop_inn
      LEFT JOIN telegram_connections tc ON tc.subscription_id = ns.id AND tc.is_active = true
    `;

    const params = [];
    if (status && status !== 'all') {
      query += ` WHERE ns.status = $1`;
      params.push(status);
    }

    query += ` ORDER BY ns.created_at DESC`;

    const result = await db.query(query, params);

    res.json({
      subscriptions: result.rows
    });

  } catch (error) {
    logger.error('Error getting subscriptions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/admin/telegram/extend-subscription/:subscriptionId - Продлить подписку
router.post('/extend-subscription/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { duration_months, payment_note } = req.body;

    if (!duration_months || duration_months <= 0) {
      return res.status(400).json({ error: 'Invalid duration_months' });
    }

    // Получить текущую подписку
    const subResult = await db.query(`
      SELECT expires_at, status FROM notification_subscriptions
      WHERE id = $1
    `, [subscriptionId]);

    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: 'Подписка не найдена' });
    }

    const currentExpiry = new Date(subResult.rows[0].expires_at);
    const now = new Date();

    // Продлить от текущей даты истечения или от сейчас (если уже истекла)
    const baseDate = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseDate);
    newExpiry.setMonth(newExpiry.getMonth() + parseFloat(duration_months));

    // Обновить подписку
    const result = await db.query(`
      UPDATE notification_subscriptions
      SET 
        expires_at = $1,
        status = 'active',
        payment_note = COALESCE($2, payment_note),
        updated_at = NOW()
      WHERE id = $3
      RETURNING expires_at
    `, [newExpiry, payment_note, subscriptionId]);

    logger.info(`Subscription extended: ID ${subscriptionId}`);

    res.json({
      success: true,
      new_expires_at: result.rows[0].expires_at,
      message: 'Подписка продлена'
    });

  } catch (error) {
    logger.error('Error extending subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/admin/telegram/cancel-subscription/:subscriptionId - Отменить подписку
router.post('/cancel-subscription/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;

    const result = await db.query(`
      UPDATE notification_subscriptions
      SET 
        status = 'cancelled',
        payment_note = COALESCE(payment_note || ' | Отменена: ' || $1, 'Отменена: ' || $1),
        updated_at = NOW()
      WHERE id = $2 AND status = 'active'
      RETURNING shop_inn
    `, [reason || 'Не указана', subscriptionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Подписка не найдена или уже отменена' });
    }

    logger.info(`Subscription cancelled: ID ${subscriptionId}`);

    res.json({
      success: true,
      message: 'Подписка отменена'
    });

  } catch (error) {
    logger.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/admin/telegram/statistics - Общая статистика
router.get('/statistics', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM notification_subscriptions WHERE status = 'active') as active_subscriptions,
        (SELECT COUNT(*) FROM notification_subscriptions WHERE status = 'expired') as expired_subscriptions,
        (SELECT COUNT(*) FROM notification_subscription_requests WHERE status = 'pending') as pending_requests,
        (SELECT COUNT(*) FROM telegram_connections WHERE is_active = true) as active_connections,
        (SELECT COUNT(*) FROM telegram_connections WHERE is_active = true AND telegram_chat_type = 'group') as group_connections,
        (SELECT COUNT(*) FROM telegram_connections WHERE is_active = true AND telegram_chat_type = 'private') as private_connections,
        (SELECT COUNT(*) FROM notification_history WHERE sent_at > NOW() - INTERVAL '24 hours') as notifications_24h,
        (SELECT COUNT(*) FROM notification_history WHERE sent_at > NOW() - INTERVAL '7 days') as notifications_7d,
        (SELECT COUNT(*) FROM notification_history WHERE delivered = false AND sent_at > NOW() - INTERVAL '24 hours') as failed_24h
    `);

    // Подписки истекающие в течение недели
    const expiringResult = await db.query(`
      SELECT 
        ns.id,
        ns.shop_inn,
        r.title as company_name,
        ns.expires_at
      FROM notification_subscriptions ns
      JOIN registrations r ON r.shop_inn = ns.shop_inn
      WHERE ns.status = 'active' 
        AND ns.expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
      ORDER BY ns.expires_at ASC
    `);

    res.json({
      statistics: stats.rows[0],
      expiring_soon: expiringResult.rows
    });

  } catch (error) {
    logger.error('Error getting statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/admin/telegram/export - Экспорт в Excel
router.get('/export', async (req, res) => {
  try {
    const { type } = req.query; // 'subscriptions', 'history', 'requests'

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Fiscal Monitor';
    workbook.created = new Date();

    if (type === 'subscriptions' || !type) {
      // Экспорт подписок
      const subsResult = await db.query(`
        SELECT 
          ns.id,
          ns.shop_inn,
          r.title as company_name,
          ns.status,
          ns.started_at,
          ns.expires_at,
          ns.approved_by,
          ns.payment_note,
          tc.telegram_chat_type,
          tc.telegram_chat_title,
          tc.connected_at,
          (SELECT COUNT(*) FROM notification_history WHERE subscription_id = ns.id) as notifications_sent
        FROM notification_subscriptions ns
        JOIN registrations r ON r.shop_inn = ns.shop_inn
        LEFT JOIN telegram_connections tc ON tc.subscription_id = ns.id AND tc.is_active = true
        ORDER BY ns.created_at DESC
      `);

      const sheet = workbook.addWorksheet('Подписки');
      
      sheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'ИНН', key: 'shop_inn', width: 15 },
        { header: 'Компания', key: 'company_name', width: 30 },
        { header: 'Статус', key: 'status', width: 12 },
        { header: 'Начало', key: 'started_at', width: 20 },
        { header: 'Окончание', key: 'expires_at', width: 20 },
        { header: 'Одобрил', key: 'approved_by', width: 20 },
        { header: 'Примечание', key: 'payment_note', width: 30 },
        { header: 'Telegram', key: 'telegram_chat_type', width: 15 },
        { header: 'Название чата', key: 'telegram_chat_title', width: 25 },
        { header: 'Подключен', key: 'connected_at', width: 20 },
        { header: 'Отправлено', key: 'notifications_sent', width: 12 }
      ];

      subsResult.rows.forEach(row => {
        sheet.addRow({
          id: row.id,
          shop_inn: row.shop_inn,
          company_name: row.company_name,
          status: row.status,
          started_at: row.started_at,
          expires_at: row.expires_at,
          approved_by: row.approved_by,
          payment_note: row.payment_note,
          telegram_chat_type: row.telegram_chat_type || 'Не подключен',
          telegram_chat_title: row.telegram_chat_title,
          connected_at: row.connected_at,
          notifications_sent: row.notifications_sent
        });
      });

      // Стиль заголовков
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
    }

    if (type === 'history') {
      // Экспорт истории уведомлений
      const historyResult = await db.query(`
        SELECT 
          nh.id,
          nh.sent_at,
          ns.shop_inn,
          r.title as company_name,
          nh.alerts_count,
          nh.delivered,
          nh.error_message,
          tc.telegram_chat_type,
          tc.telegram_chat_title
        FROM notification_history nh
        JOIN notification_subscriptions ns ON ns.id = nh.subscription_id
        JOIN registrations r ON r.shop_inn = ns.shop_inn
        LEFT JOIN telegram_connections tc ON tc.id = nh.connection_id
        WHERE nh.sent_at > NOW() - INTERVAL '30 days'
        ORDER BY nh.sent_at DESC
        LIMIT 10000
      `);

      const sheet = workbook.addWorksheet('История уведомлений');
      
      sheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Дата/Время', key: 'sent_at', width: 20 },
        { header: 'ИНН', key: 'shop_inn', width: 15 },
        { header: 'Компания', key: 'company_name', width: 30 },
        { header: 'Алертов', key: 'alerts_count', width: 10 },
        { header: 'Доставлено', key: 'delivered', width: 12 },
        { header: 'Ошибка', key: 'error_message', width: 30 },
        { header: 'Тип чата', key: 'telegram_chat_type', width: 15 },
        { header: 'Чат', key: 'telegram_chat_title', width: 25 }
      ];

      historyResult.rows.forEach(row => {
        sheet.addRow({
          id: row.id,
          sent_at: row.sent_at,
          shop_inn: row.shop_inn,
          company_name: row.company_name,
          alerts_count: row.alerts_count,
          delivered: row.delivered ? 'Да' : 'Нет',
          error_message: row.error_message,
          telegram_chat_type: row.telegram_chat_type,
          telegram_chat_title: row.telegram_chat_title
        });
      });

      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
    }

    if (type === 'requests') {
      // Экспорт запросов
      const requestsResult = await db.query(`
        SELECT 
          nsr.id,
          nsr.shop_inn,
          r.title as company_name,
          nsr.status,
          nsr.requested_at,
          nsr.client_comment,
          nsr.reviewed_by,
          nsr.reviewed_at,
          nsr.admin_comment
        FROM notification_subscription_requests nsr
        JOIN registrations r ON r.shop_inn = nsr.shop_inn
        ORDER BY nsr.requested_at DESC
      `);

      const sheet = workbook.addWorksheet('Запросы');
      
      sheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'ИНН', key: 'shop_inn', width: 15 },
        { header: 'Компания', key: 'company_name', width: 30 },
        { header: 'Статус', key: 'status', width: 12 },
        { header: 'Запрошено', key: 'requested_at', width: 20 },
        { header: 'Комментарий клиента', key: 'client_comment', width: 30 },
        { header: 'Проверил', key: 'reviewed_by', width: 20 },
        { header: 'Дата проверки', key: 'reviewed_at', width: 20 },
        { header: 'Комментарий админа', key: 'admin_comment', width: 30 }
      ];

      requestsResult.rows.forEach(row => {
        sheet.addRow(row);
      });

      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
    }

    // Установить HTTP заголовки
    const filename = `telegram_${type || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Записать в response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    logger.error('Error exporting to Excel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
