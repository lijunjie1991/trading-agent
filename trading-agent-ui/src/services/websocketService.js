import { WS_BASE_URL, WS_RECONNECT_INTERVAL, WS_MAX_RECONNECT_ATTEMPTS, WS_HEARTBEAT_INTERVAL } from '../utils/constants'
import { parseWsUrl } from '../utils/helpers'

/**
 * WebSocket Service with auto-reconnect
 */
class WebSocketService {
  constructor() {
    this.ws = null
    this.url = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = WS_MAX_RECONNECT_ATTEMPTS
    this.reconnectInterval = WS_RECONNECT_INTERVAL
    this.heartbeatInterval = null
    this.messageHandlers = []
    this.openHandlers = []
    this.closeHandlers = []
    this.errorHandlers = []
    this.isManualClose = false
  }

  /**
   * Connect to WebSocket
   */
  connect(taskId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('WebSocket already connected')
      return
    }

    this.url = `${WS_BASE_URL}/ws/analysis/${taskId}`
    this.isManualClose = false
    this.reconnectAttempts = 0

    this._createConnection()
  }

  /**
   * Create WebSocket connection
   */
  _createConnection() {
    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = (event) => {
        console.log('WebSocket connected')
        this.reconnectAttempts = 0
        this._startHeartbeat()
        this.openHandlers.forEach((handler) => handler(event))
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.messageHandlers.forEach((handler) => handler(data))
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.errorHandlers.forEach((handler) => handler(error))
      }

      this.ws.onclose = (event) => {
        console.log('WebSocket closed', event)
        this._stopHeartbeat()
        this.closeHandlers.forEach((handler) => handler(event))

        // Attempt to reconnect if not manually closed
        if (!this.isManualClose) {
          this._attemptReconnect()
        }
      }
    } catch (error) {
      console.error('Error creating WebSocket connection:', error)
      this._attemptReconnect()
    }
  }

  /**
   * Attempt to reconnect
   */
  _attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)

      setTimeout(() => {
        if (!this.isManualClose) {
          this._createConnection()
        }
      }, this.reconnectInterval)
    } else {
      console.error('Max reconnect attempts reached')
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  _startHeartbeat() {
    this._stopHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping')
      }
    }, WS_HEARTBEAT_INTERVAL)
  }

  /**
   * Stop heartbeat
   */
  _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Send message
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data)
      this.ws.send(message)
    } else {
      console.warn('WebSocket not connected')
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    this.isManualClose = true
    this._stopHeartbeat()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.url = null
    this.reconnectAttempts = 0
  }

  /**
   * Add message handler
   */
  onMessage(handler) {
    this.messageHandlers.push(handler)
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler)
    }
  }

  /**
   * Add open handler
   */
  onOpen(handler) {
    this.openHandlers.push(handler)
    return () => {
      this.openHandlers = this.openHandlers.filter((h) => h !== handler)
    }
  }

  /**
   * Add close handler
   */
  onClose(handler) {
    this.closeHandlers.push(handler)
    return () => {
      this.closeHandlers = this.closeHandlers.filter((h) => h !== handler)
    }
  }

  /**
   * Add error handler
   */
  onError(handler) {
    this.errorHandlers.push(handler)
    return () => {
      this.errorHandlers = this.errorHandlers.filter((h) => h !== handler)
    }
  }

  /**
   * Clear all handlers
   */
  clearHandlers() {
    this.messageHandlers = []
    this.openHandlers = []
    this.closeHandlers = []
    this.errorHandlers = []
  }

  /**
   * Get connection state
   */
  getState() {
    if (!this.ws) return WebSocket.CLOSED
    return this.ws.readyState
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN
  }
}

export default new WebSocketService()
