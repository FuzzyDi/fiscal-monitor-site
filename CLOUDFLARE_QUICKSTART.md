# 🚀 Cloudflare Tunnel - Quick Start Guide

## Домен и публичный доступ (Cloudflare Tunnel)

Рекомендуемая схема для всех проектов в зоне **sbg.network**:

- **fiscaldrive.sbg.network** — этот проект (Fiscal Monitor)

Локальные порты в docker-compose:

- **http://localhost:8080** → этот проект (unified endpoint, container `fiscal-monitor-nginx`)

## Самый быстрый способ (1 минута):

### Вариант 1: Автоматический скрипт ⭐ РЕКОМЕНДУЕТСЯ

```powershell
cd C:\Projects\fiscal-monitor

# Запустите скрипт
.\setup-tunnel.ps1

# Скрипт спросит:
# 1. Quick Tunnel (случайный URL) - для тестирования
# 2. Named Tunnel (постоянный URL) - для продакшена

# Выберите 1 для быстрого старта!
```

### Вариант 2: Одна команда (самый простой!)

```powershell
# 1. Установите cloudflared (один раз)
winget install Cloudflare.cloudflared

# 2. Закройте и откройте PowerShell заново

# 3. Запустите туннель
cloudflared tunnel --url http://localhost:8080

# Получите URL типа:
# https://abc-def-ghi.trycloudflare.com
```

**Готово!** 🎉 Ваш сайт публично доступен!

---

## 📋 Пошаговая инструкция

### Шаг 1: Убедитесь что Fiscal Monitor запущен

```powershell
cd C:\Projects\fiscal-monitor

# Проверьте Docker
docker-compose ps

# Если не запущен - запустите
docker-compose up -d

# Проверьте что работает
start http://localhost:8080
```

### Шаг 2: Установите cloudflared

**Способ A: Через winget (рекомендуется)**

```powershell
winget install Cloudflare.cloudflared
```

После установки **закройте и откройте PowerShell заново**!

**Способ B: Через скрипт (если winget не работает)**

```powershell
.\install-cloudflared.ps1
```

**Способ C: Вручную**

1. Скачайте: https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
2. Переименуйте в `cloudflared.exe`
3. Поместите в `C:\Windows\System32`

### Шаг 3: Проверьте установку

```powershell
cloudflared --version
```

Должно показать версию, например: `cloudflared version 2024.12.2`

### Шаг 4: Запустите Quick Tunnel

```powershell
cloudflared tunnel --url http://localhost:8080
```

**Вывод будет примерно такой:**

```
2024-01-12T10:30:45Z INF Thank you for trying Cloudflare Tunnel. Doing so, without a Cloudflare account, is a quick way to experiment and try it out. However, be aware that these account-less Tunnels have no uptime guarantee. If you intend to use Tunnels in production you should use a pre-created named tunnel by following: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps
2024-01-12T10:30:45Z INF Requesting new quick Tunnel on trycloudflare.com...
2024-01-12T10:30:46Z INF +--------------------------------------------------------------------------------------------+
2024-01-12T10:30:46Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
2024-01-12T10:30:46Z INF |  https://abc-def-ghi.trycloudflare.com                                                     |
2024-01-12T10:30:46Z INF +--------------------------------------------------------------------------------------------+
```

**Скопируйте URL** (например, `https://abc-def-ghi.trycloudflare.com`)

### Шаг 5: Откройте в браузере

```powershell
start https://abc-def-ghi.trycloudflare.com
```

**Поздравляю!** 🎉 Ваш Fiscal Monitor теперь доступен из интернета!

---

## ⚠️ Важные моменты

### URL меняется при перезапуске

Quick Tunnel генерирует **новый случайный URL** каждый раз когда вы его запускаете.

**Если это проблема** → используйте Named Tunnel (см. ниже)

### Остановка туннеля

Нажмите `Ctrl + C` в окне PowerShell

### CORS ошибка?

Если видите ошибку CORS в браузере, обновите API URL:

```powershell
# Откройте НОВОЕ окно PowerShell
cd C:\Projects\fiscal-monitor\frontend

# Создайте .env.local с URL вашего туннеля
echo "NEXT_PUBLIC_API_URL=https://abc-def-ghi.trycloudflare.com" > .env.local

# Пересоберите frontend
cd ..
docker-compose restart frontend

# Подождите 30 секунд
timeout /t 30
```

---

## 🏆 Named Tunnel (для постоянного URL)

Если нужен **постоянный URL** или **custom domain**:

### Шаг 1: Залогиньтесь

```powershell
cloudflared tunnel login
```

Откроется браузер → войдите в Cloudflare (бесплатно) → разрешите доступ

### Шаг 2: Создайте туннель

```powershell
cloudflared tunnel create fiscal-monitor
```

**Вывод:**
```
Tunnel credentials written to C:\Users\YourName\.cloudflared\TUNNEL_ID.json
Created tunnel fiscal-monitor with id TUNNEL_ID
```

Запомните `TUNNEL_ID`!

### Шаг 3: Создайте конфиг

Создайте файл `C:\Users\YourName\.cloudflared\config.yml`:

```yaml
tunnel: TUNNEL_ID
credentials-file: C:\Users\YourName\.cloudflared\TUNNEL_ID.json

ingress:
  - hostname: fiscaldrive.sbg.network
    service: http://localhost:8080

  - hostname: api.fiscaldrive.sbg.network
    service: http://localhost:8080

  - service: http_status:404
```

Замените `TUNNEL_ID` на ваш ID из шага 2!

### Шаг 4: Запустите туннель

```powershell
cloudflared tunnel run fiscal-monitor
```

### Шаг 5: Настройте DNS (для custom domain)

**Если у вас доменная зона** (например, `sbg.network`) в Cloudflare:

1. Добавьте домен в Cloudflare: https://dash.cloudflare.com
2. Перейдите: Zero Trust → Networks → Tunnels
3. Найдите ваш туннель `fiscal-monitor`
4. Configure → Public Hostname → Add
5. Настройки (рекомендуемая схема):
   - **Hostname:** `fiscaldrive.sbg.network` → **Service:** `HTTP` → `localhost:8080`
   - (опционально) **Hostname:** `api.fiscaldrive.sbg.network` → **Service:** `HTTP` → `localhost:8080`
6. Save

**Готово!** Теперь:

- проект: `https://fiscaldrive.sbg.network`

---

## 🤖 Автозапуск (Windows Service)

Чтобы туннель запускался автоматически при старте Windows:

```powershell
# ВАЖНО: Запустите PowerShell как Администратор!

# 1. Установите как службу
cloudflared service install

# 2. Запустите службу
net start cloudflared

# 3. Проверьте статус
sc query cloudflared
```

**Теперь туннель работает постоянно!**

### Управление службой:

```powershell
# Остановить
net stop cloudflared

# Запустить
net start cloudflared

# Удалить службу
cloudflared service uninstall
```

---

## 📊 Мониторинг

### Логи (если запущен вручную)

Логи выводятся прямо в PowerShell окне.

### Логи (если установлен как служба)

```powershell
# Просмотр логов службы
Get-EventLog -LogName Application -Source cloudflared -Newest 50
```

### Cloudflare Dashboard

1. Перейдите: https://dash.cloudflare.com
2. Zero Trust → Networks → Tunnels
3. Выберите ваш туннель
4. Видно:
   - Status (Online/Offline)
   - Requests
   - Data transferred

---

## 🆘 Troubleshooting

### "cloudflared: command not found"

**Решение:**
```powershell
# Закройте и откройте PowerShell заново
# Или добавьте в PATH вручную
```

### Туннель запускается но сайт не открывается

**Проверьте:**
```powershell
# 1. Docker работает?
docker-compose ps

# 2. Локально работает?
start http://localhost:8080

# 3. Firewall не блокирует?
# Откройте Windows Defender Firewall → разрешите cloudflared
```

### CORS ошибка

**Решение:**
```powershell
cd C:\Projects\fiscal-monitor\frontend
echo "NEXT_PUBLIC_API_URL=https://your-tunnel-url.com" > .env.local
cd ..
docker-compose restart frontend
```

### Туннель отключается

**Для Quick Tunnel:** Это нормально, он не гарантирует uptime.

**Решение:** Используйте Named Tunnel или установите как службу.

### "Failed to connect to Cloudflare"

**Проверьте:**
- Интернет подключение
- Firewall/Antivirus не блокирует
- Порты 7844, 443 открыты

---

## 💡 Советы

### Для демо клиенту:
```powershell
# Quick Tunnel - готово за 1 минуту
cloudflared tunnel --url http://localhost:8080
```

### Для продакшена:
```powershell
# Named Tunnel + Windows Service
cloudflared service install
net start cloudflared
```

### Для разработки:
```powershell
# Quick Tunnel - просто останавливаете когда не нужен
cloudflared tunnel --url http://localhost:8080
```

---

## 📞 Поддержка

Если что-то не работает:

1. **Проверьте Docker:** `docker-compose ps`
2. **Проверьте localhost:** `http://localhost:8080`
3. **Проверьте логи туннеля** в окне PowerShell
4. **Перезапустите туннель:** Ctrl+C и заново

---

## ✅ Чек-лист успешной настройки

- [ ] cloudflared установлен (`cloudflared --version` работает)
- [ ] Docker контейнеры запущены (`docker-compose ps` показывает Up)
- [ ] Локально работает (`http://localhost:8080` открывается)
- [ ] Туннель запущен (видно "Your quick Tunnel has been created")
- [ ] Сайт открывается по публичному URL
- [ ] Нет CORS ошибок (если есть - обновите NEXT_PUBLIC_API_URL)

**Готово!** 🎉

Ваш Fiscal Monitor теперь доступен из любой точки мира!
