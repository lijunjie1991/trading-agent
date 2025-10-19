import { useEffect, useState } from 'react'
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
import websocketService from '../services/websocketService'
import {
  addMessage,
  updateAgentStatus,
  updateStats,
  updateCurrentReport,
  updateFinalDecision,
  updateWorkflowStage,
  resetTaskState,
  fetchTask,
} from '../store/slices/taskSlice'
import { WS_MESSAGE_TYPES, WORKFLOW_STAGES } from '../utils/constants'
import { formatDateTime, truncateTaskId, getStatusColor } from '../utils/helpers'

const { Title, Text } = Typography

const TaskDetail = () => {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [isConnected, setIsConnected] = useState(false)
  const [completedStages, setCompletedStages] = useState([])

  const {
    currentTask,
    messages,
    agentStatuses,
    stats,
    currentReport,
    finalDecision,
    workflowStage,
    loading,
  } = useSelector((state) => state.task)

  useEffect(() => {
    dispatch(resetTaskState())
    dispatch(fetchTask(taskId))

    // Connect to WebSocket
    websocketService.connect(taskId)

    const unsubscribeMessage = websocketService.onMessage((data) => {
      handleWebSocketMessage(data)
    })

    const unsubscribeOpen = websocketService.onOpen(() => {
      setIsConnected(true)
      message.success('Connected to real-time updates')
    })

    const unsubscribeClose = websocketService.onClose(() => {
      setIsConnected(false)
      message.info('Disconnected from real-time updates')
    })

    const unsubscribeError = websocketService.onError(() => {
      message.error('WebSocket connection error')
    })

    return () => {
      websocketService.disconnect()
      unsubscribeMessage()
      unsubscribeOpen()
      unsubscribeClose()
      unsubscribeError()
    }
  }, [taskId, dispatch])

  const handleWebSocketMessage = (data) => {
    const { type, data: messageData, timestamp } = data

    // Add to messages
    dispatch(addMessage({ type, data: messageData, timestamp }))

    // Update stats
    if (messageData.stats) {
      dispatch(
        updateStats({
          toolCalls: messageData.stats.tool_calls || 0,
          llmCalls: messageData.stats.llm_calls || 0,
          reports: messageData.stats.reports || 0,
        })
      )
    }

    // Handle different message types
    switch (type) {
      case WS_MESSAGE_TYPES.AGENT_STATUS:
        dispatch(updateAgentStatus({ agent: messageData.agent, status: messageData.status }))
        updateWorkflowStageFromAgent(messageData.agent, messageData.status)
        break

      case WS_MESSAGE_TYPES.STATUS:
        if (messageData.decision) {
          dispatch(updateFinalDecision(messageData.decision))
        }
        if (messageData.status === 'completed') {
          setCompletedStages([
            WORKFLOW_STAGES.ANALYSIS,
            WORKFLOW_STAGES.RESEARCH,
            WORKFLOW_STAGES.TRADING,
            WORKFLOW_STAGES.RISK,
          ])
        }
        break

      case WS_MESSAGE_TYPES.REPORT:
        dispatch(updateCurrentReport(messageData))
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

  const handleDisconnect = () => {
    websocketService.disconnect()
  }

  const handleReconnect = () => {
    websocketService.connect(taskId)
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
        {isConnected ? (
          <Button icon={<StopOutlined />} onClick={handleDisconnect} danger>
            Disconnect
          </Button>
        ) : (
          <Button icon={<ReloadOutlined />} onClick={handleReconnect}>
            Reconnect
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
              {isConnected && (
                <Tag color="success" style={{ fontSize: 12 }}>
                  Live Updates
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
