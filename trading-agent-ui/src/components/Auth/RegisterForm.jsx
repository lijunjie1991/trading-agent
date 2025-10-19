import { Form, Input, Button, Alert } from 'antd'
import { LockOutlined, MailOutlined } from '@ant-design/icons'

const RegisterForm = ({ onSubmit, loading, error }) => {
  const [form] = Form.useForm()

  const handleSubmit = (values) => {
    onSubmit(values)
  }

  return (
    <Form
      form={form}
      name="register"
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
          {
            min: 6,
            message: 'Password must be at least 6 characters!',
          },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="Password"
          autoComplete="new-password"
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
          prefix={<LockOutlined />}
          placeholder="Confirm Password"
          autoComplete="new-password"
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
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </Form.Item>
    </Form>
  )
}

export default RegisterForm
