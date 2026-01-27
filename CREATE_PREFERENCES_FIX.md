# 🔧 РЕШЕНИЕ: Создать Запись в notification_preferences

## 🔍 Проблема

API возвращает:
```json
"preferences": {
  "severity_filter": null,
  "notify_on_recovery": null,
  "notify_on_stale": null,
  "notify_on_return": null
}
```

**Причина**: В таблице `notification_preferences` **нет записи** для `subscription_id = 3`.

---

## ⚡ РЕШЕНИЕ: Создать Запись

### **Вариант 1: Через SQL (Быстрый)**

```powershell
cd C:\Projects\fiscal-monitor

docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "
INSERT INTO notification_preferences 
  (subscription_id, severity_filter, notify_on_recovery, notify_on_stale, notify_on_return)
VALUES 
  (3, ARRAY['DANGER', 'CRITICAL']::TEXT[], true, true, true)
ON CONFLICT (subscription_id) DO UPDATE SET
  severity_filter = EXCLUDED.severity_filter,
  notify_on_recovery = EXCLUDED.notify_on_recovery,
  notify_on_stale = EXCLUDED.notify_on_stale,
  notify_on_return = EXCLUDED.notify_on_return;
"

# Проверить
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "SELECT * FROM notification_preferences WHERE subscription_id = 3;"
```

---

### **Вариант 2: Через Портал (Правильный)**

Исправим backend, чтобы **автоматически создавал** запись при первом сохранении.

Откройте: `backend/routes/portal-telegram.js`

Найдите функцию `PUT /preferences` (строка ~340) и измените на:

```javascript
router.put('/preferences', async (req, res) => {
  try {
    const shopInn = req.shopInn;
    const { severity_filter, notify_on_recovery, notify_on_stale, notify_on_return } = req.body;

    // Валидация severity_filter
    const validSeverities = ['INFO', 'WARN', 'DANGER', 'CRITICAL'];
    if (!Array.isArray(severity_filter) || !severity_filter.every(s => validSeverities.includes(s))) {
      return res.status(400).json({ 
        error: 'Invalid severity_filter. Must be array of: INFO, WARN, DANGER, CRITICAL' 
      });
    }

    // Получить активную подписку
    const subResult = await db.query(
      `SELECT id FROM notification_subscriptions 
       WHERE shop_inn = $1 AND status = 'active'`,
      [shopInn]
    );

    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: 'Подписка не найдена' });
    }

    const subscriptionId = subResult.rows[0].id;

    // Обновить или создать preferences (UPSERT)
    await db.query(`
      INSERT INTO notification_preferences 
        (subscription_id, severity_filter, notify_on_recovery, notify_on_stale, notify_on_return)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (subscription_id) 
      DO UPDATE SET
        severity_filter = EXCLUDED.severity_filter,
        notify_on_recovery = EXCLUDED.notify_on_recovery,
        notify_on_stale = EXCLUDED.notify_on_stale,
        notify_on_return = EXCLUDED.notify_on_return,
        updated_at = NOW()
    `, [
      subscriptionId,
      severity_filter,
      notify_on_recovery !== undefined ? notify_on_recovery : true,
      notify_on_stale !== undefined ? notify_on_stale : true,
      notify_on_return !== undefined ? notify_on_return : true
    ]);

    res.json({ success: true, message: 'Настройки сохранены' });

  } catch (error) {
    logger.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## 🎯 БЫСТРОЕ РЕШЕНИЕ (Одна Команда)

```powershell
cd C:\Projects\fiscal-monitor; `
Write-Host "`n=== Создание записи preferences ===" -ForegroundColor Yellow; `
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "INSERT INTO notification_preferences (subscription_id, severity_filter, notify_on_recovery, notify_on_stale, notify_on_return) VALUES (3, ARRAY['DANGER', 'CRITICAL']::TEXT[], true, true, true) ON CONFLICT (subscription_id) DO UPDATE SET severity_filter = EXCLUDED.severity_filter, notify_on_recovery = EXCLUDED.notify_on_recovery, notify_on_stale = EXCLUDED.notify_on_stale, notify_on_return = EXCLUDED.notify_on_return;"; `
Write-Host "`n=== Проверка ===" -ForegroundColor Cyan; `
docker exec -i fiscal-monitor-db psql -U postgres -d fiscal_monitor -c "SELECT * FROM notification_preferences WHERE subscription_id = 3;"; `
Write-Host "`n=== Тест API ===" -ForegroundColor Magenta; `
$token = "85fbd14d9b2f33fcbc955789bd1d1677253f170b4aa70b5adf9adaee58d16f37"; `
$response = Invoke-WebRequest -Uri "https://fiscaldrive.sbg.network/api/v1/portal/telegram/status" -Headers @{"X-Token"=$token} -UseBasicParsing; `
$response.Content | ConvertFrom-Json | Select-Object -ExpandProperty preferences | ConvertTo-Json; `
Write-Host "`n✅ ГОТОВО! Откройте портал" -ForegroundColor Green; `
Write-Host "URL: https://fiscaldrive.sbg.network/portal/login" -ForegroundColor Cyan
```

---

## 🧪 Проверка После Создания

### **1. Проверить API:**
```powershell
$token = "85fbd14d9b2f33fcbc955789bd1d1677253f170b4aa70b5adf9adaee58d16f37"
$response = Invoke-WebRequest -Uri "https://fiscaldrive.sbg.network/api/v1/portal/telegram/status" -Headers @{"X-Token"=$token} -UseBasicParsing
$response.Content | ConvertFrom-Json | Select-Object -ExpandProperty preferences | ConvertTo-Json
```

**Ожидаемый результат:**
```json
{
  "severity_filter": ["DANGER", "CRITICAL"],  ← Массив (не null!)
  "notify_on_recovery": true,
  "notify_on_stale": true,
  "notify_on_return": true
}
```

---

### **2. Проверить в Браузере:**

1. Откройте **инкогнито** (Ctrl+Shift+N)
2. Перейдите: https://fiscaldrive.sbg.network/portal/login
3. Введите токен: `85fbd14d9b2f33fcbc955789bd1d1677253f170b4aa70b5adf9adaee58d16f37`
4. **Telegram** → **Настройки уведомлений**
5. ✅ Уровень важности должен быть: **DANGER**

---

### **3. Тест Сохранения:**

```
1. Изменить на: INFO
2. Нажать: "Сохранить настройки"
3. ✅ Показывает: "Настройки сохранены"
4. ✅ Страница перезагружается
5. ✅ Уровень важности: INFO ← Сохранилось!
```

---

## 📊 Что Произошло

### **ДО:**
```sql
SELECT * FROM notification_preferences WHERE subscription_id = 3;
-- 0 rows (пусто!)
```

### **ПОСЛЕ:**
```sql
SELECT * FROM notification_preferences WHERE subscription_id = 3;

subscription_id | severity_filter         | notify_on_recovery | notify_on_stale | notify_on_return
----------------|-------------------------|--------------------|-----------------|-----------------
3               | {DANGER,CRITICAL}       | t                  | t               | t
```

---

## 🔍 Почему Это Произошло?

1. **Подписка создана** через админку (одобрение запроса)
2. **Preferences НЕ создались** автоматически
3. **API возвращает `null`** из LEFT JOIN (нет данных)
4. **Frontend не может отобразить** настройки

---

## ✅ Долгосрочное Решение

Обновить backend, чтобы **автоматически создавать preferences** при:
1. Одобрении подписки (admin)
2. Первом сохранении настроек (portal)

---

## 📝 Коммиты (После Исправления Backend)

После внесения изменений в `backend/routes/portal-telegram.js`:

```powershell
cd C:\Projects\fiscal-monitor
git add backend/routes/portal-telegram.js
git commit -m "fix: Auto-create preferences with UPSERT on first save"
git push origin main
docker-compose restart backend
```

---

## 🎯 Итог

**Выполните команду выше** для создания записи preferences для subscription_id = 3.

После этого:
- ✅ API вернёт данные из БД
- ✅ Frontend покажет правильные настройки
- ✅ Сохранение будет работать

---

✅ **Выполните команду и проверьте! 🚀**
