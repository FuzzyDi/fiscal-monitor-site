const request = require('supertest');
const app = require('../server');
const db = require('../utils/db');

describe('Telegram Notifications API', () => {
  const testInn = 'TEST1234567890';
  const testAdminKey = process.env.ADMIN_API_KEY || 'test-admin-key';
  let testToken = null;
  let testSubscriptionId = null;

  beforeAll(async () => {
    // Создать тестовую регистрацию
    await db.query(`
      INSERT INTO registrations (shop_inn, title, is_active)
      VALUES ($1, 'Test Company', true)
      ON CONFLICT (shop_inn) DO NOTHING
    `, [testInn]);

    // Создать токен доступа
    await db.query(`
      INSERT INTO access_tokens (token, shop_inn, label)
      VALUES ('test-token-123', $1, 'Test Token')
      ON CONFLICT (token) DO NOTHING
    `, [testInn]);

    testToken = 'test-token-123';
  });

  afterAll(async () => {
    // Очистка тестовых данных
    await db.query(`DELETE FROM access_tokens WHERE shop_inn = $1`, [testInn]);
    await db.query(`DELETE FROM registrations WHERE shop_inn = $1`, [testInn]);
    await db.pool.end();
  });

  describe('Client API - Subscription Requests', () => {
    test('POST /api/v1/portal/telegram/request-subscription - should create request', async () => {
      const response = await request(app)
        .post('/api/v1/portal/telegram/request-subscription')
        .set('X-Token', testToken)
        .send({ comment: 'Test request' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.request_id).toBeDefined();
    });

    test('POST /api/v1/portal/telegram/request-subscription - should not allow duplicate request', async () => {
      const response = await request(app)
        .post('/api/v1/portal/telegram/request-subscription')
        .set('X-Token', testToken)
        .send({ comment: 'Duplicate request' })
        .expect(400);

      expect(response.body.error).toContain('обрабатывается');
    });

    test('GET /api/v1/portal/telegram/status - should return pending request', async () => {
      const response = await request(app)
        .get('/api/v1/portal/telegram/status')
        .set('X-Token', testToken)
        .expect(200);

      expect(response.body.subscription).toBeNull();
      expect(response.body.request).toBeDefined();
      expect(response.body.request.status).toBe('pending');
    });
  });

  describe('Admin API - Approve Request', () => {
    test('GET /api/v1/admin/telegram/requests - should list requests', async () => {
      const response = await request(app)
        .get('/api/v1/admin/telegram/requests?status=pending')
        .set('X-Admin-Key', testAdminKey)
        .expect(200);

      expect(response.body.requests).toBeDefined();
      expect(Array.isArray(response.body.requests)).toBe(true);
    });

    test('POST /api/v1/admin/telegram/approve-request - should approve request', async () => {
      // Получить ID запроса
      const requestsResult = await db.query(`
        SELECT id FROM notification_subscription_requests
        WHERE shop_inn = $1 AND status = 'pending'
      `, [testInn]);

      const requestId = requestsResult.rows[0].id;

      const response = await request(app)
        .post(`/api/v1/admin/telegram/approve-request/${requestId}`)
        .set('X-Admin-Key', testAdminKey)
        .send({
          duration_months: 1,
          admin_comment: 'Test approval'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.subscription_id).toBeDefined();
      
      testSubscriptionId = response.body.subscription_id;
    });
  });

  describe('Client API - After Approval', () => {
    test('GET /api/v1/portal/telegram/status - should show active subscription', async () => {
      const response = await request(app)
        .get('/api/v1/portal/telegram/status')
        .set('X-Token', testToken)
        .expect(200);

      expect(response.body.subscription).toBeDefined();
      expect(response.body.subscription.status).toBe('active');
      expect(response.body.preferences).toBeDefined();
    });

    test('POST /api/v1/portal/telegram/generate-code - should generate connect code', async () => {
      const response = await request(app)
        .post('/api/v1/portal/telegram/generate-code')
        .set('X-Token', testToken)
        .expect(200);

      expect(response.body.code).toBeDefined();
      expect(response.body.code).toHaveLength(6);
      expect(response.body.expires_in_seconds).toBe(600);
    });

    test('PUT /api/v1/portal/telegram/preferences - should update preferences', async () => {
      const response = await request(app)
        .put('/api/v1/portal/telegram/preferences')
        .set('X-Token', testToken)
        .send({
          severity_filter: ['CRITICAL'],
          notify_on_recovery: false,
          notify_on_stale: true,
          notify_on_return: false
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.preferences.severity_filter).toEqual(['CRITICAL']);
    });
  });

  describe('Admin API - Subscriptions Management', () => {
    test('GET /api/v1/admin/telegram/subscriptions - should list subscriptions', async () => {
      const response = await request(app)
        .get('/api/v1/admin/telegram/subscriptions?status=active')
        .set('X-Admin-Key', testAdminKey)
        .expect(200);

      expect(response.body.subscriptions).toBeDefined();
      expect(response.body.subscriptions.length).toBeGreaterThan(0);
    });

    test('POST /api/v1/admin/telegram/extend-subscription - should extend subscription', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/telegram/extend-subscription/${testSubscriptionId}`)
        .set('X-Admin-Key', testAdminKey)
        .send({
          duration_months: 1,
          payment_note: 'Test extension'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.new_expires_at).toBeDefined();
    });

    test('GET /api/v1/admin/telegram/statistics - should return statistics', async () => {
      const response = await request(app)
        .get('/api/v1/admin/telegram/statistics')
        .set('X-Admin-Key', testAdminKey)
        .expect(200);

      expect(response.body.statistics).toBeDefined();
      expect(response.body.statistics.active_subscriptions).toBeDefined();
    });

    test('GET /api/v1/admin/telegram/export - should export to Excel', async () => {
      const response = await request(app)
        .get('/api/v1/admin/telegram/export?type=subscriptions')
        .set('X-Admin-Key', testAdminKey)
        .expect(200);

      expect(response.headers['content-type']).toContain('spreadsheet');
    });
  });

  describe('Security Tests', () => {
    test('Should reject request without token', async () => {
      await request(app)
        .get('/api/v1/portal/telegram/status')
        .expect(401);
    });

    test('Should reject request with invalid token', async () => {
      await request(app)
        .get('/api/v1/portal/telegram/status')
        .set('X-Token', 'invalid-token')
        .expect(401);
    });

    test('Should reject admin endpoint without admin key', async () => {
      await request(app)
        .get('/api/v1/admin/telegram/requests')
        .expect(401);
    });

    test('Should reject invalid severity filter', async () => {
      const response = await request(app)
        .put('/api/v1/portal/telegram/preferences')
        .set('X-Token', testToken)
        .send({
          severity_filter: ['INVALID', 'SEVERITY']
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid severity_filter');
    });
  });
});

describe('Telegram Bot Integration Tests', () => {
  test('Connect code validation', async () => {
    // Создать код
    const code = '123456';
    const testSubId = 1;

    await db.query(`
      INSERT INTO telegram_connect_codes
        (subscription_id, code, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '10 minutes')
    `, [testSubId, code]);

    // Проверить что код существует
    const result = await db.query(`
      SELECT * FROM telegram_connect_codes
      WHERE code = $1 AND used = false AND expires_at > NOW()
    `, [code]);

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].code).toBe(code);

    // Очистка
    await db.query(`DELETE FROM telegram_connect_codes WHERE code = $1`, [code]);
  });

  test('Cooldown mechanism', async () => {
    const testSubId = 1;
    const stateKey = 'TEST123:1:1';

    // Создать cooldown
    await db.query(`
      INSERT INTO notification_cooldowns
        (subscription_id, state_key, last_notified_at, last_severity)
      VALUES ($1, $2, NOW(), 'CRITICAL')
      ON CONFLICT (subscription_id, state_key) 
      DO UPDATE SET last_notified_at = NOW()
    `, [testSubId, stateKey]);

    // Проверить что cooldown создан
    const result = await db.query(`
      SELECT * FROM notification_cooldowns
      WHERE subscription_id = $1 AND state_key = $2
    `, [testSubId, stateKey]);

    expect(result.rows.length).toBe(1);
    
    // Проверить что нельзя отправить сразу (< 15 минут)
    const minutesAgo = (Date.now() - new Date(result.rows[0].last_notified_at).getTime()) / 60000;
    expect(minutesAgo).toBeLessThan(15);

    // Очистка
    await db.query(`DELETE FROM notification_cooldowns WHERE state_key = $1`, [stateKey]);
  });
});
