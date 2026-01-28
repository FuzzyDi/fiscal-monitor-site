# 🔍 Диагностика: Почему Уведомление Не Пришло

## Шаг 1: Проверить Логи Worker

```powershell
cd C:\Projects\fiscal-monitor

Write-Host "`n=== Логи Worker (последние 100 строк) ===" -ForegroundColor Cyan
docker-compose logs worker --tail=100

Write-Host "`n=== Поиск ошибок ===" -ForegroundColor Yellow
docker-compose logs worker --tail=200 | Select-String "error|Error|ERROR|fail|Fail"

Write-Host "`n=== Поиск упоминаний INN 311030320 ===" -ForegroundColor Yellow
docker-compose logs worker --tail=200 | Select-String "311030320"

Write-Host "`n=== Поиск telegram ===" -ForegroundColor Yellow
docker-compose logs worker --tail=200 | Select-String "telegram|Telegram"
```

---

## Шаг 2: Проверить Статус Worker

```powershell
cd C:\Projects\fiscal-monitor

Write-Host "`n=== Статус контейнера Worker ===" -ForegroundColor Cyan
docker-compose ps worker

Write-Host "`n=== Запущен ли Worker? ===" -ForegroundColor Yellow
docker ps | Select-String "worker"
```

---

## Шаг 3: Проверить БД

```powershell
cd C:\Projects\fiscal-monitor

Write-Host "`n=== 1. Есть ли запись в fiscal_last_state? ===" -ForegroundColor Cyan
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
SELECT shop_inn, shop_number, pos_number, severity, last_check_timestamp, 
       snapshot->>'fiscal'->>'fiscalStatus' as fiscal_status,
       created_at
FROM fiscal_last_state 
WHERE shop_inn = '311030320' 
ORDER BY created_at DESC 
LIMIT 5;
"

Write-Host "`n=== 2. Есть ли активная подписка? ===" -ForegroundColor Cyan
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
SELECT id, shop_inn, status, started_at, expires_at 
FROM notification_subscriptions 
WHERE shop_inn = '311030320' AND status = 'active';
"

Write-Host "`n=== 3. Есть ли Telegram подключение? ===" -ForegroundColor Cyan
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
SELECT tc.id, tc.subscription_id, tc.telegram_chat_id, tc.is_active, tc.connected_at
FROM telegram_connections tc
JOIN notification_subscriptions ns ON ns.id = tc.subscription_id
WHERE ns.shop_inn = '311030320' AND tc.is_active = true;
"

Write-Host "`n=== 4. Настройки уведомлений ===" -ForegroundColor Cyan
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
SELECT np.subscription_id, np.severity_filter, np.notify_on_recovery, 
       np.notify_on_stale, np.notify_on_return
FROM notification_preferences np
JOIN notification_subscriptions ns ON ns.id = np.subscription_id
WHERE ns.shop_inn = '311030320';
"

Write-Host "`n=== 5. Последние отправленные уведомления ===" -ForegroundColor Cyan
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
SELECT id, shop_inn, severity, message, sent_at, status
FROM notification_log
WHERE shop_inn = '311030320'
ORDER BY sent_at DESC
LIMIT 5;
"
```

---

## Шаг 4: Проверить Telegram Bot

```powershell
cd C:\Projects\fiscal-monitor

Write-Host "`n=== Логи Telegram Bot ===" -ForegroundColor Cyan
docker-compose logs telegram-bot --tail=50

Write-Host "`n=== Статус Telegram Bot ===" -ForegroundColor Yellow
docker-compose ps telegram-bot
```

---

## Шаг 5: Проверить Backend Logs

```powershell
cd C:\Projects\fiscal-monitor

Write-Host "`n=== Backend логи (snapshot) ===" -ForegroundColor Cyan
docker-compose logs backend --tail=100 | Select-String "snapshot|311030320|fiscal"
```

---

## 🧪 Быстрая Диагностика (Всё в Одном)

```powershell
cd C:\Projects\fiscal-monitor

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   ДИАГНОСТИКА TELEGRAM УВЕДОМЛЕНИЙ" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Контейнеры
Write-Host "1. СТАТУС КОНТЕЙНЕРОВ:" -ForegroundColor Yellow
docker-compose ps worker telegram-bot backend

# 2. Worker запущен?
Write-Host "`n2. WORKER РАБОТАЕТ?" -ForegroundColor Yellow
$workerStatus = docker-compose ps worker | Select-String "Up"
if ($workerStatus) {
    Write-Host "✅ Worker запущен" -ForegroundColor Green
} else {
    Write-Host "❌ Worker НЕ запущен!" -ForegroundColor Red
}

# 3. Telegram Bot запущен?
Write-Host "`n3. TELEGRAM BOT РАБОТАЕТ?" -ForegroundColor Yellow
$botStatus = docker-compose ps telegram-bot | Select-String "Up"
if ($botStatus) {
    Write-Host "✅ Telegram Bot запущен" -ForegroundColor Green
} else {
    Write-Host "❌ Telegram Bot НЕ запущен!" -ForegroundColor Red
}

# 4. БД подключение
Write-Host "`n4. ПОДКЛЮЧЕНИЕ К БД:" -ForegroundColor Yellow
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
SELECT 
    ns.id as sub_id,
    ns.shop_inn,
    ns.status as sub_status,
    tc.id as conn_id,
    tc.telegram_chat_id,
    tc.is_active as conn_active,
    np.severity_filter
FROM notification_subscriptions ns
LEFT JOIN telegram_connections tc ON tc.subscription_id = ns.id
LEFT JOIN notification_preferences np ON np.subscription_id = ns.id
WHERE ns.shop_inn = '311030320' AND ns.status = 'active';
"

# 5. Последний snapshot
Write-Host "`n5. ПОСЛЕДНИЙ SNAPSHOT ДЛЯ 311030320:" -ForegroundColor Yellow
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
SELECT shop_inn, shop_number, pos_number, severity, 
       to_char(last_check_timestamp, 'YYYY-MM-DD HH24:MI:SS') as last_check,
       to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created
FROM fiscal_last_state 
WHERE shop_inn = '311030320' 
ORDER BY created_at DESC 
LIMIT 1;
"

# 6. Worker логи (ошибки)
Write-Host "`n6. WORKER ОШИБКИ:" -ForegroundColor Yellow
$workerErrors = docker-compose logs worker --tail=100 | Select-String "error|Error|ERROR" | Select-Object -First 5
if ($workerErrors) {
    Write-Host "❌ Найдены ошибки:" -ForegroundColor Red
    $workerErrors
} else {
    Write-Host "✅ Ошибок не найдено" -ForegroundColor Green
}

# 7. Worker логи (уведомления)
Write-Host "`n7. WORKER УВЕДОМЛЕНИЯ:" -ForegroundColor Yellow
$notifications = docker-compose logs worker --tail=100 | Select-String "notification|telegram|311030320" | Select-Object -First 10
if ($notifications) {
    Write-Host "✅ Найдены упоминания:" -ForegroundColor Green
    $notifications
} else {
    Write-Host "⚠️ Упоминаний не найдено" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "           ДИАГНОСТИКА ЗАВЕРШЕНА" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
```

---

## 🔧 Возможные Проблемы

### **Проблема 1: Worker не запущен**

**Решение:**
```powershell
cd C:\Projects\fiscal-monitor
docker-compose up -d worker
docker-compose logs worker --tail=50
```

---

### **Проблема 2: Worker не подключается к БД**

**Симптомы:** Логи содержат `ECONNREFUSED` или `connection refused`

**Решение:**
```powershell
cd C:\Projects\fiscal-monitor
docker-compose restart worker
```

---

### **Проблема 3: Telegram Bot не настроен**

**Симптомы:** `TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE`

**Решение:**
1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите токен
3. Обновите `backend/.env`:
   ```env
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
   TELEGRAM_BOT_USERNAME=YourBotName
   ```
4. Перезапустите:
   ```powershell
   docker-compose restart telegram-bot worker
   ```

---

### **Проблема 4: Worker не обрабатывает уведомления**

**Проверка:**
```powershell
# Посмотреть код worker
cd C:\Projects\fiscal-monitor
Get-Content backend/worker/notification-worker.js | Select-String "processNotifications" -Context 5
```

**Решение:**
```powershell
# Перезапустить worker
docker-compose restart worker

# Следить за логами
docker-compose logs worker --follow
```

---

### **Проблема 5: Snapshot не сохранился в БД**

**Проверка:**
```powershell
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
SELECT COUNT(*) as total, 
       MAX(created_at) as last_created 
FROM fiscal_last_state 
WHERE shop_inn = '311030320';
"
```

**Если 0 записей:**
- Backend не получил snapshot
- Проверьте логи: `docker-compose logs backend --tail=100`

---

### **Проблема 6: Severity не совпадает с настройками**

**Проверка:**
```powershell
# Уровень важности в настройках
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
SELECT severity_filter 
FROM notification_preferences 
WHERE subscription_id = 3;
"
```

Если `severity_filter` не содержит `CRITICAL` — уведомление не отправится.

**Решение:** Измените настройки на портале или обновите напрямую:
```powershell
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
UPDATE notification_preferences 
SET severity_filter = ARRAY['INFO', 'WARN', 'DANGER', 'CRITICAL']::TEXT[]
WHERE subscription_id = 3;
"
```

---

## 📊 Итог

**Выполните быструю диагностику (команда выше) и пришлите результат!**

Я помогу определить точную причину проблемы. 🔍
