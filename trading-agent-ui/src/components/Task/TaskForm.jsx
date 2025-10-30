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
  Divider,
  Row,
  Col,
  Space,
} from 'antd'
import { RocketOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { RESEARCH_DEPTH_OPTIONS } from '../../utils/constants'
import PricingCalculator from '../Pricing/PricingCalculator'
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


  return (
    <div className="task-form-wrapper">
      <Card className="task-form">
            <div className="task-form__hero">
              <div className="task-form__hero-icon">
                <RocketOutlined />
              </div>
              <div className="task-form__hero-content">
                <Title level={2} className="task-form__hero-title">
                  New Market Analysis
                </Title>
                <Text className="task-form__hero-subtitle">
                  Configure your analysis parameters. Our AI agents will handle the research and provide actionable insights.
                </Text>
              </div>
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

        {/* Pricing Summary - Integrated */}
        <div style={{ marginTop: 24, marginBottom: 0 }}>
          <PricingCalculator
            quote={quote}
            quoteLoading={quoteLoading}
            billingSummary={billingSummary}
            billingLoading={billingLoading}
          />
        </div>

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

          {/* Secure Payment Note */}
          {quote && !quote.eligibleForFreeQuota && (
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                💳 Secure payment via Stripe
              </Text>
            </div>
          )}
        </Form.Item>
      </Form>
      </Card>
    </div>
  )
}

export default TaskForm
