import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { Card, Row, Col, Button, Typography, Space, Tag } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { marked } from 'marked'
import MessagePanel from '../components/Task/MessagePanel'
import CompactHeader from '../components/Task/CompactHeader'
import StatsSidebar from '../components/Task/StatsSidebar'
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
  const [lastPollingTime, setLastPollingTime] = useState(null)

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

    // Start polling for messages and task status
    startPolling()

    return () => {
      stopPolling()
    }
  }, [taskId, dispatch])

  const startPolling = () => {
    // Initial fetch
    dispatch(fetchTaskMessages({ taskId, lastTimestamp: null }))
    setLastPollingTime(new Date())

    // Poll every 2 seconds
    pollingIntervalRef.current = setInterval(() => {
      // Get the latest lastTimestamp from Redux store to avoid closure stale state
      const currentLastTimestamp = store.getState().task.lastTimestamp

      // Always poll for messages with the latest timestamp
      dispatch(fetchTaskMessages({ taskId, lastTimestamp: currentLastTimestamp }))

      // Always refresh task status to get latest updates
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

  // Update stats from currentTask when task data refreshes
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

  const handleMessage = (msg) => {
    const { messageType, content } = msg

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

      {/* Compact Header with embedded processing indicator */}
      <CompactHeader
        task={currentTask}
        finalDecision={finalDecision}
        isProcessing={isProcessing}
        lastUpdateTime={lastPollingTime}
      />

      {/* Two-Column Layout */}
      <Row gutter={24}>
        {/* Left Column: Main Content (Messages & Reports) */}
        <Col xs={24} lg={16}>
          {/* Messages Panel */}
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
              style={{ marginBottom: 24 }}
            >
              <div
                className="markdown-content"
                dangerouslySetInnerHTML={{ __html: marked.parse(currentReport.content || '') }}
              />
            </Card>
          )}
        </Col>

        {/* Right Column: Stats & Metadata Sidebar */}
        <Col xs={24} lg={8}>
          <StatsSidebar
            task={currentTask}
            stats={stats}
            isProcessing={isProcessing}
            taskId={taskId}
          />
        </Col>
      </Row>
    </div>
  )
}

export default TaskDetail
