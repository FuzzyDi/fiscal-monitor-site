#!/bin/sh
# =============================================================================
# SBG FiscalDrive Agent v2.0 - Installation Script
# Поддержка: TinyCore Linux, Ubuntu/Debian (systemd)
# =============================================================================

set -e

BINARY_NAME="sbg-fiscaldrive-agent"
INSTALL_DIR="/opt/sbg-fiscaldrive-agent"
CONFIG_DIR="/etc/sbg-fiscaldrive-agent"
LOG_FILE="/var/log/sbg-fiscaldrive-agent.log"

# =============================================================================
# Функции
# =============================================================================

# Определяем тип системы
detect_system() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        case "$ID" in
            ubuntu|debian)
                echo "systemd"
                return
                ;;
        esac
    fi
    
    if [ -f /opt/.filetool.lst ]; then
        echo "tinycore"
        return
    fi
    
    if command -v systemctl >/dev/null 2>&1; then
        echo "systemd"
        return
    fi
    
    echo "init"
}

# Функция установки для systemd (Ubuntu/Debian)
install_systemd() {
    echo "[INFO] Installing systemd service..."
    
    cat > /etc/systemd/system/$BINARY_NAME.service << EOF
[Unit]
Description=SBG FiscalDrive Agent
After=network.target postgresql.service

[Service]
Type=simple
EnvironmentFile=-$CONFIG_DIR/secrets
ExecStart=$INSTALL_DIR/$BINARY_NAME -config $CONFIG_DIR/agent.conf
Restart=always
RestartSec=10
StandardOutput=append:$LOG_FILE
StandardError=append:$LOG_FILE

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$LOG_FILE
ReadOnlyPaths=$CONFIG_DIR

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable $BINARY_NAME
    
    echo "[INFO] Starting service..."
    systemctl start $BINARY_NAME
    
    echo ""
    echo "Commands:"
    echo "  systemctl start $BINARY_NAME    - Start"
    echo "  systemctl stop $BINARY_NAME     - Stop"
    echo "  systemctl restart $BINARY_NAME  - Restart"
    echo "  systemctl status $BINARY_NAME   - Status"
    echo "  journalctl -u $BINARY_NAME -f   - View logs"
    echo ""
    
    systemctl status $BINARY_NAME --no-pager || true
}

# Функция установки для TinyCore Linux
install_tinycore() {
    INIT_SCRIPT="/etc/init.d/$BINARY_NAME"
    PID_FILE="/var/run/$BINARY_NAME.pid"
    BOOTLOCAL="/opt/bootlocal.d/90-local.sh"
    
    echo "[INFO] Installing init script for TinyCore..."
    
    cat > "$INIT_SCRIPT" << 'INITSCRIPT'
#!/bin/sh
DAEMON=/opt/sbg-fiscaldrive-agent/sbg-fiscaldrive-agent
CONFIG=/etc/sbg-fiscaldrive-agent/agent.conf
SECRETS=/etc/sbg-fiscaldrive-agent/secrets
PIDFILE=/var/run/sbg-fiscaldrive-agent.pid
LOGFILE=/var/log/sbg-fiscaldrive-agent.log

# Load secrets
if [ -f "$SECRETS" ]; then
    . "$SECRETS"
fi

case "$1" in
    start)
        if [ -f "$PIDFILE" ] && kill -0 $(cat "$PIDFILE") 2>/dev/null; then
            echo "Already running (PID $(cat $PIDFILE))"
            exit 0
        fi
        echo "Starting sbg-fiscaldrive-agent..."
        $DAEMON -config $CONFIG >> $LOGFILE 2>&1 &
        echo $! > "$PIDFILE"
        sleep 1
        if kill -0 $(cat "$PIDFILE") 2>/dev/null; then
            echo "Started (PID $(cat $PIDFILE))"
        else
            echo "Failed to start"
            rm -f "$PIDFILE"
            exit 1
        fi
        ;;
    stop)
        if [ -f "$PIDFILE" ]; then
            echo "Stopping sbg-fiscaldrive-agent..."
            kill $(cat "$PIDFILE") 2>/dev/null
            rm -f "$PIDFILE"
            echo "Stopped"
        else
            echo "Not running"
        fi
        ;;
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
    status)
        if [ -f "$PIDFILE" ] && kill -0 $(cat "$PIDFILE") 2>/dev/null; then
            echo "Running (PID $(cat $PIDFILE))"
            tail -3 $LOGFILE
        else
            echo "Not running"
            exit 1
        fi
        ;;
    log)
        tail -f $LOGFILE
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|log}"
        exit 1
        ;;
esac
INITSCRIPT
    chmod +x "$INIT_SCRIPT"
    
    # Добавляем в filetool.lst
    for path in "$INSTALL_DIR" "$CONFIG_DIR" "$INIT_SCRIPT"; do
        if ! grep -q "^$path$" /opt/.filetool.lst 2>/dev/null; then
            echo "$path" >> /opt/.filetool.lst
            echo "[INFO] Added to filetool.lst: $path"
        fi
    done
    
    # Настраиваем автозапуск
    mkdir -p "$(dirname $BOOTLOCAL)"
    if [ ! -f "$BOOTLOCAL" ]; then
        echo "#!/bin/sh" > "$BOOTLOCAL"
        chmod +x "$BOOTLOCAL"
    fi
    
    if ! grep -q "$INIT_SCRIPT start" "$BOOTLOCAL" 2>/dev/null; then
        echo "$INIT_SCRIPT start" >> "$BOOTLOCAL"
        echo "[INFO] Added autostart to $BOOTLOCAL"
    fi
    
    echo "[INFO] Starting service..."
    "$INIT_SCRIPT" start
    
    echo "[INFO] Saving changes (filetool.sh -b)..."
    filetool.sh -b 2>/dev/null || echo "[WARN] filetool.sh -b failed (normal on first install)"
    
    echo ""
    echo "Commands:"
    echo "  $INIT_SCRIPT start   - Start"
    echo "  $INIT_SCRIPT stop    - Stop"
    echo "  $INIT_SCRIPT restart - Restart"
    echo "  $INIT_SCRIPT status  - Status"
    echo "  $INIT_SCRIPT log     - View logs"
    echo ""
    
    "$INIT_SCRIPT" status || true
}

# Функция установки для generic init
install_init() {
    echo "[WARN] Generic init system - manual setup may be required"
    
    cat > "$INSTALL_DIR/start.sh" << EOF
#!/bin/sh
# Load secrets
if [ -f "$CONFIG_DIR/secrets" ]; then
    . "$CONFIG_DIR/secrets"
fi
exec $INSTALL_DIR/$BINARY_NAME -config $CONFIG_DIR/agent.conf
EOF
    chmod +x "$INSTALL_DIR/start.sh"
    
    echo ""
    echo "To start manually:"
    echo "  $INSTALL_DIR/start.sh >> $LOG_FILE 2>&1 &"
}

# =============================================================================
# Основной скрипт
# =============================================================================

SYSTEM_TYPE=$(detect_system)
echo "[INFO] Detected system type: $SYSTEM_TYPE"

# Проверяем наличие файлов
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ ! -f "$SCRIPT_DIR/$BINARY_NAME" ]; then
    echo "[ERROR] Not found: $SCRIPT_DIR/$BINARY_NAME"
    exit 1
fi
if [ ! -f "$SCRIPT_DIR/agent.conf" ]; then
    echo "[ERROR] Not found: $SCRIPT_DIR/agent.conf"
    exit 1
fi

echo "[INFO] Stopping old process..."
if [ "$SYSTEM_TYPE" = "systemd" ]; then
    systemctl stop $BINARY_NAME 2>/dev/null || true
else
    pkill -f "$BINARY_NAME" 2>/dev/null || true
fi
sleep 1

echo "[INFO] Creating directories..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$CONFIG_DIR"

echo "[INFO] Installing binary..."
cp "$SCRIPT_DIR/$BINARY_NAME" "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/$BINARY_NAME"

if [ ! -f "$CONFIG_DIR/agent.conf" ]; then
    echo "[INFO] Installing config..."
    cp "$SCRIPT_DIR/agent.conf" "$CONFIG_DIR/agent.conf"
    chmod 640 "$CONFIG_DIR/agent.conf"
else
    echo "[WARN] Config exists at $CONFIG_DIR/agent.conf, keeping old"
fi

# Создаём файл secrets если его нет
if [ ! -f "$CONFIG_DIR/secrets" ]; then
    echo "[INFO] Creating secrets file..."
    cat > "$CONFIG_DIR/secrets" << 'EOF'
# Secrets for sbg-fiscaldrive-agent
# This file is sourced before starting the agent
# Set database password here:
export DB_PASSWORD=""
EOF
    chmod 600 "$CONFIG_DIR/secrets"
    echo "[WARN] Please edit $CONFIG_DIR/secrets and set DB_PASSWORD"
fi

# Устанавливаем службу в зависимости от типа системы
case "$SYSTEM_TYPE" in
    systemd)
        install_systemd
        ;;
    tinycore)
        install_tinycore
        ;;
    *)
        install_init
        ;;
esac

echo ""
echo "=== Installation complete ==="
echo ""
echo "Configuration: $CONFIG_DIR/agent.conf"
echo "Secrets:       $CONFIG_DIR/secrets"
echo "Log:           $LOG_FILE"
echo ""
