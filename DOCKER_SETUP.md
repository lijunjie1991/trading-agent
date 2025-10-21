# Docker Deployment Guide

This guide explains how to deploy the TradingAgent platform using Docker and Docker Compose.

## Architecture

The platform consists of 4 services:

1. **MySQL** - Database for storing tasks, reports, and user data
2. **trading-agent-engine** - Python FastAPI service (Port 8000)
3. **trading-agent-api** - Java Spring Boot backend (Port 8080)
4. **trading-agent-ui** - React frontend with Nginx (Port 80)

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available for Docker
- API keys for LLM providers (OpenAI, Anthropic, etc.)

## Quick Start

### 1. Configure Environment Variables

Copy the example environment file and configure your API keys:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```bash
# Required: At least one LLM provider
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional: Additional LLM providers
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
GOOGLE_API_KEY=your-google-api-key-here

# Optional: Financial data APIs
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-api-key-here
FINNHUB_API_KEY=your-finnhub-api-key-here

# Security: Change JWT secret in production!
JWT_SECRET=your-random-secret-key-at-least-256-bits-long
```

### 2. Build and Start Services

Start all services in detached mode:

```bash
docker-compose up -d
```

Or build and start:

```bash
docker-compose up -d --build
```

### 3. Verify Services

Check if all services are running:

```bash
docker-compose ps
```

View logs:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f engine
docker-compose logs -f ui
```

### 4. Access the Application

- **Frontend UI**: http://localhost
- **API Documentation**: http://localhost:8080/swagger-ui.html
- **Engine API Docs**: http://localhost:8000/docs

## Service Details

### MySQL Database

- **Port**: 3306
- **Database**: tradingagent
- **User**: hamsa
- **Password**: dev@2023 (change in production!)
- **Volume**: `mysql_data` (persistent storage)

### Trading Agent Engine (Python)

- **Port**: 8000
- **Health Check**: http://localhost:8000/api/v1/health
- **API Docs**: http://localhost:8000/docs
- **Features**:
  - FastAPI web service
  - TradingAgents multi-agent framework
  - Real-time analysis via WebSocket

### Trading Agent API (Java)

- **Port**: 8080
- **Health Check**: http://localhost:8080/actuator/health
- **API Docs**: http://localhost:8080/swagger-ui.html
- **Features**:
  - Spring Boot 3.5.6
  - JWT authentication
  - Database migrations with Liquibase

### Trading Agent UI (React)

- **Port**: 80
- **Technology**: React 18 + Vite + Nginx
- **Features**:
  - Single Page Application
  - Client-side routing
  - Gzip compression

## Management Commands

### Start Services

```bash
docker-compose up -d
```

### Stop Services

```bash
docker-compose down
```

### Stop and Remove Volumes (WARNING: Data loss!)

```bash
docker-compose down -v
```

### Rebuild Services

```bash
docker-compose up -d --build
```

### Restart Specific Service

```bash
docker-compose restart api
docker-compose restart engine
docker-compose restart ui
```

### View Logs

```bash
# All services
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f api
```

### Execute Commands in Container

```bash
# Access MySQL
docker-compose exec mysql mysql -u hamsa -p tradingagent

# Access API container shell
docker-compose exec api sh

# Access Engine container shell
docker-compose exec engine bash
```

### Scale Services

```bash
# Run multiple engine instances
docker-compose up -d --scale engine=3
```

## Production Deployment

### Security Checklist

- [ ] Change `MYSQL_ROOT_PASSWORD` and `MYSQL_PASSWORD`
- [ ] Generate random `JWT_SECRET` (256+ bits)
- [ ] Configure CORS origins to specific domains
- [ ] Use HTTPS with reverse proxy (Nginx/Traefik)
- [ ] Enable firewall rules
- [ ] Use Docker secrets for sensitive data
- [ ] Regular database backups
- [ ] Update API keys rotation policy

### Using External Database

If using Azure MySQL or AWS RDS, modify `.env`:

```bash
# Comment out the mysql service in docker-compose.yml
# and configure these:
DB_HOST=your-db-host.database.azure.com
DB_PORT=3306
DB_NAME=tradingagent
DB_USER=your-db-user
DB_PASSWORD=your-db-password
```

### Reverse Proxy Example (Nginx)

```nginx
server {
    listen 80;
    server_name tradingagent.example.com;

    location / {
        proxy_pass http://localhost:80;
    }

    location /api/ {
        proxy_pass http://localhost:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /engine/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs service-name

# Check if port is already in use
netstat -an | grep LISTEN | grep 8080
```

### Database Connection Failed

```bash
# Check if MySQL is healthy
docker-compose ps

# Wait for MySQL to be ready (takes 20-30 seconds)
docker-compose logs mysql

# Test connection
docker-compose exec mysql mysqladmin ping -h localhost -u root -p
```

### Out of Memory

```bash
# Check Docker resources
docker stats

# Increase Docker Desktop memory allocation
# Settings > Resources > Advanced > Memory
```

### Permission Denied

```bash
# Fix volume permissions
docker-compose down
sudo chown -R $USER:$USER .
docker-compose up -d
```

## Backup and Restore

### Backup Database

```bash
docker-compose exec mysql mysqldump -u hamsa -p tradingagent > backup.sql
```

### Restore Database

```bash
docker-compose exec -T mysql mysql -u hamsa -p tradingagent < backup.sql
```

### Backup Volumes

```bash
docker run --rm -v trading-agent_mysql_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/mysql_backup.tar.gz /data
```

## Monitoring

### Health Checks

```bash
# API health
curl http://localhost:8080/actuator/health

# Engine health
curl http://localhost:8000/api/v1/health
```

### Resource Usage

```bash
docker stats
```

### Docker Compose Status

```bash
docker-compose ps
docker-compose top
```

## Development Mode

For local development with hot reload:

```bash
# Edit docker-compose.yml to mount source code as volumes
# Then restart services
docker-compose down
docker-compose up -d
```

## Support

For issues and questions:
- Check logs: `docker-compose logs -f`
- GitHub Issues: [Repository Issues](https://github.com/your-repo/issues)
- Documentation: [Project Wiki](https://github.com/your-repo/wiki)
