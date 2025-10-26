// API Configuration
// Use empty string to leverage Vite proxy in development
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8080'

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/v1/auth/login',
  REGISTER: '/api/v1/auth/register',
  LOGOUT: '/api/v1/auth/logout',
  VERIFY_TOKEN: '/api/v1/auth/verify',

  // Tasks
  START_ANALYSIS: '/api/v1/tasks',
  GET_TASK: '/api/v1/tasks/:taskId',
  LIST_TASKS: '/api/v1/tasks',
  GET_TASK_REPORTS: '/api/v1/tasks/:taskId/reports',
  CANCEL_TASK: '/api/v1/tasks/:taskId/cancel',

  // WebSocket
  WS_ANALYSIS: '/ws/analysis/:taskId',
}

// Task Status
export const TASK_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
}

// Agent Status
export const AGENT_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
}

// Workflow Stages
export const WORKFLOW_STAGES = {
  ANALYSIS: 'analysis',
  RESEARCH: 'research',
  TRADING: 'trading',
  RISK: 'risk',
}

// Agent Teams
export const AGENT_TEAMS = {
  ANALYSTS: [
    { id: 'market', name: 'Market Analyst', stage: WORKFLOW_STAGES.ANALYSIS },
    { id: 'social', name: 'Social Analyst', stage: WORKFLOW_STAGES.ANALYSIS },
    { id: 'news', name: 'News Analyst', stage: WORKFLOW_STAGES.ANALYSIS },
    { id: 'fundamentals', name: 'Fundamentals Analyst', stage: WORKFLOW_STAGES.ANALYSIS },
  ],
  RESEARCHERS: [
    { id: 'bull', name: 'Bull Researcher', stage: WORKFLOW_STAGES.RESEARCH },
    { id: 'bear', name: 'Bear Researcher', stage: WORKFLOW_STAGES.RESEARCH },
    { id: 'research-manager', name: 'Research Manager', stage: WORKFLOW_STAGES.RESEARCH },
  ],
  TRADERS: [
    { id: 'trader', name: 'Trader', stage: WORKFLOW_STAGES.TRADING },
  ],
  RISK_MANAGERS: [
    { id: 'risk-risky', name: 'Aggressive Analyst', stage: WORKFLOW_STAGES.RISK },
    { id: 'risk-safe', name: 'Conservative Analyst', stage: WORKFLOW_STAGES.RISK },
    { id: 'risk-neutral', name: 'Neutral Analyst', stage: WORKFLOW_STAGES.RISK },
    { id: 'risk-manager', name: 'Risk Manager', stage: WORKFLOW_STAGES.RISK },
  ],
}

// All Agents
export const ALL_AGENTS = [
  ...AGENT_TEAMS.ANALYSTS,
  ...AGENT_TEAMS.RESEARCHERS,
  ...AGENT_TEAMS.TRADERS,
  ...AGENT_TEAMS.RISK_MANAGERS,
]

// Research Depth Options
export const RESEARCH_DEPTH_OPTIONS = [
  { value: 1, label: 'Shallow', description: 'Quick analysis with basic insights' },
  { value: 2, label: 'Medium', description: 'Moderate depth with standard research' },
  { value: 3, label: 'Deep', description: 'In-depth analysis with comprehensive research' },
  { value: 4, label: 'Very Deep', description: 'Very thorough with extensive investigation' },
  { value: 5, label: 'Maximum', description: 'Maximum depth with exhaustive analysis' },
]

// Decision Types
export const DECISION_TYPES = {
  BUY: 'buy',
  SELL: 'sell',
  HOLD: 'hold',
}

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'tradingagents_auth_token',
  USER_INFO: 'tradingagents_user_info',
  THEME: 'tradingagents_theme',
}

// Message Display Limits
export const MAX_MESSAGES_DISPLAY = 100

// Auto-reconnect settings
export const WS_RECONNECT_INTERVAL = 3000
export const WS_MAX_RECONNECT_ATTEMPTS = 5
export const WS_HEARTBEAT_INTERVAL = 30000

// Date Formats
export const DATE_FORMAT = 'YYYY-MM-DD'
export const TIME_FORMAT = 'HH:mm:ss'
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

// Helper Functions

/**
 * Parse API URL template with parameters
 * Example: parseApiUrl('/api/v1/tasks/:taskId', { taskId: '123' }) => '/api/v1/tasks/123'
 */
export const parseApiUrl = (urlTemplate, params = {}) => {
  let url = urlTemplate
  Object.keys(params).forEach((key) => {
    url = url.replace(`:${key}`, params[key])
  })
  return url
}
