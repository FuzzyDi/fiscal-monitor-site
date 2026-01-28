# 🔴 КРИТИЧЕСКАЯ ПРОБЛЕМА: Notification Queue Пустая

## ❌ Проблема

Worker читает из таблицы `notification_queue`, но **никто не добавляет туда записи**!

### **Как Работает Сейчас:**

1. ✅ Snapshot приходит → сохраняется в `fiscal_last_state`
2. ❌ Worker читает из `notification_queue` → **пусто!**
3. ❌ Уведомления не отправляются

---

## 🔍 Проверка

```powershell
cd C:\Projects\fiscal-monitor

Write-Host "`n=== 1. Есть ли данные в fiscal_last_state? ===" -ForegroundColor Cyan
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
SELECT shop_inn, shop_number, pos_number, severity, 
       to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created
FROM fiscal_last_state 
WHERE shop_inn = '311030320' 
ORDER BY created_at DESC 
LIMIT 3;
"

Write-Host "`n=== 2. Есть ли данные в notification_queue? ===" -ForegroundColor Cyan
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
SELECT * FROM notification_queue 
WHERE processed = false 
ORDER BY created_at DESC 
LIMIT 10;
"

Write-Host "`n=== 3. Существует ли таблица notification_queue? ===" -ForegroundColor Cyan
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "\d notification_queue"
```

---

## ✅ РЕШЕНИЕ: Создать Триггер или Изменить Worker

### **Вариант 1: Изменить Worker (Проще)**

Изменить worker, чтобы читал напрямую из `fiscal_last_state`.

### **Вариант 2: Создать Триггер (Правильнее)**

Автоматически добавлять записи в `notification_queue` при изменении `fiscal_last_state`.

### **Вариант 3: Добавить Вставку в Ingest Route (Быстрее)**

Добавить INSERT в `notification_queue` после сохранения в `fiscal_last_state`.

---

## 🚀 БЫСТРОЕ РЕШЕНИЕ: Вручную Добавить в Queue

```powershell
cd C:\Projects\fiscal-monitor

Write-Host "`n=== Добавление тестового алерта в notification_queue ===" -ForegroundColor Yellow

docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
-- Получить subscription_id для INN 311030320
WITH sub AS (
  SELECT id FROM notification_subscriptions 
  WHERE shop_inn = '311030320' AND status = 'active'
  LIMIT 1
)
INSERT INTO notification_queue 
  (subscription_id, state_key, severity, event_type, alert_summary, shop_number, pos_number, processed)
SELECT 
  sub.id,
  '311030320-1-1',
  'CRITICAL',
  'state_change',
  '🧪 ТЕСТ: Касса не отвечает на запросы',
  '1',
  '1',
  false
FROM sub;
"

Write-Host "`n✅ Алерт добавлен в очередь!" -ForegroundColor Green
Write-Host "⏱️ Подождите до 60 секунд (worker проверяет каждую минуту)..."
Start-Sleep -Seconds 65

Write-Host "`n=== Проверка логов notification-worker ===" -ForegroundColor Cyan
docker-compose logs notification-worker --tail=50 | Select-String "notification|telegram|311030320|Processing"

Write-Host "`n🔔 Проверьте Telegram!" -ForegroundColor Green
```

---

## 📊 Проверка После Добавления

```powershell
cd C:\Projects\fiscal-monitor

Write-Host "`n=== 1. Очередь обработана? ===" -ForegroundColor Cyan
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
SELECT subscription_id, state_key, severity, alert_summary, processed, 
       to_char(created_at, 'HH24:MI:SS') as created
FROM notification_queue 
ORDER BY created_at DESC 
LIMIT 5;
"

Write-Host "`n=== 2. История отправки ===" -ForegroundColor Cyan
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
SELECT id, subscription_id, alerts_count, delivered, 
       to_char(sent_at, 'YYYY-MM-DD HH24:MI:SS') as sent,
       error_message
FROM notification_history 
ORDER BY sent_at DESC 
LIMIT 5;
"

Write-Host "`n=== 3. Логи worker ===" -ForegroundColor Cyan
docker-compose logs notification-worker --tail=30
```

---

## 🔧 ДОЛГОСРОЧНОЕ РЕШЕНИЕ

Нужно исправить один из этих компонентов:

### **1. Ingest Route (backend/routes/ingest.js)**

Добавить вставку в `notification_queue` после сохранения `fiscal_last_state`:

```javascript
// После INSERT в fiscal_last_state (строка ~200)

// Добавить алерты в очередь уведомлений
if (alerts && alerts.length > 0) {
  // Получить subscription_id
  const subResult = await pool.query(`
    SELECT id FROM notification_subscriptions
    WHERE shop_inn = $1 AND status = 'active'
  `, [shopInn]);
  
  if (subResult.rows.length > 0) {
    const subscriptionId = subResult.rows[0].id;
    
    for (const alert of alerts) {
      await pool.query(`
        INSERT INTO notification_queue 
          (subscription_id, state_key, severity, event_type, alert_summary, shop_number, pos_number, processed)
        VALUES ($1, $2, $3, $4, $5, $6, $7, false)
      `, [
        subscriptionId,
        stateKey,
        alert.severity || maxSev,
        'state_change',
        alert.message,
        shopNumber,
        posNumber
      ]);
    }
  }
}
```

---

### **2. Worker (backend/background-worker.js)**

Изменить логику, чтобы читал из `fiscal_last_state` напрямую:

```javascript
// Вместо чтения из notification_queue
const statesResult = await db.query(`
  SELECT 
    fls.shop_inn,
    fls.shop_number,
    fls.pos_number,
    fls.severity,
    fls.alerts,
    ns.id as subscription_id
  FROM fiscal_last_state fls
  JOIN notification_subscriptions ns ON ns.shop_inn = fls.shop_inn
  WHERE ns.status = 'active'
    AND fls.severity IN ('CRITICAL', 'DANGER')
    AND fls.created_at > NOW() - INTERVAL '5 minutes'
`);
```

---

## 🎯 РЕКОМЕНДАЦИЯ

**Сейчас:** Используйте ручное добавление в queue (команда выше)

**Потом:** Исправьте ingest route, чтобы автоматически добавлял алерты в queue

---

## 📝 Команды для Быстрого Теста

```powershell
cd C:\Projects\fiscal-monitor

# 1. Добавить алерт в queue
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
WITH sub AS (SELECT id FROM notification_subscriptions WHERE shop_inn = '311030320' AND status = 'active' LIMIT 1)
INSERT INTO notification_queue (subscription_id, state_key, severity, event_type, alert_summary, shop_number, pos_number, processed)
SELECT sub.id, '311030320-1-1', 'CRITICAL', 'state_change', '🧪 ТЕСТ: Касса не отвечает', '1', '1', false FROM sub;
"

# 2. Подождать
Write-Host "⏱️ Подождите 65 секунд..." -ForegroundColor Yellow
Start-Sleep -Seconds 65

# 3. Проверить логи
docker-compose logs notification-worker --tail=50

# 4. Проверить Telegram
Write-Host "🔔 Проверьте Telegram чат!" -ForegroundColor Green
```

---

**Выполните команду выше и проверьте Telegram! 🚀**
