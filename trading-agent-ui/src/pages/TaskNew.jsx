import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Alert, message, Space, Spin, Modal, Button, Tag } from 'antd'
import { ExclamationCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import TaskForm from '../components/Task/TaskForm'
import PaymentModal from '../components/Payment/PaymentModal'
import {
  startAnalysis,
  setCurrentTaskId,
  fetchBillingSummary,
  fetchTaskQuote,
  fetchTask,
  clearPaymentState,
} from '../store/slices/taskSlice'
import './TaskNew.css'

const TaskNew = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const {
    submitting,
    currentTaskId,
    error,
    paymentRequired,
    paymentClientSecret,
    pendingPaymentTaskId,
    currentTask,
    billingSummary,
    billingLoading,
    quote,
    quoteLoading,
  } = useSelector((state) => state.task)
  const billingAmount = currentTask?.billingAmount ?? currentTask?.billing_amount ?? quote?.totalAmount ?? quote?.total_amount ?? null
  const billingCurrency = currentTask?.billingCurrency ?? currentTask?.billing_currency ?? billingSummary?.currency ?? 'USD'
  const isSubmittingRef = useRef(false)
  const quoteTimerRef = useRef(null)
  const lastQuoteRef = useRef(null)
  const lastPaymentSecretRef = useRef(null)
  const paymentPresentationRef = useRef(false)
  const [formValues, setFormValues] = useState(null)
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [waitingForPaymentDetails, setWaitingForPaymentDetails] = useState(false)
  const [waitingStartTime, setWaitingStartTime] = useState(null)
  const [waitingElapsed, setWaitingElapsed] = useState(0)

  // Clear currentTaskId when entering this page
  useEffect(() => {
    dispatch(clearPaymentState())
    dispatch(setCurrentTaskId(null))
    dispatch(fetchBillingSummary())
  }, [dispatch])

  // Only navigate when we just submitted a new task
  useEffect(() => {
    if (currentTaskId && isSubmittingRef.current) {
      isSubmittingRef.current = false
      message.success('Analysis started successfully!')
      navigate(`/tasks/${currentTaskId}`)
    }
  }, [currentTaskId, navigate])

  useEffect(() => {
    if (error) {
      message.error(error)
      isSubmittingRef.current = false
    }
  }, [error])

  // Timer for waiting state
  useEffect(() => {
    if (waitingForPaymentDetails && !waitingStartTime) {
      setWaitingStartTime(Date.now())
    }
    if (!waitingForPaymentDetails && waitingStartTime) {
      setWaitingStartTime(null)
      setWaitingElapsed(0)
    }
  }, [waitingForPaymentDetails, waitingStartTime])

  // Update elapsed time
  useEffect(() => {
    if (!waitingStartTime) return

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - waitingStartTime) / 1000)
      setWaitingElapsed(elapsed)

      // Show warning after 10 seconds
      if (elapsed === 10) {
        message.warning('Payment preparation is taking longer than expected. Please wait...')
      }

      // Show error after 30 seconds
      if (elapsed === 30) {
        message.error('Payment preparation timeout. Please try again or contact support.')
        setWaitingForPaymentDetails(false)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [waitingStartTime])

  useEffect(() => {
    if (!paymentRequired || !pendingPaymentTaskId) {
      setPaymentModalVisible(false)
      paymentPresentationRef.current = false
      lastPaymentSecretRef.current = null
      setWaitingForPaymentDetails(false)
      return
    }
    if (!paymentClientSecret) {
      setWaitingForPaymentDetails(true)
      return
    }
    setWaitingForPaymentDetails(false)
    if (lastPaymentSecretRef.current !== paymentClientSecret) {
      lastPaymentSecretRef.current = paymentClientSecret
      paymentPresentationRef.current = false
    }
    if (!paymentPresentationRef.current) {
      paymentPresentationRef.current = true
      setPaymentModalVisible(true)
    }
    isSubmittingRef.current = false
  }, [paymentRequired, paymentClientSecret, pendingPaymentTaskId])

  useEffect(() => {
    if (!formValues) {
      return
    }
    const { researchDepth, selectedAnalysts } = formValues
    if (!researchDepth || !selectedAnalysts || selectedAnalysts.length === 0) {
      return
    }

    const requestPayload = {
      researchDepth,
      selectedAnalysts,
    }

    if (lastQuoteRef.current &&
      lastQuoteRef.current.researchDepth === requestPayload.researchDepth &&
      JSON.stringify(lastQuoteRef.current.selectedAnalysts) === JSON.stringify(requestPayload.selectedAnalysts)) {
      return
    }

    if (quoteTimerRef.current) {
      clearTimeout(quoteTimerRef.current)
    }

    quoteTimerRef.current = setTimeout(() => {
      lastQuoteRef.current = requestPayload
      dispatch(fetchTaskQuote(requestPayload))
    }, 350)

    return () => {
      if (quoteTimerRef.current) {
        clearTimeout(quoteTimerRef.current)
      }
    }
  }, [formValues, dispatch])

  const handleSubmit = async (taskData) => {
    isSubmittingRef.current = true
    await dispatch(startAnalysis(taskData))
    dispatch(fetchBillingSummary())
  }

  const handleFormChange = useCallback((values) => {
    if (!values) return
    const normalized = {
      researchDepth: values.researchDepth,
      selectedAnalysts: values.selectedAnalysts || [],
    }
    setFormValues(normalized)
  }, [])

  const handlePaymentSuccess = useCallback(async () => {
    const taskId = pendingPaymentTaskId
    setPaymentModalVisible(false)
    paymentPresentationRef.current = false
    lastPaymentSecretRef.current = null
    isSubmittingRef.current = false
    message.success('Payment successful! Your analysis will start shortly.')
    if (taskId) {
      await dispatch(fetchTask(taskId))
      navigate(`/tasks/${taskId}`)
    }
    dispatch(clearPaymentState())
    dispatch(fetchBillingSummary())
    setWaitingForPaymentDetails(false)
  }, [dispatch, navigate, pendingPaymentTaskId])

  const handlePaymentCancel = useCallback(() => {
    const taskId = pendingPaymentTaskId

    // Show confirmation dialog
    Modal.confirm({
      title: 'Cancel Payment?',
      icon: <ExclamationCircleOutlined />,
      content: (
        <Space direction="vertical" size="small">
          <div>Your analysis task has been created but payment is pending.</div>
          <div style={{ marginTop: 8 }}>
            <strong>What happens next?</strong>
            <ul style={{ marginTop: 4, paddingLeft: 20 }}>
              <li>You can complete payment later from the task details page</li>
              <li>The analysis will start automatically after payment</li>
              <li>The task will remain in "Awaiting Payment" status</li>
            </ul>
          </div>
        </Space>
      ),
      okText: 'Go to Task Details',
      cancelText: 'Stay Here',
      width: 500,
      onOk: () => {
        setPaymentModalVisible(false)
        paymentPresentationRef.current = true
        isSubmittingRef.current = false
        dispatch(clearPaymentState())
        setWaitingForPaymentDetails(false)
        if (taskId) {
          navigate(`/tasks/${taskId}`)
        }
      },
      onCancel: () => {
        // User wants to stay and continue with payment
        // Do nothing, keep the modal open
      },
    })
  }, [dispatch, navigate, pendingPaymentTaskId])

  useEffect(() => () => {
    if (quoteTimerRef.current) {
      clearTimeout(quoteTimerRef.current)
    }
    lastQuoteRef.current = null
    lastPaymentSecretRef.current = null
    paymentPresentationRef.current = false
    setPaymentModalVisible(false)
    dispatch(clearPaymentState())
    setWaitingForPaymentDetails(false)
  }, [dispatch])

  return (
    <div className="task-new-page">
      <div className="task-new-container">
        {waitingForPaymentDetails && (
          <Alert
            className="task-new-alert"
            type={waitingElapsed >= 10 ? 'warning' : 'info'}
            showIcon
            icon={<ClockCircleOutlined />}
            message={
              <Space size={8}>
                <span>Preparing payment details...</span>
                <Tag color={waitingElapsed >= 10 ? 'orange' : 'blue'}>
                  {waitingElapsed}s elapsed
                </Tag>
              </Space>
            }
            description={
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Spin size="small" />
                  <span>
                    {waitingElapsed < 5 && 'The system is retrieving payment information for this analysis.'}
                    {waitingElapsed >= 5 && waitingElapsed < 10 && 'Calculating your payment amount and preparing checkout...'}
                    {waitingElapsed >= 10 && waitingElapsed < 20 && 'This is taking longer than expected. Please wait a moment...'}
                    {waitingElapsed >= 20 && 'Almost there! Finalizing payment setup...'}
                  </span>
                </div>
                {waitingElapsed >= 10 && (
                  <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: 4 }}>
                    Expected time: 3-5 seconds. If this continues, please contact support.
                  </div>
                )}
              </Space>
            }
          />
        )}
        <TaskForm
          onSubmit={handleSubmit}
          loading={submitting}
          billingSummary={billingSummary}
          billingLoading={billingLoading}
          quote={quote}
          quoteLoading={quoteLoading}
          onFormChange={handleFormChange}
        />
      </div>
      <PaymentModal
        key={paymentClientSecret || 'payment-modal'}
        open={paymentModalVisible}
        clientSecret={paymentClientSecret}
        taskId={pendingPaymentTaskId}
        amount={billingAmount}
        currency={billingCurrency}
        researchDepth={quote?.researchDepth || formValues?.researchDepth}
        analystCount={quote?.analystCount || formValues?.selectedAnalysts?.length}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
      />
    </div>
  )
}

export default TaskNew
