import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Card, Typography, Space } from 'antd'
import LoginForm from '../components/Auth/LoginForm'
import { login, clearError } from '../store/slices/authSlice'

const { Title, Text } = Typography

const Login = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { loading, error, token } = useSelector((state) => state.auth)

  useEffect(() => {
    dispatch(clearError())
  }, [dispatch])

  useEffect(() => {
    if (token) {
      navigate('/dashboard')
    }
  }, [token, navigate])

  const handleLogin = async (credentials) => {
    const result = await dispatch(login(credentials))
    if (login.fulfilled.match(result)) {
      navigate('/dashboard')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 450,
          borderRadius: 12,
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}
        bodyStyle={{ padding: 40 }}
      >
        <Space direction="vertical" size={24} style={{ width: '100%', textAlign: 'center' }}>
          <div>
            <div
              style={{
                width: 80,
                height: 80,
                margin: '0 auto 16px',
                borderRadius: 16,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
              }}
            >
              <img
                src="/logo.png"
                alt="Logo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
            <Title level={2} style={{ margin: 0 }}>
              Quantum Husky
            </Title>
            <Text type="secondary">AI-Powered Trading Analysis Platform</Text>
          </div>

          <LoginForm onSubmit={handleLogin} loading={loading} error={error} />

          <Text type="secondary">
            Don't have an account? <Link to="/register">Register here</Link>
          </Text>
        </Space>
      </Card>
    </div>
  )
}

export default Login
