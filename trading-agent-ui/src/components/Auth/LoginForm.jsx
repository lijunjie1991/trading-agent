import { Form, Input, Button, Alert } from 'antd'
import { MailOutlined, LockOutlined } from '@ant-design/icons'

const LoginForm = ({ onSubmit, loading, error }) => {
  const [form] = Form.useForm()

  const handleSubmit = (values) => {
    onSubmit(values)
  }

  return (
    <Form
      form={form}
      name="login"
      onFinish={handleSubmit}
      size="large"
      autoComplete="off"
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
          prefix={<MailOutlined />}
          placeholder="Email"
          autoComplete="email"
        />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[
          {
            required: true,
            message: 'Please input your password!',
          },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="Password"
          autoComplete="current-password"
        />
      </Form.Item>

      <Form.Item>
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
          {loading ? 'Logging in...' : 'Log in'}
        </Button>
      </Form.Item>
    </Form>
  )
}

export default LoginForm
