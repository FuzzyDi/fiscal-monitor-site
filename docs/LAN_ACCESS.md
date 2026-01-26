# LAN Access Configuration Guide

## Проблема
По умолчанию Next.js слушает только на localhost (127.0.0.1), что не позволяет подключаться с других устройств в сети.

## Решение

### 1. Для Docker (Production)
Уже настроено! Docker автоматически слушает на всех интерфейсах.

Просто запустите:
```bash
docker-compose up -d
```

Теперь доступно:
- `http://localhost:3000` (с этого ПК)
- `http://192.168.80.19:3000` (с любого устройства в сети)
- `http://YOUR_IP:3000` (замените YOUR_IP на ваш IP)

### 2. Для локальной разработки (без Docker)

#### Windows PowerShell:
```powershell
# Backend
cd backend
$env:HOST="0.0.0.0"
npm run dev

# Frontend (в другом терминале)
cd frontend
$env:HOSTNAME="0.0.0.0"
npm run dev
```

#### Linux/Mac:
```bash
# Backend
cd backend
HOST=0.0.0.0 npm run dev

# Frontend (в другом терминале)
cd frontend
HOSTNAME=0.0.0.0 npm run dev
```

### 3. Настройка API URL для LAN доступа

При доступе через IP адрес, нужно указать правильный API URL.

Создайте `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://192.168.80.19:3001
```

Замените `192.168.80.19` на ваш реальный IP адрес.

### 4. Узнать свой IP адрес

**Windows:**
```powershell
ipconfig
# Ищите "IPv4 Address" в секции вашего сетевого адаптера
```

**Linux/Mac:**
```bash
ip addr show
# или
ifconfig
```

## Проверка доступности

### С этого компьютера:
```bash
# Frontend
curl http://localhost:3000

# Backend
curl http://localhost:3001/health
```

### С другого устройства в сети:
```bash
# Frontend
curl http://192.168.80.19:3000

# Backend
curl http://192.168.80.19:3001/health
```

## Firewall (Брандмауэр)

### Windows
Убедитесь что порты 3000 и 3001 открыты в Windows Firewall:

```powershell
# Открыть порты (запустите PowerShell как Администратор)
New-NetFirewallRule -DisplayName "Fiscal Monitor Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Fiscal Monitor Backend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

Или через GUI:
1. Откройте "Windows Defender Firewall"
2. "Advanced settings"
3. "Inbound Rules" → "New Rule"
4. Port → TCP → 3000, 3001
5. Allow connection

### Linux
```bash
# UFW
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp

# firewalld
sudo firewall-cmd --add-port=3000/tcp --permanent
sudo firewall-cmd --add-port=3001/tcp --permanent
sudo firewall-cmd --reload
```

## Troubleshooting

### Проблема: "Failed to connect to server"

**Решение 1:** Проверьте API URL
```bash
# Откройте DevTools в браузере (F12)
# Во вкладке Console посмотрите куда идут запросы
# Должно быть: http://192.168.80.19:3001/api/...
```

Если запросы идут на `localhost`, обновите `NEXT_PUBLIC_API_URL`:
```powershell
cd frontend
echo "NEXT_PUBLIC_API_URL=http://192.168.80.19:3001" > .env.local
docker-compose restart frontend
```

**Решение 2:** Проверьте что backend доступен
```bash
curl http://192.168.80.19:3001/health
```

Если не работает:
```powershell
# Убедитесь что backend слушает на 0.0.0.0
docker-compose logs backend
# Должно быть: "Fiscal Monitor API running on 0.0.0.0:3001"
```

**Решение 3:** Проверьте firewall
```powershell
# Windows - временно отключите firewall для теста
# Если заработало - нужно добавить правила (см. выше)
```

### Проблема: "Cannot paste token" или токен не вводится

**Причина:** Браузер блокирует вставку паролей по соображениям безопасности.

**Решение:** Введите токен вручную посимвольно, или:
1. Откройте DevTools (F12)
2. Console
3. Выполните:
```javascript
document.querySelector('input[type="password"]').value = 'ваш-токен-здесь'
```

### Проблема: Localhost работает, IP нет

**Решение:** Docker не слушает на внешних интерфейсах

```bash
# Проверьте что контейнеры запущены правильно
docker-compose ps

# Пересоздайте с новыми настройками
docker-compose down
docker-compose up -d --build

# Проверьте логи
docker-compose logs backend | grep "running on"
# Должно быть: 0.0.0.0:3001
```

## Для продакшена

В продакшене используйте:
- Nginx reverse proxy
- SSL сертификаты
- Доменное имя

См. `docs/DEPLOYMENT.md` для подробностей.

## Security Note

⚠️ **Важно:** Когда открываете порты в локальной сети, убедитесь что:
1. Используете сильные пароли для ADMIN_API_KEY
2. Регулярно ротируете access tokens
3. В продакшене используйте HTTPS
4. Не открывайте порты в интернет без firewall и reverse proxy
