# 🧪 Тестирование Отправки Telegram Уведомлений

## 📋 Предварительные Условия

### 1. **Проверить Подключение Telegram**

```powershell
# Проверить статус подключения
$token = "85fbd14d9b2f33fcbc955789bd1d1677253f170b4aa70b5adf9adaee58d16f37"
$response = Invoke-WebRequest -Uri "https://fiscaldrive.sbg.network/api/v1/portal/telegram/status" -Headers @{"X-Token"=$token} -UseBasicParsing
$json = $response.Content | ConvertFrom-Json
Write-Host "Subscription ID: $($json.subscription.id)"
Write-Host "Connection ID: $($json.connection.id)"
Write-Host "Chat ID: $($json.connection.telegram_chat_id)"
Write-Host "Chat Type: $($json.connection.telegram_chat_type)"
```

**Ожидаемый результат:**
```
Subscription ID: 3
Connection ID: 2
Chat ID: 33182944
Chat Type: private
```

---

## 🚀 Способы Тестирования

### **Способ 1: Отправить Тестовый Snapshot (Рекомендуется)**

Отправим тестовый snapshot с проблемой через API `/api/v1/ingest`:

```powershell
# Токен для INN 311030320
$token = "85fbd14d9b2f33fcbc955789bd1d1677253f170b4aa70b5adf9adaee58d16f37"

# Создать тестовый snapshot с ошибкой
$snapshot = @{
    shop_inn = "311030320"
    shop_number = "1"
    shop_name = "Zahratun Qorako`l"
    pos_number = "1"
    pos_ip = "192.168.1.100"
    snapshot = @{
        fiscal_status = "ERROR"
        last_check = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        error_message = "ТЕСТОВАЯ ОШИБКА: Касса не отвечает"
        receipt_count = 150
        fiscal_unsent_count = 5
        z_report_count = 10
    }
} | ConvertTo-Json -Depth 5

# Отправить
$response = Invoke-WebRequest `
    -Uri "https://fiscaldrive.sbg.network/api/v1/ingest" `
    -Method POST `
    -Headers @{
        "X-Token" = $token
        "Content-Type" = "application/json"
    } `
    -Body $snapshot `
    -UseBasicParsing

Write-Host "Статус: $($response.StatusCode)"
Write-Host "Ответ: $($response.Content)"
```

**Что произойдёт:**
1. Snapshot сохранится в БД
2. Worker проверит наличие ошибки (fiscal_status = "ERROR")
3. Worker найдёт активную подписку и подключение Telegram
4. **Отправит уведомление в Telegram чат** 📨

---

### **Способ 2: Напрямую через Worker (Для Отладки)**

Создадим тестовую запись в БД и запустим worker вручную:

```powershell
cd C:\Projects\fiscal-monitor

# 1. Создать тестовую запись
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
INSERT INTO fiscal_last_state 
  (shop_inn, shop_number, shop_name, pos_number, pos_ip, severity, last_check_timestamp, snapshot, is_registered)
VALUES 
  ('311030320', '1', 'Zahratun Qorako`l', '1', '192.168.1.100', 'CRITICAL', NOW(), 
   '{\"fiscal_status\": \"ERROR\", \"error_message\": \"ТЕСТ: Касса не отвечает\", \"last_check\": \"2026-01-27T18:00:00.000Z\"}', 
   true);
"

# 2. Проверить логи worker
docker-compose logs worker --tail=50 --follow
```

---

### **Способ 3: Проверить Worker Вручную**

Посмотрим код worker и проверим логику:

```powershell
cd C:\Projects\fiscal-monitor

# Посмотреть логи worker
docker-compose logs worker --tail=100

# Перезапустить worker
docker-compose restart worker

# Следить за логами в реальном времени
docker-compose logs worker --follow
```

---

## 🧪 **Полный Тестовый Сценарий**

### **Шаг 1: Проверить Конфигурацию**

```powershell
cd C:\Projects\fiscal-monitor

# 1. Проверить настройки подписки
$token = "85fbd14d9b2f33fcbc955789bd1d1677253f170b4aa70b5adf9adaee58d16f37"
$response = Invoke-WebRequest -Uri "https://fiscaldrive.sbg.network/api/v1/portal/telegram/status" -Headers @{"X-Token"=$token} -UseBasicParsing
$json = $response.Content | ConvertFrom-Json

Write-Host "`n=== Статус Подключения ===" -ForegroundColor Cyan
Write-Host "Subscription ID: $($json.subscription.id)"
Write-Host "Status: $($json.subscription.status)"
Write-Host "Expires: $($json.subscription.expires_at)"

Write-Host "`n=== Telegram Подключение ===" -ForegroundColor Green
Write-Host "Connection ID: $($json.connection.id)"
Write-Host "Chat ID: $($json.connection.telegram_chat_id)"
Write-Host "Chat Type: $($json.connection.telegram_chat_type)"

Write-Host "`n=== Настройки Уведомлений ===" -ForegroundColor Yellow
Write-Host "Severity Filter: $($json.preferences.severity_filter)"
Write-Host "Notify on Recovery: $($json.preferences.notify_on_recovery)"
Write-Host "Notify on Stale: $($json.preferences.notify_on_stale)"
Write-Host "Notify on Return: $($json.preferences.notify_on_return)"
```

---

### **Шаг 2: Отправить Тестовый Snapshot**

```powershell
# Токен для тестирования
$token = "85fbd14d9b2f33fcbc955789bd1d1677253f170b4aa70b5adf9adaee58d16f37"

# Snapshot с критической ошибкой
$snapshot = @{
    shop_inn = "311030320"
    shop_number = "1"
    shop_name = "Zahratun Qorako`l"
    pos_number = "1"
    pos_ip = "192.168.1.100"
    snapshot = @{
        fiscal_status = "ERROR"
        last_check = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        error_message = "🧪 ТЕСТ: Касса не отвечает на запросы"
        receipt_count = 150
        fiscal_unsent_count = 5
        z_report_count = 10
    }
} | ConvertTo-Json -Depth 5

Write-Host "`n=== Отправка тестового snapshot ===" -ForegroundColor Yellow
Write-Host "INN: 311030320"
Write-Host "Status: ERROR"
Write-Host "Message: ТЕСТ: Касса не отвечает"

# Отправить
try {
    $response = Invoke-WebRequest `
        -Uri "https://fiscaldrive.sbg.network/api/v1/ingest" `
        -Method POST `
        -Headers @{
            "X-Token" = $token
            "Content-Type" = "application/json"
        } `
        -Body $snapshot `
        -UseBasicParsing
    
    Write-Host "`n✅ Snapshot отправлен!" -ForegroundColor Green
    Write-Host "Статус: $($response.StatusCode)"
    Write-Host "Ответ: $($response.Content)"
} catch {
    Write-Host "`n❌ Ошибка отправки:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
```

---

### **Шаг 3: Проверить Логи Worker**

```powershell
cd C:\Projects\fiscal-monitor

Write-Host "`n=== Логи Notification Worker ===" -ForegroundColor Cyan
docker-compose logs worker --tail=50 | Select-String "notification|telegram|ERROR|311030320"
```

**Что искать в логах:**
```
✅ Processing notification for shop_inn: 311030320
✅ Found active subscription: 3
✅ Found telegram connection: chat_id=33182944
✅ Sending notification to Telegram...
✅ Notification sent successfully
```

**Или ошибки:**
```
❌ No active subscription found
❌ No telegram connection found
❌ Telegram API error
```

---

### **Шаг 4: Проверить Telegram**

1. Откройте **Telegram**
2. Найдите чат с ботом (chat_id: 33182944)
3. **Должно прийти уведомление:**

```
🚨 Проблема с кассой

Магазин: Zahratun Qorako`l
ИНН: 311030320
Магазин №: 1
Касса №: 1
IP: 192.168.1.100

❌ Ошибка: ТЕСТ: Касса не отвечает на запросы

Время: 27.01.2026 18:00:00
```

---

## 🔍 **Проверка Конфигурации Worker**

### **Проверить что worker запущен:**

```powershell
cd C:\Projects\fiscal-monitor

# Статус контейнера
docker-compose ps worker

# Логи запуска
docker-compose logs worker --tail=100
```

### **Проверить подключение к БД:**

```powershell
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
SELECT 
    ns.id as subscription_id,
    ns.shop_inn,
    ns.status as subscription_status,
    tc.id as connection_id,
    tc.telegram_chat_id,
    tc.is_active as connection_active
FROM notification_subscriptions ns
LEFT JOIN telegram_connections tc ON tc.subscription_id = ns.id
WHERE ns.shop_inn = '311030320' AND ns.status = 'active';
"
```

**Ожидаемый результат:**
```
subscription_id | shop_inn  | subscription_status | connection_id | telegram_chat_id | connection_active
----------------|-----------|---------------------|---------------|------------------|------------------
3               | 311030320 | active              | 2             | 33182944         | t
```

---

## 🐛 **Устранение Проблем**

### **1. Worker не запускается:**

```powershell
cd C:\Projects\fiscal-monitor

# Проверить логи ошибок
docker-compose logs worker --tail=200 | Select-String "error|Error|ERROR"

# Перезапустить
docker-compose restart worker

# Если не помогает — пересобрать
docker-compose stop worker
docker-compose build --no-cache worker
docker-compose up -d worker
```

---

### **2. Уведомления не отправляются:**

Проверьте:
1. ✅ Подписка активна (status = 'active')
2. ✅ Подключение Telegram активно (is_active = true)
3. ✅ Токен Telegram бота настроен в `.env`
4. ✅ Worker имеет доступ к БД

---

### **3. Telegram бот не настроен:**

Если `TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE`, нужно:

1. Создать бота через [@BotFather](https://t.me/BotFather)
2. Получить токен
3. Обновить `backend/.env`:
   ```env
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
   TELEGRAM_BOT_USERNAME=YourBotName
   ```
4. Перезапустить telegram-bot и worker:
   ```powershell
   docker-compose restart telegram-bot worker
   ```

---

## 📊 **Диагностическая Команда (Всё в Одном)**

```powershell
cd C:\Projects\fiscal-monitor

Write-Host "`n=== ДИАГНОСТИКА TELEGRAM УВЕДОМЛЕНИЙ ===" -ForegroundColor Cyan

# 1. Статус Worker
Write-Host "`n1. Статус Worker:" -ForegroundColor Yellow
docker-compose ps worker

# 2. Подключение в БД
Write-Host "`n2. Telegram Подключение в БД:" -ForegroundColor Yellow
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "SELECT ns.shop_inn, ns.status, tc.telegram_chat_id, tc.is_active FROM notification_subscriptions ns LEFT JOIN telegram_connections tc ON tc.subscription_id = ns.id WHERE ns.shop_inn = '311030320';"

# 3. Preferences
Write-Host "`n3. Настройки Уведомлений:" -ForegroundColor Yellow
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "SELECT * FROM notification_preferences WHERE subscription_id = 3;"

# 4. Последние логи Worker
Write-Host "`n4. Последние логи Worker:" -ForegroundColor Yellow
docker-compose logs worker --tail=30

Write-Host "`n=== ГОТОВО К ТЕСТИРОВАНИЮ ===" -ForegroundColor Green
Write-Host "Выполните Шаг 2 для отправки тестового snapshot" -ForegroundColor Cyan
```

---

## 🎯 **Итог**

**Для тестирования выполните:**

1. ✅ **Проверка конфигурации** (Шаг 1)
2. ✅ **Отправка тестового snapshot** (Шаг 2)
3. ✅ **Проверка логов worker** (Шаг 3)
4. ✅ **Проверка Telegram** (Шаг 4)

---

**Скопируйте и выполните команды! 🚀**
