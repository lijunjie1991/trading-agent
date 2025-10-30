import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { Card, Row, Col, Button, Typography, Space, Modal, Tabs, Empty, Spin, Divider, message, Popover } from 'antd'
import { FileTextOutlined, CreditCardOutlined, ReloadOutlined, QuestionCircleOutlined } from '@ant-design/icons'
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
import '../components/Task/TaskDetailEnhancements.css'

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

  const renderPricingDetailsPopover = () => {
    const depthValue = currentTask?.researchDepth ?? currentTask?.research_depth
    const depthOption = RESEARCH_DEPTH_OPTIONS.find((option) => option.value === depthValue)
    const analysts = currentTask?.selectedAnalysts ?? currentTask?.selected_analysts ?? []
    const pricingBreakdown = currentTask?.pricingBreakdown

    return (
      <div style={{
        maxWidth: 280,
        padding: '16px',
        background: 'rgba(17, 24, 39, 0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: 12,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}>
        <div style={{ marginBottom: 14 }}>
          <Text strong style={{ fontSize: 14, color: '#f9fafb', letterSpacing: '-0.01em' }}>
            💰 Pricing Breakdown
          </Text>
        </div>
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>Research Depth</Text>
            <Text strong style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.9)' }}>
              {depthOption?.label || 'N/A'}
            </Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>Analysts Selected</Text>
            <Text strong style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.9)' }}>
              {analysts.length}
            </Text>
          </div>
          {pricingBreakdown && (
            <>
              <div style={{
                height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
                margin: '4px 0'
              }} />
              <div>
                <Text style={{
                  fontSize: 11,
                  color: 'rgba(255, 255, 255, 0.5)',
                  display: 'block',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Calculation
                </Text>
                <div style={{
                  fontSize: 11,
                  color: '#fbbf24',
                  fontFamily: 'SF Mono, Monaco, Courier New, monospace',
                  background: 'rgba(251, 191, 36, 0.15)',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(251, 191, 36, 0.2)',
                  lineHeight: 1.5
                }}>
                  {pricingBreakdown.calculationFormula ||
                    `USD ${pricingBreakdown.basePrice} × ${pricingBreakdown.researchDepthFactor} (depth) × ${pricingBreakdown.analystFactor} (analysts)`}
                </div>
              </div>
            </>
          )}
          <div style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
            margin: '4px 0'
          }} />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 0 4px'
          }}>
            <Text strong style={{ fontSize: 13, color: '#f9fafb' }}>Total Amount</Text>
            <Text strong style={{
              fontSize: 16,
              color: '#fbbf24',
              letterSpacing: '-0.02em',
              textShadow: '0 0 20px rgba(251, 191, 36, 0.3)'
            }}>
              {formatBillingAmount(billingAmount, billingCurrency)?.display}
            </Text>
          </div>
        </Space>
      </div>
    )
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
        <div className={`payment-banner-compact ${
          paymentStatus === PAYMENT_STATUS.PAYMENT_FAILED ? 'payment-banner-compact--error' :
          isPaymentExpired ? 'payment-banner-compact--expired' : ''
        }`}>
          <div className="payment-banner-compact__main">
            <div className="payment-banner-compact__icon">
              <CreditCardOutlined />
            </div>
            <div className="payment-banner-compact__content">
              <div className="payment-banner-compact__text">
                <span className="payment-banner-compact__label">
                  {paymentStatus === PAYMENT_STATUS.PAYMENT_FAILED && 'Payment Required'}
                  {isPaymentExpired && 'Payment Expired'}
                  {paymentStatus === PAYMENT_STATUS.AWAITING_PAYMENT && !isPaymentExpired && 'Payment Required'}
                </span>
                <span className="payment-banner-compact__amount">
                  {formatBillingAmount(billingAmount, billingCurrency)?.display}
                </span>
              </div>
              <Popover
                content={renderPricingDetailsPopover()}
                title={null}
                trigger="click"
                placement="bottomLeft"
                overlayInnerStyle={{
                  padding: 0,
                  background: 'transparent',
                  boxShadow: 'none'
                }}
              >
                <div className="payment-banner-compact__info-btn">
                  <QuestionCircleOutlined />
                </div>
              </Popover>
            </div>
            <Button
              type="primary"
              size="middle"
              onClick={handleOpenPaymentModal}
              loading={openingPaymentModal || refreshingPaymentDetails || submitting}
              disabled={openingPaymentModal || refreshingPaymentDetails || submitting}
              className="payment-banner-compact__cta"
            >
              {(openingPaymentModal || refreshingPaymentDetails || submitting) ? 'Loading...' :
                paymentStatus === PAYMENT_STATUS.PAYMENT_FAILED ? 'Retry Payment' :
                isPaymentExpired ? 'New Payment' :
                'Pay Now'
              }
            </Button>
          </div>
        </div>
      )}
      {currentTask?.status === 'FAILED' && !needsPayment && (
        <div className="error-banner">
          <div className="error-banner__main">
            <div className="error-banner__icon">⚠️</div>
            <div className="error-banner__content">
              <div className="error-banner__title">Task Execution Failed</div>
              {currentTask?.errorMessage && (
                <div className="error-banner__message">
                  {currentTask.errorMessage.length > 200
                    ? currentTask.errorMessage.substring(0, 200) + '...'
                    : currentTask.errorMessage}
                </div>
              )}
            </div>
            <Button
              type="primary"
              size="middle"
              icon={<ReloadOutlined />}
              onClick={handleRetryTask}
              loading={submitting}
              className="error-banner__button"
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
