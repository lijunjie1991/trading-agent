import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { message } from 'antd'
import TaskForm from '../components/Task/TaskForm'
import {
  startAnalysis,
  setCurrentTaskId,
  fetchBillingSummary,
  fetchTaskQuote,
  clearCheckoutState,
} from '../store/slices/taskSlice'
import { getStripe } from '../utils/stripe'

const TaskNew = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const {
    submitting,
    currentTaskId,
    error,
    paymentRequired,
    checkoutSessionId,
    checkoutUrl,
    billingSummary,
    billingLoading,
    quote,
    quoteLoading,
  } = useSelector((state) => state.task)
  const isSubmittingRef = useRef(false)
  const quoteTimerRef = useRef(null)
  const lastQuoteRef = useRef(null)
  const [formValues, setFormValues] = useState(null)

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
    if (!paymentRequired || !isSubmittingRef.current) {
      return
    }
    if (!checkoutSessionId && !checkoutUrl) {
      return
    }

    const redirect = async () => {
      message.info('Redirecting to Stripe for payment...')
      try {
        const stripe = await getStripe()
        const { error: stripeError } = await stripe.redirectToCheckout({ sessionId: checkoutSessionId })
        if (stripeError && checkoutUrl) {
          window.location.assign(checkoutUrl)
        } else if (stripeError) {
          message.error(stripeError.message || 'Unable to redirect to Stripe checkout')
        }
      } catch (stripeInitError) {
        if (checkoutUrl) {
          window.location.assign(checkoutUrl)
        } else {
          message.error(stripeInitError.message || 'Stripe configuration error')
        }
      } finally {
        isSubmittingRef.current = false
        dispatch(clearCheckoutState())
      }
    }

    redirect()
  }, [paymentRequired, checkoutSessionId, checkoutUrl, dispatch])

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

  useEffect(() => () => {
    if (quoteTimerRef.current) {
      clearTimeout(quoteTimerRef.current)
    }
    lastQuoteRef.current = null
    dispatch(clearCheckoutState())
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
    </div>
  )
}

export default TaskNew
