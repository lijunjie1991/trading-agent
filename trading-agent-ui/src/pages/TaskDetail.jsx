import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Card, Row, Col, Button, Typography, Space, Tag, Divider, message } from 'antd'
import { ArrowLeftOutlined, StopOutlined, ReloadOutlined } from '@ant-design/icons'
import { marked } from 'marked'
import WorkflowProgress from '../components/Task/WorkflowProgress'
import AgentPanel from '../components/Task/AgentPanel'
import MessagePanel from '../components/Task/MessagePanel'
import StatsPanel from '../components/Task/StatsPanel'
import Loading from '../components/Common/Loading'
import {
  addMessages,
  updateAgentStatus,
  updateStats,
  updateCurrentReport,
  updateFinalDecision,
  updateWorkflowStage,
  resetTaskState,
  fetchTask,
  fetchTaskMessages,
} from '../store/slices/taskSlice'
import { WS_MESSAGE_TYPES, WORKFLOW_STAGES } from '../utils/constants'
import { formatDateTime, truncateTaskId, getStatusColor } from '../utils/helpers'

const { Title, Text } = Typography

const TaskDetail = () => {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [isPolling, setIsPolling] = useState(false)
  const [completedStages, setCompletedStages] = useState([])
  const pollingIntervalRef = useRef(null)

  const {
    currentTask,
    messages,
    agentStatuses,
    stats,
    currentReport,
    finalDecision,
    workflowStage,
    loading,
    lastTimestamp,
  } = useSelector((state) => state.task)

  useEffect(() => {
    dispatch(resetTaskState())
    dispatch(fetchTask(taskId))

    // Start polling for messages
    startPolling()

    return () => {
      stopPolling()
    }
  }, [taskId, dispatch])

  const startPolling = () => {
    setIsPolling(true)

    // Initial fetch
    dispatch(fetchTaskMessages({ taskId, lastTimestamp: null }))

    // Poll every 2 seconds
    pollingIntervalRef.current = setInterval(() => {
      // Only poll if task is PENDING or RUNNING
      if (currentTask?.status === 'PENDING' || currentTask?.status === 'RUNNING') {
        dispatch(fetchTaskMessages({ taskId, lastTimestamp }))
      }
    }, 2000)
  }

  const stopPolling = () => {
    setIsPolling(false)
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }

  // Stop polling when task is completed or failed
  useEffect(() => {
    if (currentTask?.status === 'COMPLETED' || currentTask?.status === 'FAILED') {
      stopPolling()
    }
  }, [currentTask?.status])

  // Process new messages when they arrive
  useEffect(() => {
    if (messages.length === 0) return

    // Process the most recent messages
    messages.slice(0, 10).forEach((msg) => {
      handleMessage(msg)
    })
  }, [messages.length])

  const handleMessage = (msg) => {
    const { messageType, content } = msg

    // Update stats
    if (content.stats) {
      dispatch(
        updateStats({
          toolCalls: content.stats.tool_calls || 0,
          llmCalls: content.stats.llm_calls || 0,
          reports: content.stats.reports || 0,
        })
      )
    }

    // Handle different message types
    switch (messageType) {
      case WS_MESSAGE_TYPES.AGENT_STATUS:
        dispatch(updateAgentStatus({ agent: content.agent, status: content.status }))
        updateWorkflowStageFromAgent(content.agent, content.status)
        break

      case WS_MESSAGE_TYPES.STATUS:
        if (content.decision) {
          dispatch(updateFinalDecision(content.decision))
        }
        if (content.status === 'completed') {
          setCompletedStages([
            WORKFLOW_STAGES.ANALYSIS,
            WORKFLOW_STAGES.RESEARCH,
            WORKFLOW_STAGES.TRADING,
            WORKFLOW_STAGES.RISK,
          ])
        }
        break

      case WS_MESSAGE_TYPES.REPORT:
        dispatch(updateCurrentReport(content))
        break

      default:
        break
    }
  }

  const updateWorkflowStageFromAgent = (agentId, status) => {
    if (status !== 'running') return

    const agentToStageMap = {
      market: WORKFLOW_STAGES.ANALYSIS,
      social: WORKFLOW_STAGES.ANALYSIS,
      news: WORKFLOW_STAGES.ANALYSIS,
      fundamentals: WORKFLOW_STAGES.ANALYSIS,
      bull: WORKFLOW_STAGES.RESEARCH,
      bear: WORKFLOW_STAGES.RESEARCH,
      'research-manager': WORKFLOW_STAGES.RESEARCH,
      trader: WORKFLOW_STAGES.TRADING,
      'risk-risky': WORKFLOW_STAGES.RISK,
      'risk-safe': WORKFLOW_STAGES.RISK,
      'risk-neutral': WORKFLOW_STAGES.RISK,
      'risk-manager': WORKFLOW_STAGES.RISK,
    }

    const stage = agentToStageMap[agentId]
    if (stage) {
      dispatch(updateWorkflowStage(stage))

      // Mark previous stages as completed
      const stageOrder = [
        WORKFLOW_STAGES.ANALYSIS,
        WORKFLOW_STAGES.RESEARCH,
        WORKFLOW_STAGES.TRADING,
        WORKFLOW_STAGES.RISK,
      ]
      const currentIndex = stageOrder.indexOf(stage)
      if (currentIndex > 0) {
        setCompletedStages(stageOrder.slice(0, currentIndex))
      }
    }
  }

  const handleStopPolling = () => {
    stopPolling()
  }

  const handleStartPolling = () => {
    startPolling()
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div>
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tasks')}>
          Back
        </Button>
        {isPolling ? (
          <Button icon={<StopOutlined />} onClick={handleStopPolling} danger>
            Stop Updates
          </Button>
        ) : (
          <Button icon={<ReloadOutlined />} onClick={handleStartPolling}>
            Resume Updates
          </Button>
        )}
      </Space>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size={4}>
              <Title level={3} style={{ margin: 0 }}>
                {currentTask?.ticker || 'N/A'}
              </Title>
              <Text type="secondary">Task ID: {truncateTaskId(currentTask?.taskId || taskId)}</Text>
              <Text type="secondary">
                Created: {currentTask?.createdAt ? formatDateTime(currentTask.createdAt) : currentTask?.created_at ? formatDateTime(currentTask.created_at) : 'N/A'}
              </Text>
              <Text type="secondary">
                Analysts: {currentTask?.selectedAnalysts?.join(', ') || currentTask?.selected_analysts?.join(', ') || 'N/A'}
              </Text>
            </Space>
          </Col>
          <Col>
            <Space direction="vertical" align="end">
              <Tag color={getStatusColor(currentTask?.status)} style={{ fontSize: 14, padding: '4px 12px' }}>
                {currentTask?.status?.toUpperCase() || 'UNKNOWN'}
              </Tag>
              {isPolling && (
                <Tag color="success" style={{ fontSize: 12 }}>
                  Auto-refreshing
                </Tag>
              )}
              {finalDecision && (
                <Tag
                  color={
                    finalDecision.toLowerCase().includes('buy')
                      ? 'success'
                      : finalDecision.toLowerCase().includes('sell')
                      ? 'error'
                      : 'warning'
                  }
                  style={{ fontSize: 14, padding: '4px 12px', fontWeight: 600 }}
                >
                  {finalDecision}
                </Tag>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      <WorkflowProgress currentStage={workflowStage} completedStages={completedStages} />

      <div style={{ marginBottom: 24 }}>
        <StatsPanel stats={stats} />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <AgentPanel agentStatuses={agentStatuses} />
        </Col>
        <Col xs={24} lg={16}>
          <MessagePanel messages={messages} />
        </Col>
      </Row>

      {currentReport && (
        <Card
          title={
            <Space>
              <Title level={5} style={{ margin: 0 }}>
                Current Report
              </Title>
              <Tag color="purple">{currentReport.report_type}</Tag>
            </Space>
          }
          style={{ marginTop: 24 }}
        >
          <div
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: marked.parse(currentReport.content || '') }}
          />
        </Card>
      )}
    </div>
  )
}

export default TaskDetail
