import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { Card, Row, Col, Button, Typography, Space, Modal, Tabs, Empty, Spin, Divider, message } from 'antd'
import { FileTextOutlined, CreditCardOutlined, ReloadOutlined } from '@ant-design/icons'
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
  retryTask,
  clearPaymentState,
} from '../store/slices/taskSlice'
import { RESEARCH_DEPTH_OPTIONS, PAYMENT_STATUS } from '../utils/constants'
import './TaskDetail.css'

const { Title, Text } = Typography
const { TabPane } = Tabs

marked.setOptions({
  gfm: true,
  breaks: true,  // allow single line breaks to render as <br>
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
  const [refreshingPaymentDetails, setRefreshingPaymentDetails] = useState(false)
  const [openingPaymentModal, setOpeningPaymentModal] = useState(false)
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
  const needsPayment = [
    PAYMENT_STATUS.AWAITING_PAYMENT,
    PAYMENT_STATUS.PAYMENT_FAILED,
    PAYMENT_STATUS.PAYMENT_EXPIRED
  ].includes(paymentStatus)
  const isPaymentExpired = paymentStatus === PAYMENT_STATUS.PAYMENT_EXPIRED
  const billingAmount = currentTask?.billingAmount ?? currentTask?.billing_amount ?? null
  const billingCurrency = currentTask?.billingCurrency ?? currentTask?.billing_currency ?? 'USD'
  const formatBillingAmount = (amount, currency) => {
    if (amount === undefined || amount === null) {
      return null
    }
    const numeric = typeof amount === 'number' ? amount : Number(amount)
    if (Number.isNaN(numeric)) {
      return null
    }
    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
    })
    return {
      display: formatter.format(numeric),
      raw: numeric,
    }
  }
  const billingBasis = useMemo(() => {
    if (!currentTask) {
      return null
    }
    const depthValue = currentTask.researchDepth ?? currentTask.research_depth
    const depthOption = RESEARCH_DEPTH_OPTIONS.find((option) => option.value === depthValue)
    const analysts = currentTask.selectedAnalysts ?? currentTask.selected_analysts ?? []
    const appliedFreeCredit = Boolean(currentTask.freeQuotaApplied ?? currentTask.free_quota_applied)
    const parts = []
    if (depthOption) {
      parts.push(`${depthOption.label.toLowerCase()} depth`)
    }
    if (analysts.length) {
      parts.push(`${analysts.length} analyst${analysts.length > 1 ? 's' : ''}`)
    }
    if (appliedFreeCredit) {
      parts.push('after free credit')
    }
    if (!parts.length) {
      return null
    }
    return parts.join(' · ')
  }, [currentTask])

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
      setRefreshingPaymentDetails(false)
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
      setRefreshingPaymentDetails(false)
      return
    }

    if (!paymentClientSecret) {
      if (!ensureClientSecretRef.current && !submitting) {
        ensureClientSecretRef.current = true
        setRefreshingPaymentDetails(true)
        dispatch(retryTaskPayment(taskId)).catch(() => {
          ensureClientSecretRef.current = false
          setRefreshingPaymentDetails(false)
        })
      }
      return
    }

    ensureClientSecretRef.current = false
    setRefreshingPaymentDetails(false)

    if (lastPaymentSecretRef.current !== paymentClientSecret) {
      lastPaymentSecretRef.current = paymentClientSecret
      paymentPresentationRef.current = false
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

  const handleOpenPaymentModal = async () => {
    try {
      setOpeningPaymentModal(true)

      // If payment expired, show informative message
      if (isPaymentExpired) {
        message.info('Payment window expired. Generating new payment link...')
      }

      if (!paymentClientSecret || isPaymentExpired) {
        setRefreshingPaymentDetails(true)
        const payload = await dispatch(retryTaskPayment(taskId)).unwrap()
        const secret = payload?.paymentClientSecret || payload?.payment_client_secret
        if (!secret) {
          throw new Error('Payment details are not available. Please try again.')
        }
      }
      paymentPresentationRef.current = true
      setPaymentModalVisible(true)
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : err?.message
      message.error(errorMessage || 'Unable to open payment form. Please retry.')
    } finally {
      setOpeningPaymentModal(false)
      setRefreshingPaymentDetails(false)
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
    setRefreshingPaymentDetails(false)
  }

  const handlePaymentCancel = () => {
    setPaymentModalVisible(false)
    paymentPresentationRef.current = false
    setRefreshingPaymentDetails(false)
  }

  const handleRetryTask = async () => {
    try {
      message.loading({ content: 'Retrying task...', key: 'retry', duration: 0 })
      await dispatch(retryTask(taskId)).unwrap()
      message.success({ content: 'Task retry initiated successfully!', key: 'retry', duration: 2 })
      // Restart polling for the retried task
      startPolling()
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to retry task'
      message.error({ content: errorMessage, key: 'retry', duration: 3 })
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
      {needsPayment && (
        <div className={`payment-banner ${
          paymentStatus === PAYMENT_STATUS.PAYMENT_FAILED ? 'payment-banner--error' :
          isPaymentExpired ? 'payment-banner--expired' : ''
        }`}>
          <div className="payment-banner__content">
            <div className="payment-banner__icon">
              <CreditCardOutlined />
            </div>
            <div className="payment-banner__copy">
              <div className="payment-banner__title">
                {paymentStatus === PAYMENT_STATUS.PAYMENT_FAILED && 'Payment failed - please try again'}
                {isPaymentExpired && 'Payment link expired - generate a new one'}
                {paymentStatus === PAYMENT_STATUS.AWAITING_PAYMENT && !isPaymentExpired && 'Complete payment to begin your analysis'}
              </div>
              {(() => {
                const billingInfo = formatBillingAmount(billingAmount, billingCurrency)
                return (
                  <div className="payment-banner__meta">
                    {billingInfo ? (
                      <span className="payment-banner__amount">
                        Amount due:&nbsp;
                        <strong>{billingInfo.display}</strong>
                        {billingBasis && (
                          <span className="payment-banner__note">
                            {billingBasis}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="payment-banner__amount">
                        Amount due:&nbsp;
                        <strong>Pending calculation</strong>
                      </span>
                    )}
                  </div>
                )
              })()}
              {refreshingPaymentDetails && (
                <div className="payment-banner__hint">
                  <Spin size="small" />
                  <span>
                    {isPaymentExpired ? 'Generating new payment link...' : 'Refreshing payment details...'}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="payment-banner__actions">
            <Button
              type="primary"
              size="large"
              onClick={handleOpenPaymentModal}
              loading={openingPaymentModal || refreshingPaymentDetails || submitting}
              className="payment-banner__cta"
            >
              {paymentStatus === PAYMENT_STATUS.PAYMENT_FAILED && 'Try Payment Again'}
              {isPaymentExpired && 'Generate New Payment'}
              {paymentStatus === PAYMENT_STATUS.AWAITING_PAYMENT && !isPaymentExpired && 'Complete Payment'}
            </Button>
          </div>
        </div>
      )}
      {currentTask?.status === 'FAILED' && !needsPayment && (
        <div className="payment-banner payment-banner--error">
          <div className="payment-banner__content">
            <div className="payment-banner__icon">
              <ReloadOutlined />
            </div>
            <div className="payment-banner__copy">
              <div className="payment-banner__title">
                Task execution failed
              </div>
              <div className="payment-banner__meta">
                {currentTask?.errorMessage && (
                  <span className="payment-banner__amount">
                    Error: {currentTask.errorMessage}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="payment-banner__actions">
            <Button
              type="primary"
              size="large"
              icon={<ReloadOutlined />}
              onClick={handleRetryTask}
              loading={submitting}
              className="payment-banner__cta"
            >
              Retry Task
            </Button>
          </div>
        </div>
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
            awaitingPayment={needsPayment}
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
        researchDepth={(() => {
          const depthValue = currentTask?.researchDepth ?? currentTask?.research_depth
          const depthOption = RESEARCH_DEPTH_OPTIONS.find((option) => option.value === depthValue)
          return depthOption?.label
        })()}
        analystCount={currentTask?.selectedAnalysts?.length ?? currentTask?.selected_analysts?.length}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
      />
    </div>
  )
}

export default TaskDetail
