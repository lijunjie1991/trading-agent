import api from './api'
import { API_ENDPOINTS, STORAGE_KEYS } from '../utils/constants'

/**
 * Authentication Service
 */
class AuthService {
  /**
   * Login user
   */
  async login(credentials) {
    const response = await api.post(API_ENDPOINTS.LOGIN, credentials)
    // response.data already extracted by interceptor
    const authData = response.data

    // Store token and user info
    this.setAuthToken(authData.token)

    // Build user object from auth response
    const user = {
      userId: authData.userId,
      email: authData.email,
    }
    this.setUserInfo(user)

    return { token: authData.token, user }
  }

  /**
   * Register new user
   */
  async register(userData) {
    const response = await api.post(API_ENDPOINTS.REGISTER, userData)
    // response.data already extracted by interceptor
    const authData = response.data

    // Store token and user info
    this.setAuthToken(authData.token)

    // Build user object from auth response
    const user = {
      userId: authData.userId,
      email: authData.email,
    }
    this.setUserInfo(user)

    return { token: authData.token, user }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      await api.post(API_ENDPOINTS.LOGOUT)
    } catch (error) {
      // Continue with logout even if server request fails
      console.error('Logout error:', error)
    } finally {
      this.clearAuth()
    }
  }

  /**
   * Verify token validity
   */
  async verifyToken() {
    try {
      const response = await api.get(API_ENDPOINTS.VERIFY_TOKEN)
      return response.data
    } catch (error) {
      this.clearAuth()
      throw error
    }
  }

  /**
   * Set auth token in localStorage
   */
  setAuthToken(token) {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token)
    }
  }

  /**
   * Get auth token from localStorage
   */
  getAuthToken() {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
  }

  /**
   * Set user info in localStorage
   */
  setUserInfo(user) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user))
    }
  }

  /**
   * Get user info from localStorage
   */
  getUserInfo() {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER_INFO)
    try {
      return userStr ? JSON.parse(userStr) : null
    } catch (error) {
      return null
    }
  }

  /**
   * Clear authentication data
   */
  clearAuth() {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER_INFO)
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.getAuthToken()
  }
}

export default new AuthService()
