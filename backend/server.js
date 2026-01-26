const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
require('dotenv').config();

const ingestRoutes = require('./routes/ingest');
const adminRoutes = require('./routes/admin');
const portalRoutes = require('./routes/portal');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Config defaults are conservative; override via env if needed.
const JSON_LIMIT = process.env.JSON_LIMIT || '256kb';
const INGEST_RL_MAX_PER_HOUR = (() => {
  const raw = process.env.INGEST_RL_MAX_PER_HOUR;
  if (!raw) return null;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
})();

function pickClientIp(req) {
  const xRealIp = req.header('x-real-ip');
  if (xRealIp) return String(xRealIp).trim();
  const xff = req.header('x-forwarded-for');
  if (xff) {
    const first = String(xff).split(',')[0].trim();
    if (first) return first;
  }
  return (req.socket && req.socket.remoteAddress) ? String(req.socket.remoteAddress) : 'unknown';
}

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS - разрешаем все источники для локальной разработки
app.use(cors({
  origin: true, // Разрешить любой origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Admin-Key', 'X-Token']
}));

app.use(express.json({ limit: JSON_LIMIT }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Optional in-memory rate limiting for ingest (disabled by default).
if (INGEST_RL_MAX_PER_HOUR) {
  const windowMs = 60 * 60 * 1000;
  const buckets = new Map(); // key -> { resetAt, count }

  app.use('/api/v1/fiscal', (req, res, next) => {
    const key = pickClientIp(req);
    const now = Date.now();
    const item = buckets.get(key);
    if (!item || now >= item.resetAt) {
      buckets.set(key, { resetAt: now + windowMs, count: 1 });
      return next();
    }
    item.count += 1;
    if (item.count > INGEST_RL_MAX_PER_HOUR) {
      // Never block POS: still respond with success, but log the overflow.
      logger.warn('Ingest rate limit exceeded', { ip: key, count: item.count });
      return res.status(204).send();
    }
    return next();
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/fiscal', ingestRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/portal', portalRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server (только при прямом запуске, чтобы тесты не зависали)
if (require.main === module) {
  const HOST = process.env.HOST || '0.0.0.0';
  app.listen(PORT, HOST, () => {
    logger.info(`Fiscal Monitor API running on ${HOST}:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;
