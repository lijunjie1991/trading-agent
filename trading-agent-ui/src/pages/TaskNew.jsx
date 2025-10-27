import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { message } from 'antd'
import TaskForm from '../components/Task/TaskForm'
import {
  startAnalysis,
  setCurrentTaskId,
  fetchBillingProfile,
  fetchPriceQuote,
} from '../store/slices/taskSlice'

const DEFAULT_STRATEGY = import.meta.env.VITE_DEFAULT_PRICING_STRATEGY || 'DEFAULT_2024'

const TaskNew = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const {
    submitting,
    error,
    currentTaskId,
    paymentInfo,
    priceQuote,
    billingProfile,
  } = useSelector((state) => state.task)

  const quoteTimerRef = useRef(null)

  useEffect(() => {
    dispatch(setCurrentTaskId(null))
    dispatch(fetchBillingProfile())

    dispatch(fetchPriceQuote({
      researchDepth: 1,
      selectedAnalysts: ['market'],
      pricingStrategyCode: DEFAULT_STRATEGY,
    }))

    return () => {
      if (quoteTimerRef.current) {
        clearTimeout(quoteTimerRef.current)
      }
    }
  }, [dispatch])

  useEffect(() => {
    if (error) {
      message.error(error)
    }
  }, [error])

  const handleSubmit = async (formValues) => {
    try {
      const payload = {
        ...formValues,
        pricingStrategyCode: DEFAULT_STRATEGY,
      }

      const result = await dispatch(startAnalysis(payload)).unwrap()
      const task = result?.task || result

      if (result?.payment?.required) {
        message.info('Complete the payment to start the analysis run')
        navigate('/tasks/checkout')
      } else {
        message.success('Analysis started successfully!')
        const id = task?.taskId || task?.task_id || currentTaskId
        if (id) {
          navigate(`/tasks/${id}`)
        }
      }

      dispatch(fetchBillingProfile())
    } catch (err) {
      const description = typeof err === 'string' ? err : err?.message
      if (description) {
        message.error(description)
      }
    }
  }

  const handleValuesChange = (_, allValues) => {
    const { researchDepth, selectedAnalysts } = allValues

    if (quoteTimerRef.current) {
      clearTimeout(quoteTimerRef.current)
    }

    if (!researchDepth || !selectedAnalysts || selectedAnalysts.length === 0) {
      return
    }

    quoteTimerRef.current = setTimeout(() => {
      dispatch(fetchPriceQuote({
        researchDepth,
        selectedAnalysts,
        pricingStrategyCode: DEFAULT_STRATEGY,
      }))
    }, 300)
  }

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }}>
      <TaskForm
        onSubmit={handleSubmit}
        loading={submitting}
        onValuesChange={handleValuesChange}
        priceQuote={priceQuote}
        billingProfile={billingProfile}
      />
    </div>
  )
}

export default TaskNew
