# Configuration Guide

This guide explains how to configure the TradingAgent platform for different environments.

## Quick Summary

- ✅ **Redis removed** - Not used in current implementation
- ✅ **Frontend API** - Uses proxy configuration (no environment variables needed)
- ✅ **Simplified deployment** - Only 4 services (MySQL, Engine, API, UI)

## Architecture

```
Browser (Port 80)
    ↓
UI (Nginx) - Proxies /api to API service
    ↓
API (Java:8080) - Calls Engine
    ↓
Engine (Python:8000) - Multi-agent analysis
    ↓
MySQL (3306) - Data storage
```

## Frontend API Configuration

### Local Development Mode

**File to edit**: `trading-agent-ui/vite.config.js`

```javascript
export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',  // 👈 Change this to your backend URL
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
```

**When to use**: Running `npm run dev` locally

**How it works**:
1. Frontend runs on port 3000
2. API requests to `/api/*` are proxied to backend
3. No CORS issues (proxy handles everything)

### Docker/Production Mode

**File**: `trading-agent-ui/nginx.conf` (already configured)

```nginx
location /api {
    proxy_pass http://api:8080;  # Docker service name
    # Headers for WebSocket and proper routing
}
```

**When to use**: Running with `docker-compose up`

**How it works**:
1. Frontend served from port 80
2. Nginx proxies `/api/*` to API container
3. Uses Docker internal network
4. No configuration changes needed

## Environment Variables

### Required Variables

Create `.env` file from template:
```bash
cp .env.example .env
```

**Minimum required for basic operation**:
```bash
# LLM Provider (at least one)
OPENAI_API_KEY=sk-your-openai-key-here

# Database (uses defaults if not changed)
MYSQL_DATABASE=tradingagent
MYSQL_USER=hamsa
MYSQL_PASSWORD=dev@2023

# Security (MUST change in production!)
JWT_SECRET=your-random-256-bit-secret-key-change-this
```

### Optional Variables

**Additional LLM Providers**:
```bash
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
```

**Financial Data APIs**:
```bash
ALPHA_VANTAGE_API_KEY=...
FINNHUB_API_KEY=...
EODHD_API_KEY=...
TUSHARE_TOKEN=...
```

**Reddit API** (for social sentiment):
```bash
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
REDDIT_USER_AGENT=TradingAgent/1.0
```

**Custom Ports** (optional):
```bash
ENGINE_PORT=8000
API_PORT=8080
UI_PORT=80
MYSQL_PORT=3306
```

**Billing & Payments**:
```bash
# Stripe credentials
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder

# Payment workflow
STRIPE_CURRENCY=usd
FREE_TASK_LIMIT=5
PRICING_STRATEGY_CODE=DEFAULT_2024
PRICING_CACHE_TTL_SECONDS=300

# Frontend (Vite) environment variables
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
VITE_DEFAULT_PRICING_STRATEGY=DEFAULT_2024
```

### Environment Variables NOT Needed

❌ **No longer required**:
- `REDIS_HOST`, `REDIS_PORT` - Redis removed
- `VITE_WS_BASE_URL` - WebSocket proxy handled automatically

## Service Configuration

### 1. MySQL Database

**Default configuration** (no changes needed):
- Host: `mysql` (Docker service name)
- Port: `3306`
- Database: `tradingagent`
- User: `hamsa`
- Password: `dev@2023`

**To use external database**:
1. Comment out `mysql` service in `docker-compose.yml`
2. Update environment variables:
```bash
DB_HOST=your-external-db.example.com
DB_PORT=3306
DB_USER=your-user
DB_PASSWORD=your-password
```

### 2. Python Engine

**Configuration** via environment variables in `docker-compose.yml`:
- Database connection (automatic in Docker)
- LLM API keys
- Financial data API keys
- Reddit API credentials

**No code changes needed** - all configuration via `.env`

### 3. Java API

**Configuration** via `application.yml`:
- Uses environment variables from `docker-compose.yml`
- Database URL auto-generated from env vars
- Python service URL: `http://engine:8000`

**CORS origins** configured in `.env`:
```bash
CORS_ORIGIN_1=http://localhost:3000  # Vite dev server
CORS_ORIGIN_2=http://localhost:5173  # Alternative Vite port
CORS_ORIGIN_3=http://localhost       # Production
```

### 4. React UI

**Local development**: Edit `vite.config.js` proxy target
**Docker**: No configuration needed (uses `nginx.conf`)

## Configuration Files Reference

| File | Purpose | When to Edit |
|------|---------|-------------|
| `.env` | Environment variables | Always (add API keys) |
| `docker-compose.yml` | Service orchestration | Rarely (advanced users) |
| `vite.config.js` | Frontend dev proxy | Local dev only |
| `nginx.conf` | Frontend prod proxy | Rarely (already configured) |
| `application.yml` | Java backend config | Rarely (uses env vars) |

## Common Configuration Scenarios

### Scenario 1: Local Development

**Backend**:
```bash
cd trading-agent-api
./mvnw spring-boot:run
```

**Engine**:
```bash
cd trading-agent-engine
uvicorn api.main:app --reload --port 8000
```

**Frontend**:
```bash
cd trading-agent-ui
npm run dev
```

**Configuration needed**:
- Frontend: Verify `vite.config.js` proxy points to `localhost:8080`
- Backend: Configure `.env` with API keys
- Engine: Configure `.env` with API keys

### Scenario 2: Full Docker Deployment

```bash
# 1. Configure environment
cp .env.example .env
nano .env  # Add API keys

# 2. Start all services
docker-compose up -d --build

# 3. Access
# Frontend: http://localhost
# API docs: http://localhost:8080/swagger-ui.html
# Engine docs: http://localhost:8000/docs
```

**Configuration needed**:
- Only `.env` file (all services auto-configured)

### Scenario 3: Docker Backend + Local Frontend

```bash
# 1. Start backend services only
docker-compose up -d mysql api engine

# 2. Run frontend locally
cd trading-agent-ui
npm run dev
```

**Configuration needed**:
- Frontend: Ensure `vite.config.js` proxy targets `localhost:8080`

### Scenario 4: External MySQL Database

**Edit** `docker-compose.yml`:
```yaml
# Comment out the mysql service
# mysql:
#   image: mysql:8.0
#   ...

# Update engine and api services
engine:
  environment:
    DB_HOST: external-db.example.com
    DB_PORT: 3306
    DB_NAME: tradingagent
    DB_USER: your-user
    DB_PASSWORD: your-password

api:
  environment:
    DB_HOST: external-db.example.com
    # ... same as above
```

## Troubleshooting Configuration

### Frontend can't reach API

**Symptom**: Network errors, 404 on `/api/*`

**Solution**:
- Local dev: Check `vite.config.js` proxy target
- Docker: Verify services on same network, check `nginx.conf`

### Database connection failed

**Symptom**: Engine/API won't start, connection errors

**Solution**:
```bash
# Check MySQL is running
docker-compose ps mysql

# Check environment variables
docker-compose config | grep DB_

# Verify credentials
docker-compose exec mysql mysql -u hamsa -p
```

### API keys not working

**Symptom**: LLM errors, "API key invalid"

**Solution**:
```bash
# Check .env file exists
ls -la .env

# Verify keys are loaded
docker-compose config | grep API_KEY

# Restart services after changing .env
docker-compose restart engine
```

### CORS errors

**Symptom**: Browser console shows CORS policy errors

**Solution**:
```bash
# Update CORS origins in .env
CORS_ORIGIN_1=http://localhost:3000  # Add your frontend URL

# Restart API
docker-compose restart api
```

## Security Best Practices

### Production Checklist

- [ ] Change `MYSQL_PASSWORD` from default
- [ ] Generate random `JWT_SECRET` (256+ bits)
- [ ] Use strong MySQL root password
- [ ] Rotate API keys regularly
- [ ] Use HTTPS with reverse proxy
- [ ] Restrict CORS to specific domains
- [ ] Don't commit `.env` to git
- [ ] Use Docker secrets for sensitive data
- [ ] Enable firewall rules
- [ ] Regular database backups

### Generate Secure JWT Secret

```bash
# Linux/Mac
openssl rand -base64 64

# Or use online generator
# https://generate-secret.vercel.app/64
```

## Configuration Validation

### Check Docker Configuration

```bash
# Validate compose file
docker-compose config

# Check which services will start
docker-compose config --services

# See resolved environment variables
docker-compose config | grep -A 5 environment
```

### Check Frontend Configuration

```bash
# Development proxy
cat trading-agent-ui/vite.config.js | grep -A 5 proxy

# Production proxy
cat trading-agent-ui/nginx.conf | grep -A 10 "location /api"
```

### Test Connections

```bash
# Test MySQL
docker-compose exec mysql mysql -u hamsa -p tradingagent -e "SELECT 1"

# Test Engine API
curl http://localhost:8000/api/v1/health

# Test Java API
curl http://localhost:8080/actuator/health

# Test Frontend proxy (in browser or curl)
curl http://localhost/api/v1/health
```

## Need Help?

1. Check service logs: `docker-compose logs -f [service-name]`
2. Verify configuration: `docker-compose config`
3. Review this guide and README files
4. Check [DOCKER_SETUP.md](DOCKER_SETUP.md) for deployment details
5. See [QUICK_START.md](QUICK_START.md) for quick reference
