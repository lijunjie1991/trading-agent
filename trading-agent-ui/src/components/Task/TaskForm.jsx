import { useEffect } from 'react'
import { Form, Input, DatePicker, Select, Checkbox, Button, Card, Typography, Space, Alert, Spin, Divider } from 'antd'
import { RocketOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { RESEARCH_DEPTH_OPTIONS } from '../../utils/constants'

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

  const renderBillingSummary = () => {
    if (billingLoading) {
      return (
        <Alert
          message="Loading billing information..."
          description={<Spin size="small" />}
          type="info"
          showIcon
        />
      )
    }

    if (!billingSummary) {
      return null
    }

    const remaining = billingSummary.freeQuotaRemaining ?? billingSummary.freeQuotaTotal
    const total = billingSummary.freeQuotaTotal ?? 0

    return (
      <Alert
        type={remaining > 0 ? 'success' : 'info'}
        showIcon
        message={remaining > 0 ? 'Free analysis credits available' : 'Free credits exhausted'}
        description={
          <Space direction="vertical" size={4} style={{ fontSize: 13 }}>
            <span>
              Free credits remaining: <strong>{remaining}</strong>{typeof total === 'number' ? ` / ${total}` : ''}
            </span>
            {typeof billingSummary.paidTaskCount === 'number' && (
              <span>
                Paid analyses completed: <strong>{billingSummary.paidTaskCount}</strong>
              </span>
            )}
          </Space>
        }
        style={{ marginBottom: 16 }}
      />
    )
  }

  const renderQuote = () => {
    if (quoteLoading) {
      return (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space><Spin size="small" /><span>Calculating estimated cost...</span></Space>
        </Card>
      )
    }

    if (!quote) {
      return (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Adjust analysis depth or analysts to preview pricing.
          </Text>
        </Card>
      )
    }

    const isFree = quote.eligibleForFreeQuota
    const numericAmount = Number(quote.totalAmount ?? 0)
    const amountDisplay = Number.isFinite(numericAmount) ? numericAmount.toFixed(2) : quote.totalAmount
    const currency = quote.currency || billingSummary?.currency || 'USD'

    return (
      <Card size="small" style={{ marginBottom: 16, borderColor: isFree ? '#34d399' : '#6366f1' }}>
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
          <Text strong style={{ color: isFree ? '#059669' : '#312e81' }}>
            {isFree ? 'This task can use a free analysis credit.' : 'Estimated charge for this task'}
          </Text>
          {!isFree && (
            <Title level={4} style={{ margin: 0, color: '#111827' }}>
              {amountDisplay} {currency}
            </Title>
          )}
          <Divider style={{ margin: '8px 0' }} />
          <Space wrap size={[12, 12]}> 
            <Text type="secondary" style={{ fontSize: 12 }}>
              Research Depth: <strong>{quote.researchDepth}</strong>
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Analysts Selected: <strong>{quote.analystCount}</strong>
            </Text>
          </Space>
        </Space>
      </Card>
    )
  }

  return (
    <Card>
      <Title level={3} style={{ marginBottom: 24 }}>
        <RocketOutlined /> Start New Analysis
      </Title>

      {renderBillingSummary()}
      {renderQuote()}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={handleValuesChange}
        initialValues={{
          analysisDate: dayjs(),
          researchDepth: 1,
          selectedAnalysts: ['market'],
        }}
        autoComplete="off"
      >
        <Form.Item
          label="Ticker Symbol"
          name="ticker"
          rules={[
            { required: true, message: 'Please input ticker symbol!' },
            {
              pattern: /^[A-Za-z]{1,5}$/,
              message: 'Ticker must be 1-5 letters!',
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
          rules={[{ required: true, message: 'Please select analysis date!' }]}
        >
          <DatePicker
            size="large"
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
          />
        </Form.Item>

        <Form.Item
          label="Research Depth"
          name="researchDepth"
          rules={[{ required: true, message: 'Please select research depth!' }]}
          extra="Higher depth means more thorough analysis but takes longer"
        >
          <Select size="large" placeholder="Select research depth">
            {RESEARCH_DEPTH_OPTIONS.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="Select Analysts"
          name="selectedAnalysts"
          rules={[
            {
              required: true,
              message: 'Please select at least one analyst!',
            },
          ]}
          extra="Select which analysts to include in the analysis"
        >
          <Checkbox.Group options={analystOptions} style={{ display: 'flex', flexDirection: 'column', gap: 8 }} />
        </Form.Item>

        <Form.Item style={{ marginTop: 32 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            size="large"
            block
            icon={<RocketOutlined />}
            style={{
              height: 50,
              fontSize: 16,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
            }}
          >
            {loading ? 'Starting Analysis...' : 'Start Analysis'}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default TaskForm
