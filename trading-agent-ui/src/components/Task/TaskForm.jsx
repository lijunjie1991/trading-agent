import { Form, Input, DatePicker, Select, Checkbox, Button, Card, Typography, Alert, Space } from 'antd'
import { RocketOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { RESEARCH_DEPTH_OPTIONS } from '../../utils/constants'
import { formatCurrency } from '../../utils/helpers'

const { Title } = Typography
const { Option } = Select

const TaskForm = ({ onSubmit, loading, onValuesChange, priceQuote, billingProfile }) => {
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

  return (
    <Card>
      <Title level={3} style={{ marginBottom: 24 }}>
        <RocketOutlined /> Start New Analysis
      </Title>

      <Space direction="vertical" size={12} style={{ display: 'block', marginBottom: 16 }}>
        {billingProfile && (
          <Alert
            type={billingProfile.freeTasksRemaining > 0 ? 'success' : 'warning'}
            showIcon
            message={`Free tasks remaining: ${billingProfile.freeTasksRemaining ?? 0} / ${billingProfile.freeTasksTotal ?? 0}`}
            description={billingProfile.freeTasksRemaining > 0
              ? 'This task will run within your free quota.'
              : 'Free quota exhausted. New tasks will incur charges based on the selected configuration.'}
          />
        )}

        {priceQuote && (
          <Alert
            type={priceQuote.freeQuotaAvailable ? 'info' : 'warning'}
            showIcon
            message={priceQuote.freeQuotaAvailable
              ? 'This configuration still consumes free quota.'
              : `Estimated cost: ${formatCurrency(priceQuote.amountCents, priceQuote.currency)}`}
            description={priceQuote.pricingBreakdown && (
              <span style={{ display: 'block' }}>
                Depth multiplier: {priceQuote.pricingBreakdown.depthMultiplier} ×, analysts selected: {priceQuote.pricingBreakdown.analystCount}
              </span>
            )}
          />
        )}
      </Space>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={onValuesChange}
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
