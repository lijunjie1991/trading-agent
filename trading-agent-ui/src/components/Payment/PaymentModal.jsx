import { useCallback, useMemo, useState } from 'react'
import { Modal, Alert, Button, Typography, Space, Divider, Tag } from 'antd'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { CheckCircleOutlined, LoadingOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { getStripe } from '../../utils/stripe'
import { RESEARCH_DEPTH_OPTIONS } from '../../utils/constants'
import './PaymentModal.css'

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

const getResearchDepthLabel = (depth) => {
  if (depth === null || depth === undefined) {
    return ''
  }
  const numericDepth = typeof depth === 'number' ? depth : Number(depth)
  const option = RESEARCH_DEPTH_OPTIONS.find(opt => opt.value === numericDepth)
  return option ? option.label : depth
}

const PaymentForm = ({ amount, currency, taskId, onSuccess, onCancel, researchDepth, analystCount }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [paymentStep, setPaymentStep] = useState('ready') // ready, processing, verifying

  const categorizeError = (error) => {
    const errorMsg = error?.message || ''
    const errorType = error?.type || ''

    // Network errors
    if (errorType === 'validation_error' || errorMsg.includes('network') || errorMsg.includes('connection')) {
      return {
        type: 'network',
        title: 'Connection Issue',
        message: errorMsg || 'Network connection lost. Please check your internet and try again.',
      }
    }

    // Card errors
    if (errorType === 'card_error' || errorMsg.includes('card') || errorMsg.includes('declined')) {
      return {
        type: 'card',
        title: 'Card Issue',
        message: errorMsg || 'Your card was declined. Please check your card details or try another payment method.',
      }
    }

    // API errors
    if (errorMsg.includes('API') || errorMsg.includes('server') || errorMsg.includes('timeout')) {
      return {
        type: 'api',
        title: 'Server Issue',
        message: 'Server took too long to respond. Please try again in a moment.',
      }
    }

    // Generic Stripe errors
    return {
      type: 'stripe',
      title: 'Payment Error',
      message: errorMsg || 'Unable to process payment. Please try again.',
    }
  }

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault()
    if (!stripe || !elements) {
      return
    }
    setSubmitting(true)
    setErrorMessage(null)
    setPaymentStep('processing')

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
        const categorized = categorizeError(error)
        setErrorMessage(categorized)
        setPaymentStep('ready')
        return
      }

      if (paymentIntent?.status === 'succeeded') {
        setPaymentStep('ready')
        onSuccess?.(paymentIntent)
      } else if (paymentIntent?.status === 'processing') {
        setPaymentStep('verifying')
        // Wait a moment to show the verification state
        setTimeout(() => {
          onSuccess?.(paymentIntent)
        }, 800)
      } else {
        setErrorMessage({
          type: 'stripe',
          title: 'Additional Action Required',
          message: 'Payment requires additional verification. Please follow the instructions from your bank.',
        })
        setPaymentStep('ready')
      }
    } catch (err) {
      const categorized = categorizeError(err)
      setErrorMessage(categorized)
      setPaymentStep('ready')
    } finally {
      setSubmitting(false)
    }
  }, [stripe, elements, onSuccess, taskId])

  const renderPaymentSteps = () => {
    const steps = [
      { key: 'processing', label: 'Processing payment', icon: paymentStep === 'processing' ? <LoadingOutlined /> : null },
      { key: 'verifying', label: 'Verifying with bank', icon: paymentStep === 'verifying' ? <LoadingOutlined /> : null },
      { key: 'starting', label: 'Starting analysis', icon: null },
    ]

    return (
      <div className="payment-steps">
        {steps.map((step, index) => {
          const isActive =
            (step.key === 'processing' && paymentStep === 'processing') ||
            (step.key === 'verifying' && paymentStep === 'verifying')
          const isCompleted =
            (step.key === 'processing' && (paymentStep === 'verifying')) ||
            (step.key === 'verifying' && paymentStep === 'starting')

          return (
            <div key={step.key} className={`payment-step ${isActive ? 'payment-step--active' : ''} ${isCompleted ? 'payment-step--completed' : ''}`}>
              <div className="payment-step__indicator">
                {isCompleted ? (
                  <CheckCircleOutlined />
                ) : isActive ? (
                  step.icon
                ) : (
                  <span className="payment-step__number">{index + 1}</span>
                )}
              </div>
              <span className="payment-step__label">{step.label}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="payment-form__content">
        {/* Payment Summary Section */}
        <div className="payment-summary">
          <div className="payment-summary__header">
            <Text className="payment-summary__title">Payment Summary</Text>
            <Tag color="blue" className="payment-summary__badge">Secure Payment</Tag>
          </div>

          <div className="payment-summary__details">
            {researchDepth && (
              <div className="payment-detail-row">
                <Text className="payment-detail-row__label">Research Depth</Text>
                <Text className="payment-detail-row__value">{getResearchDepthLabel(researchDepth)}</Text>
              </div>
            )}
            {analystCount !== undefined && analystCount !== null && (
              <div className="payment-detail-row">
                <Text className="payment-detail-row__label">Analysts Selected</Text>
                <Text className="payment-detail-row__value">{analystCount} analyst{analystCount !== 1 ? 's' : ''}</Text>
              </div>
            )}
          </div>

          <div className="payment-summary__total">
            <Text className="payment-total__label">Total Amount</Text>
            <Text className="payment-total__amount">
              {amount !== null && amount !== undefined
                ? formatAmount(amount, currency)
                : 'Calculating...'}
            </Text>
          </div>
        </div>

        {/* Payment Method Section */}
        <div className="payment-method-section">
          <PaymentElement options={{ layout: 'tabs' }} />
        </div>

        {/* Payment Progress Steps */}
        {submitting && (
          <div className="payment-progress-section">
            {renderPaymentSteps()}
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <Alert
            type="error"
            showIcon
            icon={<ExclamationCircleOutlined />}
            message={errorMessage.title}
            description={
              <Space direction="vertical" size="small">
                <Text>{errorMessage.message}</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {errorMessage.type === 'network' && 'Check your internet connection and try again.'}
                  {errorMessage.type === 'card' && 'Update your payment details above or try another payment method.'}
                  {errorMessage.type === 'api' && 'Our servers are experiencing high traffic. Please wait a moment.'}
                  {errorMessage.type === 'stripe' && 'If the issue persists, please contact support.'}
                </Text>
              </Space>
            }
            className="payment-error-alert"
          />
        )}

        {/* Action Buttons */}
        <div className="payment-actions">
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            disabled={!stripe || !elements}
            size="large"
            block
            className="payment-btn payment-btn--confirm"
          >
            {submitting ? 'Processing...' : 'Confirm Payment'}
          </Button>
          <Button
            onClick={onCancel}
            disabled={submitting}
            size="large"
            block
            className="payment-btn payment-btn--cancel"
          >
            Cancel
          </Button>
        </div>
      </div>
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
  researchDepth,
  analystCount,
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
        variables: {
          colorPrimary: '#4338ca',
          borderRadius: '12px',
        },
      },
      locale: 'en',
    }
  }, [clientSecret])

  return (
    <Modal
      open={open}
      title={
        <div className="payment-modal-header">
          <div className="payment-modal-header__icon">
            <CheckCircleOutlined />
          </div>
          <div>
            <div className="payment-modal-header__title">Analysis Created</div>
            <div className="payment-modal-header__subtitle">
              Complete Payment to Start
            </div>
          </div>
        </div>
      }
      footer={null}
      onCancel={onCancel}
      destroyOnClose
      maskClosable={false}
      centered
      width={580}
      className="payment-modal"
    >
      {stripeInitializationError ? (
        <Alert
          type="error"
          showIcon
          message="Stripe is not configured"
          description={
            <Space direction="vertical" size="small">
              <Text>{stripeInitializationError.message}</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Please contact support for assistance.
              </Text>
            </Space>
          }
        />
      ) : !clientSecret ? (
        <Alert
          type="warning"
          showIcon
          message="Payment details are not available"
          description="Please close this dialog and try again. If the issue persists, contact support."
        />
      ) : (
        <Elements stripe={stripePromise} options={elementsOptions}>
          <PaymentForm
            amount={amount}
            currency={currency}
            taskId={taskId}
            researchDepth={researchDepth}
            analystCount={analystCount}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>
      )}
    </Modal>
  )
}

export default PaymentModal
