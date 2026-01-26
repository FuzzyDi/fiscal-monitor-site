# 🚀 Deployment Guide - Fiscal Monitor

Это руководство поможет вам развернуть Fiscal Monitor в облаке.

## 📋 Содержание

1. [Railway.app](#railwayapp-рекомендуется) - Самый простой
2. [Render.com](#rendercom) - Полностью бесплатный
3. [Fly.io](#flyio) - Docker-friendly
4. [DigitalOcean](#digitalocean) - Для продакшена

---

## 🎯 Railway.app (РЕКОМЕНДУЕТСЯ)

### Почему Railway?
- ✅ $5 бесплатно каждый месяц
- ✅ Поддержка PostgreSQL из коробки
- ✅ Автодеплой из GitHub
- ✅ SSL включен
- ✅ Простая настройка

### Шаги:

#### 1. Подготовка

```bash
# Установите Railway CLI
npm install -g @railway/cli

# Или через curl
curl -fsSL https://railway.app/install.sh | sh
```

#### 2. Залогиньтесь

```bash
railway login
```

#### 3. Создайте проект

```bash
cd fiscal-monitor
railway init
```

#### 4. Создайте PostgreSQL базу

```bash
railway add -d postgres
```

#### 5. Настройте переменные окружения

```bash
# Backend
railway variables set ADMIN_API_KEY="your-secret-admin-key-123456"
railway variables set STALE_MINUTES="15"
railway variables set HOST="0.0.0.0"

# Frontend (автоматически)
# NEXT_PUBLIC_API_URL будет установлен Railway
```

#### 6. Деплой Backend

```bash
cd backend
railway up

# Запомните URL, например: https://fiscal-backend.railway.app
```

#### 7. Деплой Frontend

```bash
cd ../frontend

# Установите API URL
railway variables set NEXT_PUBLIC_API_URL="https://fiscal-backend.railway.app"

railway up
```

#### 8. Инициализируйте базу данных

```bash
# Подключитесь к базе
railway connect postgres

# Выполните schema.sql
\i backend/schema.sql

# Выйдите
\q
```

#### 9. Готово!

Ваш сервис доступен по адресу: `https://fiscal-monitor.railway.app`

---

## 🆓 Render.com

### Плюсы:
- ✅ Полностью бесплатный
- ✅ PostgreSQL включена (90 дней)
- ✅ Автодеплой

### Минусы:
- ⚠️ Засыпает после 15 минут
- ⚠️ База удаляется через 90 дней

### Шаги:

#### 1. Создайте GitHub репозиторий

```bash
cd fiscal-monitor
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/fiscal-monitor.git
git push -u origin main
```

#### 2. Зарегистрируйтесь на Render.com

Перейдите на [render.com](https://render.com) и зарегистрируйтесь через GitHub.

#### 3. Создайте PostgreSQL базу

1. Dashboard → New → PostgreSQL
2. Name: `fiscal-monitor-db`
3. Plan: **Free**
4. Create Database

Скопируйте **Internal Database URL** (начинается с `postgres://`)

#### 4. Создайте Backend Service

1. Dashboard → New → Web Service
2. Connect your GitHub repo
3. Настройки:
   - **Name:** `fiscal-monitor-backend`
   - **Region:** Frankfurt (ближайший к Узбекистану)
   - **Branch:** main
   - **Root Directory:** `backend`
   - **Environment:** Docker
   - **Docker Command:** оставьте пустым
   - **Plan:** Free

4. Environment Variables:
   ```
   PORT=3001
   DATABASE_URL=<Internal Database URL из шага 3>
   ADMIN_API_KEY=your-secret-key-123456
   STALE_MINUTES=15
   HOST=0.0.0.0
   ```

5. **Create Web Service**

Подождите ~5 минут. Скопируйте URL: `https://fiscal-monitor-backend.onrender.com`

#### 5. Инициализируйте базу данных

В настройках PostgreSQL базы:
1. Нажмите **Connect** → **External Connection**
2. Используйте `psql`:

```bash
psql postgresql://user:password@host/database < backend/schema.sql
```

#### 6. Создайте Frontend Service

1. Dashboard → New → Web Service
2. Connect your GitHub repo
3. Настройки:
   - **Name:** `fiscal-monitor-frontend`
   - **Region:** Frankfurt
   - **Branch:** main
   - **Root Directory:** `frontend`
   - **Environment:** Docker
   - **Plan:** Free

4. Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://fiscal-monitor-backend.onrender.com
   PORT=3000
   HOSTNAME=0.0.0.0
   ```

5. **Create Web Service**

#### 7. Готово!

Frontend доступен: `https://fiscal-monitor-frontend.onrender.com`

**⚠️ Важно:** Первый запрос может занять 30 секунд (cold start).

---

## 🐳 Fly.io

### Плюсы:
- ✅ $5 free credit/месяц
- ✅ Docker support
- ✅ Persistent storage
- ✅ Быстрый

### Шаги:

#### 1. Установите Fly CLI

```bash
# Linux/Mac
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

#### 2. Залогиньтесь

```bash
fly auth login
```

#### 3. Создайте PostgreSQL

```bash
fly postgres create --name fiscal-monitor-db --region fra
```

Сохраните connection string!

#### 4. Деплой Backend

```bash
cd backend

# Создайте fly.toml
fly launch --name fiscal-monitor-backend --region fra --no-deploy

# Установите secrets
fly secrets set ADMIN_API_KEY="your-secret-key"
fly secrets set DATABASE_URL="postgres://..."

# Деплой
fly deploy
```

#### 5. Деплой Frontend

```bash
cd ../frontend

# Создайте fly.toml
fly launch --name fiscal-monitor-frontend --region fra --no-deploy

# Установите API URL
fly secrets set NEXT_PUBLIC_API_URL="https://fiscal-monitor-backend.fly.dev"

# Деплой
fly deploy
```

#### 6. Инициализируйте базу

```bash
fly postgres connect -a fiscal-monitor-db

# В psql:
\i backend/schema.sql
\q
```

---

## 💎 DigitalOcean (Продакшен)

### Стоимость: $6/месяц

### Плюсы:
- ✅ Полный контроль
- ✅ SSH доступ
- ✅ Можно делать backup
- ✅ Надежно

### Шаги:

#### 1. Создайте Droplet

1. Зарегистрируйтесь на [digitalocean.com](https://digitalocean.com)
2. Create → Droplets
3. Настройки:
   - **Image:** Ubuntu 24.04 LTS
   - **Plan:** Basic ($6/mo) - 1 GB RAM
   - **Region:** Frankfurt
   - **Authentication:** SSH Key
4. Create Droplet

#### 2. Подключитесь к серверу

```bash
ssh root@your_droplet_ip
```

#### 3. Установите Docker

```bash
# Обновите систему
apt update && apt upgrade -y

# Установите Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установите Docker Compose
apt install docker-compose -y
```

#### 4. Загрузите проект

```bash
# Через Git
apt install git -y
git clone https://github.com/YOUR_USERNAME/fiscal-monitor.git
cd fiscal-monitor

# Или через SCP с локальной машины:
# scp -r fiscal-monitor root@your_droplet_ip:/root/
```

#### 5. Настройте переменные

```bash
# Backend
cd backend
cp .env.example .env
nano .env

# Установите:
# ADMIN_API_KEY=your-secret-key
# DATABASE_URL=postgresql://postgres:postgres@postgres:5432/fiscal_monitor
```

```bash
# Frontend
cd ../frontend
cp .env.example .env.local
nano .env.local

# Установите:
# NEXT_PUBLIC_API_URL=http://your_droplet_ip:3001
```

#### 6. Запустите

```bash
cd ..
docker-compose up -d
```

#### 7. Настройте Nginx (опционально)

```bash
# Установите Nginx
apt install nginx -y

# Создайте конфиг
nano /etc/nginx/sites-available/fiscal-monitor
```

Содержимое конфига:

```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

Активируйте:

```bash
ln -s /etc/nginx/sites-available/fiscal-monitor /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

#### 8. Настройте SSL (Let's Encrypt)

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d your_domain.com
```

#### 9. Готово!

Доступ: `https://your_domain.com`

---

## 🔒 Безопасность для продакшена

### 1. Firewall

```bash
# UFW
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

### 2. Fail2ban

```bash
apt install fail2ban -y
systemctl enable fail2ban
```

### 3. Автообновления

```bash
apt install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades
```

### 4. Backup

```bash
# Backup базы данных
docker-compose exec postgres pg_dump -U postgres fiscal_monitor > backup.sql

# Или автоматический backup (cron):
0 2 * * * docker-compose exec postgres pg_dump -U postgres fiscal_monitor > /backup/fiscal_$(date +\%Y\%m\%d).sql
```

---

## 📊 Сравнение вариантов

| Платформа | Цена | Сложность | Производительность | SSL | Backup |
|-----------|------|-----------|-------------------|-----|--------|
| Railway | $5/мес (free tier) | ⭐ Легко | ⭐⭐⭐ Хорошо | ✅ Да | ❌ Нет |
| Render | Бесплатно | ⭐⭐ Средне | ⭐⭐ Средне | ✅ Да | ❌ Нет |
| Fly.io | $5/мес | ⭐⭐⭐ Сложно | ⭐⭐⭐⭐ Отлично | ✅ Да | ✅ Да |
| DigitalOcean | $6/мес | ⭐⭐⭐⭐ Очень сложно | ⭐⭐⭐⭐⭐ Отлично | ⚙️ Настройка | ✅ Да |

---

## 🎯 Рекомендации

### Для тестирования:
**Railway** - проще не бывает

### Для MVP/стартапа:
**Render** - бесплатно и достаточно

### Для серьезного бизнеса:
**DigitalOcean** - полный контроль и надежность

---

## 🆘 Поддержка

Если возникли проблемы:
1. Проверьте логи: `docker-compose logs -f`
2. Проверьте переменные окружения
3. Проверьте firewall/security groups
4. Проверьте DATABASE_URL

Удачи! 🚀
