import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import taskService from '../../services/taskService'
import billingService from '../../services/billingService'
import { taskMessagesAPI } from '../../services/api'
import { AGENT_STATUS } from '../../utils/constants'

const initialState = {
  // Current task
  currentTask: null,
  currentTaskId: null,

  // Task list
  tasks: [],
  taskStats: {
    total: 0,
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
  },

  // Pagination
  pagination: {
    currentPage: 0,
    pageSize: 12,
    totalElements: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  },

  // Task messages (from polling)
  messages: [],
  lastTimestamp: null, // Track last fetched message timestamp
  agentStatuses: {},
  workflowStage: null,
  stats: {
    toolCalls: 0,
    llmCalls: 0,
    reports: 0,
  },
  currentReport: null,
  finalDecision: null,

  // Loading states
  loading: false,
  submitting: false,
  error: null,

  // Billing states
  billingSummary: null,
  billingLoading: false,
  quote: null,
  quoteLoading: false,
  paymentRequired: false,
  paymentIntentId: null,
  paymentClientSecret: null,
  pendingPaymentTaskId: null,
  freeQuotaTotal: 0,
  freeQuotaRemaining: 0,
  paidTaskCount: 0,
}

// Initialize agent statuses
const initializeAgentStatuses = () => {
  const agents = [
    'market', 'social', 'news', 'fundamentals',
    'bull', 'bear', 'research-manager',
    'trader',
    'risk-risky', 'risk-safe', 'risk-neutral', 'risk-manager',
  ]
  const statuses = {}
  agents.forEach((agent) => {
    statuses[agent] = AGENT_STATUS.PENDING
  })
  return statuses
}

// Async thunks
export const startAnalysis = createAsyncThunk(
  'task/startAnalysis',
  async (taskData, { rejectWithValue }) => {
    try {
      const data = await taskService.startAnalysis(taskData)
      return data
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const retryTaskPayment = createAsyncThunk(
  'task/retryPayment',
  async (taskId, { rejectWithValue }) => {
    try {
      const data = await taskService.retryPayment(taskId)
      return data
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const retryTask = createAsyncThunk(
  'task/retryTask',
  async (taskId, { rejectWithValue }) => {
    try {
      const data = await taskService.retryTask(taskId)
      return data
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const fetchBillingSummary = createAsyncThunk(
  'task/fetchBillingSummary',
  async (_, { rejectWithValue }) => {
    try {
      const data = await billingService.getSummary()
      return data
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const fetchTaskQuote = createAsyncThunk(
  'task/fetchTaskQuote',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await billingService.getQuote(payload)
      return { ...data, request: payload }
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const fetchTask = createAsyncThunk(
  'task/fetchTask',
  async (taskId, { rejectWithValue }) => {
    try {
      const data = await taskService.getTask(taskId)
      return data
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const fetchTasks = createAsyncThunk(
  'task/fetchTasks',
  async (params, { rejectWithValue }) => {
    try {
      const data = await taskService.listTasks(params)
      return data
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const queryTasks = createAsyncThunk(
  'task/queryTasks',
  async (queryRequest, { rejectWithValue }) => {
    try {
      const data = await taskService.queryTasks(queryRequest)
      return data
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const cancelTask = createAsyncThunk(
  'task/cancelTask',
  async (taskId, { rejectWithValue }) => {
    try {
      const data = await taskService.cancelTask(taskId)
      return data
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const fetchTaskStats = createAsyncThunk(
  'task/fetchTaskStats',
  async (_, { rejectWithValue }) => {
    try {
      const data = await taskService.getTaskStats()
      return data
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const fetchTaskMessages = createAsyncThunk(
  'task/fetchTaskMessages',
  async ({ taskId, lastTimestamp }, { rejectWithValue }) => {
    try {
      const response = await taskMessagesAPI.getTaskMessages(taskId, lastTimestamp)
      return response.data
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

// Task slice
const taskSlice = createSlice({
  name: 'task',
  initialState,
  reducers: {
    // Message handlers (from polling)
    addMessage: (state, action) => {
      state.messages.unshift(action.payload)

      // Keep only last 100 messages
      if (state.messages.length > 100) {
        state.messages = state.messages.slice(0, 100)
      }
    },

    addMessages: (state, action) => {
      // Add multiple messages (from polling)
      const newMessages = action.payload
      if (newMessages && newMessages.length > 0) {
        // Messages are expected in DESC order (newest first)
        state.messages = [...newMessages, ...state.messages]

        // Keep only last 100 messages
        if (state.messages.length > 100) {
          state.messages = state.messages.slice(0, 100)
        }

        // Update last timestamp (Timestamp of the latest message - The first message is the latest)
        const latestMessage = newMessages[0]
        if (latestMessage && latestMessage.createdAt) {
          state.lastTimestamp = latestMessage.createdAt
        }
      }
    },

    updateAgentStatus: (state, action) => {
      const { agent, status } = action.payload
      state.agentStatuses[agent] = status
    },

    updateStats: (state, action) => {
      state.stats = {
        ...state.stats,
        ...action.payload,
      }
    },

    updateCurrentReport: (state, action) => {
      state.currentReport = action.payload
    },

    updateFinalDecision: (state, action) => {
      state.finalDecision = action.payload
    },

    updateWorkflowStage: (state, action) => {
      state.workflowStage = action.payload
    },

    setCurrentTaskId: (state, action) => {
      state.currentTaskId = action.payload
    },

    resetTaskState: (state) => {
      state.messages = []
      state.lastTimestamp = null
      state.agentStatuses = initializeAgentStatuses()
      state.workflowStage = null
      state.stats = {
        toolCalls: 0,
        llmCalls: 0,
        reports: 0,
      }
      state.currentReport = null
      state.finalDecision = null
    },

    clearMessages: (state) => {
      state.messages = []
    },

    clearError: (state) => {
      state.error = null
    },
    clearPaymentState: (state) => {
      state.paymentRequired = false
      state.paymentIntentId = null
      state.paymentClientSecret = null
      state.pendingPaymentTaskId = null
    },
  },
  extraReducers: (builder) => {
    // Start analysis
    builder.addCase(startAnalysis.pending, (state) => {
      state.submitting = true
      state.error = null
    })
    builder.addCase(startAnalysis.fulfilled, (state, action) => {
      state.submitting = false
      const payload = action.payload || {}
      const taskId = payload.taskId || payload.task_id
      state.currentTask = payload
      state.agentStatuses = initializeAgentStatuses()
      state.error = null
      state.paymentRequired = Boolean(payload.paymentRequired || payload.payment_required)
      state.paymentIntentId = payload.paymentIntentId || payload.payment_intent_id || null
      state.paymentClientSecret = payload.paymentClientSecret || payload.payment_client_secret || null
      state.pendingPaymentTaskId = state.paymentRequired ? taskId : null
      state.freeQuotaTotal = payload.freeQuotaTotal ?? payload.free_quota_total ?? state.freeQuotaTotal
      state.freeQuotaRemaining = payload.freeQuotaRemaining ?? payload.free_quota_remaining ?? state.freeQuotaRemaining
      state.paidTaskCount = payload.paidTaskCount ?? payload.paid_task_count ?? state.paidTaskCount
      if (state.paymentRequired) {
        state.currentTaskId = null
      } else {
        state.currentTaskId = taskId
      }
    })
    builder.addCase(startAnalysis.rejected, (state, action) => {
      state.submitting = false
      state.error = action.payload
      state.paymentRequired = false
      state.paymentIntentId = null
      state.paymentClientSecret = null
      state.pendingPaymentTaskId = null
    })

    // Retry payment
    builder.addCase(retryTaskPayment.pending, (state) => {
      state.submitting = true
      state.error = null
    })
    builder.addCase(retryTaskPayment.fulfilled, (state, action) => {
      state.submitting = false
      const payload = action.payload || {}
      const paymentRequiredValue = payload.paymentRequired
      if (typeof paymentRequiredValue === 'boolean') {
        state.paymentRequired = paymentRequiredValue
      } else if (typeof payload.payment_required === 'boolean') {
        state.paymentRequired = payload.payment_required
      }
      state.paymentIntentId = payload.paymentIntentId || payload.payment_intent_id || null
      state.paymentClientSecret = payload.paymentClientSecret || payload.payment_client_secret || null
      const taskId = payload.taskId || payload.task_id || state.pendingPaymentTaskId
      state.pendingPaymentTaskId = state.paymentRequired ? taskId : null
      state.freeQuotaTotal = payload.freeQuotaTotal ?? payload.free_quota_total ?? state.freeQuotaTotal
      state.freeQuotaRemaining = payload.freeQuotaRemaining ?? payload.free_quota_remaining ?? state.freeQuotaRemaining
      state.paidTaskCount = payload.paidTaskCount ?? payload.paid_task_count ?? state.paidTaskCount
      state.currentTask = payload
    })
    builder.addCase(retryTaskPayment.rejected, (state, action) => {
      state.submitting = false
      state.error = action.payload
    })

    // Retry task
    builder.addCase(retryTask.pending, (state) => {
      state.submitting = true
      state.error = null
    })
    builder.addCase(retryTask.fulfilled, (state, action) => {
      state.submitting = false
      state.currentTask = action.payload
      state.error = null
      // Reset messages and state for the retried task
      state.messages = []
      state.lastTimestamp = null
      state.agentStatuses = initializeAgentStatuses()
      state.stats = {
        toolCalls: 0,
        llmCalls: 0,
        reports: 0,
      }
      state.currentReport = null
      state.finalDecision = null
    })
    builder.addCase(retryTask.rejected, (state, action) => {
      state.submitting = false
      state.error = action.payload
    })

    // Fetch task
    builder.addCase(fetchTask.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(fetchTask.fulfilled, (state, action) => {
      state.loading = false
      state.currentTask = action.payload

      // 从 task 对象中提取 finalDecision 字段
      const task = action.payload
      if (task) {
        const decision = task.finalDecision || task.final_decision || task.decision
        if (decision) {
          state.finalDecision = decision
        }

        const requiresPayment = Boolean(task.paymentRequired || task.payment_required)
        state.paymentRequired = requiresPayment
        state.paymentIntentId = task.paymentIntentId || task.payment_intent_id || null
        state.paymentClientSecret = task.paymentClientSecret || task.payment_client_secret || null
        if (requiresPayment) {
          const pendingId = task.taskId || task.task_id || state.pendingPaymentTaskId
          state.pendingPaymentTaskId = pendingId
        } else {
          state.pendingPaymentTaskId = null
        }
      }

      state.error = null
    })
    builder.addCase(fetchTask.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload
    })

    // Fetch tasks
    builder.addCase(fetchTasks.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(fetchTasks.fulfilled, (state, action) => {
      state.loading = false
      // Backend returns array directly in data field
      state.tasks = Array.isArray(action.payload) ? action.payload : (action.payload.tasks || action.payload)
      state.error = null
    })
    builder.addCase(fetchTasks.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload
    })

    // Query tasks with pagination
    builder.addCase(queryTasks.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(queryTasks.fulfilled, (state, action) => {
      state.loading = false
      // Backend returns PageResponse: { content, currentPage, pageSize, totalElements, totalPages, hasNext, hasPrevious }
      const pageResponse = action.payload
      state.tasks = pageResponse.content || []
      state.pagination = {
        currentPage: pageResponse.currentPage || 0,
        pageSize: pageResponse.pageSize || 12,
        totalElements: pageResponse.totalElements || 0,
        totalPages: pageResponse.totalPages || 0,
        hasNext: pageResponse.hasNext || false,
        hasPrevious: pageResponse.hasPrevious || false,
      }
      state.error = null
    })
    builder.addCase(queryTasks.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload
    })

    // Cancel task
    builder.addCase(cancelTask.fulfilled, (state, action) => {
      if (state.currentTask?.task_id === action.payload.task_id) {
        state.currentTask = action.payload
      }
    })

    // Fetch task stats
    builder.addCase(fetchTaskStats.fulfilled, (state, action) => {
      state.taskStats = action.payload
    })

    // Fetch task messages
    builder.addCase(fetchTaskMessages.fulfilled, (state, action) => {
      const messages = action.payload || []

      if (state.lastTimestamp === null || state.messages.length === 0) {
        // Initial fetch - replace all messages
        // Backend returns DESC order (newest first)
        state.messages = messages

        // Update last timestamp
        if (messages.length > 0 && messages[0].createdAt) {
          state.lastTimestamp = messages[0].createdAt
        }
      } else if (messages.length > 0) {
        // Incremental fetch - add new messages to the front
        // Backend returns DESC order (newest first)
        state.messages = [...messages, ...state.messages]

        // Keep only last 100 messages
        if (state.messages.length > 100) {
          state.messages = state.messages.slice(0, 100)
        }

        // Update last timestamp (Timestamp of the latest message - The first message is the latest)
        const latestMessage = messages[0]
        if (latestMessage && latestMessage.createdAt) {
          state.lastTimestamp = latestMessage.createdAt
        }
      }
    })

    // Billing summary
    builder.addCase(fetchBillingSummary.pending, (state) => {
      state.billingLoading = true
    })
    builder.addCase(fetchBillingSummary.fulfilled, (state, action) => {
      state.billingLoading = false
      state.billingSummary = action.payload
      if (action.payload) {
        state.freeQuotaTotal = action.payload.freeQuotaTotal ?? state.freeQuotaTotal
        const remaining = action.payload.freeQuotaRemaining ?? state.freeQuotaRemaining
        state.freeQuotaRemaining = remaining
        state.paidTaskCount = action.payload.paidTaskCount ?? state.paidTaskCount
      }
    })
    builder.addCase(fetchBillingSummary.rejected, (state) => {
      state.billingLoading = false
    })

    // Task quote
    builder.addCase(fetchTaskQuote.pending, (state) => {
      state.quoteLoading = true
    })
    builder.addCase(fetchTaskQuote.fulfilled, (state, action) => {
      state.quoteLoading = false
      state.quote = action.payload
      if (action.payload) {
        state.freeQuotaRemaining = action.payload.freeQuotaRemaining ?? state.freeQuotaRemaining
        state.freeQuotaTotal = action.payload.freeQuotaTotal ?? state.freeQuotaTotal
      }
    })
    builder.addCase(fetchTaskQuote.rejected, (state) => {
      state.quoteLoading = false
    })
  },
})

export const {
  addMessage,
  addMessages,
  updateAgentStatus,
  updateStats,
  updateCurrentReport,
  updateFinalDecision,
  updateWorkflowStage,
  setCurrentTaskId,
  resetTaskState,
  clearMessages,
  clearError,
  clearPaymentState,
} = taskSlice.actions

export default taskSlice.reducer
