import api from './api'
import { API_ENDPOINTS } from '../utils/constants'

class BillingService {
  async getSummary() {
    const response = await api.get(API_ENDPOINTS.BILLING_SUMMARY)
    return response.data.data || response.data
  }

  async getQuote(payload) {
    const response = await api.post(API_ENDPOINTS.TASK_QUOTE, payload)
    return response.data.data || response.data
  }
}

export default new BillingService()
