# 🔴 Worker Использует Старый Код

## Проблема

Worker всё ещё использует старую версию кода с `parse_mode: null`.

**Логи:**
```
error: Failed to send notification: subscription=3, error=Bad Request: unsupported parse_mode
```

---

## ✅ РЕШЕНИЕ: Пересобрать Worker

```powershell
cd C:\Projects\fiscal-monitor

Write-Host "`n=== 1. Обновление кода ===" -ForegroundColor Cyan
git pull origin main

Write-Host "`n=== 2. Остановка worker ===" -ForegroundColor Yellow
docker-compose stop notification-worker

Write-Host "`n=== 3. Пересборка образа ===" -ForegroundColor Magenta
docker-compose build --no-cache notification-worker

Write-Host "`n=== 4. Запуск worker ===" -ForegroundColor Green
docker-compose up -d notification-worker

Write-Host "`n=== 5. Ожидание 5 секунд ===" -ForegroundColor Cyan
Start-Sleep -Seconds 5

Write-Host "`n=== 6. Проверка логов ===" -ForegroundColor Yellow
docker-compose logs notification-worker --tail=30

Write-Host "`n✅ Worker пересобран с новым кодом!" -ForegroundColor Green
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
  '311030320-1-1-' || EXTRACT(EPOCH FROM NOW())::TEXT,
  'CRITICAL',
  'state_change',
  '✅ ФИНАЛЬНЫЙ ТЕСТ: Уведомление должно работать!',
  '1',
  '1',
  false
FROM sub;
"

Write-Host "`n✅ Алерт добавлен!" -ForegroundColor Green
Write-Host "⏱️ Подождите 65 секунд..." -ForegroundColor Cyan
Start-Sleep -Seconds 65

Write-Host "`n=== Проверка истории ===" -ForegroundColor Yellow
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
SELECT id, subscription_id, alerts_count, delivered, 
       to_char(sent_at, 'HH24:MI:SS') as sent_time,
       CASE WHEN delivered THEN '✅ УСПЕХ' ELSE '❌ ' || error_message END as status
FROM notification_history 
ORDER BY sent_at DESC 
LIMIT 3;
"

Write-Host "`n=== Логи worker ===" -ForegroundColor Cyan
docker-compose logs notification-worker --tail=30 | Select-String "Notification sent|Failed|error"

Write-Host "`n🔔 ПРОВЕРЬТЕ TELEGRAM!" -ForegroundColor Green
```

---

## 🎯 ОДНА КОМАНДА ДЛЯ ВСЕГО

```powershell
cd C:\Projects\fiscal-monitor; `
Write-Host "`n=== ПЕРЕСБОРКА WORKER ===" -ForegroundColor Cyan; `
git pull origin main; `
docker-compose stop notification-worker; `
docker-compose build --no-cache notification-worker; `
docker-compose up -d notification-worker; `
Start-Sleep -Seconds 5; `
Write-Host "`n=== ДОБАВЛЕНИЕ ТЕСТА ===" -ForegroundColor Yellow; `
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "WITH sub AS (SELECT id FROM notification_subscriptions WHERE shop_inn = '311030320' AND status = 'active' LIMIT 1) INSERT INTO notification_queue (subscription_id, state_key, severity, event_type, alert_summary, shop_number, pos_number, processed) SELECT sub.id, '311030320-1-1-' || EXTRACT(EPOCH FROM NOW())::TEXT, 'CRITICAL', 'state_change', '✅ ФИНАЛЬНЫЙ ТЕСТ: Уведомление должно работать!', '1', '1', false FROM sub;"; `
Write-Host "`n⏱️ Подождите 65 секунд..." -ForegroundColor Cyan; `
Start-Sleep -Seconds 65; `
Write-Host "`n=== РЕЗУЛЬТАТ ===" -ForegroundColor Green; `
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "SELECT id, delivered, to_char(sent_at, 'HH24:MI:SS') as sent_time, CASE WHEN delivered THEN '✅ УСПЕХ' ELSE '❌ ' || error_message END as status FROM notification_history ORDER BY sent_at DESC LIMIT 3;"; `
Write-Host "`n🔔 ПРОВЕРЬТЕ TELEGRAM!" -ForegroundColor Green
```

---

## 📊 Ожидаемый Результат

### **В notification_history:**
```
id | delivered | sent_time | status
---+-----------+-----------+---------
 2 | t         | 12:50:00  | ✅ УСПЕХ
 1 | f         | 07:34:00  | ❌ Bad Request: unsupported parse_mode
```

### **В Telegram:**
```
АЛЕРТ: КРИТИЧЕСКИЙ

Терминал: Магазин 1, Касса 1
Проблема: ✅ ФИНАЛЬНЫЙ ТЕСТ: Уведомление должно работать!
Время: 28.01.2026, 12:50:00

Подробнее: https://fiscaldrive.sbg.network/portal
```

---

## 🔍 Проверка Кода в Контейнере

Если хотите убедиться что новый код внутри:

```powershell
docker exec fiscal-monitor-worker cat /app/utils/telegram-sender.js | Select-String "parse_mode" -Context 2
```

**Должно НЕ быть** строки `parse_mode: null`

---

## ⚠️ Важно

Docker кеширует образы. Поэтому:
1. ✅ `--no-cache` — обязательно при пересборке
2. ✅ `git pull` — перед пересборкой
3. ✅ Перезапуск контейнера после сборки

---

**Выполните ОДНУ КОМАНДУ выше и через 65 секунд проверьте Telegram! 🚀**
