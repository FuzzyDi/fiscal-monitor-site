# Deployment Guide

## Production Deployment

### Prerequisites

1. Linux server (Ubuntu 20.04+ recommended)
2. Docker & Docker Compose installed
3. Domain name configured (optional but recommended)
4. SSL certificate (Let's Encrypt recommended)

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2: Application Setup

```bash
# Clone or copy project files
cd /opt
sudo git clone <your-repo> fiscal-monitor
cd fiscal-monitor

# Set ownership
sudo chown -R $USER:$USER /opt/fiscal-monitor
```

### Step 3: Configuration

```bash
# Backend environment
cd backend
cp .env.example .env

# Generate secure admin key
ADMIN_KEY=$(openssl rand -hex 32)
echo "ADMIN_API_KEY=$ADMIN_KEY" >> .env

# Edit .env with production values
nano .env
```

**.env (Production):**
```env
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://postgres:STRONG_PASSWORD@postgres:5432/fiscal_monitor
ADMIN_API_KEY=your-generated-admin-key
STALE_MINUTES=15
LOG_LEVEL=info
```

```bash
# Frontend environment
cd ../frontend
echo "NEXT_PUBLIC_API_URL=https://api.yourdomain.com" > .env.local
```

### Step 4: Docker Compose Configuration

Edit `docker-compose.yml` for production:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: fiscal-monitor-db
    environment:
      POSTGRES_DB: fiscal_monitor
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    networks:
      - fiscal-network
    restart: unless-stopped

  backend:
    build: ./backend
    container_name: fiscal-monitor-backend
    environment:
      PORT: 3001
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/fiscal_monitor
      ADMIN_API_KEY: ${ADMIN_API_KEY}
      STALE_MINUTES: 15
    depends_on:
      - postgres
    networks:
      - fiscal-network
    restart: unless-stopped

  frontend:
    build: ./frontend
    container_name: fiscal-monitor-frontend
    environment:
      NEXT_PUBLIC_API_URL: ${API_URL}
    depends_on:
      - backend
    networks:
      - fiscal-network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: fiscal-monitor-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    networks:
      - fiscal-network
    restart: unless-stopped

volumes:
  postgres_data:

networks:
  fiscal-network:
    driver: bridge
```

### Step 5: Nginx Configuration

Create `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3001;
    }

    upstream frontend {
        server frontend:3000;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name yourdomain.com api.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    # Frontend HTTPS
    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }

    # Backend API HTTPS
    server {
        listen 443 ssl http2;
        server_name api.yourdomain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        location / {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### Step 6: SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot -y

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com

# Copy certificates
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
sudo chown -R $USER:$USER nginx/ssl
```

### Step 7: Deploy

```bash
# Create .env file for docker-compose
cat > .env << EOF
POSTGRES_PASSWORD=$(openssl rand -base64 32)
ADMIN_API_KEY=$(cat backend/.env | grep ADMIN_API_KEY | cut -d= -f2)
API_URL=https://api.yourdomain.com
EOF

# Build and start
docker-compose build
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

### Step 8: Verify Deployment

```bash
# Check health
curl https://api.yourdomain.com/health

# Test admin access (from local machine)
curl https://api.yourdomain.com/api/v1/admin/overview \
  -H "X-Admin-Key: YOUR_ADMIN_KEY"
```

## Backup Strategy

### Database Backup

```bash
# Create backup script
cat > /opt/fiscal-monitor/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/fiscal-monitor/backups"
mkdir -p $BACKUP_DIR

docker-compose exec -T postgres pg_dump -U postgres fiscal_monitor > \
  $BACKUP_DIR/backup_$DATE.sql

# Keep only last 30 backups
ls -t $BACKUP_DIR/backup_*.sql | tail -n +31 | xargs -r rm

echo "Backup completed: backup_$DATE.sql"
EOF

chmod +x /opt/fiscal-monitor/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/fiscal-monitor/backup.sh") | crontab -
```

### Application Backup

```bash
# Backup entire application
tar -czf fiscal-monitor-$(date +%Y%m%d).tar.gz \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='postgres_data' \
  /opt/fiscal-monitor
```

## Monitoring

### Application Logs

```bash
# View logs
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### System Monitoring

```bash
# Check container stats
docker stats

# Check disk usage
df -h
docker system df
```

### Log Rotation

Create `/etc/logrotate.d/fiscal-monitor`:

```
/opt/fiscal-monitor/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 nobody nobody
    sharedscripts
}
```

## Maintenance

### Update Application

```bash
cd /opt/fiscal-monitor

# Backup first
./backup.sh

# Pull updates
git pull

# Rebuild and restart
docker-compose build
docker-compose down
docker-compose up -d
```

### Database Maintenance

```bash
# Vacuum database
docker-compose exec postgres psql -U postgres -d fiscal_monitor -c "VACUUM ANALYZE;"

# Check database size
docker-compose exec postgres psql -U postgres -d fiscal_monitor -c "\l+"
```

### Clean Up Docker

```bash
# Remove old images
docker image prune -a

# Remove unused volumes
docker volume prune
```

## Security Checklist

- [ ] Strong passwords for database
- [ ] Strong ADMIN_API_KEY
- [ ] SSL/TLS configured
- [ ] Firewall configured (allow 80, 443 only)
- [ ] Regular backups scheduled
- [ ] Log monitoring enabled
- [ ] Database not exposed externally
- [ ] Regular security updates
- [ ] Token rotation policy
- [ ] Rate limiting configured

## Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

## Performance Tuning

### PostgreSQL

Edit `docker-compose.yml` postgres service:

```yaml
command: 
  - "postgres"
  - "-c"
  - "max_connections=100"
  - "-c"
  - "shared_buffers=256MB"
  - "-c"
  - "effective_cache_size=1GB"
```

### Node.js

Increase memory limit if needed:

```yaml
backend:
  environment:
    NODE_OPTIONS: "--max-old-space-size=2048"
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs backend

# Restart specific service
docker-compose restart backend
```

### Database connection issues

```bash
# Check postgres is running
docker-compose ps postgres

# Test connection
docker-compose exec backend sh -c 'psql $DATABASE_URL -c "SELECT 1;"'
```

### High memory usage

```bash
# Check stats
docker stats

# Restart services
docker-compose restart
```

## Rollback Procedure

```bash
# Stop services
docker-compose down

# Restore from backup
docker-compose exec -T postgres psql -U postgres fiscal_monitor < \
  backups/backup_YYYYMMDD_HHMMSS.sql

# Start services
docker-compose up -d
```
