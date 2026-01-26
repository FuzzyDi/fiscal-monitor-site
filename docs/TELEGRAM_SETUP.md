# Telegram Notifications System - Setup Guide

## 🚀 Quick Start

### Prerequisites

1. **Telegram Bot** 
   - Create bot via @BotFather
   - Get bot token and username
   
2. **Database**
   - PostgreSQL 15+ running
   - Run schema migrations

3. **Environment**
   - Node.js 18+
   - npm or yarn

---

## 📋 Step 1: Create Telegram Bot

### 1.1 Open Telegram and find @BotFather

Search for `@BotFather` in Telegram.

### 1.2 Create new bot

Send command:
```
/newbot
```

Follow the prompts:
- **Bot name:** `Fiscal Monitor Bot` (or your preferred name)
- **Bot username:** `YourCompanyFiscalBot` (must end with 'bot')

### 1.3 Get your bot token

@BotFather will give you a token like:
```
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

**Save this token!** You'll need it for `.env` file.

### 1.4 Configure bot settings

#### Set description:
```
/setdescription
```
Choose your bot, then send:
```
Система мониторинга кассовых терминалов. Получайте мгновенные уведомления о проблемах с фискальными модулями.
```

#### Set about text:
```
/setabouttext
```
Choose your bot, then send:
```
Этот бот отправляет уведомления о проблемах с фискальными терминалами. Подключите бота в портале мониторинга.
```

#### Set commands:
```
/setcommands
```
Choose your bot, then send:
```
status - Текущее состояние терминалов
disconnect - Отключить уведомления
help - Справка
```

#### **IMPORTANT:** Disable privacy mode
```
/setprivacy
```
Choose your bot, select **DISABLED**.

This allows bot to read `/connect` command in groups.

---

## 📋 Step 2: Database Setup

### 2.1 Run migrations

The new tables will be created automatically when you run the schema:

```bash
cd backend
psql $DATABASE_URL -f schema.sql
```

### 2.2 Verify tables

Check that these tables exist:
- `notification_subscription_requests`
- `notification_subscriptions`
- `notification_preferences`
- `telegram_connections`
- `telegram_connect_codes`
- `notification_cooldowns`
- `notification_queue`
- `notification_history`

```bash
psql $DATABASE_URL -c "\dt notification*"
psql $DATABASE_URL -c "\dt telegram*"
```

---

## 📋 Step 3: Configuration

### 3.1 Update `.env` file

```bash
cd backend
cp .env.example .env
nano .env
```

Add/update these variables:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
TELEGRAM_BOT_USERNAME=YourCompanyFiscalBot
TELEGRAM_SEND_DELAY_MS=100
PORTAL_URL=https://your-domain.com
SUPPORT_EMAIL=support@your-domain.com
```

### 3.2 Install dependencies

```bash
npm install
```

New dependencies installed:
- `node-telegram-bot-api` - Telegram Bot API
- `node-cron` - Cron jobs
- `exceljs` - Excel export
- `axios` - HTTP client

---

## 📋 Step 4: Start Services

You need to run **3 services**:

### 4.1 Backend API (existing)

```bash
cd backend
npm start
```

Or with PM2:
```bash
pm2 start server.js --name "fiscal-api"
```

### 4.2 Telegram Bot (NEW)

```bash
cd backend
node telegram-bot.js
```

Or with PM2:
```bash
pm2 start telegram-bot.js --name "telegram-bot"
```

### 4.3 Background Worker (NEW)

```bash
cd backend
node background-worker.js
```

Or with PM2:
```bash
pm2 start background-worker.js --name "notification-worker"
```

### 4.4 Verify all services running

```bash
pm2 status
```

You should see:
```
┌────┬──────────────────────┬─────────┬─────────┐
│ id │ name                 │ status  │ restart │
├────┼──────────────────────┼─────────┼─────────┤
│ 0  │ fiscal-api           │ online  │ 0       │
│ 1  │ telegram-bot         │ online  │ 0       │
│ 2  │ notification-worker  │ online  │ 0       │
└────┴──────────────────────┴─────────┴─────────┘
```

---

## 📋 Step 5: Test Setup

### 5.1 Test bot in Telegram

Open your bot in Telegram and send:
```
/start
```

Bot should respond with welcome message.

### 5.2 Test API endpoints

```bash
# Check health
curl http://localhost:3001/health

# Test admin telegram endpoint (replace ADMIN_KEY)
curl -X GET http://localhost:3001/api/v1/admin/telegram/statistics \
  -H "X-Admin-Key: YOUR_ADMIN_KEY"
```

### 5.3 Run automated tests

```bash
cd backend
npm test -- telegram.test.js
```

---

## 📋 Step 6: Client Workflow Test

### 6.1 Create test registration

```bash
psql $DATABASE_URL << EOF
INSERT INTO registrations (shop_inn, title) 
VALUES ('TEST123', 'Test Company');

INSERT INTO access_tokens (token, shop_inn, label) 
VALUES ('test-token', 'TEST123', 'Test Token');
EOF
```

### 6.2 Request subscription (as client)

```bash
curl -X POST http://localhost:3001/api/v1/portal/telegram/request-subscription \
  -H "Content-Type: application/json" \
  -H "X-Token: test-token" \
  -d '{"comment": "Test request"}'
```

### 6.3 Approve request (as admin)

Get request ID from previous step, then:

```bash
curl -X POST http://localhost:3001/api/v1/admin/telegram/approve-request/1 \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -d '{"duration_months": 1, "admin_comment": "Test approval"}'
```

### 6.4 Generate connect code

```bash
curl -X POST http://localhost:3001/api/v1/portal/telegram/generate-code \
  -H "X-Token: test-token"
```

Response will contain 6-digit code, e.g., `847291`.

### 6.5 Connect bot in Telegram

Open your bot and send:
```
/connect 847291
```

Bot should respond: "Уведомления подключены!"

### 6.6 Test status command

```
/status
```

Bot should show terminal statistics.

---

## 📊 Monitoring

### Check logs

```bash
# All logs
pm2 logs

# Specific service
pm2 logs telegram-bot
pm2 logs notification-worker

# Backend logs
pm2 logs fiscal-api
```

### Database queries

```bash
# Active subscriptions
psql $DATABASE_URL -c "
SELECT COUNT(*) FROM notification_subscriptions WHERE status = 'active';
"

# Active connections
psql $DATABASE_URL -c "
SELECT COUNT(*) FROM telegram_connections WHERE is_active = true;
"

# Pending queue
psql $DATABASE_URL -c "
SELECT COUNT(*) FROM notification_queue WHERE processed = false;
"

# Recent notifications
psql $DATABASE_URL -c "
SELECT COUNT(*) FROM notification_history 
WHERE sent_at > NOW() - INTERVAL '24 hours';
"
```

---

## 🔧 Troubleshooting

### Bot not responding

1. Check bot process is running:
   ```bash
   pm2 status telegram-bot
   ```

2. Check bot token is correct in `.env`

3. Check logs:
   ```bash
   pm2 logs telegram-bot --lines 100
   ```

4. Verify bot privacy mode is disabled (in @BotFather)

### Notifications not sending

1. Check worker process:
   ```bash
   pm2 status notification-worker
   ```

2. Check queue:
   ```bash
   psql $DATABASE_URL -c "
   SELECT * FROM notification_queue WHERE processed = false LIMIT 10;
   "
   ```

3. Check logs:
   ```bash
   pm2 logs notification-worker --lines 100
   ```

4. Verify rate limit settings in `.env`

### Database errors

1. Check connection:
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```

2. Verify migrations ran:
   ```bash
   psql $DATABASE_URL -c "\dt notification*"
   ```

3. Check for locks:
   ```bash
   psql $DATABASE_URL -c "
   SELECT * FROM pg_locks WHERE NOT granted;
   "
   ```

---

## 📈 Performance Tuning

### Rate limiting

Adjust in `.env`:
```env
# Default: 100ms = 10 messages/second
TELEGRAM_SEND_DELAY_MS=100

# Faster: 50ms = 20 messages/second (risky)
# TELEGRAM_SEND_DELAY_MS=50

# Slower: 200ms = 5 messages/second (safer)
# TELEGRAM_SEND_DELAY_MS=200
```

### Worker frequency

Edit `background-worker.js`:
```javascript
// Default: every minute
cron.schedule('* * * * *', async () => {

// More frequent: every 30 seconds
// cron.schedule('*/30 * * * * *', async () => {
```

### Database indexes

Already optimized, but you can add more if needed:
```sql
CREATE INDEX idx_queue_created ON notification_queue(created_at) 
WHERE processed = false;
```

---

## 🔐 Security Checklist

- [ ] Change `ADMIN_API_KEY` to strong random value
- [ ] Use HTTPS in production
- [ ] Set `NODE_ENV=production`
- [ ] Enable firewall for PostgreSQL
- [ ] Rotate access tokens periodically
- [ ] Monitor rate limit abuse
- [ ] Backup database regularly
- [ ] Keep bot token secret

---

## 📚 Additional Resources

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [Client Guide](../docs/TELEGRAM_CLIENT_GUIDE.md)
- [API Documentation](../docs/API.md)

---

## 🆘 Support

If you need help:
- Check logs first
- Review this guide
- Contact development team

**Happy monitoring! 🎉**
