import dayjs from 'dayjs'
import { DATE_FORMAT, DATETIME_FORMAT, TIME_FORMAT } from './constants'

/**
 * Format date to string
 */
export const formatDate = (date, format = DATE_FORMAT) => {
  if (!date) return ''
  return dayjs(date).format(format)
}

/**
 * Format datetime to string
 */
export const formatDateTime = (date) => {
  return formatDate(date, DATETIME_FORMAT)
}

/**
 * Format time to string
 */
export const formatTime = (date) => {
  return formatDate(date, TIME_FORMAT)
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export const getRelativeTime = (date) => {
  if (!date) return ''
  const now = dayjs()
  const target = dayjs(date)
  const diffMs = now.diff(target)
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
  return formatDate(date)
}

/**
 * Truncate text with ellipsis
 */
export const truncate = (text, maxLength = 50) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Truncate task ID for display
 */
export const truncateTaskId = (taskId) => {
  if (!taskId) return ''
  return taskId.length > 8 ? taskId.substring(0, 8) + '...' : taskId
}

/**
 * Get status color for Ant Design
 */
export const getStatusColor = (status) => {
  const colors = {
    pending: 'default',
    running: 'processing',
    completed: 'success',
    failed: 'error',
    cancelled: 'warning',
  }
  return colors[status?.toLowerCase()] || 'default'
}

/**
 * Get decision color class
 */
export const getDecisionColor = (decision) => {
  if (!decision) return 'default'
  const lowerDecision = decision.toLowerCase()
  if (lowerDecision.includes('buy')) return 'success'
  if (lowerDecision.includes('sell')) return 'error'
  return 'warning'
}

/**
 * Get decision badge type for Ant Design
 */
export const getDecisionBadgeStatus = (decision) => {
  if (!decision) return 'default'
  const lowerDecision = decision.toLowerCase()
  if (lowerDecision.includes('buy')) return 'success'
  if (lowerDecision.includes('sell')) return 'error'
  return 'warning'
}

/**
 * Parse WebSocket URL with task ID
 */
export const parseWsUrl = (template, taskId) => {
  return template.replace(':taskId', taskId)
}

/**
 * Parse API URL with parameters
 */
export const parseApiUrl = (template, params = {}) => {
  let url = template
  Object.keys(params).forEach((key) => {
    url = url.replace(`:${key}`, params[key])
  })
  return url
}

/**
 * Deep clone object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Check if value is empty
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * Debounce function
 */
export const debounce = (func, wait = 300) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function
 */
export const throttle = (func, limit = 300) => {
  let inThrottle
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Sleep for specified milliseconds
 */
export const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Format number with commas
 */
export const formatNumber = (num) => {
  if (!num && num !== 0) return '0'
  return num.toLocaleString()
}

/**
 * Format percentage
 */
export const formatPercentage = (value, decimals = 2) => {
  if (!value && value !== 0) return '0%'
  return `${value.toFixed(decimals)}%`
}

/**
 * Safely parse JSON
 */
export const safeJsonParse = (str, defaultValue = null) => {
  try {
    return JSON.parse(str)
  } catch (e) {
    return defaultValue
  }
}

/**
 * Get message type icon
 */
export const getMessageTypeIcon = (type) => {
  const icons = {
    status: '📊',
    message: '💬',
    tool_call: '🔧',
    report: '📄',
    agent_status: '👤',
  }
  return icons[type] || '📝'
}

/**
 * Get message type label
 */
export const getMessageTypeLabel = (type) => {
  if (!type) return 'UNKNOWN'
  const labels = {
    status: 'STATUS',
    message: 'REASONING',
    tool_call: 'TOOL CALL',
    report: 'REPORT',
    agent_status: 'AGENT STATUS',
  }
  return labels[type] || type.toUpperCase()
}

/**
 * Calculate task duration
 */
export const calculateDuration = (startTime, endTime) => {
  if (!startTime) return 'N/A'
  const start = dayjs(startTime)
  const end = endTime ? dayjs(endTime) : dayjs()
  const diffMs = end.diff(start)

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

/**
 * Validate ticker symbol
 */
export const isValidTicker = (ticker) => {
  if (!ticker) return false
  // Basic validation: 1-5 uppercase letters
  return /^[A-Z]{1,5}$/.test(ticker.trim())
}

/**
 * Get agent display name
 */
export const getAgentDisplayName = (agentId) => {
  const nameMap = {
    'market': 'Market Analyst',
    'social': 'Social Analyst',
    'news': 'News Analyst',
    'fundamentals': 'Fundamentals Analyst',
    'bull': 'Bull Researcher',
    'bear': 'Bear Researcher',
    'research-manager': 'Research Manager',
    'trader': 'Trader',
    'risk-risky': 'Aggressive Analyst',
    'risk-safe': 'Conservative Analyst',
    'risk-neutral': 'Neutral Analyst',
    'risk-manager': 'Risk Manager',
  }
  return nameMap[agentId] || agentId
}

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Failed to copy:', err)
    return false
  }
}

/**
 * Download text as file
 */
export const downloadAsFile = (content, filename, mimeType = 'text/plain') => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
