# Telegram Troubleshooting Guide

## ✅ Проблема: "Internal server error" при запросе активации Telegram

### Симптомы
- В клиентском портале (`http://localhost:8080/portal/telegram`) при нажатии кнопки **"Запросить активацию"** появляется ошибка
- В консоли браузера: `500 Internal Server Error`

### Причина
Backend не может подключиться к PostgreSQL базе данных по одной из причин:
1. PostgreSQL не запущен
2. База данных `fiscal_monitor` не создана
3. Таблицы не созданы (нет миграции)
4. Неправильный пароль в `DATABASE_URL`

---

## 🔧 Решение для Windows (Docker Compose)

### Шаг 1: Получить последние изменения

```powershell
cd C:\Projects\fiscal-monitor
git pull
```

### Шаг 2: Применить миграцию Telegram таблиц

Запустите скрипт миграции:

```powershell
.\apply-migration.ps1
```

При запросе подтвердите: **Y**

Что делает скрипт:
- Добавляет 8 новых таблиц для Telegram в существующую БД
- **НЕ удаляет** старые данные
- После выполнения у вас будет **12 таблиц** вместо 4

### Шаг 3: Проверить что таблицы созданы

```powershell
docker-compose exec postgres psql -U postgres -d fiscal_monitor -c "\dt"
```

Должно быть **12 таблиц**:
```
 access_tokens
 fiscal_events
 fiscal_last_state
 notification_cooldowns
 notification_history
 notification_preferences
 notification_queue
 notification_subscription_requests
 notification_subscriptions
 registrations
 telegram_connect_codes
 telegram_connections
```

### Шаг 4: Перезапустить backend

```powershell
docker-compose restart backend
```

Или полный рестарт:

```powershell
.\restart-all.ps1
```

### Шаг 5: Проверить что работает

1. **Проверить здоровье backend:**
   ```powershell
   curl http://localhost:3001/health
   ```
   
   Ожидаемый ответ:
   ```json
   {"status":"ok","timestamp":"2026-01-26T14:17:51.563Z"}
   ```

2. **Создать тестовые данные (если еще нет):**
   - Откройте админ-панель: `http://localhost:8080/admin/login`
   - Войдите используя `ADMIN_API_KEY` из `.env`
   - Создайте Registration: INN `1234567890`, Title `Test Company`
   - Создайте Token для этого INN

3. **Войти в клиентский портал:**
   - Откройте: `http://localhost:8080/portal/login`
   - Введите токен из админки
   - Кликните **"Telegram"** в header
   - Должна открыться страница управления Telegram

4. **Запросить активацию:**
   - Нажмите **"Запросить активацию"**
   - Должно появиться сообщение: *"Запрос отправлен администратору"*

5. **Проверить в админке:**
   - Админ-панель → **Telegram** → Вкладка **"Запросы"**
   - Должен появиться ваш запрос со статусом **Pending**

---

## 🐛 Troubleshooting

### Ошибка: "Cannot connect to database"

**Решение:**

1. Проверить что PostgreSQL контейнер запущен:
   ```powershell
   docker-compose ps
   ```
   
   Должно быть:
   ```
   fiscal-monitor-db   Up
   ```

2. Если не запущен:
   ```powershell
   docker-compose up -d postgres
   ```

3. Проверить логи PostgreSQL:
   ```powershell
   docker-compose logs postgres --tail=50
   ```

### Ошибка: "Table does not exist"

**Решение:**

1. Применить миграцию:
   ```powershell
   .\apply-migration.ps1
   ```

2. Если это не помогает, пересоздать БД:
   ```powershell
   .\reset-db.ps1
   ```
   
   **⚠️ ВНИМАНИЕ:** Это удалит ВСЕ данные!

### Ошибка: "password authentication failed"

**Решение:**

1. Проверить `.env` файл:
   ```powershell
   notepad .env
   ```

2. Убедиться что `DATABASE_URL` правильный:
   ```
   DATABASE_URL=postgresql://postgres:postgres@postgres:5432/fiscal_monitor
   ```

3. Перезапустить контейнеры:
   ```powershell
   docker-compose restart
   ```

### Frontend не показывает кнопку Telegram

**Решение:**

1. Пересобрать frontend:
   ```powershell
   .\rebuild.ps1
   ```

2. Очистить кэш браузера: `Ctrl+Shift+R` (Chrome) или `Ctrl+F5` (Firefox)

3. Проверить логи frontend:
   ```powershell
   docker-compose logs frontend --tail=50
   ```

---

## ✅ Полный тестовый сценарий

### 1. Подготовка

```powershell
cd C:\Projects\fiscal-monitor
git pull
.\apply-migration.ps1   # Введите Y для подтверждения
.\status.ps1            # Проверить что всё запущено
```

### 2. Создать тестовые данные

**Админ-панель** (`http://localhost:8080/admin/login`):

1. Login с `ADMIN_API_KEY` из `.env`
2. **Registrations** → **Add New**
   - INN: `1234567890`
   - Title: `Test Company LLC`
   - Is Active: ✅
   - Save

3. **Tokens** → **Create New**
   - INN: `1234567890`
   - Label: `Test Token`
   - Create
   - **Скопируйте токен!**

### 3. Клиентский портал

1. Откройте: `http://localhost:8080/portal/login`
2. Введите токен из шага 2
3. Кликните **"Telegram"** в header
4. Нажмите **"Запросить активацию"**
   - Комментарий: `Test request`
   - Отправить

✅ Должно появиться: *"Запрос отправлен администратору"*

### 4. Админ одобряет

**Админ-панель** → **Telegram** → Вкладка **"Запросы"**:

1. Найдите запрос от `Test Company LLC`
2. Status: **Pending**
3. Нажмите **"Одобрить"**
4. Duration: **1 month**
5. Approve

✅ Подписка активирована!

### 5. Клиент подключает Telegram

**Клиентский портал** → **Telegram**:

1. Секция **"Подключение Telegram"**
2. Нажмите **"Подключить Telegram"**
3. **Скопируйте 6-значный код** (например: `123456`)
4. Откройте Telegram бота (настройте `TELEGRAM_BOT_TOKEN` в `.env`)
5. Напишите боту:
   ```
   /connect 123456
   ```

✅ Бот ответит: *"Вы успешно подключены к системе уведомлений для Test Company LLC"*

### 6. Настройка уведомлений

**Клиентский портал** → **Telegram** → Секция **"Настройки уведомлений"**:

1. Выберите уровни severity: ✅ DANGER, ✅ CRITICAL
2. Настройки:
   - ✅ При восстановлении
   - ✅ При длительной неактивности
   - ✅ При возвращении связи
3. Save

✅ Настройки сохранены!

---

## 📊 Проверка работы системы

### Backend API

```powershell
# Health check
curl http://localhost:3001/health

# Telegram status (нужен токен)
curl -H "X-Token: YOUR_TOKEN" http://localhost:3001/api/v1/portal/telegram/status

# Admin: Список запросов (нужен ADMIN_API_KEY)
curl -H "X-Admin-Key: YOUR_ADMIN_KEY" http://localhost:3001/api/v1/admin/telegram/requests
```

### Database

```powershell
# Количество запросов
docker-compose exec postgres psql -U postgres -d fiscal_monitor -c `
  "SELECT COUNT(*) FROM notification_subscription_requests;"

# Активные подписки
docker-compose exec postgres psql -U postgres -d fiscal_monitor -c `
  "SELECT * FROM notification_subscriptions WHERE status = 'active';"

# Telegram подключения
docker-compose exec postgres psql -U postgres -d fiscal_monitor -c `
  "SELECT * FROM telegram_connections WHERE is_active = true;"
```

### Логи

```powershell
# Backend
docker-compose logs backend --tail=50 -f

# Telegram Bot
docker-compose logs telegram-bot --tail=50 -f

# Background Worker
docker-compose logs notification-worker --tail=50 -f

# Все логи
.\logs.ps1
```

---

## 🚀 Что дальше?

1. **Настроить реальный Telegram бот:**
   - Создать бота через `@BotFather`
   - Обновить `.env`:
     ```
     TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
     TELEGRAM_BOT_USERNAME=YourFiscalBot
     ```
   - Перезапустить: `docker-compose restart`

2. **Протестировать уведомления:**
   - Отправить тестовое событие в API
   - Проверить что уведомление пришло в Telegram

3. **Настроить Cloudflare Tunnel:**
   - Обновить `PORTAL_URL` в `.env`
   - Убедиться что webhook работает

4. **Настроить production окружение:**
   - Сменить `ADMIN_API_KEY` на сложный
   - Сменить пароль PostgreSQL
   - Настроить HTTPS
   - Настроить firewall

---

## 📚 Дополнительные документы

- `DATABASE_RESET.md` - Сброс базы данных
- `WINDOWS_SETUP.md` - Настройка на Windows
- `WINDOWS_CHEATSHEET.md` - Быстрая справка
- `TELEGRAM_READY.md` - Полное руководство по Telegram
- `HOW_TO_RUN.md` - Как запустить проект

---

## 🆘 Нужна помощь?

1. Проверьте логи: `.\logs.ps1`
2. Проверьте статус: `.\status.ps1`
3. Проверьте документацию в `docs/`

**GitHub:** https://github.com/FuzzyDi/fiscal-monitor-site
