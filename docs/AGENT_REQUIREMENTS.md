# Fiscal Monitor Agent - Техническое задание

## 1. Общие требования

### 1.1 Назначение
Агент собирает данные с фискальных модулей (ФМ) через FiscalDriveService API 
и отправляет их на сервер мониторинга. 

**Принцип:** Агент — "тупой" сборщик данных. Вся логика обработки (алерты, severity, 
уведомления) выполняется на сервере.

### 1.2 Целевые платформы
- **Основная:** TinyCore Linux (кассовые терминалы)
- **Альтернативная:** Ubuntu 18.04+, Debian 10+
- **Опционально:** Windows Server 2012 R2+ (для центральных серверов)

### 1.3 Ключевые требования
- **Минимальное потребление ресурсов** — не более 10 MB RAM, минимум CPU
- **Не блокировать работу кассы** — все операции асинхронные с таймаутами
- **Простая установка** — один скрипт, без зависимостей
- **Отказоустойчивость** — продолжает работу при ошибках сети


## 2. Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                        КАССА                                 │
│  ┌──────────────────┐     ┌──────────────────┐              │
│  │ FiscalDriveService│────▶│   Fiscal Agent   │              │
│  │  localhost:3449   │     │   (этот агент)   │              │
│  └──────────────────┘     └────────┬─────────┘              │
└────────────────────────────────────┼────────────────────────┘
                                     │ HTTPS POST
                                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    СЕРВЕР МОНИТОРИНГА                       │
│  ┌──────────────────┐     ┌──────────────────┐              │
│  │   POST /snapshot  │────▶│  Alert Analyzer  │──▶ Telegram │
│  │   (ingest.js)     │     │  (сервер)        │              │
│  └──────────────────┘     └──────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```


## 3. Источники данных

### 3.1 FiscalDriveService API
Агент получает данные через REST API FiscalDriveService (по умолчанию http://127.0.0.1:3449)

#### Endpoint для получения информации о ФМ:
```
GET http://127.0.0.1:3449/api/v1/fm/info
```

#### Пример ответа:
```json
{
  "serialNumber": "00000000001234567890",
  "firmwareVersion": "0400",
  "zReportCount": 245,
  "zReportMaxCount": 2100,
  "receiptCount": 15234,
  "receiptMaxCount": 500000,
  "unsentCount": 0,
  "lastZReportDate": "2026-01-29",
  "lastZReportNumber": 245
}
```

### 3.2 Данные терминала
Агент также должен знать:
- `shopInn` — ИНН организации (из конфигурации)
- `shopNumber` — номер магазина (из конфигурации или автоопределение)
- `posNumber` — номер кассы (из конфигурации или автоопределение)


## 4. Формат отправки данных

### 4.1 Endpoint сервера
```
POST https://fiscaldrive.sbg.network/api/v1/fiscal/snapshot
Content-Type: application/json
```

### 4.2 Минимальный payload (агент шлёт только это!)
```json
{
  "shopInn": "123456789012",
  "shopNumber": "1",
  "posNumber": "1",
  "fiscal": {
    "serialNumber": "00000000001234567890",
    "zReportCount": 245,
    "zReportMaxCount": 2100,
    "receiptCount": 15234,
    "receiptMaxCount": 500000,
    "unsentCount": 0,
    "lastZReportDate": "2026-01-29",
    "lastZReportNumber": 245
  }
}
```

### 4.3 Опциональные поля
```json
{
  "shopName": "Магазин №1",
  "posIp": "192.168.1.100",
  "timestamp": "2026-01-29T14:30:00Z"
}
```

### 4.4 Что агент НЕ должен делать
- ❌ Вычислять severity
- ❌ Генерировать алерты
- ❌ Определять пороги
- ❌ Форматировать сообщения

**Всё это делает сервер!**


## 5. Конфигурация агента

### 5.1 Файл конфигурации: `/etc/fiscal-agent/config.json`
```json
{
  "server_url": "https://fiscaldrive.sbg.network",
  "shop_inn": "123456789012",
  "shop_number": "1",
  "pos_number": "1",
  "interval_seconds": 300,
  "fiscal_api_url": "http://127.0.0.1:3449",
  "timeout_seconds": 10,
  "log_file": "/var/log/fiscal-agent.log",
  "log_level": "info"
}
```

### 5.2 Описание параметров
| Параметр | Обязательный | По умолчанию | Описание |
|----------|--------------|--------------|----------|
| server_url | ✅ Да | — | URL сервера мониторинга |
| shop_inn | ✅ Да | — | ИНН организации (12 цифр) |
| shop_number | ✅ Да | — | Номер магазина |
| pos_number | ✅ Да | — | Номер кассы |
| interval_seconds | Нет | 300 | Интервал отправки (5 мин) |
| fiscal_api_url | Нет | http://127.0.0.1:3449 | URL FiscalDriveService |
| timeout_seconds | Нет | 10 | Таймаут запросов |
| log_file | Нет | /var/log/fiscal-agent.log | Путь к лог-файлу |
| log_level | Нет | info | Уровень логирования |


## 6. Режимы работы

### 6.1 Демон (основной режим)
Работает как системная служба, отправляет данные каждые N секунд.

```bash
# Запуск
systemctl start fiscal-agent

# Автозапуск
systemctl enable fiscal-agent
```

### 6.2 Однократный запуск (для отладки/cron)
```bash
fiscal-agent --once
```

### 6.3 Проверка конфигурации
```bash
fiscal-agent --check
```


## 7. Обработка ошибок

### 7.1 Ошибки сети
- Таймаут запроса — логируем, ждём следующий интервал
- Сервер недоступен — логируем, ждём следующий интервал
- **НЕ накапливаем данные** — просто пропускаем

### 7.2 Ошибки FiscalDriveService
- API недоступен — логируем как warning
- Отправляем snapshot без fiscal данных (сервер поймёт что терминал "молчит")

### 7.3 Ошибки конфигурации
- Отсутствует config.json — не запускаемся, выводим ошибку
- Неверный формат — не запускаемся, выводим ошибку


## 8. Логирование

### 8.1 Формат логов
```
2026-01-29 14:30:00 [INFO] Snapshot sent successfully
2026-01-29 14:35:00 [WARN] FiscalDriveService unavailable, sending without fiscal data
2026-01-29 14:40:00 [ERROR] Server unreachable: connection timeout
```

### 8.2 Ротация логов
- Максимальный размер: 10 MB
- Хранить: 3 файла


## 9. Установка

### 9.1 TinyCore Linux / Ubuntu
```bash
# Скачать
curl -O https://fiscaldrive.sbg.network/downloads/fiscal-agent-linux.tar.gz

# Распаковать
tar -xzf fiscal-agent-linux.tar.gz
cd fiscal-agent

# Установить
sudo ./install.sh

# Настроить
sudo nano /etc/fiscal-agent/config.json

# Запустить
sudo systemctl start fiscal-agent
sudo systemctl enable fiscal-agent
```

### 9.2 Удаление
```bash
sudo ./uninstall.sh
```


## 10. Варианты реализации

### Вариант A: Bash + curl (самый простой)
**Плюсы:** Нет зависимостей, работает везде
**Минусы:** Менее надёжный парсинг JSON

```bash
#!/bin/bash
# Примерный скрипт (упрощённо)

CONFIG="/etc/fiscal-agent/config.json"
SERVER_URL=$(jq -r '.server_url' $CONFIG)
SHOP_INN=$(jq -r '.shop_inn' $CONFIG)

# Получить данные от FiscalDriveService
FISCAL_DATA=$(curl -s http://127.0.0.1:3449/api/v1/fm/info)

# Отправить на сервер
curl -X POST "$SERVER_URL/api/v1/fiscal/snapshot" \
  -H "Content-Type: application/json" \
  -d "{\"shopInn\":\"$SHOP_INN\",\"fiscal\":$FISCAL_DATA}" \
  --connect-timeout 10
```

### Вариант B: Go (рекомендуется)
**Плюсы:** Один бинарник, кроссплатформенный, надёжный
**Минусы:** Нужна компиляция

### Вариант C: Python
**Плюсы:** Простой код, легко модифицировать
**Минусы:** Требует Python на целевой системе


## 11. Безопасность

- HTTPS для связи с сервером
- Нет хранения чувствительных данных
- Минимальные права (не root)
- Доступ только к localhost:3449


## 12. Тестирование

### 12.1 Тест конфигурации
```bash
fiscal-agent --check
# Output: Configuration OK
```

### 12.2 Тест отправки
```bash
fiscal-agent --once --verbose
# Output: Snapshot sent to https://... (204 OK)
```

### 12.3 Тест без FiscalDriveService
```bash
# Остановить FiscalDriveService
fiscal-agent --once --verbose
# Output: WARNING: FiscalDriveService unavailable
# Output: Snapshot sent without fiscal data (204 OK)
```


## 13. Мониторинг агента

Сервер автоматически определяет "молчащие" терминалы:
- Нет данных > 15 минут → терминал помечается как STALE
- Сервер может отправить уведомление о потере связи


## 14. Приоритеты разработки

1. **MVP (первая версия):**
   - Bash скрипт + curl
   - Конфиг в JSON
   - Cron для запуска каждые 5 минут
   - Базовое логирование

2. **Версия 2.0:**
   - Бинарник на Go
   - Systemd служба
   - Graceful shutdown
   - Ротация логов

3. **Версия 3.0:**
   - Поддержка нескольких ФМ на одной машине
   - Автообнаружение shop_number/pos_number
   - Health-check endpoint
