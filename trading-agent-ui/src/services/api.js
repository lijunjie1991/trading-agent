import axios from 'axios'
import { message as antdMessage } from 'antd'
import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Handle unified response format
api.interceptors.response.use(
  (response) => {
    const result = response.data

    // Check if response follows the unified format
    if (result && typeof result.code !== 'undefined') {
      // Code 0 means success
      if (result.code === 0) {
        // Return the data directly for easier usage
        response.data = result.data
        return response
      } else {
        // Business error (code !== 0)
        const errorMessage = result.message || 'An error occurred'

        // Show error message notification
        antdMessage.error(errorMessage)

        // Handle specific error codes
        if (result.code === 1004 || result.code === 1005) {
          // Token expired or invalid
          localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
          localStorage.removeItem(STORAGE_KEYS.USER_INFO)
          window.location.href = '/login'
        }

        // Create error with code and message
        const error = new Error(errorMessage)
        error.code = result.code
        error.result = result
        return Promise.reject(error)
      }
    }

    // If not unified format, return as is
    return response
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response

      // Try to extract message from unified format
      let errorMessage = 'An error occurred'

      if (data && typeof data.code !== 'undefined') {
        // Unified error format
        errorMessage = data.message || errorMessage

        // Show validation errors if present
        if (data.code === 422 && data.data && typeof data.data === 'object') {
          const fieldErrors = Object.values(data.data).join(', ')
          errorMessage = fieldErrors || errorMessage
        }
      } else {
        // Legacy error format
        errorMessage = data?.message || data?.error || error.message
      }

      // Show error notification
      antdMessage.error(errorMessage)

      // Handle 401 Unauthorized
      if (status === 401) {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
        localStorage.removeItem(STORAGE_KEYS.USER_INFO)
        window.location.href = '/login'
      }

      // Create enhanced error object
      const enhancedError = new Error(errorMessage)
      enhancedError.status = status
      enhancedError.code = data?.code
      enhancedError.response = error.response
      return Promise.reject(enhancedError)
    } else if (error.request) {
      // Request made but no response received
      const errorMessage = 'No response from server. Please check your connection.'
      antdMessage.error(errorMessage)
      return Promise.reject(new Error(errorMessage))
    } else {
      // Something else happened
      const errorMessage = error.message || 'An unexpected error occurred'
      antdMessage.error(errorMessage)
      return Promise.reject(new Error(errorMessage))
    }
  }
)

// Task Messages API
export const taskMessagesAPI = {
  /**
   * Get task messages
   * @param {string} taskId - Task ID
   * @param {string} lastTimestamp - Last timestamp (optional for incremental fetch)
   * @returns {Promise<Array>} - Array of messages
   */
  getTaskMessages: (taskId, lastTimestamp = null) => {
    const params = lastTimestamp ? { lastTimestamp } : {}
    return api.get(`/api/v1/tasks/${taskId}/messages`, { params })
  }
}

export default api
