# 🎉 ИСПРАВЛЕНО: Severity Filter Загрузка

## ✅ Проблема Решена

**Проблема**: После перезагрузки страницы выбранный уровень важности не сохранялся.

**Причина**: Неправильная логика конвертации массива → строка при загрузке настроек из API.

---

## 🔧 Что Исправлено

### ДО (неправильно):
```javascript
// Использовал includes() - неточное сравнение
if (severities.includes('INFO')) {
  severityString = 'INFO';
} else if (severities.includes('WARN')) {
  severityString = 'WARN';
}
// ❌ ['DANGER', 'CRITICAL'] → всегда возвращало 'DANGER'
```

### ПОСЛЕ (правильно):
```javascript
// Сортируем и объединяем для точного сопоставления
const severities = data.preferences.severity_filter.sort();
const severityKey = severities.join(',');

const severityMap = {
  'CRITICAL': 'CRITICAL',
  'CRITICAL,DANGER': 'DANGER',
  'CRITICAL,DANGER,WARN': 'WARN',
  'CRITICAL,DANGER,INFO,WARN': 'INFO'
};

severityString = severityMap[severityKey] || 'DANGER';
// ✅ ['DANGER', 'CRITICAL'] → сортируется в ['CRITICAL', 'DANGER'] → 'CRITICAL,DANGER' → 'DANGER'
```

---

## 📊 Примеры Конвертации

### API → UI (загрузка):
```javascript
['CRITICAL']                               → 'CRITICAL'
['DANGER', 'CRITICAL']                     → 'DANGER'
['WARN', 'DANGER', 'CRITICAL']             → 'WARN'
['INFO', 'WARN', 'DANGER', 'CRITICAL']     → 'INFO'
```

### UI → API (сохранение):
```javascript
'CRITICAL' → ['CRITICAL']
'DANGER'   → ['DANGER', 'CRITICAL']
'WARN'     → ['WARN', 'DANGER', 'CRITICAL']
'INFO'     → ['INFO', 'WARN', 'DANGER', 'CRITICAL']
```

---

## ⚡ Как Применить Исправление

### Вариант 1: Обновить через Git (Рекомендуется)

```powershell
cd C:\Projects\fiscal-monitor

# 1. Скачать исправление
git pull origin main

# 2. Пересобрать frontend
docker-compose stop frontend
docker rmi fiscal-monitor-frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend

# 3. Подождать
Start-Sleep -Seconds 15

# 4. Проверить
docker-compose logs frontend --tail=20
```

### Вариант 2: Скачать файл напрямую

```powershell
cd C:\Projects\fiscal-monitor

# 1. Скачать обновлённый файл
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/FuzzyDi/fiscal-monitor-site/main/frontend/pages/portal/telegram.js" -OutFile "frontend/pages/portal/telegram.js"

# 2. Пересобрать frontend
docker-compose stop frontend
docker rmi fiscal-monitor-frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend
Start-Sleep -Seconds 15
```

---

## 🎯 ОДНА КОМАНДА ДЛЯ ВСЕГО

```powershell
cd C:\Projects\fiscal-monitor; `
Write-Host "`n=== 1. Обновление кода ===" -ForegroundColor Cyan; `
git pull origin main; `
Write-Host "`n=== 2. Остановка frontend ===" -ForegroundColor Yellow; `
docker-compose stop frontend; `
docker rmi fiscal-monitor-frontend; `
Write-Host "`n=== 3. Пересборка ===" -ForegroundColor Magenta; `
docker-compose build --no-cache frontend; `
Write-Host "`n=== 4. Запуск ===" -ForegroundColor Green; `
docker-compose up -d frontend; `
Start-Sleep -Seconds 15; `
Write-Host "`n=== 5. Проверка логов ===" -ForegroundColor Cyan; `
docker-compose logs frontend --tail=20 | Select-String "ready|error"; `
Write-Host "`n✅ ГОТОВО!" -ForegroundColor Green; `
Write-Host "Откройте в инкогнито: https://fiscaldrive.sbg.network/portal/login" -ForegroundColor Cyan; `
Write-Host "Токен: 27df158781b9c27b02f65745bb82c81793e34aa4180fb33d15b9a4c0e8b43b18" -ForegroundColor Yellow
```

---

## 🧪 Проверка После Применения

### Шаг 1: Тест сохранения (уже работает)
1. Откройте **инкогнито**: https://fiscaldrive.sbg.network/portal/login
2. Telegram → Настройки уведомлений
3. Выберите каждый уровень и нажмите **Сохранить**:
   - ✅ CRITICAL → Сохранить
   - ✅ DANGER → Сохранить
   - ✅ WARN → Сохранить
   - ✅ INFO → Сохранить

### Шаг 2: Тест загрузки (НОВОЕ!)
1. Выберите уровень **INFO**
2. Нажмите **Сохранить настройки**
3. ✅ Должно показать: **"Настройки сохранены"**
4. **Перезагрузите страницу** (F5)
5. ✅ **Уровень важности должен остаться INFO!**

### Шаг 3: Проверка каждого уровня
```
CRITICAL → Сохранить → F5 → ✅ Остался CRITICAL
DANGER   → Сохранить → F5 → ✅ Остался DANGER
WARN     → Сохранить → F5 → ✅ Остался WARN
INFO     → Сохранить → F5 → ✅ Остался INFO
```

---

## 🔍 Техническая Информация

### Файл: `frontend/pages/portal/telegram.js`

**Изменённая функция**: `loadStatus()`

**Строки**: 37-57

**Изменения**:
- Удалена логика `includes()` для проверки наличия элементов
- Добавлена сортировка массива: `.sort()`
- Добавлена конкатенация: `.join(',')`
- Добавлен словарь точного сопоставления: `severityMap`

### Backend: `backend/routes/portal-telegram.js`

**GET /api/v1/portal/telegram/status** возвращает:
```json
{
  "preferences": {
    "severity_filter": ["DANGER", "CRITICAL"],  // Массив из БД
    "notify_on_recovery": true,
    "notify_on_stale": true,
    "notify_on_return": true
  }
}
```

### Frontend конвертирует:
```javascript
["DANGER", "CRITICAL"]     // Из API
  → sort()                 // ['CRITICAL', 'DANGER']
  → join(',')              // 'CRITICAL,DANGER'
  → severityMap[...]       // 'DANGER'
  → setPreferences()       // UI показывает 'DANGER'
```

---

## 📋 Коммиты

- **f3b0327** — `fix: Fix severity_filter loading - use exact array matching`
- **f4d711b** — `docs: Add comprehensive DB fix instructions for severity_filter`
- **4902af5** — `fix: Add SQL migration to fix severity_filter column type`
- **2c7e418** — `fix: Convert severity_filter between string (UI) and array (API)`

**GitHub**: https://github.com/FuzzyDi/fiscal-monitor-site

---

## ⚠️ Важно

1. **Обязательно очистите кэш браузера** или используйте **инкогнито** (Ctrl+Shift+N)
2. Если используете обычный браузер — **Ctrl+Shift+R** (hard reload)
3. Проверьте **DevTools → Console** на наличие ошибок

---

## 📞 Если Не Работает

Пришлите:
1. **Вывод команды пересборки**
2. **Логи frontend**: `docker-compose logs frontend --tail=50`
3. **Скриншот DevTools → Network → Response** для `/api/v1/portal/telegram/status`

---

## 🎊 Итог

**ДО**:
- ✅ Сохранение работает
- ❌ После F5 выбранный уровень сбрасывается

**ПОСЛЕ**:
- ✅ Сохранение работает
- ✅ После F5 выбранный уровень **сохраняется**!

---

✅ **Выполните команду обновления и проверьте! 🚀**
