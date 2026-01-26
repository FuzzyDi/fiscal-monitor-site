# 🚀 Запуск проекта Fiscal Monitor

## Варианты запуска

### ✅ Вариант 1: Быстрый старт (Рекомендуется)

**Одна команда запускает все сервисы:**

```bash
./start-all.sh
```

Запускаются:
- ✅ Backend API (порт 3001)
- ✅ Telegram Bot
- ✅ Background Worker (уведомления)

**Остановка:**
```bash
./stop-all.sh
```

**Перезапуск:**
```bash
./restart-all.sh
```

**Проверка статуса:**
```bash
./status.sh
```

---

### Вариант 2: Через Docker

```bash
docker-compose up -d
```

---

### Вариант 3: Вручную для разработки

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Telegram Bot
cd backend
node telegram-bot.js

# Terminal 3 - Worker
cd backend
node background-worker.js
```

---

## 📋 Первоначальная настройка (один раз)

### 1. База данных
```bash
# Убедитесь, что PostgreSQL запущен
psql $DATABASE_URL -c "SELECT 1"

# Мигрируйте схему (если ещё не сделано)
npm run db:init
```

### 2. Создайте Telegram бота

1. Откройте Telegram и найдите **@BotFather**
2. Отправьте: `/newbot`
3. Введите название: `Fiscal Monitor Bot`
4. Введите username: `YourCompanyFiscalBot` (заканчивается на `bot`)
5. **СОХРАНИТЕ ТОКЕН!** Пример: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`
6. Отправьте: `/setprivacy` → выберите бота → `Disable`

### 3. Настройте .env

```bash
cd backend
nano .env

# Обновите эти строки:
TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
TELEGRAM_BOT_USERNAME=ваш_username_бота

# Сохраните: Ctrl+O, Enter, Ctrl+X
```

**Или быстро через sed:**
```bash
cd backend
sed -i 's/YOUR_BOT_TOKEN_HERE/ВАШТОКЕН/' .env
sed -i 's/YourBotUsername/ВАШUSERNAME/' .env
```

### 4. Установите зависимости (если ещё не установлены)

```bash
npm run install:all
```

---

## ✅ После запуска

### Проверьте, что всё работает:

```bash
# 1. Проверить Backend API
curl http://localhost:3001/health
# Ожидается: {"status":"ok","timestamp":"..."}

# 2. Проверить логи
pm2 logs

# 3. Проверить статус
./status.sh

# 4. Проверить Telegram бота
# Откройте бота в Telegram и отправьте: /start
```

---

## 🎯 Тестирование полного флоу

### 1. Админ активирует подписку клиента

```bash
curl -X POST http://localhost:3001/api/v1/admin/telegram/activate \
  -H "X-Admin-Key: YOUR_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "registration_id": 1,
    "duration_months": 1
  }'
```

### 2. Клиент генерирует код подключения

```bash
curl -X POST http://localhost:3001/api/v1/portal/telegram/generate-code \
  -H "X-Token: CLIENT_ACCESS_TOKEN"
```

Ответ:
```json
{
  "success": true,
  "code": "123456",
  "expires_in_seconds": 600,
  "bot_username": "YourFiscalBot",
  "instructions": "..."
}
```

### 3. Клиент подключает Telegram

В Telegram боте:
```
/connect 123456
```

Бот ответит подтверждением подключения.

---

## 🔧 Управление PM2

```bash
# Список процессов
pm2 list

# Логи всех процессов
pm2 logs

# Логи конкретного процесса
pm2 logs fiscal-api
pm2 logs telegram-bot
pm2 logs notification-worker

# Мониторинг в реальном времени
pm2 monit

# Перезапуск
pm2 restart all

# Остановка
pm2 stop all

# Удаление
pm2 delete all

# Очистка логов
pm2 flush

# Автозапуск при перезагрузке системы
pm2 startup
pm2 save
```

---

## 🐛 Troubleshooting

### Backend не запускается

```bash
# Проверьте логи
pm2 logs fiscal-api --lines 50

# Проверьте, не занят ли порт
lsof -i :3001

# Проверьте конфигурацию
cat backend/.env
```

### Telegram бот не отвечает

```bash
# Проверьте логи
pm2 logs telegram-bot --lines 50

# Проверьте токен
grep TELEGRAM_BOT_TOKEN backend/.env

# Тестируйте токен вручную
curl "https://api.telegram.org/bot<ВАШ_ТОКЕН>/getMe"
```

### Worker не отправляет уведомления

```bash
# Проверьте логи
pm2 logs notification-worker --lines 50

# Проверьте очередь в БД
psql $DATABASE_URL -c "SELECT COUNT(*) FROM notification_queue WHERE processed = false;"

# Проверьте историю отправок
psql $DATABASE_URL -c "SELECT * FROM notification_history ORDER BY sent_at DESC LIMIT 10;"
```

### База данных не подключается

```bash
# Проверьте DATABASE_URL
echo $DATABASE_URL

# Тест подключения
psql $DATABASE_URL -c "SELECT 1"

# Проверьте, запущен ли PostgreSQL
systemctl status postgresql
# или
pg_isready
```

---

## 📊 Полезные SQL запросы

```sql
-- Проверить подписки
SELECT * FROM notification_subscriptions;

-- Проверить активные подключения Telegram
SELECT * FROM telegram_connections WHERE is_active = true;

-- Проверить очередь уведомлений
SELECT * FROM notification_queue WHERE processed = false;

-- Проверить историю отправок
SELECT * FROM notification_history ORDER BY sent_at DESC LIMIT 20;

-- Статистика по клиентам
SELECT 
  r.shop_inn,
  r.title,
  ns.status,
  ns.expires_at,
  tc.telegram_chat_id,
  COUNT(nh.id) as notifications_sent
FROM registrations r
LEFT JOIN notification_subscriptions ns ON r.id = ns.registration_id
LEFT JOIN telegram_connections tc ON ns.id = tc.subscription_id AND tc.is_active = true
LEFT JOIN notification_history nh ON tc.id = nh.connection_id
GROUP BY r.shop_inn, r.title, ns.status, ns.expires_at, tc.telegram_chat_id;
```

---

## 📚 Документация

- **[QUICK_START.md](./QUICK_START.md)** - Быстрый старт
- **[TELEGRAM_READY.md](./TELEGRAM_READY.md)** - Документация Telegram системы
- **[docs/TELEGRAM_CLIENT_GUIDE.md](./docs/TELEGRAM_CLIENT_GUIDE.md)** - Руководство для клиентов
- **[docs/TELEGRAM_SETUP.md](./docs/TELEGRAM_SETUP.md)** - Настройка для разработчиков
- **[docs/API.md](./docs/API.md)** - API документация
- **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Развёртывание

---

## 🎉 Готово!

После выполнения этих шагов, весь проект будет запущен и готов к использованию!

**Команды для быстрого доступа:**
```bash
./start-all.sh   # Запустить всё
./status.sh      # Проверить статус
pm2 logs         # Смотреть логи
pm2 monit        # Мониторинг
./stop-all.sh    # Остановить всё
```

---

## 🔐 Безопасность

⚠️ **Важно перед production:**

1. Смените `ADMIN_API_KEY` в `.env`
2. Смените пароль PostgreSQL
3. Настройте HTTPS (nginx/cloudflare)
4. Включите firewall для PostgreSQL (только localhost)
5. Включите rate limiting
6. Регулярно делайте бэкапы БД

---

## 📞 Поддержка

GitHub: https://github.com/FuzzyDi/fiscal-monitor-site

---

**Версия:** 1.0.0  
**Последнее обновление:** 2026-01-26
