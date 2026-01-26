# 🔗 Unified Endpoint Setup Guide

## Проблема

При использовании туннелей (ngrok/cloudflare) приходится запускать 2 туннеля:
- Один для frontend (port 3000)
- Один для backend (port 3001)

## Решение

Используем **Nginx** как reverse proxy, который объединит всё в один endpoint!

---

## 🎯 Архитектура

### До (2 туннеля):
```
Frontend: https://abc.ngrok.io → localhost:3000
Backend:  https://xyz.ngrok.io → localhost:3001
```

### После (1 туннель):
```
https://abc.ngrok.io → localhost:8080 (Nginx)
  ├─ /          → frontend:3000
  ├─ /api/      → backend:3001
  └─ /health    → backend:3001
```

---

## 📦 Установка

### Шаг 1: Структура проекта

Убедитесь что у вас есть файлы:
```
fiscal-monitor/
├── docker-compose.yml (обновлен с nginx)
└── nginx/
    └── nginx.conf (новый файл)
```

### Шаг 2: Пересоберите контейнеры

```powershell
cd C:\Projects\fiscal-monitor

# Остановите старые контейнеры
docker-compose down

# Пересоберите с nginx
docker-compose up -d --build

# Проверьте что все запущены
docker-compose ps
```

Должны быть 4 контейнера:
- fiscal-monitor-postgres
- fiscal-monitor-backend
- fiscal-monitor-frontend
- fiscal-monitor-nginx ← новый!

### Шаг 3: Проверьте работу

```powershell
# Откройте в браузере
start http://localhost:8080

# Проверьте API
curl http://localhost:8080/health
```

---

## 🌐 Использование с туннелями

### С ngrok (только ОДИН туннель!)

```powershell
# Запустите ОДИН туннель на nginx
ngrok http 8080
```

Получите URL, например: `https://abc123.ngrok-free.app`

**Всё работает!**
- Frontend: `https://abc123.ngrok-free.app/`
- Admin: `https://abc123.ngrok-free.app/admin/login`
- Portal: `https://abc123.ngrok-free.app/portal/login`
- API: `https://abc123.ngrok-free.app/api/v1/...`

### С Cloudflare Tunnel

```powershell
# Один туннель на nginx
cloudflared tunnel --url http://localhost:8080
```

---

## 🔧 Настройка API URL

### Для туннеля

```powershell
cd C:\Projects\fiscal-monitor

# Создайте .env файл
"NEXT_PUBLIC_API_URL=https://your-tunnel-url.com" | Out-File -FilePath .env -Encoding ASCII

# Или для ngrok
"NEXT_PUBLIC_API_URL=https://abc123.ngrok-free.app" | Out-File -FilePath .env -Encoding ASCII

# Пересоберите frontend
docker-compose up -d --build frontend
```

### Для локального использования

```powershell
# .env файл
"NEXT_PUBLIC_API_URL=http://localhost:8080" | Out-File -FilePath .env -Encoding ASCII
```

---

## 📊 Порты

| Сервис | Порт | Доступ |
|--------|------|--------|
| **Nginx** | 8080 | ✅ Публичный (используйте этот для туннеля!) |
| Frontend | 3000 | ⚠️ Внутренний (через nginx) |
| Backend | 3001 | ⚠️ Внутренний (через nginx) |
| PostgreSQL | 5432 | ⚠️ Только для разработки |

---

## 🎯 Преимущества

### ✅ Один туннель вместо двух
- Экономия (бесплатный ngrok = 1 туннель)
- Проще управлять
- Один URL для всего

### ✅ Нет CORS проблем
- Frontend и API на одном домене
- Браузер не блокирует запросы

### ✅ Как в продакшене
- Правильная архитектура
- Готово для деплоя
- SSL termination на nginx

### ✅ Гибкая настройка
- Можно добавить кеширование
- Можно настроить rate limiting
- Можно добавить basic auth

---

## 🔒 Дополнительные настройки nginx

### Rate Limiting (защита от спама)

Отредактируйте `nginx/nginx.conf`:

```nginx
# В начало файла добавьте
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

server {
    # ... existing config ...
    
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        # ... rest of config ...
    }
}
```

### Basic Auth для админки

```powershell
# Создайте пароль
docker run --rm httpd:alpine htpasswd -nb admin your-password > nginx/.htpasswd
```

В `nginx/nginx.conf`:

```nginx
location /admin {
    auth_basic "Admin Area";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://frontend:3000/admin;
}
```

Добавьте в docker-compose.yml:

```yaml
nginx:
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    - ./nginx/.htpasswd:/etc/nginx/.htpasswd:ro  # ← добавить
```

---

## 🆘 Troubleshooting

### Nginx не запускается

```powershell
# Проверьте логи
docker-compose logs nginx

# Проверьте конфигурацию
docker-compose exec nginx nginx -t
```

### 502 Bad Gateway

Значит nginx не может достучаться до backend/frontend.

```powershell
# Проверьте что все контейнеры запущены
docker-compose ps

# Перезапустите
docker-compose restart
```

### API запросы не работают

```powershell
# Проверьте что NEXT_PUBLIC_API_URL правильный
docker-compose exec frontend env | findstr API

# Должно быть: NEXT_PUBLIC_API_URL=http://localhost:8080
# Или ваш туннель URL
```

### Изменил nginx.conf но не работает

```powershell
# Перезагрузите nginx
docker-compose restart nginx

# Или пересоздайте
docker-compose up -d --force-recreate nginx
```

---

## 📝 Полный workflow

### Для локальной разработки:

```powershell
cd C:\Projects\fiscal-monitor
docker-compose up -d
start http://localhost:8080
```

### Для публикации через ngrok:

```powershell
# 1. Запустите сервисы
cd C:\Projects\fiscal-monitor
docker-compose up -d

# 2. Обновите API URL
"NEXT_PUBLIC_API_URL=https://YOUR_TUNNEL_URL" | Out-File -FilePath .env -Encoding ASCII
docker-compose up -d --build frontend

# 3. Запустите туннель (ОДИН!)
ngrok http 8080

# 4. Скопируйте URL из ngrok
# 5. Обновите .env с реальным URL
# 6. Пересоберите frontend
docker-compose up -d --build frontend
```

### Для публикации через Cloudflare:

```powershell
# 1. Запустите сервисы
docker-compose up -d

# 2. Запустите туннель
cloudflared tunnel --url http://localhost:8080

# 3. Скопируйте URL
# 4. Обновите NEXT_PUBLIC_API_URL
# 5. Пересоберите frontend
```

---

## ✅ Готово!

Теперь у вас **ОДИН endpoint** для всего!

- ✅ Один туннель
- ✅ Нет CORS
- ✅ Проще настройка
- ✅ Готово к продакшену
