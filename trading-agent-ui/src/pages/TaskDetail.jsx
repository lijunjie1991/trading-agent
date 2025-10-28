import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { Card, Row, Col, Button, Typography, Space, Modal, Tabs, Empty, Spin, Divider, Alert, message } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import { marked } from 'marked'
import MessagePanel from '../components/Task/MessagePanel'
import CompactHeader from '../components/Task/CompactHeader'
import StatsSidebar from '../components/Task/StatsSidebar'
import Loading from '../components/Common/Loading'
import PaymentModal from '../components/Payment/PaymentModal'
import api from '../services/api'
import {
  updateStats,
  resetTaskState,
  fetchTask,
  fetchTaskMessages,
  retryTaskPayment,
  clearPaymentState,
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
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const paymentPresentationRef = useRef(false)
  const lastPaymentSecretRef = useRef(null)
  const ensureClientSecretRef = useRef(false)

  const {
    currentTask,
    messages,
    stats,
    finalDecision,
    loading,
    lastTimestamp,
    paymentRequired,
    paymentClientSecret,
    pendingPaymentTaskId,
    submitting,
  } = useSelector((state) => state.task)

  const isProcessing = currentTask?.status === 'RUNNING' || currentTask?.status === 'PENDING'
  const paymentStatus = (currentTask?.paymentStatus || currentTask?.payment_status || '').toUpperCase()
  const needsPayment = ['AWAITING_PAYMENT', 'PAYMENT_FAILED', 'PAYMENT_EXPIRED'].includes(paymentStatus)
  const billingAmount = currentTask?.billingAmount ?? currentTask?.billing_amount ?? null
  const billingCurrency = currentTask?.billingCurrency ?? currentTask?.billing_currency ?? 'USD'

  useEffect(() => {
    dispatch(resetTaskState())
    dispatch(fetchTask(taskId)).then(() => {
      setInitialLoading(false)
    })

    startPolling()

    return () => {
      stopPolling()
      setPaymentModalVisible(false)
      paymentPresentationRef.current = false
      lastPaymentSecretRef.current = null
      ensureClientSecretRef.current = false
      dispatch(clearPaymentState())
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
    if (!paymentRequired || pendingPaymentTaskId !== taskId) {
      setPaymentModalVisible(false)
      paymentPresentationRef.current = false
      lastPaymentSecretRef.current = null
      ensureClientSecretRef.current = false
      return
    }

    if (!paymentClientSecret) {
      if (!ensureClientSecretRef.current && !submitting) {
        ensureClientSecretRef.current = true
        dispatch(retryTaskPayment(taskId)).catch(() => {
          ensureClientSecretRef.current = false
        })
      }
      return
    }

    ensureClientSecretRef.current = false

    if (lastPaymentSecretRef.current !== paymentClientSecret) {
      lastPaymentSecretRef.current = paymentClientSecret
      paymentPresentationRef.current = false
    }

    if (!paymentPresentationRef.current) {
      message.info('Payment is required to continue this analysis.')
      paymentPresentationRef.current = true
      setPaymentModalVisible(true)
    }
  }, [paymentRequired, paymentClientSecret, pendingPaymentTaskId, taskId, dispatch, submitting])

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

  const handleRetryPayment = async () => {
    try {
      await dispatch(retryTaskPayment(taskId)).unwrap()
      paymentPresentationRef.current = false
      lastPaymentSecretRef.current = null
    } catch (err) {
      message.error(err || 'Unable to refresh payment intent')
    }
  }

  const handlePaymentSuccess = async () => {
    setPaymentModalVisible(false)
    paymentPresentationRef.current = false
    lastPaymentSecretRef.current = null
    ensureClientSecretRef.current = false
    message.success('Payment successful! Your analysis will resume shortly.')
    dispatch(clearPaymentState())
    await dispatch(fetchTask(taskId))
  }

  const handlePaymentCancel = () => {
    setPaymentModalVisible(false)
    paymentPresentationRef.current = true
    message.info('Payment is still pending. You can retry whenever you are ready.')
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
      {needsPayment && (
        <Alert
          type={paymentStatus === 'PAYMENT_FAILED' ? 'error' : 'warning'}
          showIcon
          message={paymentStatus === 'AWAITING_PAYMENT' ? 'Payment required to start analysis' : 'Payment attention required'}
          description={currentTask?.errorMessage || 'Complete the payment to start the analysis.'}
          action={
            <Button type="primary" size="small" onClick={handleRetryPayment} loading={submitting}>
              Resume Payment
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}
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

      <PaymentModal
        key={paymentClientSecret || 'payment-modal'}
        open={paymentModalVisible}
        clientSecret={paymentClientSecret}
        taskId={pendingPaymentTaskId || taskId}
        amount={billingAmount}
        currency={billingCurrency}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
      />
    </div>
  )
}

export default TaskDetail
