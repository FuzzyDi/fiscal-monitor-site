# Быстрая настройка для доступа по IP

## Проблема
При открытии `http://192.168.80.19:3000` запросы идут на `localhost:3001` и блокируются браузером.

## Решение: Настроить API URL

### Способ 1: Через .env файл (Рекомендуется)

```powershell
cd C:\Projects\fiscal-monitor

# Узнайте свой IP адрес
ipconfig
# Найдите IPv4 Address вашего сетевого адаптера
# Например: 192.168.80.19

# Создайте .env.local для frontend
cd frontend
echo NEXT_PUBLIC_API_URL=http://192.168.80.19:3001 > .env.local

# Проверьте содержимое
type .env.local
# Должно показать: NEXT_PUBLIC_API_URL=http://192.168.80.19:3001

# Вернитесь в корень проекта
cd ..

# Пересоберите frontend
docker-compose down
docker-compose up -d --build frontend

# Или используйте переменную окружения
$env:NEXT_PUBLIC_API_URL="http://192.168.80.19:3001"
docker-compose up -d --build frontend
```

### Способ 2: Через docker-compose (Постоянно)

Отредактируйте `docker-compose.yml`:

```yaml
  frontend:
    environment:
      NEXT_PUBLIC_API_URL: http://192.168.80.19:3001  # ← Замените на ваш IP
```

Затем:
```powershell
docker-compose down
docker-compose up -d --build
```

### Способ 3: Создать .env в корне проекта

```powershell
cd C:\Projects\fiscal-monitor

# Создайте .env файл
echo NEXT_PUBLIC_API_URL=http://192.168.80.19:3001 > .env

# Запустите
docker-compose up -d --build
```

## Проверка

### 1. Откройте DevTools в браузере (F12)

### 2. Перейдите на вкладку Console

### 3. Выполните команду:
```javascript
console.log(process.env.NEXT_PUBLIC_API_URL)
```

Должно вывести: `http://192.168.80.19:3001`

Если выводит `undefined` или `http://localhost:3001` - переменная не применилась.

### 4. Проверьте Network вкладку

Откройте Network, обновите страницу (F5), посмотрите на запросы.

**Правильно:**
```
Request URL: http://192.168.80.19:3001/api/v1/admin/overview
```

**Неправильно:**
```
Request URL: http://localhost:3001/api/v1/admin/overview
```

## Полная последовательность действий

```powershell
# 1. Узнайте свой IP
ipconfig
# Запомните: 192.168.80.19 (пример)

# 2. Остановите контейнеры
cd C:\Projects\fiscal-monitor
docker-compose down

# 3. Создайте .env.local
cd frontend
echo NEXT_PUBLIC_API_URL=http://192.168.80.19:3001 > .env.local
cd ..

# 4. Пересоберите
docker-compose build --no-cache
docker-compose up -d

# 5. Проверьте логи
docker-compose logs frontend | Select-String "API"
docker-compose logs backend | Select-String "running"

# 6. Откройте в браузере
# http://192.168.80.19:3000
```

## Если не работает

### Проблема: Переменная не применяется

**Причина:** Next.js кеширует переменные окружения при сборке.

**Решение:**
```powershell
# Полностью удалите контейнер и образ
docker-compose down
docker rmi fiscal-monitor-frontend

# Пересоберите с нуля
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### Проблема: CORS ошибка даже с правильным URL

**Проверьте backend:**
```powershell
# Убедитесь что backend слушает на 0.0.0.0
docker-compose logs backend | Select-String "running"
# Должно быть: "running on 0.0.0.0:3001"

# Проверьте CORS настройки
docker-compose exec backend cat server.js | Select-String "cors"
# Должно быть: origin: true
```

### Проблема: Запросы идут на localhost несмотря на .env.local

**Причина:** Браузер кеширует JavaScript код.

**Решение:**
1. Откройте DevTools (F12)
2. Network вкладка
3. Поставьте галочку "Disable cache"
4. Обновите страницу (Ctrl+Shift+R)

Или откройте в режиме инкогнито:
```
Ctrl+Shift+N (Chrome)
Ctrl+Shift+P (Firefox)
```

## Для разных устройств

### Доступ с другого компьютера/телефона

Используйте тот же IP:
- `http://192.168.80.19:3000` - frontend
- `http://192.168.80.19:3001` - backend API

### Доступ с этого же компьютера

Можете использовать любой вариант:
- `http://localhost:3000` ✅
- `http://127.0.0.1:3000` ✅
- `http://192.168.80.19:3000` ✅

Но API URL должен быть одинаковым для всех!

## Production настройка

Для продакшена используйте домен:

```env
NEXT_PUBLIC_API_URL=https://api.fiscalmonitor.uz
```

См. `docs/DEPLOYMENT.md` для подробностей.

## Troubleshooting

### Команды для диагностики:

```powershell
# Проверить переменные окружения в контейнере
docker-compose exec frontend env | Select-String "API"

# Проверить что frontend видит переменную
docker-compose exec frontend sh -c 'echo $NEXT_PUBLIC_API_URL'

# Проверить что backend доступен
curl http://192.168.80.19:3001/health

# Проверить CORS headers
curl -I -X OPTIONS http://192.168.80.19:3001/api/v1/admin/overview

# Посмотреть все логи
docker-compose logs -f
```

### Если ничего не помогает:

```powershell
# Ядерный вариант - удалить всё и пересобрать
docker-compose down -v
docker system prune -a -f
cd C:\Projects\fiscal-monitor
docker-compose build --no-cache
docker-compose up -d
```

## FAQ

**Q: Нужно ли менять API URL при каждом запуске?**  
A: Нет. После настройки .env.local он сохраняется.

**Q: Можно ли использовать localhost при доступе по IP?**  
A: Нет. Браузер заблокирует CORS. Используйте IP везде.

**Q: Что если мой IP изменится?**  
A: Обновите .env.local и пересоберите frontend.

**Q: Можно ли использовать имя хоста вместо IP?**  
A: Да, если оно резолвится в сети. Например: `http://mypc:3001`
