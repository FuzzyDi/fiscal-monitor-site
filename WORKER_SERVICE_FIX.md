# 🔴 ПРОБЛЕМА НАЙДЕНА: Worker Сервис

## ❌ Проблема

Worker сервис в `docker-compose.yml` называется **`notification-worker`**, а не `worker`!

---

## ✅ ИСПРАВЛЕННЫЕ КОМАНДЫ

### **Быстрая Диагностика:**

```powershell
cd C:\Projects\fiscal-monitor

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   ДИАГНОСТИКА TELEGRAM УВЕДОМЛЕНИЙ" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Статус контейнеров
Write-Host "1. СТАТУС КОНТЕЙНЕРОВ:" -ForegroundColor Yellow
docker-compose ps notification-worker telegram-bot backend

# 2. Worker запущен?
Write-Host "`n2. NOTIFICATION-WORKER РАБОТАЕТ?" -ForegroundColor Yellow
$workerStatus = docker-compose ps notification-worker | Select-String "Up"
if ($workerStatus) {
    Write-Host "✅ Notification-Worker запущен" -ForegroundColor Green
} else {
    Write-Host "❌ Notification-Worker НЕ запущен!" -ForegroundColor Red
    Write-Host "Запускаем..." -ForegroundColor Yellow
    docker-compose up -d notification-worker
    Start-Sleep -Seconds 5
}

# 3. Telegram Bot запущен?
Write-Host "`n3. TELEGRAM BOT РАБОТАЕТ?" -ForegroundColor Yellow
$botStatus = docker-compose ps telegram-bot | Select-String "Up"
if ($botStatus) {
    Write-Host "✅ Telegram Bot запущен" -ForegroundColor Green
} else {
    Write-Host "❌ Telegram Bot НЕ запущен!" -ForegroundColor Red
    Write-Host "Запускаем..." -ForegroundColor Yellow
    docker-compose up -d telegram-bot
    Start-Sleep -Seconds 5
}

# 4. БД подключение
Write-Host "`n4. ПОДКЛЮЧЕНИЕ К БД (311030320):" -ForegroundColor Yellow
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

# 6. Worker логи
Write-Host "`n6. NOTIFICATION-WORKER ЛОГИ:" -ForegroundColor Yellow
docker-compose logs notification-worker --tail=50

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "           ДИАГНОСТИКА ЗАВЕРШЕНА" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
```

---

## 🚀 Запустить Notification-Worker

```powershell
cd C:\Projects\fiscal-monitor

Write-Host "`n=== Запуск Notification-Worker ===" -ForegroundColor Yellow
docker-compose up -d notification-worker

Write-Host "`n=== Ожидание 5 секунд ===" -ForegroundColor Cyan
Start-Sleep -Seconds 5

Write-Host "`n=== Статус ===" -ForegroundColor Green
docker-compose ps notification-worker

Write-Host "`n=== Логи (последние 50 строк) ===" -ForegroundColor Cyan
docker-compose logs notification-worker --tail=50

Write-Host "`n✅ Готово!" -ForegroundColor Green
```

---

## 🔍 Проверить Логи Notification-Worker

```powershell
cd C:\Projects\fiscal-monitor

# Все логи
docker-compose logs notification-worker --tail=100

# Только ошибки
docker-compose logs notification-worker --tail=200 | Select-String "error|Error|ERROR"

# Поиск упоминаний INN
docker-compose logs notification-worker --tail=200 | Select-String "311030320"

# Поиск telegram
docker-compose logs notification-worker --tail=200 | Select-String "telegram|notification"

# Следить в реальном времени
docker-compose logs notification-worker --follow
```

---

## 🧪 Повторная Отправка Тестового Snapshot

После запуска notification-worker, отправьте тестовый snapshot снова:

```powershell
# Создать snapshot с ошибкой
$snapshot = @{
    shopInn = "311030320"
    shopNumber = "1"
    shopName = "Zahratun Qorako`l"
    posNumber = "1"
    posIp = "192.168.1.100"
    alerts = @(
        @{
            severity = "CRITICAL"
            message = "🧪 ТЕСТ: Касса не отвечает на запросы"
            code = "TEST_ERROR"
        }
    )
    fiscal = @{
        fiscalStatus = "ERROR"
        lastCheck = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        errorMessage = "🧪 ТЕСТ: Касса не отвечает на запросы"
        receiptCount = 150
        fiscalUnsentCount = 5
        zReportCount = 10
    }
} | ConvertTo-Json -Depth 5

Write-Host "`n=== Отправка тестового snapshot ===" -ForegroundColor Yellow

# Отправить
$response = Invoke-WebRequest `
    -Uri "https://fiscaldrive.sbg.network/api/v1/fiscal/snapshot" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $snapshot `
    -UseBasicParsing

Write-Host "`n✅ Snapshot отправлен! Статус: $($response.StatusCode)" -ForegroundColor Green
Write-Host "⏱️ Подождите 10-30 секунд..."
Start-Sleep -Seconds 15

Write-Host "`n=== Проверка логов notification-worker ===" -ForegroundColor Cyan
docker-compose logs notification-worker --tail=30 | Select-String "311030320|notification|telegram"

Write-Host "`n🔔 Проверьте Telegram чат!" -ForegroundColor Green
```

---

## 📊 Что Должно Быть в Логах

После отправки snapshot, в логах `notification-worker` должно появиться:

```
✅ Processing notifications...
✅ Found state for shop_inn: 311030320
✅ Found active subscription: 3
✅ Found telegram connection: chat_id=33182944
✅ Severity CRITICAL matches filter
✅ Sending notification to Telegram...
✅ Notification sent successfully
```

**Или ошибки:**
```
❌ No active subscription found for 311030320
❌ No telegram connection found
❌ Severity CRITICAL not in filter
❌ Telegram API error: ...
```

---

## 🔧 Если Worker Не Запускается

```powershell
cd C:\Projects\fiscal-monitor

# Проверить логи ошибок
docker-compose logs notification-worker --tail=100 | Select-String "error|Error|ERROR"

# Перезапустить
docker-compose restart notification-worker

# Пересобрать (если нужно)
docker-compose stop notification-worker
docker-compose build --no-cache notification-worker
docker-compose up -d notification-worker
```

---

## 📝 Правильные Названия Сервисов

| Неправильно | Правильно |
|-------------|-----------|
| `worker` ❌ | `notification-worker` ✅ |
| `bot` ❌ | `telegram-bot` ✅ |
| `postgres` ⚠️ | `postgres` ✅ (контейнер: `fiscal-monitor-db`) |
| `db` ❌ | `postgres` ✅ |

---

## 🎯 Итог

1. ✅ **Запустите notification-worker** (команда выше)
2. ✅ **Отправьте тестовый snapshot** снова
3. ✅ **Проверьте логи** notification-worker
4. ✅ **Проверьте Telegram**

---

**Выполните быструю диагностику и скажите что показали логи! 🚀**
