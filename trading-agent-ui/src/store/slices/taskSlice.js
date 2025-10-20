import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import taskService from '../../services/taskService'
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

        // Update last timestamp (最新消息的时间戳 - 第一个消息是最新的)
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
  },
  extraReducers: (builder) => {
    // Start analysis
    builder.addCase(startAnalysis.pending, (state) => {
      state.submitting = true
      state.error = null
    })
    builder.addCase(startAnalysis.fulfilled, (state, action) => {
      state.submitting = false
      // Backend uses taskId (camelCase), not task_id
      state.currentTaskId = action.payload.taskId || action.payload.task_id
      state.currentTask = action.payload
      state.agentStatuses = initializeAgentStatuses()
      state.error = null
    })
    builder.addCase(startAnalysis.rejected, (state, action) => {
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

        // Update last timestamp (最新消息的时间戳 - 第一个消息是最新的)
        const latestMessage = messages[0]
        if (latestMessage && latestMessage.createdAt) {
          state.lastTimestamp = latestMessage.createdAt
        }
      }
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
} = taskSlice.actions

export default taskSlice.reducer
