# 🪟 Fiscal Monitor - Windows Setup Guide

## 🎯 Для Windows + Docker + Cloudflared

Это руководство специально для вашей среды!

---

## ✅ Предварительные требования

1. **✅ Docker Desktop** - уже установлен
2. **✅ Cloudflared** - уже настроен
3. **⏳ Telegram Bot** - нужно создать

---

## 🚀 Быстрый старт (3 шага)

### Шаг 1: Создайте Telegram бота

1. Откройте Telegram на телефоне/компьютере
2. Найдите **@BotFather**
3. Отправьте: `/newbot`
4. Введите название: `Fiscal Monitor Bot`
5. Введите username: `YourCompanyFiscalBot` (должен заканчиваться на `bot`)
6. **СОХРАНИТЕ ТОКЕН!** 
   ```
   Пример: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
   ```
7. Отправьте: `/setprivacy`
8. Выберите вашего бота
9. Выберите: **Disable**

### Шаг 2: Настройте .env файл

Откройте файл `.env` в корне проекта и обновите:

```env
# Измените эти строки:
TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
TELEGRAM_BOT_USERNAME=ваш_username_бота

# Также рекомендуется сменить:
ADMIN_API_KEY=ваш_секретный_ключ

# URL вашего портала (через Cloudflare Tunnel)
PORTAL_URL=https://fiscaldrive.sbg.network
```

### Шаг 3: Запустите через Docker

**Вариант A - Batch файл (двойной клик):**
```
Дважды кликните на: start-all.bat
```

**Вариант B - PowerShell (рекомендуется):**
```powershell
.\start-all.ps1
```

**Вариант C - Командная строка:**
```cmd
docker-compose up -d --build
```

**Готово!** 🎉

---

## 📂 Структура Windows скриптов

```
fiscal-monitor/
├── start-all.bat        ← Запуск (Batch)
├── start-all.ps1        ← Запуск (PowerShell, лучше)
├── stop-all.bat         ← Остановка (Batch)
├── stop-all.ps1         ← Остановка (PowerShell)
├── restart-all.bat      ← Перезапуск (Batch)
├── status.bat           ← Статус (Batch)
├── status.ps1           ← Статус (PowerShell, показывает больше)
├── logs.bat             ← Логи (Batch)
├── logs.ps1             ← Логи (PowerShell)
├── docker-compose.yml   ← Конфигурация Docker
└── .env                 ← Переменные окружения
```

---

## 🎮 Управление сервисами

### Запуск
```powershell
# PowerShell (рекомендуется)
.\start-all.ps1

# Или Batch
start-all.bat

# Или напрямую
docker-compose up -d --build
```

### Остановка
```powershell
.\stop-all.ps1
# или
docker-compose down
```

### Перезапуск
```powershell
docker-compose restart
```

### Статус
```powershell
.\status.ps1
# или
docker-compose ps
```

### Логи
```powershell
# Все логи (live)
.\logs.ps1
# или
docker-compose logs -f

# Только backend
docker-compose logs -f backend

# Только Telegram бот
docker-compose logs -f telegram-bot

# Только worker
docker-compose logs -f notification-worker
```

---

## ✅ Проверка работы

### 1. Проверьте статус контейнеров
```powershell
docker-compose ps
```

Должны быть запущены:
- ✅ fiscal-monitor-db (PostgreSQL)
- ✅ fiscal-monitor-backend
- ✅ fiscal-monitor-telegram-bot
- ✅ fiscal-monitor-worker
- ✅ fiscal-monitor-frontend
- ✅ fiscal-monitor-nginx

### 2. Проверьте Backend API
```powershell
curl http://localhost:3001/health
```

Ожидаемый ответ:
```json
{"status":"ok","timestamp":"2026-01-26T..."}
```

### 3. Проверьте Nginx (unified endpoint)
```powershell
curl http://localhost:8080/api/v1/admin/overview -H "X-Admin-Key: your-key"
```

### 4. Проверьте Telegram бота
Откройте вашего бота в Telegram и отправьте:
```
/start
```

Бот должен ответить приветствием.

---

## 🔧 Cloudflare Tunnel Integration

Если у вас уже настроен Cloudflare Tunnel, добавьте в конфигурацию:

### cloudflared-config.yml
```yaml
tunnel: ваш-tunnel-id
credentials-file: /path/to/credentials.json

ingress:
  # Unified endpoint (Frontend + Backend)
  - hostname: fiscaldrive.sbg.network
    service: http://localhost:8080
  
  # Прямой доступ к Backend (опционально)
  - hostname: api.fiscaldrive.sbg.network
    service: http://localhost:3001
  
  # Catch-all
  - service: http_status:404
```

### Запуск Cloudflared (Windows)
```powershell
cloudflared tunnel run
```

Или через systemd/service, если настроили.

---

## 🎯 Полный тестовый флоу

### 1. Админ активирует подписку

```powershell
$headers = @{
    "X-Admin-Key" = "your-admin-key"
    "Content-Type" = "application/json"
}

$body = @{
    registration_id = 1
    duration_months = 1
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/v1/admin/telegram/activate" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

### 2. Клиент генерирует код

```powershell
$headers = @{
    "X-Token" = "client-token"
}

$response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/portal/telegram/generate-code" `
    -Method POST `
    -Headers $headers

Write-Host "Код подключения: $($response.code)"
```

### 3. Клиент подключает в Telegram

```
/connect 123456
```

Бот подтвердит подключение!

---

## 📊 Мониторинг

### Docker Dashboard
Docker Desktop имеет встроенный GUI для мониторинга:
1. Откройте Docker Desktop
2. Перейдите в "Containers"
3. Найдите контейнеры `fiscal-monitor-*`

### Логи в реальном времени
```powershell
docker-compose logs -f --tail=100
```

### Статистика ресурсов
```powershell
docker stats
```

---

## 🐛 Troubleshooting

### Контейнеры не запускаются

```powershell
# Проверьте логи
docker-compose logs

# Проверьте статус Docker
docker ps -a

# Пересоберите контейнеры
docker-compose down
docker-compose up -d --build --force-recreate
```

### Backend не отвечает

```powershell
# Проверьте логи backend
docker-compose logs backend

# Проверьте здоровье контейнера
docker inspect fiscal-monitor-backend

# Рестарт backend
docker-compose restart backend
```

### Telegram бот не работает

```powershell
# Проверьте логи
docker-compose logs telegram-bot

# Проверьте .env
Get-Content .env | Select-String "TELEGRAM"

# Проверьте токен через API
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getMe"
```

### База данных не доступна

```powershell
# Проверьте контейнер PostgreSQL
docker-compose logs postgres

# Подключитесь к БД
docker-compose exec postgres psql -U postgres -d fiscal_monitor

# Проверьте таблицы
docker-compose exec postgres psql -U postgres -d fiscal_monitor -c "\dt"
```

### Порт занят

```powershell
# Проверьте, кто использует порт 3001
netstat -ano | findstr :3001

# Убить процесс (замените PID)
taskkill /PID <PID> /F

# Или измените порт в docker-compose.yml
```

---

## 🔐 Безопасность для Production

### ⚠️ ВАЖНО перед запуском на продакшене:

1. **Смените ADMIN_API_KEY**
   ```env
   ADMIN_API_KEY=сложный_случайный_ключ_64_символа
   ```

2. **Настройте SSL/HTTPS через Cloudflare**
   - ✅ У вас уже настроен Cloudflare Tunnel
   - ✅ Убедитесь, что SSL включен

3. **Измените пароль PostgreSQL**
   ```yaml
   # В docker-compose.yml:
   POSTGRES_PASSWORD: сложный_пароль
   ```

4. **Включите firewall**
   ```powershell
   # Разрешите только локальный доступ к PostgreSQL
   ```

5. **Регулярные бэкапы**
   ```powershell
   # Создайте scheduled task для бэкапов
   docker-compose exec postgres pg_dump -U postgres fiscal_monitor > backup.sql
   ```

---

## 📋 SQL Management через Docker

### Подключение к БД
```powershell
docker-compose exec postgres psql -U postgres -d fiscal_monitor
```

### Выполнение SQL запросов
```powershell
# Проверить подписки
docker-compose exec postgres psql -U postgres -d fiscal_monitor -c "SELECT * FROM notification_subscriptions;"

# Проверить активные Telegram подключения
docker-compose exec postgres psql -U postgres -d fiscal_monitor -c "SELECT * FROM telegram_connections WHERE is_active = true;"
```

### Бэкап БД
```powershell
docker-compose exec postgres pg_dump -U postgres fiscal_monitor > backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql
```

### Восстановление БД
```powershell
Get-Content backup.sql | docker-compose exec -T postgres psql -U postgres -d fiscal_monitor
```

---

## 📚 Полезные ссылки

- **Docker Desktop:** https://www.docker.com/products/docker-desktop
- **Cloudflare Tunnel:** https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- **Telegram BotFather:** https://t.me/BotFather
- **GitHub Repo:** https://github.com/FuzzyDi/fiscal-monitor-site

---

## 🎉 Готово!

После выполнения этих шагов, весь проект будет запущен в Docker и доступен через Cloudflare Tunnel!

**Основные команды для Windows:**

```powershell
# Запуск
.\start-all.ps1

# Статус
.\status.ps1

# Логи
.\logs.ps1

# Остановка
.\stop-all.ps1
```

**Точки доступа:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Nginx (unified): http://localhost:8080
- Cloudflare: https://fiscaldrive.sbg.network

---

**Версия:** 1.0.0 для Windows  
**Дата:** 2026-01-26
