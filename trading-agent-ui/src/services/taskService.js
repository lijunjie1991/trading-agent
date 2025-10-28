import api from './api'
import { API_ENDPOINTS, parseApiUrl } from '../utils/constants'

/**
 * Task Service
 */
class TaskService {
  /**
   * Start new analysis task
   */
  async startAnalysis(taskData) {
    const response = await api.post(API_ENDPOINTS.START_ANALYSIS, {
      ticker: taskData.ticker,
      analysisDate: taskData.analysisDate,
      selectedAnalysts: taskData.selectedAnalysts,
      researchDepth: taskData.researchDepth,
    })
    // Backend returns: { code, message, data, timestamp }
    return response.data.data || response.data
  }

  /**
   * Get task by ID
   */
  async getTask(taskId) {
    const url = parseApiUrl(API_ENDPOINTS.GET_TASK, { taskId })
    const response = await api.get(url)
    // Backend returns: { code, message, data, timestamp }
    return response.data.data || response.data
  }

  /**
   * List all tasks
   */
  async listTasks(params = {}) {
    const response = await api.get(API_ENDPOINTS.LIST_TASKS, { params })
    // Backend returns: { code, message, data: [...], timestamp }
    return response.data.data || response.data
  }

  /**
   * Query tasks with pagination and filters
   */
  async queryTasks(queryRequest = {}) {
    const response = await api.post('/api/v1/tasks/query', queryRequest)
    // Backend returns: { code, message, data: PageResponse, timestamp }
    return response.data.data || response.data
  }

  /**
   * Cancel task
   */
  async cancelTask(taskId) {
    const url = parseApiUrl(API_ENDPOINTS.CANCEL_TASK, { taskId })
    const response = await api.post(url)
    return response.data
  }

  /**
   * Get task statistics
   */
  async getTaskStats() {
    try {
      const response = await api.get('/api/v1/tasks/stats')
      return response.data
    } catch (error) {
      console.error('Error fetching task stats:', error)
      return {
        total: 0,
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
      }
    }
  }

  async retryPayment(taskId) {
    const url = parseApiUrl(API_ENDPOINTS.RETRY_PAYMENT, { taskId })
    const response = await api.post(url)
    return response.data.data || response.data
  }
}

export default new TaskService()
