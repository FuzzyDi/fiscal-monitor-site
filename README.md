# Fiscal Monitor

Full-stack monitoring service for Set Retail 10 fiscal modules with open ingest API, admin panel, and client portal.

## Features

- ✅ **Open Ingest API** - Accept POS snapshots without authentication
- ✅ **Admin Panel** - Manage registrations, view all INNs, issue access tokens
- ✅ **Client Portal** - Secure client access with token-based authentication
- ✅ **Real-time Monitoring** - Track POS status, alerts, and health
- ✅ **Severity Auto-calculation** - Automatic severity detection from alerts
- ✅ **Stale Detection** - Identify inactive POS terminals
- ✅ **Docker Ready** - Full containerized deployment

## Tech Stack

- **Backend**: Node.js 18+, Express 4.x, PostgreSQL 15+
- **Frontend**: Next.js 14, React 18, Tailwind CSS 3
- **Infrastructure**: Docker Compose
- **Testing**: Jest, Supertest

## Quick Start

### 1. Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 15+ (for local development)

### 2. Clone and Configure

```bash
# Clone repository (or extract files)
cd fiscal-monitor

# Backend configuration
cd backend
cp .env.example .env
# Edit .env and set:
# - DATABASE_URL
# - ADMIN_API_KEY (use a strong random key)

# Frontend configuration
cd ../frontend
# Рекомендуемый режим: unified endpoint через nginx (см. docker-compose.yml)
# В этом режиме оставьте NEXT_PUBLIC_API_URL пустым (same-origin).
cp .env.example .env
```

### 3. Run with Docker

```bash
# From project root
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

Services will be available at:
- Unified endpoint (frontend + api): http://localhost:8080
- (Optional) Frontend direct: http://localhost:3000
- (Optional) Backend direct: http://localhost:3001
- PostgreSQL: localhost:5432

Recommended public hostname (Cloudflare Tunnel):
- https://fiscaldrive.sbg.network

### 4. Initialize Database

The database schema is automatically applied on first startup via Docker initialization scripts.

For manual initialization:
```bash
psql $DATABASE_URL -f backend/schema.sql
```

### 5. Local Development (without Docker)

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

## Usage

### Admin Panel

1. Navigate to http://localhost:8080/admin/login (unified endpoint)
2. Enter your `ADMIN_API_KEY` from `.env`
3. Access the dashboard to:
   - View system overview
   - Manage registrations
   - Issue access tokens
   - View POS states

### Client Portal

1. Navigate to http://localhost:8080/portal/login (unified endpoint)
2. Enter the access token issued by admin
3. View your POS monitoring data

### Sending Snapshots

POST snapshots to the ingest endpoint (no authentication required):

```bash
curl -X POST http://localhost:8080/api/v1/fiscal/snapshot \
  -H "Content-Type: application/json" \
  -d @examples/snapshot-normal.json
```

See `examples/curl-examples.sh` for more examples.

## API Endpoints

### Public

- `POST /api/v1/fiscal/snapshot` - Ingest POS snapshot (always returns 204)

### Admin (requires X-Admin-Key header)

- `GET /api/v1/admin/overview` - System statistics
- `GET /api/v1/admin/inns` - List all INNs
- `GET /api/v1/admin/state` - View POS states
- `GET /api/v1/admin/registrations` - List registrations
- `POST /api/v1/admin/registrations` - Create registration
- `GET /api/v1/admin/tokens` - List tokens
- `POST /api/v1/admin/tokens` - Issue token

### Portal (requires X-Token header)

- `GET /api/v1/portal/summary` - Client summary
- `GET /api/v1/portal/state` - Client POS states

## Configuration

### Environment Variables

**Backend** (`.env`):
```env
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/fiscal_monitor
ADMIN_API_KEY=your-secret-key-here
STALE_MINUTES=15
NODE_ENV=production
LOG_LEVEL=info
```

**Frontend** (`.env.local`):
```env
# Recommended (unified endpoint via nginx): use same-origin
NEXT_PUBLIC_API_URL=

# Optional (direct backend access, dev-only)
# NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Docker Compose

Customize `docker-compose.yml` for:
- Database credentials
- Port mappings
- Environment variables

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Project Structure

```
fiscal-monitor/
├── backend/
│   ├── server.js           # Express application
│   ├── routes/             # API route handlers
│   ├── middleware/         # Authentication middleware
│   ├── utils/              # Helper functions
│   ├── schema.sql          # Database schema
│   └── Dockerfile
├── frontend/
│   ├── pages/              # Next.js pages
│   ├── components/         # React components
│   ├── lib/                # API client
│   └── Dockerfile
├── tests/                  # Jest tests
├── examples/               # Usage examples
└── docker-compose.yml
```

## Database Schema

### Tables

- **fiscal_last_state** - Current state of each POS terminal
- **registrations** - Registered client companies
- **access_tokens** - Portal access tokens
- **fiscal_events** - Event history (future use)

### Key Concepts

- **state_key**: Unique identifier `shopInn:shopNumber:posNumber`
- **severity**: Auto-calculated from alerts (CRITICAL > DANGER > WARN > INFO)
- **is_registered**: Auto-updated based on registrations table
- **stale detection**: Based on `updated_at` timestamp

## Monitoring & Operations

### Health Check

```bash
curl http://localhost:3001/health
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

### Database Access

```bash
docker-compose exec postgres psql -U postgres -d fiscal_monitor
```

### Backup Database

```bash
docker-compose exec postgres pg_dump -U postgres fiscal_monitor > backup.sql
```

## Security Considerations

1. **Change default credentials** in production
2. **Use strong ADMIN_API_KEY** (generate with `openssl rand -hex 32`)
3. **Enable HTTPS** for production deployments
4. **Rotate access tokens** periodically
5. **Restrict database access** to backend only
6. **Rate limiting** recommended for production

## Troubleshooting

### Backend won't start
- Check DATABASE_URL is correct
- Verify PostgreSQL is running
- Check logs: `docker-compose logs backend`

### Frontend can't connect to backend
- Verify NEXT_PUBLIC_API_URL is set correctly
- Check backend is running on expected port
- Verify CORS is enabled

### Database connection issues
- Wait for PostgreSQL health check to pass
- Check credentials in DATABASE_URL
- Verify network connectivity

## Future Enhancements

- [ ] Event history tracking
- [ ] Telegram/Email notifications
- [ ] Analytics dashboard
- [ ] Webhooks
- [ ] Multi-user authentication (JWT)
- [ ] Rate limiting
- [ ] Data retention policies
- [ ] Export functionality

## License

MIT

## Support

For issues, questions, or contributions, please refer to project documentation or contact the development team.
