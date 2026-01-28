# 🔧 Исправления Fiscal Monitor

## Критические исправления

### 1. ✅ Добавлена логика записи в notification_queue
**Файл:** `backend/routes/ingest.js`

Теперь при получении snapshot с alerts:
- Проверяется наличие активных подписок для данного INN
- Проверяется severity_filter подписки
- Проверяется cooldown (30 минут на один терминал)
- Добавляется запись в очередь уведомлений

```javascript
// Новая функция queueNotifications()
async function queueNotifications(shopInn, stateKey, severity, alerts, shopNumber, posNumber) {
  // Находит подписки с matching severity
  // Проверяет cooldown
  // Добавляет в notification_queue
  // Обновляет cooldown
}
```

### 2. ✅ Исправлен тип severity_filter
**Файлы:** 
- `backend/telegram-migration.sql`
- `fix-severity-filter-type.sql`

Было: `VARCHAR(20)` (скаляр)
Стало: `TEXT[]` (массив)

### 3. ✅ Исправлен URL экспорта в API
**Файл:** `frontend/lib/api.js`

Было: `/api/v1/admin/telegram/export/subscriptions`
Стало: `/api/v1/admin/telegram/export?type=subscriptions`

### 4. ✅ Добавлены Portal Telegram методы в api.js
**Файл:** `frontend/lib/api.js`

Новые методы:
- `portalApi.getTelegramStatus()`
- `portalApi.requestTelegramSubscription()`
- `portalApi.cancelTelegramRequest()`
- `portalApi.generateTelegramCode()`
- `portalApi.disconnectTelegram()`
- `portalApi.updateTelegramPreferences()`

### 5. ✅ Обновлён portal/telegram.js
**Файл:** `frontend/pages/portal/telegram.js`

Теперь использует централизованный API клиент вместо fetch().

---

## Важные исправления

### 6. ✅ Добавлена проверка expires_at
**Файл:** `backend/routes/portal-telegram.js`

Было:
```sql
WHERE ns.status = 'active'
```

Стало:
```sql
WHERE ns.status = 'active' AND ns.expires_at > NOW()
```

### 7. ✅ Исправлен race condition в генерации кода
**Файл:** `backend/routes/portal-telegram.js`

Теперь используется атомарная вставка с обработкой unique violation.

### 8. ✅ Исправлен memory leak в rate limiter
**Файл:** `backend/telegram-bot.js`

Добавлена периодическая очистка старых записей каждую минуту.

### 9. ✅ Улучшена валидация duration_months
**Файл:** `backend/routes/admin-telegram.js`

Теперь проверяется что это целое число от 1 до 36.

### 10. ✅ Добавлен индекс для производительности
**Файл:** `backend/schema.sql`

```sql
CREATE INDEX IF NOT EXISTS idx_subscriptions_active_inn 
  ON notification_subscriptions(shop_inn) 
  WHERE status = 'active';
```

---

## Новые файлы

### `backend/migrations/001_telegram_fixes.sql`
Скрипт миграции для существующих баз данных.

---

## Как применить исправления

### Для новых установок:
Просто используйте обновлённые файлы из архива.

### Для существующих установок:

1. Обновите код из архива
2. Примените миграцию:
```bash
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor < backend/migrations/001_telegram_fixes.sql
```

3. Пересоберите контейнеры:
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## Тестирование

После применения исправлений:

1. **Проверьте логи backend:**
```bash
docker logs fiscal-monitor-backend -f
```
Должны появляться сообщения "Queued notification for subscription X"

2. **Проверьте очередь:**
```sql
SELECT * FROM notification_queue WHERE processed = false;
```

3. **Проверьте worker:**
```bash
docker logs fiscal-monitor-worker -f
```
Должны появляться сообщения "Notification sent"

---

*Исправления подготовлены 28 января 2026*
