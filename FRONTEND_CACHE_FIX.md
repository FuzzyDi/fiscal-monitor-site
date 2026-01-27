# 🔍 Проверка и исправление кэша frontend

## Проблема
Frontend отправляет старый код (строку вместо массива) для severity_filter.

## Решение

### Шаг 1: Убедитесь что код обновлён локально

```powershell
cd C:\Projects\fiscal-monitor

# Проверить последние коммиты
git log --oneline -5

# Должно быть:
# 2c7e418 fix: Convert severity_filter between string (UI) and array (API)
```

Если нет — обновите:
```powershell
git pull origin main
```

### Шаг 2: Проверьте что файл исправлен локально

```powershell
Select-String "severityMap" frontend/pages/portal/telegram.js
```

Должно показать:
```javascript
const severityMap = {
  'CRITICAL': ['CRITICAL'],
  'DANGER': ['DANGER', 'CRITICAL'],
  ...
}
```

Если **НЕТ** — скачайте файл напрямую:
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/FuzzyDi/fiscal-monitor-site/main/frontend/pages/portal/telegram.js" -OutFile "frontend/pages/portal/telegram.js"
```

### Шаг 3: Полная пересборка frontend

```powershell
cd C:\Projects\fiscal-monitor

# Остановить frontend
docker-compose stop frontend

# Удалить образ
docker rmi fiscal-monitor-frontend

# Удалить .next кэш (если есть volume)
docker volume ls | Select-String "fiscal-monitor"
# Если есть volume с .next — удалить его

# Пересобрать БЕЗ кэша
docker-compose build --no-cache frontend

# Запустить
docker-compose up -d frontend

# Подождать 20 секунд
Start-Sleep -Seconds 20

# Проверить логи
docker-compose logs frontend --tail=30
```

### Шаг 4: Проверить внутри контейнера

```powershell
# Проверить что файл правильный внутри контейнера
docker-compose exec frontend sh -c "grep -n severityMap /app/pages/portal/telegram.js"
```

Если команда не работает (sh не найден), попробуйте:
```powershell
docker-compose exec frontend cat /app/pages/portal/telegram.js | Select-String "severityMap" -Context 5
```

### Шаг 5: Очистить кэш браузера

#### Вариант A: DevTools Hard Reload (Chrome/Edge)
```
1. F12 (открыть DevTools)
2. Правой кнопкой на ⟳ (Обновить)
3. "Empty Cache and Hard Reload"
```

#### Вариант B: Полная очистка
```
1. Ctrl+Shift+Delete
2. Период: "Всё время"
3. ☑ Кэшированные изображения и файлы
4. Удалить
5. Перезапустить браузер
```

#### Вариант C: Режим инкогнито (рекомендуется)
```
1. Ctrl+Shift+N
2. https://fiscaldrive.sbg.network/portal/login
3. Токен: 27df158781b9c27b02f65745bb82c81793e34aa4180fb33d15b9a4c0e8b43b18
```

### Шаг 6: Проверить в DevTools

После открытия страницы:
```
1. F12 → Network
2. Очистить (🚫)
3. Telegram → Изменить настройки → Сохранить
4. Смотрите запрос "preferences":
   - Request Payload должен содержать:
     severity_filter: ["DANGER", "CRITICAL"]  ← МАССИВ!
```

## Одна команда для всего

```powershell
cd C:\Projects\fiscal-monitor; Write-Host "=== Обновление кода ===" -ForegroundColor Cyan; git pull origin main; Write-Host "`n=== Проверка файла ===" -ForegroundColor Cyan; Select-String "severityMap" frontend/pages/portal/telegram.js | Select-Object -First 3; Write-Host "`n=== Пересборка ===" -ForegroundColor Yellow; docker-compose stop frontend; docker rmi fiscal-monitor-frontend; docker-compose build --no-cache frontend; docker-compose up -d frontend; Start-Sleep -Seconds 20; Write-Host "`n=== Статус ===" -ForegroundColor Green; docker-compose ps frontend; Write-Host "`n✅ Готово! Откройте в инкогнито: Ctrl+Shift+N" -ForegroundColor Green; Write-Host "https://fiscaldrive.sbg.network/portal/login" -ForegroundColor Cyan
```

## Если ВСЕГО этого недостаточно

### Проблема: Next.js кэширует сборку

Next.js может кэшировать сборку внутри контейнера. Решение:

```powershell
cd C:\Projects\fiscal-monitor

# Удалить всё
docker-compose down

# Удалить volumes (если есть)
docker volume prune -f

# Удалить образ
docker rmi fiscal-monitor-frontend

# Пересобрать с нуля
docker-compose build --no-cache frontend

# Запустить
docker-compose up -d

# Подождать
Start-Sleep -Seconds 30

# Проверить
docker-compose ps
```

## Финальная проверка

### В PowerShell:
```powershell
# Проверить что файл обновлён локально
Get-Content frontend/pages/portal/telegram.js | Select-String "severityMap" -Context 10
```

### В браузере (инкогнито):
```
1. Ctrl+Shift+N
2. F12 → Network
3. Открыть: https://fiscaldrive.sbg.network/portal/login
4. Найти запрос telegram.js (или telegram-[hash].js)
5. Кликнуть → вкладка Response
6. Найти "severityMap" — должно быть!
```

### В DevTools Console:
Вставьте и выполните:
```javascript
fetch('/api/v1/portal/telegram/preferences', {
  method: 'PUT',
  headers: {
    'X-Token': localStorage.getItem('portalToken'),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    severity_filter: ['DANGER', 'CRITICAL'],
    notify_on_recovery: true,
    notify_on_stale: true,
    notify_on_return: true
  })
}).then(r => r.json()).then(console.log)
```

Должно вернуть:
```json
{"success": true, "preferences": {...}}
```

Если возвращает — значит API работает, проблема в frontend коде!

## Экстренное решение

Если ничего не помогает — скачайте файл напрямую с GitHub:

```powershell
cd C:\Projects\fiscal-monitor
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/FuzzyDi/fiscal-monitor-site/main/frontend/pages/portal/telegram.js" -OutFile "frontend/pages/portal/telegram.js"
docker-compose build --no-cache frontend
docker-compose up -d frontend
```
