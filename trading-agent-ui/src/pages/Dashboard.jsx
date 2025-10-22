import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Card, Row, Col, Button, Typography, Space, Empty, Divider } from 'antd'
import {
  PlusCircleOutlined,
  RocketOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { fetchTaskStats, fetchTasks } from '../store/slices/taskSlice'
import TaskCard from '../components/Task/TaskCard'
import Loading from '../components/Common/Loading'

const { Title, Text } = Typography

const Dashboard = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { taskStats, tasks, loading } = useSelector((state) => state.task)

  useEffect(() => {
    dispatch(fetchTaskStats())
    dispatch(fetchTasks({ limit: 6 }))
  }, [dispatch])

  const handleNewAnalysis = () => {
    navigate('/tasks/new')
  }

  const handleViewHistory = () => {
    navigate('/tasks')
  }

  if (loading) {
    return <Loading />
  }

  // Calculate success rate
  const successRate = taskStats.total > 0
    ? Math.round((taskStats.completed / taskStats.total) * 100)
    : 0

  return (
    <div>
      {/* Hero Section */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 12,
          padding: '48px',
          marginBottom: 32,
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
        }}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <Space direction="vertical" size={8}>
              <Title level={1} style={{ color: '#fff', margin: 0, fontSize: '36px' }}>
                Welcome to Quantum Husky
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
                AI-powered trading analysis at your fingertips
              </Text>
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              size="large"
              icon={<RocketOutlined />}
              onClick={handleNewAnalysis}
              style={{
                height: 56,
                fontSize: 18,
                padding: '0 32px',
                background: '#fff',
                color: '#667eea',
                border: 'none',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              Start New Analysis
            </Button>
          </Col>
        </Row>
      </div>

      {/* Stats Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)',
            }}
          >
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 500 }}>
                Total Analyses
              </Text>
              <Title level={2} style={{ color: '#fff', margin: '8px 0', fontSize: '36px', fontWeight: 700 }}>
                {taskStats.total || 0}
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                All time
              </Text>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              border: '2px solid #f59e0b',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)',
            }}
          >
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Space>
                <ClockCircleOutlined style={{ fontSize: 20, color: '#f59e0b' }} />
                <Text style={{ color: '#78716c', fontSize: 14, fontWeight: 500 }}>
                  In Progress
                </Text>
              </Space>
              <Title level={2} style={{ color: '#292524', margin: '8px 0', fontSize: '36px', fontWeight: 700 }}>
                {(taskStats.pending || 0) + (taskStats.running || 0)}
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {taskStats.pending || 0} pending · {taskStats.running || 0} running
              </Text>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              border: '2px solid #10b981',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)',
            }}
          >
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Space>
                <CheckCircleOutlined style={{ fontSize: 20, color: '#10b981' }} />
                <Text style={{ color: '#78716c', fontSize: 14, fontWeight: 500 }}>
                  Completed
                </Text>
              </Space>
              <Title level={2} style={{ color: '#292524', margin: '8px 0', fontSize: '36px', fontWeight: 700 }}>
                {taskStats.completed || 0}
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Successfully analyzed
              </Text>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              border: '2px solid #8b5cf6',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.1)',
            }}
          >
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Space>
                <TrophyOutlined style={{ fontSize: 20, color: '#8b5cf6' }} />
                <Text style={{ color: '#78716c', fontSize: 14, fontWeight: 500 }}>
                  Success Rate
                </Text>
              </Space>
              <Title level={2} style={{ color: '#292524', margin: '8px 0', fontSize: '36px', fontWeight: 700 }}>
                {successRate}%
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {taskStats.failed || 0} failed
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Recent Tasks Section */}
      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
        bodyStyle={{ padding: 32 }}
      >
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>
            Recent Analyses
          </Title>
          {tasks.length > 0 && (
            <Button type="link" onClick={handleViewHistory} style={{ fontSize: 15 }}>
              View All →
            </Button>
          )}
        </div>

        {tasks.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Space direction="vertical" size={16}>
                  <Text style={{ fontSize: 16, color: '#78716c' }}>
                    No analyses yet. Start your first stock analysis now!
                  </Text>
                  <Button
                    type="primary"
                    size="large"
                    icon={<PlusCircleOutlined />}
                    onClick={handleNewAnalysis}
                    style={{
                      height: 48,
                      padding: '0 32px',
                      fontSize: 16,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                    }}
                  >
                    Create First Analysis
                  </Button>
                </Space>
              }
            />
          </div>
        ) : (
          <Row gutter={[24, 24]}>
            {tasks.map((task) => (
              <Col xs={24} sm={12} lg={8} key={task.taskId || task.task_id || task.id}>
                <TaskCard task={task} />
              </Col>
            ))}
          </Row>
        )}
      </Card>
    </div>
  )
}

export default Dashboard
