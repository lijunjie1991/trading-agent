# TradingAgents Java Backend Service

Spring Boot backend service providing user authentication, task management, and WebSocket proxy functionality for the TradingAgents platform.

## Features

- ✅ User registration and login (JWT authentication)
- ✅ Task submission and management
- ✅ Communication with Python analysis service
- ✅ Real-time progress WebSocket proxy
- ✅ Task and report persistence storage
- ✅ Database migration management with Liquibase

## Technology Stack

- Spring Boot 3.2.0 with Java 21
- Spring Security + JWT (0.12.3)
- Spring Data JPA with Hibernate
- Spring WebSocket for real-time communication
- Spring WebFlux (WebClient) for HTTP calls to Python service
- Liquibase for database version control
- H2 Database (development) / MySQL 8.0+ (production)
- Lombok for reducing boilerplate code

## Quick Start

### Prerequisites

- JDK 21+
- Maven 3.8+
- MySQL 8.0+ (for production)
- Python analysis service running on localhost:8000

### Installation and Running

```bash
# Navigate to the project directory
cd backend/java_service/trading-agent

# Install dependencies and compile
mvn clean install

# Run the application (development mode with H2)
mvn spring-boot:run

# Or use the wrapper
./mvnw spring-boot:run
```

The service will start on `http://localhost:8080`

### H2 Console (Development Only)

Access the H2 database console in development mode:
- URL: http://localhost:8080/h2-console
- JDBC URL: jdbc:h2:mem:tradingdb
- Username: sa
- Password: (leave empty)

## API Documentation

### Authentication Endpoints

#### Register New User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "type": "Bearer",
  "userId": 1,
  "username": "testuser",
  "email": "test@example.com"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer {token}
```

### Task Management Endpoints

#### Submit New Analysis Task
```http
POST /api/tasks
Authorization: Bearer {token}
Content-Type: application/json

{
  "ticker": "NVDA",
  "analysisDate": "2024-05-10",
  "selectedAnalysts": ["market", "social", "news", "fundamentals"],
  "researchDepth": 3
}
```

Response:
```json
{
  "id": 1,
  "taskId": "abc-123-def-456",
  "ticker": "NVDA",
  "analysisDate": "2024-05-10",
  "selectedAnalysts": ["market", "social", "news", "fundamentals"],
  "researchDepth": 3,
  "status": "running",
  "createdAt": "2024-01-15T10:30:00"
}
```

#### Get User Task List
```http
GET /api/tasks
Authorization: Bearer {token}
```

#### Get Task Detail
```http
GET /api/tasks/{taskId}
Authorization: Bearer {token}
```

#### Get Task Reports
```http
GET /api/tasks/{taskId}/reports
Authorization: Bearer {token}
```

Response:
```json
[
  {
    "id": 1,
    "reportType": "analyst_market",
    "content": "# Market Analysis Report...",
    "createdAt": "2024-01-15T10:35:00"
  },
  {
    "reportType": "final_decision",
    "content": "BUY",
    "createdAt": "2024-01-15T10:40:00"
  }
]
```

### WebSocket

Connect to real-time task progress:
```javascript
const ws = new WebSocket('ws://localhost:8080/ws/analysis/{taskId}');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Message type:', data.type);
  console.log('Data:', data.data);
};

// Message types: status, message, tool_call, report, agent_status
```

## Configuration

### Environment Variables

Create a `.env` file or set environment variables:

```bash
# Database Configuration (Production)
DB_USERNAME=root
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-production-secret-key-must-be-at-least-256-bits-long

# Python Service Configuration
PYTHON_SERVICE_URL=http://localhost:8000
PYTHON_WS_URL=ws://localhost:8000/ws/analysis

# Server Configuration
SERVER_PORT=8080

# CORS Configuration
CORS_ORIGIN_1=http://localhost:3000
CORS_ORIGIN_2=http://localhost:5173
```

### application.yml (Development)

Main configuration file with H2 database:

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:tradingdb
    driver-class-name: org.h2.Driver
    username: sa
    password:

  jpa:
    hibernate:
      ddl-auto: none  # Managed by Liquibase
    show-sql: true

  liquibase:
    change-log: classpath:db/changelog/db.changelog-master.yaml
    enabled: true

python:
  service:
    url: http://localhost:8000

jwt:
  secret: your-dev-secret-key-change-this
  expiration: 86400000  # 24 hours
```

### application-prod.yml (Production)

Production configuration with MySQL:

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/tradingagent
    driver-class-name: com.mysql.cj.jdbc.Driver
    username: ${DB_USERNAME:root}
    password: ${DB_PASSWORD:password}

  jpa:
    hibernate:
      ddl-auto: none
    show-sql: false

  liquibase:
    change-log: classpath:db/changelog/db.changelog-master.yaml
    enabled: true
    default-schema: tradingagent
```

## Database Setup

### Development (H2)
No setup required - H2 runs in-memory and is auto-initialized by Liquibase.

### Production (MySQL)

1. **Install MySQL 8.0+**

2. **Run initialization script:**
```bash
mysql -u root -p < src/main/resources/scripts/init-mysql.sql
```

This will create:
- Database: `tradingagent`
- User: `tradingagent` with password `tradingagent123`

3. **Update application-prod.yml** with your credentials:
```yaml
spring:
  datasource:
    username: tradingagent
    password: tradingagent123
```

4. **Run with production profile:**
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

### Liquibase Migrations

Database schema is managed by Liquibase with XML changelogs:

- Master changelog: `db/changelog/db.changelog-master.yaml`
- Initial schema: `db/changelog/changes/v1.0.0-initial-schema.xml`

To add a new migration:
1. Create a new XML file in `db/changelog/changes/`
2. Add it to `db.changelog-master.yaml`
3. Restart the application - Liquibase will auto-apply

## Project Structure

```
src/main/java/com/tradingagent/service/
├── config/                      # Configuration classes
│   ├── SecurityConfig.java      # Spring Security + JWT configuration
│   ├── CorsConfig.java          # CORS settings
│   └── WebSocketConfig.java    # WebSocket configuration
├── controller/                  # REST controllers
│   ├── AuthController.java      # Authentication endpoints
│   └── TaskController.java      # Task management endpoints
├── dto/                         # Data Transfer Objects
│   ├── LoginRequest.java
│   ├── RegisterRequest.java
│   ├── AuthResponse.java
│   ├── TaskRequest.java
│   └── TaskResponse.java
├── entity/                      # JPA entities
│   ├── User.java                # User entity
│   ├── Task.java                # Task entity
│   └── Report.java              # Report entity
├── repository/                  # Data access layer
│   ├── UserRepository.java
│   ├── TaskRepository.java
│   └── ReportRepository.java
├── security/                    # Security components
│   ├── JwtTokenProvider.java    # JWT generation and validation
│   ├── JwtAuthenticationFilter.java  # JWT request filter
│   └── UserDetailsServiceImpl.java   # User details service
├── service/                     # Business logic layer
│   ├── AuthService.java         # Authentication logic
│   ├── TaskService.java         # Task management logic
│   └── PythonServiceClient.java # HTTP client for Python service
└── websocket/                   # WebSocket handlers
    └── WebSocketProxyHandler.java  # WebSocket proxy with auto-persistence

src/main/resources/
├── db/
│   └── changelog/
│       ├── db.changelog-master.yaml
│       └── changes/
│           └── v1.0.0-initial-schema.xml
├── scripts/
│   └── init-mysql.sql
├── application.yml              # Development configuration
└── application-prod.yml         # Production configuration
```

## Deployment

### Build JAR

```bash
# Build for production
mvn clean package -Pprod

# JAR will be created at: target/trading-agent-1.0.0.jar
```

### Run JAR

```bash
# Development mode
java -jar target/trading-agent-1.0.0.jar

# Production mode
java -jar target/trading-agent-1.0.0.jar --spring.profiles.active=prod
```

### Docker Deployment

1. **Build Docker image:**
```bash
docker build -t trading-agent-backend .
```

2. **Run with Docker Compose:**
```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: tradingagent
      MYSQL_USER: tradingagent
      MYSQL_PASSWORD: tradingagent123
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  backend:
    image: trading-agent-backend
    environment:
      DB_USERNAME: tradingagent
      DB_PASSWORD: tradingagent123
      JWT_SECRET: your-production-secret-256-bits
      PYTHON_SERVICE_URL: http://python-service:8000
    ports:
      - "8080:8080"
    depends_on:
      - mysql

volumes:
  mysql_data:
```

## Development

### Hot Reload

Spring DevTools is included for automatic restart on code changes:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
</dependency>
```

### Adding Dependencies

Add to `pom.xml` and run:
```bash
mvn clean install
```

### Code Style

- Follow standard Java naming conventions
- Use Lombok annotations to reduce boilerplate
- Add Javadoc comments for public methods
- Keep controllers thin, business logic in services

## Testing

### Unit Tests

```bash
mvn test
```

### Integration Tests

```bash
mvn verify
```

### Manual API Testing

Use the provided curl commands or import into Postman/Insomnia.

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Change `server.port` in application.yml
   - Or kill the process: `lsof -ti:8080 | xargs kill`

2. **Cannot connect to Python service**
   - Ensure Python service is running on http://localhost:8000
   - Check `python.service.url` configuration
   - Verify network connectivity

3. **JWT token invalid**
   - Check `jwt.secret` matches between requests
   - Ensure token is sent in `Authorization: Bearer {token}` header
   - Check token expiration (default 24 hours)

4. **Database connection failed**
   - Verify MySQL is running
   - Check username/password in application-prod.yml
   - Ensure database `tradingagent` exists

5. **WebSocket connection issues**
   - Check CORS configuration
   - Verify WebSocket endpoint: `ws://localhost:8080/ws/analysis/{taskId}`
   - Ensure taskId is valid and belongs to authenticated user

6. **Liquibase migration errors**
   - Check changelog XML syntax
   - Verify database connectivity
   - Review Liquibase logs in console

## Security Considerations

### Production Checklist

- [ ] Change `jwt.secret` to a strong 256-bit key
- [ ] Use environment variables for sensitive data
- [ ] Enable HTTPS/WSS in production
- [ ] Restrict CORS to your frontend domain only
- [ ] Use strong database passwords
- [ ] Enable SQL injection protection (enabled by default with JPA)
- [ ] Set up rate limiting for API endpoints
- [ ] Configure proper logging (no sensitive data in logs)
- [ ] Use Spring Actuator for monitoring (with security)

## Performance Tuning

### Recommended Production Settings

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 10
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000

  jpa:
    properties:
      hibernate:
        jdbc:
          batch_size: 20
        order_inserts: true
        order_updates: true

logging:
  level:
    com.tradingagent: INFO
    org.springframework: WARN
    org.hibernate: WARN
```

## Monitoring

### Health Check

```bash
curl http://localhost:8080/actuator/health
```

### Logs

Application logs are written to:
- Console output
- `logs/trading-agent.log` (production)

### Metrics

Enable Spring Boot Actuator for metrics:
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
```

## Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation
4. Use meaningful commit messages

## License

MIT License - Same as parent TradingAgents project

## Support

For issues and questions:
- Check troubleshooting section above
- Review application logs
- Consult Spring Boot documentation
- Join TradingAgents Discord community
