# Downloads - Fiscal Monitor

## Агент мониторинга v2.0

**Файл:** `sbg-fiscaldrive-agent.tar.gz`

### Содержимое архива:
- `sbg-fiscaldrive-agent` — бинарный файл (Linux x64)
- `agent.conf` — конфигурация (отредактируйте под свои нужды)
- `install.sh` — скрипт установки (автоопределение TinyCore/Ubuntu)

### Быстрая установка:

```bash
# Скачать
curl -O https://fiscaldrive.sbg.network/downloads/sbg-fiscaldrive-agent.tar.gz

# Распаковать
tar -xzf sbg-fiscaldrive-agent.tar.gz
cd sbg-fiscaldrive-agent

# Установить (автоопределение системы)
sudo ./install.sh

# Настроить (опционально, если не читается из БД)
sudo nano /etc/sbg-fiscaldrive-agent/agent.conf

# Проверить статус
/etc/init.d/sbg-fiscaldrive-agent status    # TinyCore
systemctl status sbg-fiscaldrive-agent      # Ubuntu/Debian
```

### Основные параметры конфига:

| Параметр | Описание | По умолчанию |
|----------|----------|--------------|
| `server.url` | URL сервера мониторинга | fiscaldrive.sbg.network |
| `server.insecure` | Отключить проверку SSL | false |
| `db.enabled` | Читать данные из БД SetRetail | true |
| `shop.inn` | ИНН магазина (если db.enabled=false) | — |
| `interval.minutes` | Интервал проверки | 5 |

### Системные требования:
- Linux (TinyCore, Ubuntu 18.04+, Debian 10+)
- FiscalDriveService (JSON-RPC API на порту 3448)
- Доступ к интернету (HTTPS порт 443)

### Пароль БД:
Пароль PostgreSQL указывается в файле `/etc/sbg-fiscaldrive-agent/secrets`:
```bash
export DB_PASSWORD="ваш_пароль"
```

### Документация:
https://fiscaldrive.sbg.network/docs
