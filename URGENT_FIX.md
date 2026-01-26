# 🔥 СРОЧНОЕ ИСПРАВЛЕНИЕ: Отсутствует таблица notification_subscription_requests

## Проблема

Вы видите ошибку:
```
ERROR: relation "notification_subscription_requests" does not exist
```

У вас **11 таблиц** вместо **12**.

---

## ✅ Решение (2 команды)

### Вариант 1: PowerShell (рекомендуется)

```powershell
# 1. Получить исправленную миграцию
cd C:\Projects\fiscal-monitor
git pull

# 2. Применить миграцию
.\apply-migration.ps1
```

При запросе введите: **Y**

---

### Вариант 2: Прямая команда

Если скрипт не работает, выполните напрямую:

```powershell
cd C:\Projects\fiscal-monitor
git pull
docker-compose exec postgres psql -U postgres -d fiscal_monitor -f /docker-entrypoint-initdb.d/telegram-migration.sql
```

---

### Вариант 3: Ручное выполнение SQL

Если ничего не работает, создайте таблицу вручную:

```powershell
cd C:\Projects\fiscal-monitor
docker-compose exec -T postgres psql -U postgres -d fiscal_monitor << 'EOF'
-- Create missing table
CREATE TABLE IF NOT EXISTS notification_subscription_requests (
  id SERIAL PRIMARY KEY,
  shop_inn TEXT NOT NULL REFERENCES registrations(shop_inn) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  client_comment TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  admin_comment TEXT,
  subscription_id INTEGER
);

-- Ensure only one pending request per INN
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_requests_pending 
  ON notification_subscription_requests(shop_inn, status) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_subscription_requests_status 
  ON notification_subscription_requests(status, requested_at);
EOF
```

---

## 🔍 Проверка (должно быть 12 таблиц)

```powershell
docker-compose exec postgres psql -U postgres -d fiscal_monitor -c "\dt"
```

Ожидаемый результат:
```
 access_tokens
 fiscal_events
 fiscal_last_state
 notification_cooldowns
 notification_history
 notification_preferences
 notification_queue
 notification_subscription_requests    <-- ДОЛЖНА БЫТЬ!
 notification_subscriptions
 registrations
 telegram_connect_codes
 telegram_connections
(12 rows)
```

---

## 🔄 После исправления

```powershell
# Перезапустить backend
docker-compose restart backend

# Проверить что работает
curl http://localhost:3001/health
```

Затем откройте: **https://fiscaldrive.sbg.network/portal/telegram**

✅ **Должно работать!**

---

## 🐛 Что было исправлено

В файле `backend/telegram-migration.sql` был неправильный синтаксис комментариев:

**Было:**
```sql
# Telegram Tables Migration
```

**Стало:**
```sql
-- Telegram Tables Migration
```

SQL не поддерживает `#` комментарии, только `--`.

---

## 💡 Быстрая команда (всё в одной строке)

```powershell
cd C:\Projects\fiscal-monitor; git pull; .\apply-migration.ps1; docker-compose restart backend; docker-compose exec postgres psql -U postgres -d fiscal_monitor -c "\dt"
```

---

## 🆘 Если всё еще не работает

Пересоздайте БД (⚠️ **удалит все данные!**):

```powershell
.\reset-db.ps1
```

---

**Сделайте `git pull` и запустите `.\apply-migration.ps1` прямо сейчас!** 🚀
