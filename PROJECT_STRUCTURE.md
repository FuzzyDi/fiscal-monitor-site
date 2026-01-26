# Fiscal Monitor - Project Structure

## Overview
Total files created: 47
- JavaScript files: 26
- JSON files: 6
- SQL files: 1
- Markdown files: 4
- Other configuration: 10

## Directory Structure

```
fiscal-monitor/
├── backend/                           # Express.js API Server
│   ├── middleware/
│   │   ├── admin-auth.js             # Admin API key authentication
│   │   └── portal-auth.js            # Portal token authentication
│   ├── routes/
│   │   ├── admin.js                  # Admin endpoints (registrations, tokens, etc)
│   │   ├── ingest.js                 # Public snapshot ingestion
│   │   └── portal.js                 # Client portal endpoints
│   ├── utils/
│   │   ├── db.js                     # PostgreSQL connection pool
│   │   ├── helpers.js                # Helper functions (key generation, severity calc)
│   │   └── logger.js                 # Winston logger configuration
│   ├── .dockerignore                 # Docker ignore patterns
│   ├── .env.example                  # Environment variables template
│   ├── Dockerfile                    # Backend container definition
│   ├── package.json                  # Backend dependencies
│   ├── schema.sql                    # Database schema
│   └── server.js                     # Main Express application
│
├── frontend/                          # Next.js Web Interface
│   ├── components/
│   │   └── AdminLayout.js            # Admin panel layout wrapper
│   ├── lib/
│   │   └── api.js                    # API client with axios
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── dashboard.js          # Admin dashboard with overview
│   │   │   ├── login.js              # Admin authentication
│   │   │   ├── registrations.js      # Registration management
│   │   │   ├── state.js              # POS state viewer
│   │   │   └── tokens.js             # Token management
│   │   ├── portal/
│   │   │   ├── index.js              # Client portal dashboard
│   │   │   └── login.js              # Portal authentication
│   │   ├── _app.js                   # Next.js app wrapper
│   │   └── index.js                  # Homepage with navigation
│   ├── styles/
│   │   └── globals.css               # Global Tailwind styles
│   ├── .dockerignore                 # Docker ignore patterns
│   ├── .env.example                  # Frontend environment template
│   ├── .eslintrc.json                # ESLint configuration
│   ├── Dockerfile                    # Frontend container definition
│   ├── next.config.js                # Next.js configuration
│   ├── package.json                  # Frontend dependencies
│   ├── postcss.config.js             # PostCSS configuration
│   └── tailwind.config.js            # Tailwind CSS configuration
│
├── tests/                             # Test Suite
│   ├── api.test.js                   # API integration tests
│   └── helpers.test.js               # Helper function unit tests
│
├── examples/                          # Usage Examples
│   ├── curl-examples.sh              # Bash script with API examples
│   ├── snapshot-critical.json        # Example critical alert snapshot
│   └── snapshot-normal.json          # Example normal snapshot
│
├── docs/                              # Documentation
│   ├── API.md                        # Complete API reference
│   ├── DEPLOYMENT.md                 # Production deployment guide
│   └── MIGRATIONS.md                 # Database migration guide
│
├── .gitignore                         # Git ignore patterns
├── docker-compose.yml                 # Multi-container orchestration
├── jest.config.js                     # Jest test configuration
├── package.json                       # Root workspace scripts
└── README.md                          # Main project documentation
```

## Key Components

### Backend Routes
1. **Ingest API** (`/api/v1/fiscal/snapshot`)
   - Open endpoint, no authentication
   - Always returns 204 to never block POS
   - Auto-calculates severity from alerts

2. **Admin API** (`/api/v1/admin/*`)
   - X-Admin-Key authentication
   - System management and monitoring
   - Registration and token management

3. **Portal API** (`/api/v1/portal/*`)
   - X-Token authentication
   - Client-specific data access
   - Read-only interface

### Frontend Pages
1. **Homepage** - Navigation hub
2. **Admin Panel** - System management interface
   - Dashboard with statistics
   - INN and state viewing
   - Registration management
   - Token issuance
3. **Client Portal** - Client monitoring interface
   - Real-time POS status
   - Alert viewing
   - Summary statistics

### Database Schema
- **fiscal_last_state** - Current POS states (main table)
- **registrations** - Client company records
- **access_tokens** - Portal authentication tokens
- **fiscal_events** - Historical events (future use)

## Features Implemented

✅ Open ingest API
✅ Token-based authentication (admin & portal)
✅ Auto-severity calculation
✅ Stale detection (configurable minutes)
✅ Registration management
✅ Access token issuance
✅ Admin dashboard with statistics
✅ Client portal with real-time data
✅ Docker containerization
✅ Database initialization
✅ Health checks
✅ Logging
✅ Error handling
✅ API documentation
✅ Deployment guide
✅ Test suite
✅ Usage examples

## Quick Start Commands

```bash
# Install all dependencies
npm run install:all

# Development mode (both servers)
npm run dev

# Production with Docker
docker-compose up -d

# Run tests
npm test

# Database initialization
npm run db:init
```

## Environment Variables

### Backend (.env)
- PORT=3001
- DATABASE_URL=postgresql://...
- ADMIN_API_KEY=secret-key
- STALE_MINUTES=15
- NODE_ENV=production
- LOG_LEVEL=info

### Frontend (.env.local)
- NEXT_PUBLIC_API_URL=http://localhost:3001

## Technology Stack

**Backend:**
- Node.js 18+
- Express 4.x
- PostgreSQL 15+
- Winston (logging)
- pg (database)

**Frontend:**
- Next.js 14
- React 18
- Tailwind CSS 3
- Axios

**Infrastructure:**
- Docker & Docker Compose
- Nginx (for production)

**Testing:**
- Jest
- Supertest

## File Count Summary

- Total Files: 47
- JavaScript: 26 (backend logic, frontend pages, tests)
- JSON: 6 (package.json, config files, examples)
- SQL: 1 (schema.sql)
- Markdown: 4 (README, API docs, deployment guide, migrations)
- Configuration: 10 (Docker, Tailwind, PostCSS, etc)

## Next Steps

1. Review `.env.example` files and configure environment
2. Run `docker-compose up -d` to start services
3. Access admin panel at http://localhost:8080/admin/login (unified endpoint)
4. Create first registration and issue token
5. Test snapshot ingestion with examples/curl-examples.sh
6. Access client portal with issued token

## Support Files

- **README.md** - Complete project documentation
- **API.md** - Full API reference with examples
- **DEPLOYMENT.md** - Production deployment guide
- **MIGRATIONS.md** - Database schema evolution guide
- **curl-examples.sh** - Working API examples
- **snapshot examples** - Test data for development
