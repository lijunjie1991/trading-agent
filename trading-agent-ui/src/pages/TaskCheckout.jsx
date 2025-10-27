import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Card, Typography, Space, Descriptions, Button, Alert, message } from 'antd'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import dayjs from 'dayjs'
import { confirmPayment, fetchBillingProfile } from '../store/slices/taskSlice'
import { formatCurrency, formatDate } from '../utils/helpers'

const { Title, Text } = Typography

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')

const CheckoutForm = ({ paymentInfo, taskId, onSuccess }) => {
  const stripe = useStripe()
  const elements = useElements()
  const dispatch = useDispatch()
  const paymentConfirming = useSelector((state) => state.task.paymentConfirming)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!stripe || !elements || !paymentInfo) return

    setSubmitting(true)
    setErrorMessage('')

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/tasks/${taskId ?? ''}?payment=completed`,
      },
      redirect: 'if_required',
    })

    if (error) {
      setErrorMessage(error.message || 'Payment failed, please try again.')
      setSubmitting(false)
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      try {
        await dispatch(confirmPayment(paymentInfo.paymentIntentId)).unwrap()
        await dispatch(fetchBillingProfile())
        message.success('Payment successful. Task has been queued for analysis.')
        onSuccess()
      } catch (err) {
        const reason = typeof err === 'string' ? err : err?.message
        setErrorMessage(reason || 'Payment confirmation failed. Please try again later.')
      }
    } else {
      setErrorMessage(`Current payment status: ${paymentIntent?.status}`)
    }

    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <PaymentElement id="payment-element" options={{ layout: 'tabs' }} />
      {errorMessage && (
        <Alert type="error" showIcon message={errorMessage} style={{ marginTop: 16 }} />
      )}
      <Button
        type="primary"
        htmlType="submit"
        size="large"
        block
        loading={submitting || paymentConfirming}
        style={{ marginTop: 20 }}
      >
        {paymentInfo ? `Confirm payment ${formatCurrency(paymentInfo.amountCents, paymentInfo.currency)}` : 'Confirm payment'}
      </Button>
    </form>
  )
}

const TaskCheckout = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { paymentInfo, currentTask } = useSelector((state) => state.task)

  if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 32 }}>
        <Alert
          type="error"
          showIcon
          message="Stripe publishable key missing"
          description="Populate VITE_STRIPE_PUBLISHABLE_KEY in your environment and reload the page."
        />
      </div>
    )
  }

  useEffect(() => {
    if (!paymentInfo?.required) {
      navigate('/tasks/new', { replace: true })
    }
  }, [paymentInfo, navigate])

  const clientSecret = paymentInfo?.clientSecret

  const elementsOptions = useMemo(() => {
    if (!clientSecret) return null
    return { clientSecret }
  }, [clientSecret])

  const taskId = currentTask?.taskId || currentTask?.task_id

  const handleSuccessNavigation = () => {
    if (taskId) {
      navigate(`/tasks/${taskId}`, { replace: true })
    } else {
      navigate('/tasks')
    }
  }

  if (!paymentInfo || !paymentInfo.required || !elementsOptions) {
    return null
  }

  const analystCount = paymentInfo.pricingBreakdown?.analystCount || (currentTask?.selectedAnalysts || []).length
  const createdAt = currentTask?.createdAt || currentTask?.created_at

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 32 }}>
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ marginBottom: 8 }}>Complete payment to start the analysis</Title>
          <Text type="secondary">
            Once payment succeeds the task is sent to the analysis engine automatically.
          </Text>
        </div>

        <Card>
          <Descriptions column={1} size="small" title="Task summary" bordered>
            <Descriptions.Item label="Ticker">{currentTask?.ticker}</Descriptions.Item>
            <Descriptions.Item label="Research depth">
              {currentTask?.researchDepth || currentTask?.research_depth}
            </Descriptions.Item>
            <Descriptions.Item label="Analysts selected">{analystCount}</Descriptions.Item>
            <Descriptions.Item label="Created at">
              {createdAt ? formatDate(createdAt) : dayjs().format('YYYY-MM-DD')}
            </Descriptions.Item>
            <Descriptions.Item label="Amount due">
              <Text strong>{formatCurrency(paymentInfo.amountCents, paymentInfo.currency)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Pricing strategy">
              {paymentInfo.pricingStrategyCode || currentTask?.pricingStrategyCode || 'DEFAULT_2024'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card>
          <Elements stripe={stripePromise} options={elementsOptions}>
            <CheckoutForm paymentInfo={paymentInfo} taskId={taskId} onSuccess={handleSuccessNavigation} />
          </Elements>
        </Card>
      </Space>
    </div>
  )
}

export default TaskCheckout
