import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { message } from 'antd'
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

  // Clear currentTaskId when entering this page
  useEffect(() => {
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

  useEffect(() => {
    if (!paymentRequired || !pendingPaymentTaskId) {
      setPaymentModalVisible(false)
      paymentPresentationRef.current = false
      lastPaymentSecretRef.current = null
      return
    }
    if (!paymentClientSecret) {
      return
    }
    if (lastPaymentSecretRef.current !== paymentClientSecret) {
      lastPaymentSecretRef.current = paymentClientSecret
      paymentPresentationRef.current = false
    }
    if (!paymentPresentationRef.current) {
      message.info('Payment is required to start this analysis.')
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
  }, [dispatch, navigate, pendingPaymentTaskId])

  const handlePaymentCancel = useCallback(() => {
    const taskId = pendingPaymentTaskId
    setPaymentModalVisible(false)
    paymentPresentationRef.current = true
    isSubmittingRef.current = false
    dispatch(clearPaymentState())
    if (taskId) {
      message.info('Payment pending. You can complete it anytime from the task details page.')
      navigate(`/tasks/${taskId}`)
    }
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
  }, [dispatch])

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <TaskForm
        onSubmit={handleSubmit}
        loading={submitting}
        billingSummary={billingSummary}
        billingLoading={billingLoading}
        quote={quote}
        quoteLoading={quoteLoading}
        onFormChange={handleFormChange}
      />
      <PaymentModal
        key={paymentClientSecret || 'payment-modal'}
        open={paymentModalVisible}
        clientSecret={paymentClientSecret}
        taskId={pendingPaymentTaskId}
        amount={billingAmount}
        currency={billingCurrency}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
      />
    </div>
  )
}

export default TaskNew
