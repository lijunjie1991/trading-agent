import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { Card, Row, Col, Button, Typography, Space, Tag, Modal, Tabs, Empty, Spin } from 'antd'
import { ArrowLeftOutlined, FileTextOutlined } from '@ant-design/icons'
import { marked } from 'marked'
import MessagePanel from '../components/Task/MessagePanel'
import CompactHeader from '../components/Task/CompactHeader'
import StatsSidebar from '../components/Task/StatsSidebar'
import Loading from '../components/Common/Loading'
import api from '../services/api'
import {
  updateStats,
  updateCurrentReport,
  updateFinalDecision,
  resetTaskState,
  fetchTask,
  fetchTaskMessages,
} from '../store/slices/taskSlice'
import { WS_MESSAGE_TYPES } from '../utils/constants'
import './TaskDetail.css'

const { Title, Text } = Typography
const { TabPane } = Tabs

const TaskDetail = () => {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const store = useStore()
  const pollingIntervalRef = useRef(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [lastPollingTime, setLastPollingTime] = useState(null)
  const [showReportsModal, setShowReportsModal] = useState(false)
  const [reports, setReports] = useState(null)
  const [loadingReports, setLoadingReports] = useState(false)

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
  const isCompleted = currentTask?.status === 'COMPLETED'

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

    messages.slice(0, 10).forEach((msg) => {
      handleMessage(msg)
    })
  }, [messages.length])

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

  // Fetch all reports when user clicks the button
  const handleViewReports = async () => {
    setShowReportsModal(true)
    setLoadingReports(true)

    try {
      const response = await api.get(`/api/v1/analysis/${taskId}/reports`)
      setReports(response.data.reports || {})
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    } finally {
      setLoadingReports(false)
    }
  }

  const renderReport = (reportType, content) => {
    const reportTitles = {
      market_report: 'Market Analysis',
      sentiment_report: 'Social Sentiment Analysis',
      news_report: 'News Analysis',
      fundamentals_report: 'Fundamentals Analysis',
      investment_plan: 'Research Team Decision',
      trader_investment_plan: 'Trading Team Plan',
      final_trade_decision: 'Final Trade Decision',
    }

    return (
      <div key={reportType} style={{ marginBottom: 24 }}>
        <Title level={4} style={{ color: '#667eea', marginBottom: 16 }}>
          {reportTitles[reportType] || reportType}
        </Title>
        <div
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: marked.parse(content || '') }}
        />
      </div>
    )
  }

  if (initialLoading) {
    return <Loading />
  }

  return (
    <div className="task-detail-page">
      {/* Floating Back Button */}
      <Button
        className="floating-back-button"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/tasks')}
        shape="circle"
        size="large"
        title="Back to Tasks"
      />

      {/* Compact Header */}
      <CompactHeader
        task={currentTask}
        finalDecision={finalDecision}
        isProcessing={isProcessing}
        lastUpdateTime={lastPollingTime}
      />

      {/* View Full Reports Button (Only for completed tasks) */}
      {isCompleted && (
        <Card
          className="view-reports-card"
          style={{ marginBottom: 24, textAlign: 'center' }}
        >
          <Space direction="vertical" size={12}>
            <FileTextOutlined style={{ fontSize: 48, color: '#667eea' }} />
            <Title level={4} style={{ margin: 0 }}>Analysis Complete!</Title>
            <Text type="secondary">
              All reports have been generated. Click below to view the complete analysis.
            </Text>
            <Button
              type="primary"
              size="large"
              icon={<FileTextOutlined />}
              onClick={handleViewReports}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                marginTop: 8,
              }}
            >
              View Full Reports
            </Button>
          </Space>
        </Card>
      )}

      {/* Two-Column Layout */}
      <Row gutter={24}>
        {/* Left Column: Messages */}
        <Col xs={24} lg={18}>
          <MessagePanel messages={messages} />
        </Col>

        {/* Right Column: Stats & Metadata Sidebar */}
        <Col xs={24} lg={6}>
          <StatsSidebar
            task={currentTask}
            stats={stats}
            isProcessing={isProcessing}
            taskId={taskId}
          />
        </Col>
      </Row>

      {/* Full Reports Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: '#667eea' }} />
            <span>Complete Analysis Reports</span>
          </Space>
        }
        open={showReportsModal}
        onCancel={() => setShowReportsModal(false)}
        footer={null}
        width={1200}
        style={{ top: 20 }}
        bodyStyle={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
      >
        {loadingReports ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Loading reports...</Text>
            </div>
          </div>
        ) : reports && Object.keys(reports).length > 0 ? (
          <Tabs defaultActiveKey="all">
            <TabPane tab="All Reports" key="all">
              <div style={{ padding: '0 16px' }}>
                {Object.entries(reports).map(([reportType, content]) =>
                  renderReport(reportType, content)
                )}
              </div>
            </TabPane>
            {Object.entries(reports).map(([reportType, content]) => {
              const reportTitles = {
                market_report: 'Market',
                sentiment_report: 'Sentiment',
                news_report: 'News',
                fundamentals_report: 'Fundamentals',
                investment_plan: 'Research',
                trader_investment_plan: 'Trading',
                final_trade_decision: 'Decision',
              }
              return (
                <TabPane tab={reportTitles[reportType] || reportType} key={reportType}>
                  <div style={{ padding: '0 16px' }}>
                    {renderReport(reportType, content)}
                  </div>
                </TabPane>
              )
            })}
          </Tabs>
        ) : (
          <Empty description="No reports available" />
        )}
      </Modal>
    </div>
  )
}

export default TaskDetail
