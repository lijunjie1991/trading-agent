import { Form, Input, Button, Alert, Checkbox } from 'antd'
import { LockOutlined, MailOutlined, FileTextOutlined } from '@ant-design/icons'

const RegisterForm = ({ onSubmit, loading, error }) => {
  const [form] = Form.useForm()

  const handleSubmit = (values) => {
    onSubmit(values)
  }

  const handleDisclaimerClick = (e) => {
    e.preventDefault()
    // Open PDF directly in new window
    window.open('/docs/disclaimer.pdf', '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <Form
        form={form}
        name="register"
        onFinish={handleSubmit}
        size="large"
        autoComplete="off"
        layout="vertical"
      >
        {error && (
          <Form.Item>
            <Alert message={error} type="error" showIcon closable />
          </Form.Item>
        )}

        <Form.Item
          name="email"
          rules={[
            {
              required: true,
              message: 'Please input your email!',
            },
            {
              type: 'email',
              message: 'Please enter a valid email!',
            },
          ]}
        >
          <Input
            prefix={<MailOutlined style={{ marginRight: 8 }} />}
            placeholder="Email"
            autoComplete="email"
            style={{ paddingLeft: 12 }}
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[
            {
              required: true,
              message: 'Please input your password!',
            },
            {
              min: 6,
              message: 'Password must be at least 6 characters!',
            },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ marginRight: 8 }} />}
            placeholder="Password"
            autoComplete="new-password"
            style={{ paddingLeft: 12 }}
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            {
              required: true,
              message: 'Please confirm your password!',
            },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('Passwords do not match!'))
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ marginRight: 8 }} />}
            placeholder="Confirm Password"
            autoComplete="new-password"
            style={{ paddingLeft: 12 }}
          />
        </Form.Item>

        <Form.Item
          name="agreeToTerms"
          valuePropName="checked"
          rules={[
            {
              required: true,
              message: 'Please read and agree to the disclaimer to continue registration!',
            },
          ]}
          style={{ marginBottom: 16 }}
        >
          <Checkbox
            style={{
              fontSize: 14,
              lineHeight: 1.4,
              textAlign: 'left',
              width: '100%'
            }}
          >
            <span style={{ color: 'rgba(0, 0, 0, 0.85)' }}>
              I have read and agree to the{' '}
              <span
                onClick={handleDisclaimerClick}
                style={{
                  color: 'rgba(0, 0, 0, 0.85)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#667eea'
                  e.target.style.textDecoration = 'underline'
                  e.target.style.textDecorationStyle = 'solid'
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = 'rgba(0, 0, 0, 0.85)'
                  e.target.style.textDecoration = 'underline'
                }}
              >
                Disclaimer
              </span>
            </span>
          </Checkbox>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            style={{
              height: 45,
              fontSize: 16,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
            }}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
        </Form.Item>
      </Form>
    </>
  )
}

export default RegisterForm
