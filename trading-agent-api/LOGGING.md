# Logging Configuration

## Overview

This project uses **Logback** as the logging framework, which is the default logging implementation for Spring Boot.

## Configuration Files

- `src/main/resources/logback-spring.xml` - Main Logback configuration file
- `src/main/resources/application.yml` - References the Logback configuration

## Log Files Location

All log files are stored in the `logs/` directory:

```
logs/
├── trading-agent-api.log              # All logs (INFO and above)
├── trading-agent-api-error.log        # Error logs only
├── trading-agent-api-YYYY-MM-DD.*.log.gz  # Archived daily logs
└── trading-agent-api-error-YYYY-MM-DD.*.log.gz  # Archived error logs
```

## Log Levels by Profile

### Development Profile (`dev` or `default`)
- **Console Output**: Enabled with colored formatting
- **File Output**: All logs and error logs
- **Log Level**:
  - Application code (`com.tradingagent`): `DEBUG`
  - Root level: `INFO`
  - SQL queries: `DEBUG`
  - Spring Web/Security: `DEBUG`

### Production Profile (`prod`)
- **Console Output**: Disabled
- **File Output**: All logs and error logs
- **Log Level**:
  - Application code (`com.tradingagent`): `INFO`
  - Root level: `INFO`
  - Third-party libraries: `WARN`

### Test Profile (`test`)
- **Console Output**: Enabled
- **File Output**: Disabled
- **Log Level**:
  - Application code (`com.tradingagent`): `DEBUG`
  - Root level: `WARN`

## Log Rotation Policy

### All Logs (`trading-agent-api.log`)
- **Max File Size**: 10MB
- **Max History**: 30 days
- **Total Size Cap**: 1GB
- **Compression**: GZIP after rotation

### Error Logs (`trading-agent-api-error.log`)
- **Max File Size**: 10MB
- **Max History**: 60 days
- **Total Size Cap**: 500MB
- **Compression**: GZIP after rotation

## Using Loggers in Code

### Import Lombok's @Slf4j annotation:

```java
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class MyService {

    public void doSomething() {
        log.trace("Trace level log");
        log.debug("Debug level log");
        log.info("Info level log");
        log.warn("Warning level log");
        log.error("Error level log");

        // With parameters
        log.info("User {} logged in at {}", username, LocalDateTime.now());

        // With exception
        try {
            // some code
        } catch (Exception e) {
            log.error("Error processing request: {}", request, e);
        }
    }
}
```

### Without Lombok (manual logger creation):

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class MyService {
    private static final Logger log = LoggerFactory.getLogger(MyService.class);

    public void doSomething() {
        log.info("Processing...");
    }
}
```

## Running with Different Profiles

### Development (default):
```bash
mvn spring-boot:run
# or
java -jar trading-agent-api.jar
```

### Production:
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=prod
# or
java -jar trading-agent-api.jar --spring.profiles.active=prod
```

### Test:
```bash
mvn test
```

## Monitoring Logs

### Tail all logs:
```bash
tail -f logs/trading-agent-api.log
```

### Tail error logs only:
```bash
tail -f logs/trading-agent-api-error.log
```

### Search for specific errors:
```bash
grep "ERROR" logs/trading-agent-api.log
```

### View compressed logs:
```bash
zcat logs/trading-agent-api-2025-01-15.1.log.gz | less
```

## Performance Considerations

- **Async Appenders**: Enabled for file logging to avoid blocking application threads
- **Queue Size**: 512 for all logs, 256 for error logs
- **Discarding Threshold**: 0 (no log messages are discarded under high load)

## Customization

To adjust log levels without restarting:
1. Update `application.yml` or use environment variables
2. Or modify `logback-spring.xml` and restart

### Environment Variables:
```bash
export LOG_PATH=/var/log/tradingagent
export LOG_FILE=/var/log/tradingagent/app
java -jar trading-agent-api.jar
```

## Best Practices

1. **Use appropriate log levels**:
   - `TRACE`: Very detailed diagnostic info
   - `DEBUG`: Debugging information
   - `INFO`: General informational messages
   - `WARN`: Warning messages (potential issues)
   - `ERROR`: Error events that might still allow the application to continue running

2. **Use parameterized logging**:
   ```java
   // Good - lazy evaluation
   log.debug("User {} performed action {}", userId, action);

   // Bad - string concatenation even when debug is disabled
   log.debug("User " + userId + " performed action " + action);
   ```

3. **Don't log sensitive information**:
   - Passwords, tokens, API keys
   - Personal Identifiable Information (PII)
   - Credit card numbers

4. **Log exceptions properly**:
   ```java
   log.error("Error processing order", exception);  // Good
   log.error(exception.getMessage());  // Bad - loses stack trace
   ```

## Troubleshooting

### Logs not appearing?
1. Check if `logs/` directory exists and is writable
2. Verify Spring profile is set correctly
3. Check log level configuration in `logback-spring.xml`

### Too many log files?
- Adjust `maxHistory` in `logback-spring.xml`
- Adjust `totalSizeCap` to limit total disk usage

### Performance issues?
- Reduce async queue size if memory is limited
- Increase `discardingThreshold` to drop low-priority logs under load
- Disable file logging in development if not needed
