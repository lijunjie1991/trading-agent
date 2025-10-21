# TradingAgent Platform Architecture

## System Overview

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ :80
┌──────▼──────────┐
│  UI (Nginx)     │
│  React + Vite   │
└──────┬──────────┘
       │
       │ :8080
┌──────▼──────────┐      :8000      ┌─────────────────┐
│  API (Java)     │◄─────────────────│  Engine (Python)│
│  Spring Boot    │                  │  FastAPI        │
└──────┬──────────┘                  └────────┬────────┘
       │                                      │
       └──────────────────┬───────────────────┘
                          │
                     ┌────▼───┐
                     │ MySQL  │
                     └────────┘
```

## Services

### 1. MySQL Database (Port 3306)
- **Technology**: MySQL 8.0
- **Purpose**: Persistent data storage
- **Data**:
  - User accounts and authentication
  - Analysis tasks and status
  - Generated reports
  - Task messages and progress logs
- **Volume**: `mysql_data` (persistent)

### 2. Trading Agent Engine (Port 8000)
- **Technology**: Python 3.11 + FastAPI
- **Purpose**: Multi-agent LLM trading analysis
- **Features**:
  - Multi-agent orchestration with LangGraph
  - Real-time streaming analysis
  - Database integration for task tracking
  - WebSocket support for live updates
- **Dependencies**:
  - MySQL (required)
  - OpenAI/Anthropic/Google LLMs (required)
  - Financial data APIs (optional)

### 3. Trading Agent API (Port 8080)
- **Technology**: Java 21 + Spring Boot 3.5.6
- **Purpose**: Backend REST API
- **Features**:
  - JWT authentication
  - Database migrations (Liquibase)
  - Task management
  - Report retrieval
  - Python engine proxy
- **Dependencies**:
  - MySQL (required)
  - Engine service (required)

### 4. Trading Agent UI (Port 80)
- **Technology**: React 18 + Vite + Nginx
- **Purpose**: Web user interface
- **Features**:
  - SPA with client-side routing
  - Real-time analysis progress
  - Task management dashboard
  - Report visualization
- **Dependencies**:
  - API service (required)

## Data Flow

### Creating an Analysis Task

1. **User Action** (Browser)
   ```
   User fills form: ticker, date, analysts, depth
   ↓
   POST /api/tasks
   ```

2. **API Service** (Java)
   ```
   Create task in MySQL
   ↓
   POST to Engine: /api/v1/analysis/start
   ```

3. **Engine Service** (Python)
   ```
   Start async analysis task
   ↓
   Update MySQL with progress/messages
   ↓
   Return final decision
   ```

4. **Data Storage** (MySQL)
   ```
   tables:
   - tasks (status, ticker, date, decision)
   - reports (market, news, social, fundamental)
   - task_messages (progress, tool calls, agent status)
   ```

## Network Architecture

All services communicate via Docker network `trading-network`:

- **UI → API**: HTTP REST API calls
- **API → Engine**: HTTP REST API calls
- **Engine → MySQL**: Direct database connection
- **API → MySQL**: Direct database connection

## Data Persistence

### Volumes

1. **mysql_data**
   - Location: `/var/lib/mysql`
   - Persists all database data
   - Survives container restarts

2. **engine_cache**
   - Location: `/app/.cache`
   - Caches LLM embeddings and ChromaDB vectors
   - Improves performance for repeated queries

## Security Considerations

### Network Isolation
- Services communicate only via Docker network
- MySQL not exposed to host by default (configurable)

### Authentication
- **API**: JWT-based authentication
- **MySQL**: Username/password authentication
- **Engine**: No direct external access (proxied via API)

### Environment Variables
- Sensitive data stored in `.env` file
- Not committed to version control
- Different values for dev/prod

## Scaling Options

### Horizontal Scaling

1. **Engine Service** (Recommended)
   ```bash
   docker-compose up -d --scale engine=3
   ```
   - Multiple engine instances for parallel analysis
   - Load balancing via Docker

2. **API Service**
   ```bash
   docker-compose up -d --scale api=3
   ```
   - Requires external load balancer (Nginx/HAProxy)

### Vertical Scaling

- Increase Docker resource limits
- Upgrade host machine resources

## Development vs Production

### Development Mode
- Mount source code as volumes
- Hot reload enabled
- Debug logging
- Local database

### Production Mode
- Built images from Dockerfile
- Optimized builds
- Production logging
- External managed database (recommended)
- HTTPS with reverse proxy
- Container orchestration (Kubernetes/Docker Swarm)

## Monitoring

### Health Checks
- **Engine**: http://localhost:8000/api/v1/health
- **API**: http://localhost:8080/actuator/health
- **MySQL**: `mysqladmin ping`

### Logs
```bash
docker-compose logs -f [service-name]
```

### Metrics
- Docker stats: `docker stats`
- Service-specific metrics via health endpoints

## Backup Strategy

### Database Backup
```bash
docker-compose exec mysql mysqldump -u hamsa -p tradingagent > backup.sql
```

### Volume Backup
```bash
docker run --rm -v trading-agent_mysql_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/mysql_backup.tar.gz /data
```

## Disaster Recovery

1. Stop services: `docker-compose down`
2. Restore volumes from backup
3. Restart services: `docker-compose up -d`
4. Verify data integrity

## Technology Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React | 18.2.0 |
| **Build Tool** | Vite | 5.0.8 |
| **Web Server** | Nginx | Alpine |
| **Backend** | Spring Boot | 3.5.6 |
| **Language** | Java | 21 |
| **AI Engine** | FastAPI | 0.109+ |
| **Language** | Python | 3.11 |
| **Database** | MySQL | 8.0 |
| **Orchestration** | Docker Compose | 2.0+ |
| **Container Runtime** | Docker | 20.10+ |
