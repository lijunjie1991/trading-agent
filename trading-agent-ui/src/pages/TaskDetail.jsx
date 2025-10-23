import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector, useStore } from 'react-redux'
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Space,
  Tag,
  Tabs,
  Timeline,
  Progress,
  Statistic,
  Divider,
  Badge,
  Tooltip,
} from 'antd'
import {
  ArrowLeftOutlined,
  RocketOutlined,
  FireOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  RobotOutlined,
  FileTextOutlined,
  LineChartOutlined,
  TeamOutlined,
  BulbOutlined,
  SafetyCertificateOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import { marked } from 'marked'
import Loading from '../components/Common/Loading'
import {
  updateStats,
  updateCurrentReport,
  updateFinalDecision,
  resetTaskState,
  fetchTask,
  fetchTaskMessages,
} from '../store/slices/taskSlice'
import { formatDateTime, truncateTaskId, getStatusColor } from '../utils/helpers'
import './TaskDetail.css'

const { Title, Text, Paragraph } = Typography
const { TabPane } = Tabs

const TaskDetail = () => {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const store = useStore()
  const pollingIntervalRef = useRef(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [lastPollingTime, setLastPollingTime] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [agentProgress, setAgentProgress] = useState({})
  const [reportTimeline, setReportTimeline] = useState([])

  const {
    currentTask,
    messages,
    stats,
    currentReport,
    finalDecision,
    loading,
    lastTimestamp,
  } = useSelector((state) => state.task)

  const isProcessing = currentTask?.status === 'RUNNING' || currentTask?.status === 'PENDING'

  useEffect(() => {
    dispatch(resetTaskState())
    dispatch(fetchTask(taskId)).then(() => {
      setInitialLoading(false)
    })

    startPolling()

    return () => {
      stopPolling()
    }
  }, [taskId, dispatch])

  const startPolling = () => {
    dispatch(fetchTaskMessages({ taskId, lastTimestamp: null }))
    setLastPollingTime(new Date())

    pollingIntervalRef.current = setInterval(() => {
      const currentLastTimestamp = store.getState().task.lastTimestamp
      dispatch(fetchTaskMessages({ taskId, lastTimestamp: currentLastTimestamp }))
      dispatch(fetchTask(taskId))
      setLastPollingTime(new Date())
    }, 2000)
  }

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }

  useEffect(() => {
    if (currentTask?.status === 'COMPLETED' || currentTask?.status === 'FAILED') {
      stopPolling()
    }
  }, [currentTask?.status])

  useEffect(() => {
    if (messages.length === 0) return

    // Process messages for agent progress and timeline
    const agentStatusMap = {}
    const timelineEvents = []

    messages.forEach((msg) => {
      if (msg.messageType === 'agent_status') {
        agentStatusMap[msg.content.agent] = msg.content.status
      }
      if (msg.messageType === 'report') {
        timelineEvents.push({
          time: msg.createdAt,
          type: msg.content.report_type,
          content: msg.content.content,
        })
      }
      if (msg.messageType === 'status' && msg.content.decision) {
        dispatch(updateFinalDecision(msg.content.decision))
      }
      if (msg.messageType === 'report') {
        dispatch(updateCurrentReport(msg.content))
      }
    })

    setAgentProgress(agentStatusMap)
    setReportTimeline(timelineEvents)
  }, [messages.length, dispatch])

  useEffect(() => {
    if (currentTask) {
      dispatch(
        updateStats({
          toolCalls: currentTask.toolCalls || currentTask.tool_calls || 0,
          llmCalls: currentTask.llmCalls || currentTask.llm_calls || 0,
          reports: currentTask.reports || 0,
        })
      )
    }
  }, [currentTask, dispatch])

  if (initialLoading) {
    return <Loading />
  }

  const getDecisionColor = (decision) => {
    if (!decision) return 'default'
    const d = decision.toLowerCase()
    if (d.includes('strong buy')) return 'success'
    if (d.includes('buy')) return 'green'
    if (d.includes('strong sell')) return 'error'
    if (d.includes('sell')) return 'red'
    return 'warning'
  }

  const getDecisionIcon = (decision) => {
    if (!decision) return <DollarOutlined />
    const d = decision.toLowerCase()
    if (d.includes('buy')) return <RocketOutlined />
    if (d.includes('sell')) return <FireOutlined />
    return <ThunderboltOutlined />
  }

  const calculateProgress = () => {
    const totalSteps = 7 // market, social, news, fundamentals, research, trade, risk
    const completed = Object.values(agentProgress).filter((s) => s === 'completed').length
    return Math.round((completed / totalSteps) * 100)
  }

  const agentGroups = [
    {
      title: 'Analyst Team',
      icon: <LineChartOutlined />,
      color: '#3b82f6',
      agents: ['market', 'social', 'news', 'fundamentals'],
    },
    {
      title: 'Research Team',
      icon: <BulbOutlined />,
      color: '#8b5cf6',
      agents: ['bull', 'bear', 'research-manager'],
    },
    {
      title: 'Trading Team',
      icon: <DollarOutlined />,
      color: '#10b981',
      agents: ['trader'],
    },
    {
      title: 'Risk Team',
      icon: <SafetyCertificateOutlined />,
      color: '#f59e0b',
      agents: ['risk-risky', 'risk-safe', 'risk-neutral'],
    },
  ]

  return (
    <div className="task-detail-enhanced">
      {/* Hero Header */}
      <div className="hero-header">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/tasks')}
          className="back-button"
          type="text"
        >
          Back
        </Button>

        <div className="hero-content">
          <div className="hero-main">
            <Space align="center" size={16}>
              <div className="ticker-badge">
                <Text className="ticker-symbol">{currentTask?.ticker || 'N/A'}</Text>
              </div>
              <Tag
                color={getStatusColor(currentTask?.status)}
                className="status-tag"
              >
                {currentTask?.status?.toUpperCase() || 'UNKNOWN'}
              </Tag>
            </Space>

            <div className="hero-meta">
              <Space size={24}>
                <div>
                  <ClockCircleOutlined className="meta-icon" />
                  <Text className="meta-text">
                    {currentTask?.analysisDate || currentTask?.analysis_date || 'N/A'}
                  </Text>
                </div>
                <div>
                  <TeamOutlined className="meta-icon" />
                  <Text className="meta-text">
                    {(currentTask?.selectedAnalysts || currentTask?.selected_analysts || []).length}{' '}
                    Analysts
                  </Text>
                </div>
              </Space>
            </div>
          </div>

          {finalDecision && (currentTask?.status === 'COMPLETED' || currentTask?.status === 'FAILED') && (
            <div className="final-decision-card">
              <div className="decision-label">Final Decision</div>
              <div className="decision-value">
                <Space size={8}>
                  {getDecisionIcon(finalDecision)}
                  <span>{finalDecision}</span>
                </Space>
              </div>
            </div>
          )}
        </div>

        {isProcessing && (
          <div className="progress-indicator">
            <Progress
              percent={calculateProgress()}
              strokeColor={{
                '0%': '#667eea',
                '100%': '#764ba2',
              }}
              status="active"
              showInfo={false}
            />
            <div className="progress-text">
              <RobotOutlined className="spinning-icon" />
              <Text>AI agents analyzing...</Text>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <Row gutter={[24, 24]} className="main-content">
        {/* Left Column - Primary Content */}
        <Col xs={24} xl={16}>
          {/* Analytics Dashboard */}
          <Card className="analytics-card" bordered={false}>
            <Row gutter={16}>
              <Col span={8}>
                <div className="stat-card">
                  <ToolOutlined className="stat-icon" style={{ color: '#3b82f6' }} />
                  <Statistic
                    title="Tool Calls"
                    value={stats.toolCalls || 0}
                    valueStyle={{ color: '#3b82f6', fontSize: 28 }}
                  />
                </div>
              </Col>
              <Col span={8}>
                <div className="stat-card">
                  <RobotOutlined className="stat-icon" style={{ color: '#8b5cf6' }} />
                  <Statistic
                    title="LLM Calls"
                    value={stats.llmCalls || 0}
                    valueStyle={{ color: '#8b5cf6', fontSize: 28 }}
                  />
                </div>
              </Col>
              <Col span={8}>
                <div className="stat-card">
                  <FileTextOutlined className="stat-icon" style={{ color: '#10b981' }} />
                  <Statistic
                    title="Reports"
                    value={stats.reports || 0}
                    valueStyle={{ color: '#10b981', fontSize: 28 }}
                  />
                </div>
              </Col>
            </Row>
          </Card>

          {/* Agent Workflow Visualization */}
          <Card
            title={
              <Space>
                <TeamOutlined />
                <span>Agent Workflow</span>
              </Space>
            }
            className="workflow-card"
            bordered={false}
          >
            <Row gutter={[16, 16]}>
              {agentGroups.map((group, idx) => (
                <Col xs={24} md={12} key={idx}>
                  <div className="agent-group-card" style={{ borderLeftColor: group.color }}>
                    <div className="group-header">
                      <Space>
                        {group.icon}
                        <Text strong>{group.title}</Text>
                      </Space>
                    </div>
                    <div className="agent-list">
                      {group.agents.map((agent) => (
                        <div key={agent} className="agent-item">
                          <Text className="agent-name">{agent.replace('-', ' ')}</Text>
                          <Badge
                            status={
                              agentProgress[agent] === 'running'
                                ? 'processing'
                                : agentProgress[agent] === 'completed'
                                ? 'success'
                                : 'default'
                            }
                            text={
                              agentProgress[agent] === 'running'
                                ? 'Running'
                                : agentProgress[agent] === 'completed'
                                ? 'Done'
                                : 'Pending'
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>

          {/* Tabs for Different Views */}
          <Card className="content-tabs-card" bordered={false}>
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <TabPane tab="Messages" key="messages">
                <div className="messages-container">
                  {messages.length === 0 ? (
                    <div className="empty-state">
                      <Text type="secondary">No messages yet</Text>
                    </div>
                  ) : (
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      {messages.slice(0, 50).map((msg, index) => (
                        <div key={index} className={`message-item message-${msg.messageType}`}>
                          <div className="message-header">
                            <Tag color="blue">{msg.messageType}</Tag>
                            <Text type="secondary" className="message-time">
                              {formatDateTime(msg.createdAt)}
                            </Text>
                          </div>
                          <div className="message-content">
                            {msg.messageType === 'message' && (
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: marked.parse(msg.content.content || ''),
                                }}
                              />
                            )}
                            {msg.messageType === 'tool_call' && (
                              <div>
                                <Text strong>Tool: </Text>
                                <Tag>{msg.content.tool_name}</Tag>
                                <pre className="tool-args">
                                  {JSON.stringify(msg.content.args, null, 2)}
                                </pre>
                              </div>
                            )}
                            {msg.messageType === 'status' && (
                              <Text>{msg.content.message || JSON.stringify(msg.content)}</Text>
                            )}
                          </div>
                        </div>
                      ))}
                    </Space>
                  )}
                </div>
              </TabPane>

              <TabPane tab="Report Timeline" key="timeline">
                <div className="timeline-container">
                  {reportTimeline.length === 0 ? (
                    <div className="empty-state">
                      <Text type="secondary">No reports generated yet</Text>
                    </div>
                  ) : (
                    <Timeline mode="left">
                      {reportTimeline.map((event, index) => (
                        <Timeline.Item
                          key={index}
                          color={
                            event.type === 'final_trade_decision'
                              ? 'green'
                              : event.type === 'investment_plan'
                              ? 'blue'
                              : 'purple'
                          }
                          label={<Text type="secondary">{formatDateTime(event.time)}</Text>}
                        >
                          <Card size="small" className="timeline-event-card">
                            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                              <Tag color="purple">{event.type}</Tag>
                              <div
                                className="report-preview"
                                dangerouslySetInnerHTML={{
                                  __html: marked.parse(
                                    event.content.substring(0, 300) +
                                      (event.content.length > 300 ? '...' : '')
                                  ),
                                }}
                              />
                            </Space>
                          </Card>
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  )}
                </div>
              </TabPane>

              <TabPane tab="Full Reports" key="reports">
                <div className="reports-container">
                  {reportTimeline.length === 0 ? (
                    <div className="empty-state">
                      <Text type="secondary">No reports available</Text>
                    </div>
                  ) : (
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                      {reportTimeline.map((event, index) => (
                        <Card
                          key={index}
                          title={
                            <Space>
                              <FileTextOutlined />
                              <span>{event.type.replace(/_/g, ' ').toUpperCase()}</span>
                            </Space>
                          }
                          extra={<Text type="secondary">{formatDateTime(event.time)}</Text>}
                          className="report-card"
                        >
                          <div
                            className="markdown-content"
                            dangerouslySetInnerHTML={{ __html: marked.parse(event.content) }}
                          />
                        </Card>
                      ))}
                    </Space>
                  )}
                </div>
              </TabPane>
            </Tabs>
          </Card>
        </Col>

        {/* Right Column - Metadata & Details */}
        <Col xs={24} xl={8}>
          <div className="sidebar-sticky">
            {/* Task Info Card */}
            <Card title="Task Information" className="info-card" bordered={false}>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div className="info-item">
                  <Text type="secondary" className="info-label">
                    Task ID
                  </Text>
                  <Tooltip title={currentTask?.taskId || taskId}>
                    <Text className="info-value" copyable>
                      {truncateTaskId(currentTask?.taskId || taskId)}
                    </Text>
                  </Tooltip>
                </div>

                <Divider style={{ margin: 0 }} />

                <div className="info-item">
                  <Text type="secondary" className="info-label">
                    Research Depth
                  </Text>
                  <Progress
                    percent={(currentTask?.researchDepth || currentTask?.research_depth || 1) * 20}
                    steps={5}
                    strokeColor="#667eea"
                    format={() =>
                      `Level ${currentTask?.researchDepth || currentTask?.research_depth || 1}`
                    }
                  />
                </div>

                <Divider style={{ margin: 0 }} />

                <div className="info-item">
                  <Text type="secondary" className="info-label">
                    Created At
                  </Text>
                  <Text className="info-value">
                    {currentTask?.createdAt
                      ? formatDateTime(currentTask.createdAt)
                      : currentTask?.created_at
                      ? formatDateTime(currentTask.created_at)
                      : 'N/A'}
                  </Text>
                </div>

                <Divider style={{ margin: 0 }} />

                <div className="info-item">
                  <Text type="secondary" className="info-label">
                    Completed At
                  </Text>
                  <Text className="info-value">
                    {currentTask?.completedAt
                      ? formatDateTime(currentTask.completedAt)
                      : currentTask?.completed_at
                      ? formatDateTime(currentTask.completed_at)
                      : isProcessing
                      ? 'In Progress...'
                      : 'N/A'}
                  </Text>
                </div>

                <Divider style={{ margin: 0 }} />

                <div className="info-item">
                  <Text type="secondary" className="info-label">
                    Selected Analysts
                  </Text>
                  <Space wrap size={[4, 4]}>
                    {(currentTask?.selectedAnalysts || currentTask?.selected_analysts || []).map(
                      (analyst, idx) => (
                        <Tag key={idx} color="blue">
                          {analyst}
                        </Tag>
                      )
                    )}
                  </Space>
                </div>
              </Space>
            </Card>

            {/* Live Updates Indicator */}
            {isProcessing && (
              <Card className="live-updates-card" bordered={false}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <div className="live-indicator">
                    <Badge status="processing" />
                    <Text strong>Live Updates Active</Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Polling every 2 seconds...
                  </Text>
                  {lastPollingTime && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Last update:{' '}
                      {Math.floor((Date.now() - new Date(lastPollingTime).getTime()) / 1000)}s ago
                    </Text>
                  )}
                </Space>
              </Card>
            )}
          </div>
        </Col>
      </Row>
    </div>
  )
}

export default TaskDetail
