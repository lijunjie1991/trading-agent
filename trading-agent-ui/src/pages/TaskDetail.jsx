import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { Card, Row, Col, Button, Typography, Space, Modal, Tabs, Empty, Spin, Divider } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import { marked } from 'marked'
import MessagePanel from '../components/Task/MessagePanel'
import CompactHeader from '../components/Task/CompactHeader'
import StatsSidebar from '../components/Task/StatsSidebar'
import Loading from '../components/Common/Loading'
import api from '../services/api'
import {
  updateStats,
  resetTaskState,
  fetchTask,
  fetchTaskMessages,
} from '../store/slices/taskSlice'
import './TaskDetail.css'

const { Title, Text } = Typography
const { TabPane } = Tabs

marked.setOptions({
  gfm: true,
  breaks: true,  // 允许单个换行符也产生换行效果
})

const TaskDetail = () => {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const store = useStore()
  const pollingIntervalRef = useRef(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [lastPollingTime, setLastPollingTime] = useState(null)
  const [showReportsModal, setShowReportsModal] = useState(false)
  const [reports, setReports] = useState([])
  const [loadingReports, setLoadingReports] = useState(false)

  const {
    currentTask,
    messages,
    stats,
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

  // Fetch all reports when user clicks the button
  const handleViewReports = async () => {
    setShowReportsModal(true)
    setLoadingReports(true)

    try {
      // Call Java backend API: /api/v1/tasks/{taskId}/reports
      // Returns: Result<List<Map<String, Object>>>
      const response = await api.get(`/api/v1/tasks/${taskId}/reports`)

      // response.data is the data field from Result.success(reports)
      // It's a List of Maps, each containing report_type and content
      const reportsList = response.data || []
      setReports(reportsList)
    } catch (error) {
      console.error('Failed to fetch reports:', error)
      setReports([])
    } finally {
      setLoadingReports(false)
    }
  }

  const renderReport = (report) => {
    const reportTitles = {
      market_report: 'Market Analysis',
      sentiment_report: 'Social Sentiment Analysis',
      news_report: 'News Analysis',
      fundamentals_report: 'Fundamentals Analysis',
      investment_plan: 'Research Team Decision',
      trader_investment_plan: 'Trading Team Plan',
      final_trade_decision: 'Final Trade Decision',
    }

    const reportType = report.report_type || report.reportType
    const content = report.content

    return (
      <div key={reportType} style={{ marginBottom: 32 }}>
        <Title level={4} style={{ color: '#667eea', marginBottom: 16 }}>
          📊 {reportTitles[reportType] || reportType}
        </Title>
        <Divider style={{ marginTop: 8, marginBottom: 16 }} />
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
      {/* Compact Header with integrated View Reports button */}
      <CompactHeader
        task={currentTask}
        finalDecision={finalDecision}
        isProcessing={isProcessing}
      />

      {/* Two-Column Layout */}
      <Row gutter={24}>
        {/* Left Column: Messages */}
        <Col xs={24} lg={18}>
          <MessagePanel
            messages={messages}
            isProcessing={isProcessing}
            taskStatus={currentTask?.status}
            lastUpdateTime={lastPollingTime}
            onViewReports={currentTask?.status === 'COMPLETED' ? handleViewReports : null}
          />
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
            <FileTextOutlined style={{ color: '#667eea', fontSize: 20 }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>Complete Analysis Reports</span>
          </Space>
        }
        open={showReportsModal}
        onCancel={() => setShowReportsModal(false)}
        footer={null}
        width={1200}
        style={{ top: 20 }}
        bodyStyle={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: 24 }}
      >
        {loadingReports ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Loading reports...</Text>
            </div>
          </div>
        ) : reports && reports.length > 0 ? (
          <Tabs
            defaultActiveKey={
              reports[0].report_type ||
              reports[0].reportType ||
              `report-${reports[0].id || 0}`
            }
            type="card"
          >
            {reports.map((report, index) => {
              const reportType = report.report_type || report.reportType
              const tabKey = reportType || `report-${report.id || index}`
              const reportTitles = {
                market_report: '📈 Market',
                sentiment_report: '💬 Sentiment',
                news_report: '📰 News',
                fundamentals_report: '📊 Fundamentals',
                investment_plan: '🔬 Research',
                trader_investment_plan: '💼 Trading',
                final_trade_decision: '✅ Decision',
              }
              return (
                <TabPane tab={reportTitles[reportType] || reportType || `Report ${index + 1}`} key={tabKey}>
                  <div style={{ padding: '16px 0' }}>
                    {renderReport(report)}
                  </div>
                </TabPane>
              )
            })}
          </Tabs>
        ) : (
          <Empty
            description="No reports available"
            style={{ padding: 60 }}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Modal>
    </div>
  )
}

export default TaskDetail
