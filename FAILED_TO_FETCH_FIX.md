# 🔴 Ошибка "Failed to fetch" - Диагностика

## ❌ Проблема

При сохранении настроек уведомлений появляется ошибка:
```
Ошибка: Failed to fetch
```

## 🔍 Причина

**Frontend не может подключиться к Backend API.** Возможные причины:

1. ❌ Backend контейнер не запущен
2. ❌ Backend упал с ошибкой
3. ❌ Nginx не проксирует запросы
4. ❌ Порт 3001 не доступен

---

## 🚀 ДИАГНОСТИКА И РЕШЕНИЕ

### **Шаг 1: Проверить статус контейнеров**

```powershell
cd C:\Projects\fiscal-monitor
docker-compose ps
```

**Что должно быть:**
```
fiscal-monitor-backend    Up    healthy    0.0.0.0:3001->3001/tcp
fiscal-monitor-frontend   Up              
fiscal-monitor-nginx      Up    healthy    0.0.0.0:8080->80/tcp
fiscal-monitor-db         Up    healthy    0.0.0.0:5432->5432/tcp
```

**Если backend НЕ Up или unhealthy:**
```powershell
# Проверить логи
docker-compose logs backend --tail=50

# Перезапустить
docker-compose restart backend

# Если не помогло - пересобрать
docker-compose down
docker-compose up -d
```

---

### **Шаг 2: Проверить логи Backend**

```powershell
docker-compose logs backend --tail=100 | Select-String "error|running|listen"
```

**Что должно быть:**
```
✅ Fiscal Monitor API running on 0.0.0.0:3001
✅ New database connection established
```

**Если есть ошибки:**
```powershell
# Смотреть полные логи
docker-compose logs backend --tail=200

# Типичные ошибки:
# - EADDRINUSE: port 3001 already in use
# - Database connection failed
# - TypeError/SyntaxError в коде
```

---

### **Шаг 3: Проверить API напрямую**

```powershell
# Health check
curl http://localhost:3001/health -UseBasicParsing

# Должно вернуть:
# StatusCode: 200
# Content: {"status":"ok","timestamp":"..."}
```

**Если НЕ работает:**
```powershell
# Порт занят?
netstat -ano | findstr :3001

# Если порт занят другим процессом - убить его
taskkill /PID <номер_процесса> /F

# Перезапустить backend
docker-compose restart backend
```

---

### **Шаг 4: Проверить Nginx**

```powershell
docker-compose logs nginx --tail=50 | Select-String "error|upstream"
```

**Типичные ошибки:**
```
❌ connect() failed (111: Connection refused)
   → Backend не отвечает

❌ upstream timed out
   → Backend слишком долго отвечает

❌ no live upstreams
   → Backend контейнер недоступен
```

**Решение:**
```powershell
# Перезапустить всё
docker-compose restart nginx backend
```

---

### **Шаг 5: Полный перезапуск**

Если ничего не помогло:

```powershell
cd C:\Projects\fiscal-monitor

# Остановить всё
docker-compose down

# Подождать
Start-Sleep -Seconds 3

# Запустить заново
docker-compose up -d

# Подождать 15 секунд
Start-Sleep -Seconds 15

# Проверить статус
docker-compose ps

# Проверить логи
docker-compose logs backend --tail=30
docker-compose logs nginx --tail=30
```

---

## ✅ БЫСТРАЯ ПРОВЕРКА

### **Одна команда для диагностики:**

```powershell
cd C:\Projects\fiscal-monitor; Write-Host "`n=== Статус контейнеров ===" -ForegroundColor Cyan; docker-compose ps; Write-Host "`n=== Backend Health ===" -ForegroundColor Cyan; curl http://localhost:3001/health -UseBasicParsing | Select-Object StatusCode, Content; Write-Host "`n=== Backend логи (последние 20) ===" -ForegroundColor Cyan; docker-compose logs backend --tail=20 | Select-String "running|error|listen" | Select-Object -Last 10
```

---

## 🔧 РЕШЕНИЯ ПО ТИПАМ ОШИБОК

### 1. **Backend не запущен**
```powershell
docker-compose up -d backend
Start-Sleep -Seconds 5
docker-compose ps backend
```

### 2. **Порт 3001 занят**
```powershell
# Найти процесс
netstat -ano | findstr :3001

# Убить процесс
taskkill /PID <PID> /F

# Перезапустить
docker-compose restart backend
```

### 3. **Database connection failed**
```powershell
# Проверить PostgreSQL
docker-compose ps db

# Если не работает
docker-compose restart db
Start-Sleep -Seconds 5
docker-compose restart backend
```

### 4. **Frontend не обновлён**
```powershell
# Пересобрать frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### 5. **Nginx не проксирует**
```powershell
# Проверить конфиг nginx
docker-compose exec nginx nginx -t

# Перезапустить
docker-compose restart nginx
```

---

## 📊 Проверочный чек-лист

После исправления проверьте:

- [ ] `docker-compose ps` — все контейнеры **Up**
- [ ] `curl http://localhost:3001/health` — возвращает **200**
- [ ] Backend логи показывают **"API running on 0.0.0.0:3001"**
- [ ] Nginx логи **БЕЗ ошибок** "connection refused"
- [ ] Открыть портал: https://fiscaldrive.sbg.network/portal/telegram
- [ ] Изменить настройки и нажать "Сохранить"
- [ ] Должно показать: **"Настройки сохранены"** ✅

---

## 🎯 Если всё ещё не работает

### Проверьте .env файлы:

```powershell
# Backend .env
Get-Content backend\.env | Select-String "PORT|DATABASE_URL"

# Должно быть:
# PORT=3001
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fiscal_monitor
```

### Проверьте docker-compose.yml:

```powershell
Get-Content docker-compose.yml | Select-String "3001|backend"

# Должно содержать:
# ports:
#   - "3001:3001"
```

---

## 🆘 Экстренное решение

Если ничего не помогает — полная переустановка:

```powershell
cd C:\Projects\fiscal-monitor

# Остановить всё
docker-compose down

# Удалить образы
docker rmi fiscal-monitor-backend fiscal-monitor-frontend fiscal-monitor-nginx

# Пересобрать всё
docker-compose build --no-cache

# Запустить
docker-compose up -d

# Подождать 30 секунд
Start-Sleep -Seconds 30

# Проверить
docker-compose ps
curl http://localhost:3001/health -UseBasicParsing
```

---

## 📝 Полезные команды

```powershell
# Статус всех контейнеров
docker-compose ps

# Логи всех сервисов
docker-compose logs --tail=50

# Логи конкретного сервиса
docker-compose logs backend --tail=100
docker-compose logs frontend --tail=100
docker-compose logs nginx --tail=100

# Перезапуск сервиса
docker-compose restart backend

# Остановка всех
docker-compose down

# Запуск всех
docker-compose up -d

# Пересборка конкретного сервиса
docker-compose build --no-cache backend
docker-compose up -d backend
```

---

## 🔗 Дополнительные проверки

### Проверить API endpoints напрямую:

```powershell
# Health
curl http://localhost:3001/health -UseBasicParsing

# Telegram status (с токеном)
$token = "27df158781b9c27b02f65745bb82c81793e34aa4180fb33d15b9a4c0e8b43b18"
Invoke-WebRequest -Uri "http://localhost:3001/api/v1/portal/telegram/status" -Headers @{"X-Token"=$token} -UseBasicParsing | Select-Object StatusCode, Content
```

---

## 🎉 Когда всё работает

После успешного исправления вы должны видеть:

1. ✅ Все контейнеры в статусе **Up** и **healthy**
2. ✅ Backend отвечает на `/health` с кодом **200**
3. ✅ Портал открывается: https://fiscaldrive.sbg.network
4. ✅ Настройки Telegram **сохраняются без ошибок**
5. ✅ Сообщение: **"Настройки сохранены"**

---

**Выполните диагностику и скопируйте результаты!** 🚀

Если проблема не решается — поделитесь выводом команд:
- `docker-compose ps`
- `docker-compose logs backend --tail=50`
- `curl http://localhost:3001/health`
