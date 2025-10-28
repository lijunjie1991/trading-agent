import { useCallback, useMemo, useState } from 'react'
import { Modal, Alert, Button, Typography, Space } from 'antd'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { getStripe } from '../../utils/stripe'

const { Text, Title } = Typography

const formatAmount = (amount, currency) => {
  if (amount === null || amount === undefined) {
    return ''
  }
  const numericAmount = typeof amount === 'number' ? amount : Number(amount)
  if (Number.isNaN(numericAmount)) {
    return ''
  }
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'USD',
  })
  return formatter.format(numericAmount)
}

const PaymentForm = ({ amount, currency, taskId, onSuccess, onCancel }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault()
    if (!stripe || !elements) {
      return
    }
    setSubmitting(true)
    setErrorMessage(null)
    try {
      const returnUrl = taskId ? `${window.location.origin}/tasks/${taskId}` : window.location.href

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: 'if_required',
      })

      if (error) {
        setErrorMessage(error.message || 'Unable to confirm payment. Please try again.')
        return
      }

      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
        onSuccess?.(paymentIntent)
      } else {
        setErrorMessage('Payment requires additional action. Please try again.')
      }
    } catch (err) {
      setErrorMessage(err.message || 'Unexpected payment error. Please retry.')
    } finally {
      setSubmitting(false)
    }
  }, [stripe, elements, onSuccess, taskId])

  return (
    <form onSubmit={handleSubmit}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>
            Complete Payment
          </Title>
          <Text type="secondary">
            {amount !== null && amount !== undefined
              ? `Amount due: ${formatAmount(amount, currency)}`
              : 'Please complete the payment to proceed.'}
          </Text>
        </div>

        <PaymentElement options={{ layout: 'tabs' }} />

        {errorMessage && (
          <Alert
            type="error"
            showIcon
            message={errorMessage}
          />
        )}

        <Button
          type="primary"
          htmlType="submit"
          loading={submitting}
          block
        >
          Confirm Payment
        </Button>
        <Button
          onClick={onCancel}
          disabled={submitting}
          block
        >
          Cancel
        </Button>
      </Space>
    </form>
  )
}

let stripeInitializationError = null
let stripePromise = null
try {
  stripePromise = getStripe()
} catch (error) {
  console.error('Stripe initialization error:', error)
  stripeInitializationError = error
}

const PaymentModal = ({
  open,
  clientSecret,
  taskId,
  amount,
  currency,
  onSuccess,
  onCancel,
}) => {
  const elementsOptions = useMemo(() => {
    if (!clientSecret) {
      return null
    }
    return {
      clientSecret,
      appearance: {
        theme: 'stripe',
      },
    }
  }, [clientSecret])

  return (
    <Modal
      open={open}
      title="Payment Required"
      footer={null}
      onCancel={onCancel}
      destroyOnClose
      maskClosable={false}
      centered
    >
      {stripeInitializationError ? (
        <Alert
          type="error"
          showIcon
          message="Stripe is not configured. Please contact support."
          description={stripeInitializationError.message}
        />
      ) : !clientSecret ? (
        <Alert
          type="warning"
          showIcon
          message="Payment details are not available. Please retry."
        />
      ) : (
        <Elements stripe={stripePromise} options={elementsOptions}>
          <PaymentForm
            amount={amount}
            currency={currency}
            taskId={taskId}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>
      )}
    </Modal>
  )
}

export default PaymentModal
