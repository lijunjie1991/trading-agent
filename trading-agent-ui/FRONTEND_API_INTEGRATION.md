# Frontend API Integration Guide

## Overview

The frontend automatically handles the unified API response format from the backend. All API responses are processed through Axios interceptors to provide a seamless developer experience.

## Response Format

### Backend Response Structure

All backend APIs return responses in this format:

```json
{
  "code": 0,
  "message": "Success",
  "data": { ... },
  "timestamp": "2025-01-18T10:30:45.123",
  "path": null
}
```

### Frontend Handling

The Axios interceptor automatically:
1. **Extracts the `data` field** - `response.data` becomes the actual data
2. **Shows error notifications** - Errors are automatically displayed using Ant Design message
3. **Handles authentication** - 401 errors redirect to login
4. **Token expiration** - Codes 1004/1005 clear auth and redirect

## Usage Examples

### 1. Login Example

```javascript
import authService from '../services/authService'

// In your component
const handleLogin = async (credentials) => {
  try {
    // authService.login returns { token, user }
    // The interceptor has already extracted the data from Result wrapper
    const { token, user } = await authService.login(credentials)

    console.log('Login successful:', user)
    // No need to manually show success message - already stored in localStorage
  } catch (error) {
    // Error message already shown by interceptor
    // Just handle the UI state
    console.error('Login failed:', error.message)
  }
}
```

### 2. Fetch Tasks Example

```javascript
import taskService from '../services/taskService'

const fetchTasks = async () => {
  try {
    // taskService.listTasks returns the task array directly
    const tasks = await taskService.listTasks()

    console.log('Tasks:', tasks)
    setTasks(tasks)
  } catch (error) {
    // Error notification already displayed
    console.error('Failed to fetch tasks:', error.message)
  }
}
```

### 3. Submit Task Example

```javascript
import taskService from '../services/taskService'

const submitTask = async (taskData) => {
  try {
    const task = await taskService.startAnalysis(taskData)

    console.log('Task created:', task)
    // Success! Interceptor has shown success notification if needed
    navigate(`/tasks/${task.id}`)
  } catch (error) {
    // Error already shown by interceptor
    console.error('Task submission failed:', error.message)
  }
}
```

## Error Handling

### Automatic Error Notifications

All errors are automatically displayed using Ant Design's `message.error()`:

```javascript
// You don't need to do this manually:
// message.error('Email is already registered')

// The interceptor handles it automatically!
try {
  await authService.register(userData)
} catch (error) {
  // Error notification already shown
  // Just update component state if needed
  setIsLoading(false)
}
```

### Validation Errors

Validation errors (code 422) are automatically formatted and displayed:

```javascript
// Backend returns:
{
  "code": 422,
  "message": "Validation error",
  "data": {
    "email": "Email should be valid",
    "password": "Password must be at least 6 characters"
  }
}

// Interceptor shows: "Email should be valid, Password must be at least 6 characters"
```

### Error Codes

The interceptor handles these error codes automatically:

| Code | Action |
|------|--------|
| 0 | Success - extract data |
| 401 | Unauthorized - redirect to login |
| 1004 | Token expired - clear auth & redirect |
| 1005 | Invalid token - clear auth & redirect |
| 422 | Validation error - show field errors |
| Other | Show error message |

## No Need to Handle Response Wrapper

### ❌ Old Way (Before Interceptor)

```javascript
// Don't do this anymore
const response = await api.post('/api/v1/auth/login', credentials)
if (response.data.code === 0) {
  const authData = response.data.data
  // ...
} else {
  message.error(response.data.message)
}
```

### ✅ New Way (With Interceptor)

```javascript
// Just use the service directly
const { token, user } = await authService.login(credentials)
// response.data is already extracted!
```

## Redux Integration

Redux slices don't need to change because the interceptor handles everything:

```javascript
// authSlice.js
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      // authService.login returns { token, user }
      // Already extracted from Result wrapper
      const data = await authService.login(credentials)
      return data
    } catch (error) {
      // Error message already shown by interceptor
      return rejectWithValue(error.message)
    }
  }
)
```

## Custom Error Handling

If you need to handle errors differently for specific cases:

```javascript
// Suppress automatic error notification by catching before it reaches interceptor
const handleSpecialCase = async () => {
  try {
    const response = await api.post('/api/v1/special', data)
    // response.data is already extracted
    return response.data
  } catch (error) {
    // Error notification already shown

    // Handle specific error codes
    if (error.code === 1101) {
      // Task not found - do something specific
      navigate('/tasks')
    } else if (error.code === 1006) {
      // Access denied - show custom message
      Modal.error({
        title: 'Access Denied',
        content: 'You do not have permission to access this resource.',
      })
    }

    throw error // Re-throw if needed
  }
}
```

## Disabling Auto Notifications

If you want to handle notifications manually for a specific request:

```javascript
// Option 1: Catch and handle yourself
try {
  await authService.login(credentials)
  message.success('Welcome back!') // Custom success message
} catch (error) {
  // Error already shown by interceptor
  // If you want to override it, you'd need to modify the interceptor
}

// Option 2: Use raw API with custom config
try {
  const response = await api.post('/api/v1/auth/login', credentials, {
    // Add custom flag to skip notification (would need interceptor modification)
    skipNotification: true
  })
} catch (error) {
  // Handle manually
}
```

## TypeScript Support (Optional)

If you're using TypeScript, you can define types:

```typescript
// types/api.ts
export interface ApiResult<T = any> {
  code: number
  message: string
  data: T | null
  timestamp: string
  path?: string
}

export interface AuthResponse {
  token: string
  type: string
  userId: number
  email: string
}

// Usage
import { AuthResponse } from '../types/api'

const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/api/v1/auth/login', credentials)
  return response.data // Already extracted by interceptor
}
```

## Testing

When testing components that use the API:

```javascript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import api from '../services/api'

jest.mock('../services/api')

test('shows error message when login fails', async () => {
  // Mock the API to reject with an error
  api.post.mockRejectedValue(new Error('Invalid email or password'))

  render(<LoginPage />)

  // Fill in form and submit
  await userEvent.type(screen.getByLabelText('Email'), 'test@example.com')
  await userEvent.type(screen.getByLabelText('Password'), 'wrong')
  await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

  // Error notification will be shown automatically
  await waitFor(() => {
    // Test that component state is updated correctly
    expect(screen.getByRole('button')).not.toBeDisabled()
  })
})
```

## Best Practices

1. **Don't manually parse Result wrapper** - The interceptor does it automatically
2. **Don't manually show error messages** - The interceptor displays them
3. **Handle specific error codes when needed** - Check `error.code` for custom logic
4. **Log errors for debugging** - `console.error()` is still useful
5. **Update component state on errors** - Reset loading states, clear forms, etc.
6. **Trust the interceptor** - It handles 99% of error cases correctly

## Configuration

The interceptor is configured in `src/services/api.js`:

```javascript
// Key configurations:
- Timeout: 30 seconds
- Base URL: From environment or empty string (uses Vite proxy)
- Auto token injection: Yes
- Auto error notifications: Yes (Ant Design message)
- Auto 401 redirect: Yes
```

## Troubleshooting

### Error notifications not showing?

Check that Ant Design's `ConfigProvider` or message component is properly set up in your app root.

### Want to customize error messages?

Modify the interceptor in `src/services/api.js` to change notification behavior.

### Need to handle errors differently?

Use error codes in catch blocks:
```javascript
catch (error) {
  if (error.code === 1101) {
    // Custom handling for task not found
  }
}
```
