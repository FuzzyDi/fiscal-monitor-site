# ⚡ Fiscal Monitor - Шпаргалка

## 🚀 Быстрый старт (3 команды)

```bash
# 1. Запустить все сервисы
./start-all.sh

# 2. Проверить статус
./status.sh

# 3. Смотреть логи
pm2 logs
```

---

## 📝 Основные команды

### Управление сервисами

```bash
./start-all.sh      # Запустить всё
./stop-all.sh       # Остановить всё
./restart-all.sh    # Перезапустить всё
./status.sh         # Статус системы
```

### PM2

```bash
pm2 list            # Список процессов
pm2 logs            # Все логи
pm2 logs fiscal-api # Логи API
pm2 monit           # Мониторинг
pm2 restart all     # Перезапуск
pm2 stop all        # Остановка
```

### Проверки

```bash
# Backend
curl http://localhost:3001/health

# Telegram бот
# В Telegram отправьте: /start

# База данных
psql $DATABASE_URL -c "SELECT 1"
```

---

## 🔧 Быстрая настройка

### Создать Telegram бота

```
1. Telegram → @BotFather
2. /newbot
3. Название: Fiscal Monitor Bot
4. Username: YourCompanyFiscalBot
5. Сохранить токен!
6. /setprivacy → Disable
```

### Обновить токен

```bash
cd backend
nano .env

# Заменить:
TELEGRAM_BOT_TOKEN=ваш_токен
TELEGRAM_BOT_USERNAME=ваш_username
```

---

## 🎯 Тестовый флоу

### 1. Админ активирует подписку

```bash
curl -X POST http://localhost:3001/api/v1/admin/telegram/activate \
  -H "X-Admin-Key: 1234567890" \
  -H "Content-Type: application/json" \
  -d '{"registration_id": 1, "duration_months": 1}'
```

### 2. Клиент генерирует код

```bash
curl -X POST http://localhost:3001/api/v1/portal/telegram/generate-code \
  -H "X-Token: token_клиента"
```

### 3. Клиент подключает

```
В Telegram боте: /connect 123456
```

---

## 🐛 Troubleshooting

### Backend не работает

```bash
pm2 logs fiscal-api --lines 50
lsof -i :3001
cat backend/.env
```

### Telegram бот не отвечает

```bash
pm2 logs telegram-bot --lines 50
grep TELEGRAM_BOT_TOKEN backend/.env
curl "https://api.telegram.org/bot<TOKEN>/getMe"
```

### Worker не отправляет

```bash
pm2 logs notification-worker --lines 50
psql $DATABASE_URL -c "SELECT COUNT(*) FROM notification_queue WHERE processed = false;"
```

---

## 📊 Полезные SQL

```sql
-- Подписки
SELECT * FROM notification_subscriptions;

-- Активные подключения
SELECT * FROM telegram_connections WHERE is_active = true;

-- Очередь
SELECT * FROM notification_queue WHERE processed = false;

-- История
SELECT * FROM notification_history ORDER BY sent_at DESC LIMIT 10;
```

---

## 🔐 Security Checklist

- [ ] Сменить ADMIN_API_KEY
- [ ] Сменить пароль PostgreSQL
- [ ] Настроить HTTPS
- [ ] Firewall для PostgreSQL
- [ ] Rate limiting
- [ ] Бэкапы БД

---

## 📚 Документация

- `HOW_TO_RUN.md` - Полное руководство
- `QUICK_START.md` - Быстрый старт
- `TELEGRAM_READY.md` - Telegram система
- `docs/TELEGRAM_CLIENT_GUIDE.md` - Для клиентов
- `docs/API.md` - API docs

---

## 💾 Бэкапы

```bash
# Бэкап БД
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление
psql $DATABASE_URL < backup_20260126.sql
```

---

## 🌐 Порты

- **3001** - Backend API
- **3000** - Frontend (если запущен)
- **5432** - PostgreSQL

---

## 📞 Поддержка

**GitHub:** https://github.com/FuzzyDi/fiscal-monitor-site

**Основные файлы:**
- `backend/server.js` - API
- `backend/telegram-bot.js` - Бот
- `backend/background-worker.js` - Worker
- `backend/schema.sql` - БД схема

---

**Версия:** 1.0.0  
**Дата:** 2026-01-26
