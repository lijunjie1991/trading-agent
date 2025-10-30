import { useEffect } from 'react'
import {
  Form,
  Input,
  DatePicker,
  Select,
  Checkbox,
  Button,
  Card,
  Typography,
  Spin,
  Divider,
  Tag,
} from 'antd'
import { RocketOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { RESEARCH_DEPTH_OPTIONS } from '../../utils/constants'
import './TaskForm.css'

const { Title, Text } = Typography
const { Option } = Select

const TaskForm = ({
  onSubmit,
  loading,
  billingSummary,
  billingLoading,
  quote,
  quoteLoading,
  onFormChange,
}) => {
  const [form] = Form.useForm()

  const analystOptions = [
    { label: 'Market Analyst', value: 'market' },
    { label: 'Social Analyst', value: 'social' },
    { label: 'News Analyst', value: 'news' },
    { label: 'Fundamentals Analyst', value: 'fundamentals' },
  ]

  const handleSubmit = (values) => {
    const formattedValues = {
      ticker: values.ticker.toUpperCase(),
      analysisDate: values.analysisDate.format('YYYY-MM-DD'),
      selectedAnalysts: values.selectedAnalysts,
      researchDepth: values.researchDepth,
    }
    onSubmit(formattedValues)
  }

  useEffect(() => {
    const initialValues = form.getFieldsValue(true)
    onFormChange?.({
      researchDepth: initialValues.researchDepth,
      selectedAnalysts: initialValues.selectedAnalysts,
    })
  }, [form, onFormChange])

  const handleValuesChange = (_, allValues) => {
    onFormChange?.({
      researchDepth: allValues.researchDepth,
      selectedAnalysts: allValues.selectedAnalysts,
    })
  }

  const renderBillingSummaryCard = () => {
    if (billingLoading) {
      return (
        <div className="task-form__summary-card task-form__summary-card--loading">
          <Spin size="small" />
          <span>Loading billing overview...</span>
        </div>
      )
    }

    if (!billingSummary) {
      return (
        <div className="task-form__summary-card task-form__summary-card--placeholder">
          <Text type="secondary">Billing summary is currently unavailable.</Text>
        </div>
      )
    }

    const remaining = Number(
      billingSummary.freeQuotaRemaining ?? billingSummary.freeQuotaTotal ?? 0
    )
    const total = Number(billingSummary.freeQuotaTotal ?? 0)
    const hasFreeCredits = remaining > 0

    return (
      <div
        className={`task-form__summary-card ${
          hasFreeCredits ? 'task-form__summary-card--available' : 'task-form__summary-card--exhausted'
        }`}
      >
        <div className="task-form__summary-card-header">
          <span
            className={`task-form__summary-card-tag ${
              hasFreeCredits ? 'task-form__summary-card-tag--success' : 'task-form__summary-card-tag--warning'
            }`}
          >
            {hasFreeCredits ? 'Available' : 'Exhausted'}
          </span>
        </div>
        <div className="task-form__summary-card-value">
          {hasFreeCredits ? (
            <>
              <span className="task-form__summary-card-highlight">{remaining}</span>
              <span className="task-form__summary-card-text"> credit{remaining === 1 ? '' : 's'} remaining</span>
            </>
          ) : (
            'No credits left'
          )}
        </div>
        <div className="task-form__summary-card-meta">
          <span>Total credits: {total}</span>
          {typeof billingSummary.paidTaskCount === 'number' && (
            <span>Paid analyses: {billingSummary.paidTaskCount}</span>
          )}
        </div>
        {hasFreeCredits && (
          <div className="task-form__summary-card-tip">
            This analysis may use your free credit
          </div>
        )}
      </div>
    )
  }

  const renderQuoteCard = () => {
    if (quoteLoading) {
      return (
        <div className="task-form__summary-card task-form__summary-card--loading">
          <Spin size="small" />
          <span>Calculating estimated charge...</span>
        </div>
      )
    }

    if (!quote) {
      return (
        <div className="task-form__summary-card task-form__summary-card--placeholder">
          <Text type="secondary">Adjust depth or analyst mix to preview pricing.</Text>
        </div>
      )
    }

    const isFree = Boolean(quote.eligibleForFreeQuota)
    const numericAmount = Number(quote.totalAmount ?? 0)
    const amountDisplay = Number.isFinite(numericAmount)
      ? numericAmount.toFixed(2)
      : quote.totalAmount
    const currency = quote.currency || billingSummary?.currency || 'USD'

    return (
      <div
        className={`task-form__summary-card task-form__summary-card--quote ${
          isFree ? 'task-form__summary-card--quote-free' : ''
        }`}
      >
        <div className="task-form__summary-card-header">
          <div className="task-form__summary-card-title">
            {isFree ? 'Free Analysis' : 'Estimated Charge'}
          </div>
        </div>
        <div className="task-form__summary-card-amount">
          {isFree ? (
            <div className="task-form__free-badge">
              <span className="task-form__free-badge-text">FREE</span>
            </div>
          ) : (
            <>
              <span className="task-form__amount-value">{amountDisplay}</span>
              <span className="task-form__amount-currency">{currency}</span>
            </>
          )}
        </div>
        <Divider className="task-form__summary-card-divider" />
        <div className="task-form__summary-card-details">
          <Tag color={isFree ? 'green' : 'blue'}>
            {quote.researchDepth} depth
          </Tag>
          <Tag color={isFree ? 'green' : 'blue'}>
            {quote.analystCount} analyst{quote.analystCount !== 1 ? 's' : ''}
          </Tag>
        </div>
        {isFree && (
          <div className="task-form__summary-card-tip task-form__summary-card-tip--free">
            One free credit will be used for this analysis
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="task-form">
      <div className="task-form__hero">
        <div className="task-form__hero-icon">
          <RocketOutlined />
        </div>
        <div>
          <Title level={3} className="task-form__hero-title">
            New Market Analysis
          </Title>
          <Text type="secondary" className="task-form__hero-subtitle">
            Configure your analysis parameters. Our AI agents will handle the research and provide actionable insights.
          </Text>
        </div>
      </div>

      <div className="task-form__summary-grid">
        {renderBillingSummaryCard()}
        {renderQuoteCard()}
      </div>

      <Divider className="task-form__divider" />

      <Form
        form={form}
        layout="vertical"
        className="task-form__form"
        onFinish={handleSubmit}
        onValuesChange={handleValuesChange}
        initialValues={{
          analysisDate: dayjs(),
          researchDepth: 1,
          selectedAnalysts: ['market'],
        }}
        autoComplete="off"
      >
        <div className="task-form__field-grid">
          <Form.Item
            label="Ticker Symbol"
            name="ticker"
            rules={[
              { required: true, message: 'Please input ticker symbol.' },
              {
                pattern: /^[A-Za-z]{1,5}$/,
                message: 'Ticker must be 1-5 letters.',
              },
            ]}
          >
            <Input
              placeholder="e.g., NVDA, AAPL, TSLA"
              size="large"
              style={{ textTransform: 'uppercase' }}
            />
          </Form.Item>

          <Form.Item
            label="Analysis Date"
            name="analysisDate"
            rules={[{ required: true, message: 'Please select analysis date.' }]}
          >
            <DatePicker
              size="large"
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
            />
          </Form.Item>
        </div>

        <Form.Item
          label={(
            <div className="task-form__label">
              <span>Research Depth</span>
              <span className="task-form__label-hint">Higher depth provides more thorough analysis.</span>
            </div>
          )}
          name="researchDepth"
          rules={[{ required: true, message: 'Please select research depth.' }]}
        >
          <Select size="large" placeholder="Select research depth">
            {RESEARCH_DEPTH_OPTIONS.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label} — {option.description}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label={(
            <div className="task-form__label">
              <span>Analysts</span>
              <span className="task-form__label-hint">Select which specialists should contribute to the analysis.</span>
            </div>
          )}
          name="selectedAnalysts"
          rules={[
            {
              required: true,
              message: 'Please select at least one analyst.',
            },
          ]}
        >
          <Checkbox.Group options={analystOptions} className="task-form__checkbox-group" />
        </Form.Item>

        <Form.Item className="task-form__cta">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            size="large"
            block
            icon={<RocketOutlined />}
            className="task-form__cta-button"
          >
            {loading ? 'Starting analysis...' : (() => {
              // If quote is available and not free, show "Create Analysis & Pay" with amount
              if (quote && !quote.eligibleForFreeQuota) {
                const numericAmount = Number(quote.totalAmount ?? 0)
                const amountDisplay = Number.isFinite(numericAmount)
                  ? numericAmount.toFixed(2)
                  : quote.totalAmount
                const currency = quote.currency || billingSummary?.currency || 'USD'
                return `Create Analysis & Pay ${amountDisplay} ${currency}`
              }
              // Otherwise, just "Start Analysis"
              return 'Start Analysis'
            })()}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default TaskForm
