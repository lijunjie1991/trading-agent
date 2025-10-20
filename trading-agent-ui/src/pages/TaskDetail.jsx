import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { Card, Row, Col, Button, Typography, Space, Tag, Descriptions } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { marked } from 'marked'
import MessagePanel from '../components/Task/MessagePanel'
import StatsPanel from '../components/Task/StatsPanel'
import Loading from '../components/Common/Loading'
import {
  updateStats,
  updateCurrentReport,
  updateFinalDecision,
  resetTaskState,
  fetchTask,
  fetchTaskMessages,
} from '../store/slices/taskSlice'
import { WS_MESSAGE_TYPES } from '../utils/constants'
import { formatDateTime, truncateTaskId, getStatusColor } from '../utils/helpers'

const { Title, Text } = Typography

const TaskDetail = () => {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const store = useStore()
  const pollingIntervalRef = useRef(null)
  const [initialLoading, setInitialLoading] = useState(true)

  const {
    currentTask,
    messages,
    stats,
    currentReport,
    finalDecision,
    loading,
    lastTimestamp,
  } = useSelector((state) => state.task)

  useEffect(() => {
    dispatch(resetTaskState())
    dispatch(fetchTask(taskId)).then(() => {
      setInitialLoading(false)
    })

    // Start polling for messages and task status
    startPolling()

    return () => {
      stopPolling()
    }
  }, [taskId, dispatch])

  const startPolling = () => {
    // Initial fetch
    dispatch(fetchTaskMessages({ taskId, lastTimestamp: null }))

    // Poll every 2 seconds
    pollingIntervalRef.current = setInterval(() => {
      // Get the latest lastTimestamp from Redux store to avoid closure stale state
      const currentLastTimestamp = store.getState().task.lastTimestamp

      // Always poll for messages with the latest timestamp
      dispatch(fetchTaskMessages({ taskId, lastTimestamp: currentLastTimestamp }))

      // Always refresh task status to get latest updates
      dispatch(fetchTask(taskId))
    }, 2000)
  }

  const stopPolling = () => {
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
      case WS_MESSAGE_TYPES.STATUS:
        if (content.decision) {
          dispatch(updateFinalDecision(content.decision))
        }
        break

      case WS_MESSAGE_TYPES.REPORT:
        dispatch(updateCurrentReport(content))
        break

      default:
        break
    }
  }

  if (initialLoading) {
    return <Loading />
  }

  return (
    <div>
      {/* Header with Back button */}
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tasks')}>
          Back to Tasks
        </Button>
      </Space>

      {/* Hero Section - Key Information */}
      <Card style={{ marginBottom: 24, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Row align="middle" gutter={24}>
          <Col flex="auto">
            <Space direction="vertical" size={8}>
              <Space align="center" size={16}>
                <Title level={1} style={{ margin: 0, color: '#fff', fontSize: '48px', fontWeight: 700 }}>
                  {currentTask?.ticker || 'N/A'}
                </Title>
                <Tag
                  color={getStatusColor(currentTask?.status)}
                  style={{
                    fontSize: 16,
                    padding: '8px 20px',
                    fontWeight: 600,
                    borderRadius: 6,
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}
                >
                  {currentTask?.status?.toUpperCase() || 'UNKNOWN'}
                </Tag>
              </Space>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
                Analysis Date: {currentTask?.analysisDate || currentTask?.analysis_date || 'N/A'}
              </Text>
            </Space>
          </Col>
          <Col>
            {finalDecision && (currentTask?.status === 'COMPLETED' || currentTask?.status === 'FAILED') ? (
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 8 }}>
                  Final Decision
                </div>
                <Tag
                  color={
                    finalDecision.toLowerCase().includes('buy')
                      ? 'success'
                      : finalDecision.toLowerCase().includes('sell')
                      ? 'error'
                      : 'warning'
                  }
                  style={{
                    fontSize: 32,
                    padding: '12px 32px',
                    fontWeight: 700,
                    borderRadius: 8,
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}
                >
                  {finalDecision}
                </Tag>
              </div>
            ) : null}
          </Col>
        </Row>
      </Card>

      {/* Task Metadata - Clean Layout */}
      <Card style={{ marginBottom: 24 }} bodyStyle={{ padding: 24 }}>
        <Row gutter={[24, 16]}>
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Task ID
              </Text>
            </div>
            <Text strong style={{ fontSize: 14 }}>
              {currentTask?.taskId || taskId}
            </Text>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Research Depth
              </Text>
            </div>
            <Text strong style={{ fontSize: 14 }}>
              Level {currentTask?.researchDepth || currentTask?.research_depth || 'N/A'}
            </Text>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Created
              </Text>
            </div>
            <Text strong style={{ fontSize: 14 }}>
              {currentTask?.createdAt
                ? formatDateTime(currentTask.createdAt)
                : currentTask?.created_at
                ? formatDateTime(currentTask.created_at)
                : 'N/A'}
            </Text>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Completed
              </Text>
            </div>
            <Text strong style={{ fontSize: 14 }}>
              {currentTask?.completedAt
                ? formatDateTime(currentTask.completedAt)
                : currentTask?.completed_at
                ? formatDateTime(currentTask.completed_at)
                : 'In Progress...'}
            </Text>
          </Col>
          <Col span={24}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Selected Analysts
              </Text>
            </div>
            <Space wrap>
              {(currentTask?.selectedAnalysts || currentTask?.selected_analysts || []).map((analyst, idx) => (
                <Tag key={idx} color="blue" style={{ margin: 0, fontSize: 13, padding: '4px 12px' }}>
                  {analyst}
                </Tag>
              ))}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Stats Panel */}
      <div style={{ marginBottom: 24 }}>
        <StatsPanel stats={stats} />
      </div>

      {/* Messages Panel - Full width */}
      <div style={{ marginBottom: 24 }}>
        <MessagePanel messages={messages} />
      </div>

      {/* Current Report */}
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
