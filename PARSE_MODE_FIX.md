# ✅ ИСПРАВЛЕНО: parse_mode Ошибка

## ❌ Проблема

Telegram API возвращал ошибку: **`Bad Request: unsupported parse_mode`**

**Причина:** В `telegram-sender.js` строка 36 отправляла `parse_mode: null`, что не поддерживается API.

---

## ✅ Решение

Удалён параметр `parse_mode: null` из запроса.

### **ДО:**
```javascript
const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
  chat_id: chatId,
  text: text,
  parse_mode: null,  // ❌ Ошибка!
  disable_web_page_preview: true
});
```

### **ПОСЛЕ:**
```javascript
const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
  chat_id: chatId,
  text: text,
  disable_web_page_preview: true  // ✅ Работает!
});
```

---

## 🚀 Применить Исправление

```powershell
cd C:\Projects\fiscal-monitor

Write-Host "`n=== 1. Обновление кода ===" -ForegroundColor Cyan
git pull origin main

Write-Host "`n=== 2. Перезапуск notification-worker ===" -ForegroundColor Yellow
docker-compose restart notification-worker

Write-Host "`n=== 3. Ожидание 5 секунд ===" -ForegroundColor Magenta
Start-Sleep -Seconds 5

Write-Host "`n=== 4. Проверка логов ===" -ForegroundColor Green
docker-compose logs notification-worker --tail=30

Write-Host "`n✅ Готово!" -ForegroundColor Green
```

---

## 🧪 Повторный Тест

```powershell
cd C:\Projects\fiscal-monitor

Write-Host "`n=== Добавление тестового алерта ===" -ForegroundColor Yellow

docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
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
  '🧪 ТЕСТ #2: Касса не отвечает на запросы',
  '1',
  '1',
  false
FROM sub;
"

Write-Host "`n✅ Алерт добавлен!" -ForegroundColor Green
Write-Host "⏱️ Подождите 65 секунд (worker проверяет каждую минуту)..." -ForegroundColor Cyan
Start-Sleep -Seconds 65

Write-Host "`n=== Проверка логов ===" -ForegroundColor Yellow
docker-compose logs notification-worker --tail=50 | Select-String "notification|telegram|311030320|sent"

Write-Host "`n=== История отправки ===" -ForegroundColor Cyan
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
SELECT id, subscription_id, alerts_count, delivered, 
       to_char(sent_at, 'HH24:MI:SS') as sent_time,
       error_message
FROM notification_history 
ORDER BY sent_at DESC 
LIMIT 5;
"

Write-Host "`n🔔 ПРОВЕРЬТЕ TELEGRAM!" -ForegroundColor Green
```

---

## 📊 Ожидаемый Результат

### **В notification_history:**
```
id | subscription_id | alerts_count | delivered | sent_time | error_message
---+-----------------+--------------+-----------+-----------+--------------
 2 |               3 |            1 | t         | 12:45:00  | 
```

**`delivered = t`** (true) — успех! ✅

### **В Telegram:**
```
АЛЕРТ: КРИТИЧЕСКИЙ

Терминал: Магазин 1, Касса 1
Проблема: 🧪 ТЕСТ #2: Касса не отвечает на запросы
Время: 28.01.2026, 12:45:00

Подробнее: https://fiscaldrive.sbg.network/portal
```

---

## 🔍 Проверка После Отправки

```powershell
cd C:\Projects\fiscal-monitor

# 1. Очередь пуста?
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
SELECT COUNT(*) as pending_count 
FROM notification_queue 
WHERE processed = false;
"

# 2. Последние отправки
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
SELECT id, alerts_count, delivered, 
       to_char(sent_at, 'YYYY-MM-DD HH24:MI:SS') as sent_at,
       CASE WHEN delivered THEN '✅ OK' ELSE '❌ ' || error_message END as status
FROM notification_history 
ORDER BY sent_at DESC 
LIMIT 5;
"

# 3. Логи worker
docker-compose logs notification-worker --tail=50 | Select-String "Notification sent|Failed to send"
```

---

## 🎯 Итог

- ✅ **Проблема**: `parse_mode: null` вызывала ошибку API
- ✅ **Решение**: Параметр удалён
- ✅ **Коммит**: `bbae7ba` — fix: Remove unsupported parse_mode

---

## 📝 Коммиты

- **bbae7ba** — `fix: Remove unsupported parse_mode: null from Telegram API call`
- **a91f285** — `docs: Add notification queue missing data fix`
- **2587a07** — `docs: Add worker service name fix (notification-worker)`

**GitHub**: https://github.com/FuzzyDi/fiscal-monitor-site

---

**Выполните команды обновления и повторного теста! 🚀**

**После 65 секунд проверьте Telegram — должно прийти уведомление! 📱**
