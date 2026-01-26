# ⚡ Windows Quick Reference

## 🚀 Основные команды

### Запуск проекта
```powershell
# Двойной клик на файл:
start-all.bat

# Или через PowerShell (лучше):
.\start-all.ps1

# Или напрямую:
docker-compose up -d --build
```

### Остановка
```powershell
.\stop-all.ps1
# или
docker-compose down
```

### Статус
```powershell
.\status.ps1
# или
docker-compose ps
```

### Логи
```powershell
.\logs.ps1
# или
docker-compose logs -f
```

---

## 📝 Первоначальная настройка

### 1. Создать Telegram бота
```
Telegram → @BotFather
/newbot → сохранить токен
/setprivacy → Disable
```

### 2. Настроить .env
```env
TELEGRAM_BOT_TOKEN=ваш_токен
TELEGRAM_BOT_USERNAME=ваш_username
ADMIN_API_KEY=секретный_ключ
```

### 3. Запустить
```powershell
.\start-all.ps1
```

---

## ✅ Проверки

```powershell
# Backend API
curl http://localhost:3001/health

# Статус контейнеров
docker-compose ps

# Telegram бот
# В Telegram: /start
```

---

## 🔧 Полезные команды Docker

```powershell
# Все логи (live)
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f telegram-bot
docker-compose logs -f notification-worker

# Перезапуск всех
docker-compose restart

# Перезапуск конкретного
docker-compose restart backend

# Статистика ресурсов
docker stats

# Зайти в контейнер
docker-compose exec backend sh

# SQL запрос
docker-compose exec postgres psql -U postgres -d fiscal_monitor -c "SELECT * FROM notification_subscriptions;"
```

---

## 📊 SQL через Docker

```powershell
# Подключиться к БД
docker-compose exec postgres psql -U postgres -d fiscal_monitor

# Внутри psql:
\dt                  # список таблиц
\d tablename         # структура таблицы
\q                   # выход

# Бэкап
docker-compose exec postgres pg_dump -U postgres fiscal_monitor > backup.sql

# Восстановление
Get-Content backup.sql | docker-compose exec -T postgres psql -U postgres -d fiscal_monitor
```

---

## 🎯 Тестирование

### PowerShell команды

```powershell
# 1. Активировать подписку
$headers = @{"X-Admin-Key"="your-key"; "Content-Type"="application/json"}
$body = @{registration_id=1; duration_months=1} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/admin/telegram/activate" -Method POST -Headers $headers -Body $body

# 2. Сгенерировать код
$headers = @{"X-Token"="client-token"}
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/portal/telegram/generate-code" -Method POST -Headers $headers

# 3. В Telegram боте: /connect КОД
```

---

## 🐛 Troubleshooting

```powershell
# Пересобрать все контейнеры
docker-compose down
docker-compose up -d --build --force-recreate

# Проверить логи ошибок
docker-compose logs | Select-String "error"

# Очистить всё и начать заново
docker-compose down -v
docker-compose up -d --build

# Проверить сеть
docker network ls
docker network inspect fiscal-monitor_default
```

---

## 🌐 Точки доступа

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Nginx (unified):** http://localhost:8080
- **Cloudflare:** https://fiscaldrive.sbg.network

---

## 📂 Структура файлов

```
start-all.ps1      ← Запуск (PowerShell, лучше)
start-all.bat      ← Запуск (Batch)
stop-all.ps1       ← Остановка
status.ps1         ← Статус
logs.ps1           ← Логи
.env               ← Конфигурация (не коммитится!)
.env.example       ← Пример конфигурации
docker-compose.yml ← Docker конфигурация
```

---

## 📚 Документация

- **WINDOWS_SETUP.md** - ⭐ Полное руководство для Windows
- **HOW_TO_RUN.md** - Общее руководство
- **QUICK_START.md** - Быстрый старт
- **CHEATSHEET.md** - Шпаргалка команд

---

**GitHub:** https://github.com/FuzzyDi/fiscal-monitor-site

**Версия:** 1.0.0 Windows
