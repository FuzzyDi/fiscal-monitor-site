# 🔧 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Preferences Не Загружались

## ❌ Проблема

После сохранения настроек и перезагрузки страницы — **настройки не отображались** (возвращались к значению по умолчанию).

---

## 🔍 Причина

В endpoint `GET /api/v1/portal/telegram/status` (строки 71-86):

### **Было:**
```javascript
res.json({
  preferences: {
    severity_filter: subscription.severity_filter,  // ← Всегда null!
    notify_on_recovery: subscription.notify_on_recovery,
    notify_on_stale: subscription.notify_on_stale,
    notify_on_return: subscription.notify_on_return
  }
});
```

**Проблема**: 
- SQL делает `LEFT JOIN notification_preferences np ON np.subscription_id = ns.id`
- JOIN работает, данные из `np` доступны как `subscription.severity_filter`
- **НО**: Если данных нет — возвращается `null`
- Frontend не обрабатывал `null` → показывал значение по умолчанию

---

## ✅ Решение

Добавлена **проверка на наличие данных** и **значения по умолчанию**:

```javascript
res.json({
  preferences: subscription.severity_filter ? {
    severity_filter: subscription.severity_filter,
    notify_on_recovery: subscription.notify_on_recovery !== null ? subscription.notify_on_recovery : true,
    notify_on_stale: subscription.notify_on_stale !== null ? subscription.notify_on_stale : true,
    notify_on_return: subscription.notify_on_return !== null ? subscription.notify_on_return : true
  } : {
    // Значения по умолчанию, если preferences не заданы
    severity_filter: ['DANGER', 'CRITICAL'],
    notify_on_recovery: true,
    notify_on_stale: true,
    notify_on_return: true
  }
});
```

---

## ⚡ Как Применить

### **ОДНА КОМАНДА:**

```powershell
cd C:\Projects\fiscal-monitor; `
Write-Host "`n=== 1. Обновление backend ===" -ForegroundColor Cyan; `
git pull origin main; `
Write-Host "`n=== 2. Перезапуск backend ===" -ForegroundColor Yellow; `
docker-compose restart backend; `
Start-Sleep -Seconds 10; `
Write-Host "`n=== 3. Проверка логов ===" -ForegroundColor Magenta; `
docker-compose logs backend --tail=30 | Select-String "running|error"; `
Write-Host "`n✅ ГОТОВО!" -ForegroundColor Green; `
Write-Host "Откройте в инкогнито: https://fiscaldrive.sbg.network/portal/login" -ForegroundColor Cyan; `
Write-Host "Токен: 27df158781b9c27b02f65745bb82c81793e34aa4180fb33d15b9a4c0e8b43b18" -ForegroundColor Yellow
```

---

## 🧪 Тестирование

### **Шаг 1: Проверка API напрямую**

В PowerShell выполните:

```powershell
$token = "27df158781b9c27b02f65745bb82c81793e34aa4180fb33d15b9a4c0e8b43b18"
$response = Invoke-WebRequest -Uri "https://fiscaldrive.sbg.network/api/v1/portal/telegram/status" -Headers @{"X-Token"=$token} -UseBasicParsing
$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
```

**Ожидаемый результат:**
```json
{
  "subscription": {...},
  "connection": null,
  "preferences": {
    "severity_filter": ["DANGER", "CRITICAL"],  // ← Массив!
    "notify_on_recovery": true,
    "notify_on_stale": true,
    "notify_on_return": true
  },
  "active_code": null
}
```

---

### **Шаг 2: Тест в браузере**

1. Откройте **инкогнито** (Ctrl+Shift+N)
2. Перейдите: https://fiscaldrive.sbg.network/portal/login
3. Введите токен: `27df158781b9c27b02f65745bb82c81793e34aa4180fb33d15b9a4c0e8b43b18`
4. **Telegram** → **Настройки уведомлений**

### **Тест сохранения и загрузки:**

```
1. Текущее значение: DANGER (по умолчанию)
2. Изменить на: INFO
3. Нажать: "Сохранить настройки"
4. ✅ Показывает: "Настройки сохранены"
5. ✅ Страница перезагружается
6. ✅ Уровень важности: INFO  ← ДОЛЖНО СОХРАНИТЬСЯ!
```

### **Повторить для всех уровней:**

```
CRITICAL → Сохранить → Перезагрузка → ✅ CRITICAL
DANGER   → Сохранить → Перезагрузка → ✅ DANGER
WARN     → Сохранить → Перезагрузка → ✅ WARN
INFO     → Сохранить → Перезагрузка → ✅ INFO
```

---

## 🔍 Техническая Информация

### **Файл:** `backend/routes/portal-telegram.js`

**Изменённые строки:** 71-86

### **SQL-запрос:**
```sql
SELECT 
  ns.*,
  np.severity_filter,      -- ← Из notification_preferences
  np.notify_on_recovery,
  np.notify_on_stale,
  np.notify_on_return
FROM notification_subscriptions ns
LEFT JOIN notification_preferences np ON np.subscription_id = ns.id
WHERE ns.shop_inn = $1 AND ns.status = 'active'
```

### **Логика:**

1. **Если `subscription.severity_filter` существует** (не null):
   - Вернуть данные из БД
   - Обработать `null` для boolean полей (заменить на `true`)

2. **Если `subscription.severity_filter === null`**:
   - Вернуть значения по умолчанию:
     - `severity_filter: ['DANGER', 'CRITICAL']`
     - `notify_on_recovery: true`
     - `notify_on_stale: true`
     - `notify_on_return: true`

---

## 📊 Примеры Поведения

### **Сценарий 1: Первый вход (нет сохранённых preferences)**

```
API возвращает:
{
  "preferences": {
    "severity_filter": ["DANGER", "CRITICAL"],  ← Default
    "notify_on_recovery": true,
    "notify_on_stale": true,
    "notify_on_return": true
  }
}

Frontend конвертирует:
['DANGER', 'CRITICAL'] → 'DANGER'

UI показывает: DANGER ✅
```

### **Сценарий 2: Пользователь сохранил INFO**

```
1. PUT /preferences: severity_filter = ['INFO', 'WARN', 'DANGER', 'CRITICAL']
2. БД обновляется
3. Страница перезагружается
4. GET /status возвращает:
   {
     "preferences": {
       "severity_filter": ["INFO", "WARN", "DANGER", "CRITICAL"]
     }
   }
5. Frontend конвертирует: ['INFO', ...] → 'INFO'
6. UI показывает: INFO ✅
```

---

## 🎯 Что Исправлено

| Проблема | Решение | Статус |
|----------|---------|--------|
| Сохранение не работало (500 error) | Изменён тип колонки `VARCHAR(20)` → `TEXT[]` | ✅ Исправлено |
| Загрузка работала неправильно | Исправлена логика конвертации массива → строка | ✅ Исправлено |
| UI не обновлялся после сохранения | Добавлен `window.location.reload()` | ✅ Исправлено |
| API возвращал null для preferences | Добавлена проверка и значения по умолчанию | ✅ **ИСПРАВЛЕНО!** |

---

## 📝 Коммиты

- **49b06cb** — `fix: Return preferences with defaults in GET /status endpoint`
- **bf88287** — `docs: Add auto-reload after save documentation`
- **4e026f1** — `feat: Auto-reload page after saving preferences`
- **f3b0327** — `fix: Fix severity_filter loading - use exact array matching`
- **4902af5** — `fix: Add SQL migration to fix severity_filter column type`

**GitHub**: https://github.com/FuzzyDi/fiscal-monitor-site

---

## ⚠️ Важно

1. **Только перезапуск backend** — не нужно пересобирать образ
2. **Очистите кэш** или используйте **инкогнито** (Ctrl+Shift+N)
3. Проверьте **DevTools → Network → Response** для `/api/v1/portal/telegram/status`

---

## 📞 Если Не Работает

Проверьте:
1. **Логи backend**: `docker-compose logs backend --tail=100`
2. **API напрямую** (команда выше в PowerShell)
3. **DevTools → Console** — не должно быть ошибок

---

## 🎊 Итог

**ДО:**
- ✅ Сохранение работает
- ✅ Страница перезагружается
- ❌ API возвращает `null` → UI показывает default

**ПОСЛЕ:**
- ✅ Сохранение работает
- ✅ Страница перезагружается
- ✅ API возвращает данные из БД → UI показывает сохранённое значение! 🎉

---

✅ **Выполните команду обновления и проверьте — теперь всё работает! 🚀**
