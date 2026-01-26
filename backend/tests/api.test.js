const request = require('supertest');
const app = require('../server');

describe('Fiscal Monitor API Tests', () => {
  
  describe('Health Check', () => {
    test('GET /health returns 200 and status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('Ingest API', () => {
    test('POST /api/v1/fiscal/snapshot accepts valid snapshot', async () => {
      const snapshot = {
        shopInn: '1234567890',
        shopNumber: 1,
        shopName: 'Test Shop',
        posNumber: 1,
        alerts: [
          {
            type: 'TEST_ALERT',
            severity: 'INFO',
            message: 'Test alert'
          }
        ]
      };

      const res = await request(app)
        .post('/api/v1/fiscal/snapshot')
        .send(snapshot);
      
      expect(res.status).toBe(204);
    });

    test('POST /api/v1/fiscal/snapshot returns 204 even with invalid data', async () => {
      const res = await request(app)
        .post('/api/v1/fiscal/snapshot')
        .send({ invalid: 'data' });
      
      expect(res.status).toBe(204);
    });
  });

  describe('Admin API - Authentication', () => {
    test('GET /api/v1/admin/overview requires admin key', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview');
      
      expect(res.status).toBe(401);
    });

    test('GET /api/v1/admin/overview rejects invalid key', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('X-Admin-Key', 'invalid-key');
      
      expect(res.status).toBe(401);
    });
  });

  describe('Portal API - Authentication', () => {
    test('GET /api/v1/portal/summary requires token', async () => {
      const res = await request(app)
        .get('/api/v1/portal/summary');
      
      expect(res.status).toBe(401);
    });

    test('GET /api/v1/portal/state requires token', async () => {
      const res = await request(app)
        .get('/api/v1/portal/state');
      
      expect(res.status).toBe(401);
    });
  });

  describe('404 Handler', () => {
    test('Returns 404 for unknown routes', async () => {
      const res = await request(app).get('/api/unknown-route');
      expect(res.status).toBe(404);
    });
  });
});
