# 🔧 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Severity Filter Column Type

## Проблема
**Ошибка**: `value too long for type character varying(20)`

**Причина**: Колонка `severity_filter` в таблице `notification_preferences` имеет тип `VARCHAR(20)`, но backend пытается сохранить массив текстовых значений.

---

## ⚡ СРОЧНОЕ РЕШЕНИЕ

### Вариант 1: Через Docker (Рекомендуется)

```powershell
# 1. Скопировать SQL-файл в контейнер
cd C:\Projects\fiscal-monitor
docker cp fix-severity-filter-type.sql fiscal-monitor-postgres:/tmp/

# 2. Применить миграцию
docker exec -i fiscal-monitor-postgres psql -U postgres -d fiscal_monitor < fix-severity-filter-type.sql

# 3. Проверить результат
docker exec -i fiscal-monitor-postgres psql -U postgres -d fiscal_monitor -c "\d notification_preferences"
```

### Вариант 2: Прямой SQL-запрос

```powershell
cd C:\Projects\fiscal-monitor

# Выполнить напрямую
docker exec -i fiscal-monitor-postgres psql -U postgres -d fiscal_monitor -c "
BEGIN;

-- Удалить старую колонку
ALTER TABLE notification_preferences DROP COLUMN IF EXISTS severity_filter;

-- Создать новую колонку правильного типа
ALTER TABLE notification_preferences 
  ADD COLUMN severity_filter TEXT[] DEFAULT ARRAY['DANGER', 'CRITICAL']::TEXT[];

-- Создать индекс для производительности
CREATE INDEX IF NOT EXISTS idx_notification_preferences_severity 
  ON notification_preferences USING GIN (severity_filter);

COMMIT;
"

# Проверить
docker exec -i fiscal-monitor-postgres psql -U postgres -d fiscal_monitor -c "\d notification_preferences"
```

### Вариант 3: Через docker-compose exec

```powershell
cd C:\Projects\fiscal-monitor

docker-compose exec postgres psql -U postgres -d fiscal_monitor << 'EOF'
BEGIN;

ALTER TABLE notification_preferences DROP COLUMN IF EXISTS severity_filter;
ALTER TABLE notification_preferences 
  ADD COLUMN severity_filter TEXT[] DEFAULT ARRAY['DANGER', 'CRITICAL']::TEXT[];

CREATE INDEX IF NOT EXISTS idx_notification_preferences_severity 
  ON notification_preferences USING GIN (severity_filter);

COMMIT;
EOF
```

---

## 📋 Одна Команда для Всего

```powershell
cd C:\Projects\fiscal-monitor; `
Write-Host "`n=== Применение исправления ===" -ForegroundColor Yellow; `
docker exec -i fiscal-monitor-postgres psql -U postgres -d fiscal_monitor -c "BEGIN; ALTER TABLE notification_preferences DROP COLUMN IF EXISTS severity_filter; ALTER TABLE notification_preferences ADD COLUMN severity_filter TEXT[] DEFAULT ARRAY['DANGER', 'CRITICAL']::TEXT[]; CREATE INDEX IF NOT EXISTS idx_notification_preferences_severity ON notification_preferences USING GIN (severity_filter); COMMIT;"; `
Write-Host "`n=== Проверка структуры таблицы ===" -ForegroundColor Cyan; `
docker exec -i fiscal-monitor-postgres psql -U postgres -d fiscal_monitor -c "\d notification_preferences"; `
Write-Host "`n=== Перезапуск backend ===" -ForegroundColor Green; `
docker-compose restart backend; `
Start-Sleep -Seconds 10; `
docker-compose logs backend --tail=20; `
Write-Host "`n✅ Исправление применено!" -ForegroundColor Green; `
Write-Host "Откройте браузер в инкогнито: https://fiscaldrive.sbg.network/portal/login" -ForegroundColor Cyan; `
Write-Host "Токен: 27df158781b9c27b02f65745bb82c81793e34aa4180fb33d15b9a4c0e8b43b18" -ForegroundColor Yellow
```

---

## 🔍 Проверка После Применения

### 1. Проверить структуру таблицы

```powershell
docker exec -i fiscal-monitor-postgres psql -U postgres -d fiscal_monitor -c "\d notification_preferences"
```

**Ожидаемый результат:**
```
Column          | Type      | Modifiers
----------------|-----------|----------
severity_filter | text[]    | default ARRAY['DANGER', 'CRITICAL']::text[]
```

### 2. Проверить данные

```powershell
docker exec -i fiscal-monitor-postgres psql -U postgres -d fiscal_monitor -c "SELECT subscription_id, severity_filter FROM notification_preferences;"
```

### 3. Протестировать сохранение

1. Откройте: https://fiscaldrive.sbg.network/portal/login
2. Введите токен: `27df158781b9c27b02f65745bb82c81793e34aa4180fb33d15b9a4c0e8b43b18`
3. Перейдите в **Telegram** → **Настройки уведомлений**
4. Выберите **Уровень важности**: CRITICAL
5. Нажмите **Сохранить настройки**

**Ожидаемый результат:** ✅ **Настройки сохранены**

### 4. Проверить логи backend

```powershell
docker-compose logs backend --tail=50 | Select-String "preferences|severity|error"
```

**Не должно быть:**
- ❌ `value too long for type character varying(20)`
- ❌ `Internal server error`

---

## 🎯 Что Изменилось

### ДО:
```sql
severity_filter VARCHAR(20)  -- ❌ Не может хранить массив
```

### ПОСЛЕ:
```sql
severity_filter TEXT[]  -- ✅ Массив текстовых значений
```

### Примеры Данных:

```sql
-- ДО (ошибка):
severity_filter = 'DANGER,CRITICAL'  -- ❌ Строка длиной > 20 символов

-- ПОСЛЕ (корректно):
severity_filter = ARRAY['DANGER', 'CRITICAL']::TEXT[]  -- ✅ Массив
```

---

## 📊 Техническая Информация

### Изменения в БД:
- **Таблица**: `notification_preferences`
- **Колонка**: `severity_filter`
- **Старый тип**: `VARCHAR(20)`
- **Новый тип**: `TEXT[]`
- **Значение по умолчанию**: `ARRAY['DANGER', 'CRITICAL']::TEXT[]`
- **Индекс**: `idx_notification_preferences_severity` (GIN)

### Backend (portal-telegram.js):
```javascript
// Запрос на обновление:
UPDATE notification_preferences 
SET 
  severity_filter = $1,           -- TEXT[] массив
  notify_on_recovery = $2,        -- BOOLEAN
  notify_on_stale = $3,           -- BOOLEAN
  notify_on_return = $4,          -- BOOLEAN
  updated_at = NOW()
WHERE subscription_id = $5
```

### Frontend (telegram.js):
```javascript
// Конвертация UI → API:
const severityMap = {
  'CRITICAL': ['CRITICAL'],
  'DANGER': ['DANGER', 'CRITICAL'],
  'WARN': ['WARN', 'DANGER', 'CRITICAL'],
  'INFO': ['INFO', 'WARN', 'DANGER', 'CRITICAL']
};

// Отправка:
body: JSON.stringify({
  ...preferences,
  severity_filter: severityMap[preferences.severity_filter]
})
```

---

## 🚀 Коммиты

- **4902af5** — `fix: Add SQL migration to fix severity_filter column type`
- **2c7e418** — `fix: Convert severity_filter between string (UI) and array (API)`
- **f708a53** — `fix: Add text-gray-900 to all input/select fields`

**GitHub**: https://github.com/FuzzyDi/fiscal-monitor-site

---

## ⚠️ Важно

1. **Backup БД** (рекомендуется):
   ```powershell
   docker exec -i fiscal-monitor-postgres pg_dump -U postgres fiscal_monitor > backup.sql
   ```

2. **После применения** — перезапустить backend:
   ```powershell
   docker-compose restart backend
   ```

3. **Очистить кэш браузера** или использовать **инкогнито** (Ctrl+Shift+N)

---

## 📞 Если Не Работает

Пришлите:
1. Вывод команды проверки структуры таблицы
2. Логи backend: `docker-compose logs backend --tail=100`
3. Скриншот DevTools → Network → Request Payload

---

✅ **Готово! После применения исправления настройки уведомлений будут сохраняться корректно.**
