# API Response Format

## Overview

All API endpoints return responses in a unified JSON format with consistent structure and error handling.

## Response Structure

### Success Response

```json
{
  "code": 0,
  "message": "Success",
  "data": { ... },
  "timestamp": "2025-01-18T10:30:45.123",
  "path": null
}
```

### Error Response

```json
{
  "code": 1003,
  "message": "Email is already registered",
  "data": null,
  "timestamp": "2025-01-18T10:30:45.123",
  "path": "/api/v1/auth/register"
}
```

### Validation Error Response

```json
{
  "code": 422,
  "message": "Validation error",
  "data": {
    "email": "Email should be valid",
    "password": "Password must be at least 6 characters"
  },
  "timestamp": "2025-01-18T10:30:45.123",
  "path": "/api/v1/auth/register"
}
```

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `code` | Integer | Response code (0 = success, non-zero = error) |
| `message` | String | Human-readable message |
| `data` | Object/Array/null | Response data (null for errors) |
| `timestamp` | String | ISO 8601 timestamp |
| `path` | String/null | Request path (included in errors) |

## Response Codes

### Success Codes

| Code | Message | Description |
|------|---------|-------------|
| 0 | Success | Successful operation |

### HTTP Error Codes (4xx, 5xx)

| Code | Message | Description |
|------|---------|-------------|
| 400 | Bad request | Invalid request format |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Access denied |
| 404 | Resource not found | Requested resource not found |
| 405 | Method not allowed | HTTP method not supported |
| 422 | Validation error | Request validation failed |
| 429 | Too many requests | Rate limit exceeded |
| 500 | Internal server error | Unexpected server error |
| 503 | Service unavailable | Service temporarily unavailable |
| 504 | Gateway timeout | Service timeout |

### Business Error Codes (1xxx)

#### Authentication & Authorization (10xx)

| Code | Message | Description |
|------|---------|-------------|
| 1001 | User not found | User does not exist |
| 1002 | Invalid email or password | Login credentials invalid |
| 1003 | Email is already registered | Email already in use |
| 1004 | Token has expired | JWT token expired |
| 1005 | Invalid token | JWT token invalid |
| 1006 | Access denied | Insufficient permissions |

#### Task Related (11xx)

| Code | Message | Description |
|------|---------|-------------|
| 1101 | Task not found | Task does not exist |
| 1102 | Task is already running | Cannot start duplicate task |
| 1103 | Task has been cancelled | Task was cancelled |
| 1104 | Task execution failed | Task failed to execute |
| 1105 | Invalid task status | Task status invalid |

#### Python Service (12xx)

| Code | Message | Description |
|------|---------|-------------|
| 1201 | Python service error | Error from Python service |
| 1202 | Python service is unavailable | Cannot connect to Python service |
| 1203 | Python service timeout | Python service timeout |

#### Database (13xx)

| Code | Message | Description |
|------|---------|-------------|
| 1301 | Database error | Database operation failed |
| 1302 | Duplicate entry | Database constraint violation |

#### Validation (14xx)

| Code | Message | Description |
|------|---------|-------------|
| 1401 | Missing required field | Required field not provided |
| 1402 | Invalid parameter | Parameter value invalid |
| 1403 | Invalid date format | Date format incorrect |
| 1404 | Invalid ticker symbol | Ticker symbol invalid |

## API Examples

### 1. Register User

**Request:**
```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200 OK):**
```json
{
  "code": 0,
  "message": "Registration successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "type": "Bearer",
    "userId": 1,
    "email": "user@example.com"
  },
  "timestamp": "2025-01-18T10:30:45.123",
  "path": null
}
```

**Error Response (400 Bad Request):**
```json
{
  "code": 1003,
  "message": "Email is already registered",
  "data": null,
  "timestamp": "2025-01-18T10:30:45.123",
  "path": "/api/v1/auth/register"
}
```

**Validation Error (422 Unprocessable Entity):**
```json
{
  "code": 422,
  "message": "Validation error",
  "data": {
    "email": "Email should be valid",
    "password": "Password must be at least 6 characters"
  },
  "timestamp": "2025-01-18T10:30:45.123",
  "path": "/api/v1/auth/register"
}
```

### 2. Login

**Request:**
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200 OK):**
```json
{
  "code": 0,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "type": "Bearer",
    "userId": 1,
    "email": "user@example.com"
  },
  "timestamp": "2025-01-18T10:30:45.123",
  "path": null
}
```

**Error Response (401 Unauthorized):**
```json
{
  "code": 1002,
  "message": "Invalid email or password",
  "data": null,
  "timestamp": "2025-01-18T10:30:45.123",
  "path": "/api/v1/auth/login"
}
```

### 3. Submit Task

**Request:**
```bash
POST /api/v1/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "ticker": "AAPL",
  "analysisDate": "2025-01-18",
  "selectedAnalysts": ["market", "fundamentals"],
  "researchDepth": 3
}
```

**Success Response (200 OK):**
```json
{
  "code": 0,
  "message": "Task submitted successfully",
  "data": {
    "id": 1,
    "taskId": "abc-123-def",
    "ticker": "AAPL",
    "analysisDate": "2025-01-18",
    "selectedAnalysts": ["market", "fundamentals"],
    "researchDepth": 3,
    "status": "PENDING",
    "finalDecision": null,
    "errorMessage": null,
    "createdAt": "2025-01-18T10:30:45",
    "completedAt": null
  },
  "timestamp": "2025-01-18T10:30:45.123",
  "path": null
}
```

### 4. Get Task List

**Request:**
```bash
GET /api/v1/tasks
Authorization: Bearer <token>
```

**Success Response (200 OK):**
```json
{
  "code": 0,
  "message": "Success",
  "data": [
    {
      "id": 1,
      "taskId": "abc-123-def",
      "ticker": "AAPL",
      "status": "COMPLETED",
      "createdAt": "2025-01-18T10:30:45"
    },
    {
      "id": 2,
      "taskId": "xyz-456-ghi",
      "ticker": "MSFT",
      "status": "RUNNING",
      "createdAt": "2025-01-18T11:00:00"
    }
  ],
  "timestamp": "2025-01-18T11:30:45.123",
  "path": null
}
```

### 5. Get Task by ID

**Request:**
```bash
GET /api/v1/tasks/1
Authorization: Bearer <token>
```

**Success Response (200 OK):**
```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "id": 1,
    "taskId": "abc-123-def",
    "ticker": "AAPL",
    "analysisDate": "2025-01-18",
    "status": "COMPLETED",
    "finalDecision": "BUY"
  },
  "timestamp": "2025-01-18T11:30:45.123",
  "path": null
}
```

**Error Response (404 Not Found):**
```json
{
  "code": 1101,
  "message": "Task not found",
  "data": null,
  "timestamp": "2025-01-18T11:30:45.123",
  "path": "/api/v1/tasks/999"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "code": 1006,
  "message": "Access denied",
  "data": null,
  "timestamp": "2025-01-18T11:30:45.123",
  "path": "/api/v1/tasks/1"
}
```

## Frontend Integration

### JavaScript/TypeScript

```typescript
// Response type definition
interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T | null;
  timestamp: string;
  path?: string;
}

// API call with error handling
async function loginUser(email: string, password: string) {
  try {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const result: ApiResponse<AuthResponse> = await response.json();

    if (result.code === 0) {
      // Success
      console.log('Login successful:', result.data);
      return result.data;
    } else {
      // Business error
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

// Check response code
function isSuccess(result: ApiResponse): boolean {
  return result.code === 0;
}

// Extract data safely
function getData<T>(result: ApiResponse<T>): T | null {
  return result.code === 0 ? result.data : null;
}
```

### Axios Interceptor

```typescript
import axios from 'axios';

axios.interceptors.response.use(
  (response) => {
    const result = response.data as ApiResponse;
    if (result.code !== 0) {
      // Handle business errors
      return Promise.reject(new Error(result.message));
    }
    return response;
  },
  (error) => {
    // Handle network errors
    return Promise.reject(error);
  }
);
```

## Best Practices

1. **Always check the `code` field**: Code 0 means success, non-zero means error
2. **Use `message` for user-facing errors**: The message field is always human-readable
3. **Validation errors include field details**: Check `data` field for field-specific errors
4. **Include `path` for debugging**: Error responses include the request path
5. **Handle different error types appropriately**:
   - 401 Unauthorized → Redirect to login
   - 403 Forbidden → Show access denied message
   - 404 Not Found → Show not found message
   - 422 Validation Error → Show field-specific errors
   - 500 Server Error → Show generic error message

## Exception Handling Flow

```
Controller Request
    ↓
Try-Catch (removed - exceptions bubble up)
    ↓
Service Layer throws BusinessException/ResourceNotFoundException/etc
    ↓
GlobalExceptionHandler catches exception
    ↓
Converts to Result<T> with appropriate code and message
    ↓
Returns ResponseEntity<Result<T>>
    ↓
Client receives unified JSON response
```
