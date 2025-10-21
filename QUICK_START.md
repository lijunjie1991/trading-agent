# Quick Start Guide - TradingAgent Platform

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- OpenAI API Key (or other LLM provider)

## 3-Step Quick Start

### 1. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit and add your API keys
nano .env
```

**Minimum required:**
```bash
OPENAI_API_KEY=sk-your-key-here
```

### 2. Start Services

```bash
# Using the quick start script (recommended)
./start.sh

# Or manually with docker-compose
docker-compose up -d --build
```

### 3. Access Application

- **Frontend**: http://localhost
- **API Docs**: http://localhost:8080/swagger-ui.html
- **Engine Docs**: http://localhost:8000/docs

## Project Structure

```
trading-agent/
├── docker-compose.yml              # Multi-service orchestration
├── .env.example                    # Environment variables template
├── start.sh                        # Quick start helper script
├── DOCKER_SETUP.md                 # Detailed deployment guide
│
├── trading-agent-api/              # Java Spring Boot Backend
│   ├── Dockerfile                  # Java 21 + Maven build
│   └── .dockerignore
│
├── trading-agent-ui/               # React Frontend
│   ├── Dockerfile                  # Node.js build + Nginx
│   ├── nginx.conf                  # Nginx configuration
│   └── .dockerignore
│
└── trading-agent-engine/           # Python FastAPI Engine
    ├── Dockerfile                  # Python 3.11 + FastAPI
    └── .dockerignore
```

## Services Overview

| Service | Technology | Port | Purpose |
|---------|-----------|------|---------|
| **mysql** | MySQL 8.0 | 3306 | Database |
| **engine** | Python FastAPI | 8000 | TradingAgents AI Engine |
| **api** | Java Spring Boot | 8080 | Backend API |
| **ui** | React + Nginx | 80 | Web Interface |

## Common Commands

```bash
# Start services
docker-compose up -d

# Start with rebuild
docker-compose up -d --build

# Stop services
docker-compose down

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f api
docker-compose logs -f engine

# Check service status
docker-compose ps

# Restart service
docker-compose restart api

# Execute command in container
docker-compose exec api sh
docker-compose exec engine bash
docker-compose exec mysql mysql -u hamsa -p
```

## Environment Variables Reference

### Database
```bash
MYSQL_DATABASE=tradingagent
MYSQL_USER=hamsa
MYSQL_PASSWORD=dev@2023
```

### Ports
```bash
ENGINE_PORT=8000    # Python FastAPI
API_PORT=8080       # Java Spring Boot
UI_PORT=80          # React UI
```

### LLM Providers (at least one required)
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
```

### Financial Data APIs (optional)
```bash
ALPHA_VANTAGE_API_KEY=...
FINNHUB_API_KEY=...
EODHD_API_KEY=...
TUSHARE_TOKEN=...
```

### Security
```bash
JWT_SECRET=your-random-256-bit-secret
```

## Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs -f

# Check if ports are in use
lsof -i :8080
lsof -i :8000
lsof -i :80
```

### Database connection failed
```bash
# Wait 30 seconds for MySQL to initialize
# Check MySQL health
docker-compose logs mysql

# Verify connection
docker-compose exec mysql mysqladmin ping -h localhost
```

### Out of memory
```bash
# Increase Docker memory in Docker Desktop
# Settings > Resources > Memory (recommend 4GB+)
```

### Permission denied
```bash
# Fix permissions on Linux/Mac
chmod +x start.sh
sudo chown -R $USER:$USER .
```

## Development Mode

For local development with hot reload:

1. Comment out the `ui` service in `docker-compose.yml`
2. Run frontend locally:
   ```bash
   cd trading-agent-ui
   npm install
   npm run dev
   ```

3. Start only backend services:
   ```bash
   docker-compose up -d mysql redis engine api
   ```

## Production Checklist

- [ ] Change all default passwords
- [ ] Generate random JWT secret (256+ bits)
- [ ] Configure specific CORS origins
- [ ] Use HTTPS with reverse proxy
- [ ] Set up database backups
- [ ] Configure log rotation
- [ ] Enable firewall rules
- [ ] Use Docker secrets for sensitive data

## Next Steps

1. ✅ Services running → Access http://localhost
2. 📚 Read [DOCKER_SETUP.md](DOCKER_SETUP.md) for detailed guide
3. 🔧 Configure additional API keys in `.env`
4. 🚀 Start analyzing stocks!

## Support

- **Logs**: `docker-compose logs -f`
- **Status**: `docker-compose ps`
- **Health**:
  - http://localhost:8080/actuator/health
  - http://localhost:8000/api/v1/health

## File Descriptions

- **Dockerfile** (each service): Container build instructions
- **.dockerignore**: Files to exclude from Docker build
- **docker-compose.yml**: Multi-container orchestration
- **.env**: Environment variables (create from .env.example)
- **nginx.conf**: Frontend web server configuration
- **start.sh**: Interactive deployment helper

---

For detailed deployment information, see [DOCKER_SETUP.md](DOCKER_SETUP.md)
