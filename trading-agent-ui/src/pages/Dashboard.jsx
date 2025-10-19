import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Card, Row, Col, Statistic, Button, Typography, Space, Empty } from 'antd'
import {
  PlusCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  CloseCircleOutlined,
  HistoryOutlined,
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
    dispatch(fetchTasks({ limit: 5 }))
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

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>
          Dashboard
        </Title>
        <Space>
          <Button
            type="primary"
            icon={<PlusCircleOutlined />}
            onClick={handleNewAnalysis}
            size="large"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
            }}
          >
            New Analysis
          </Button>
          <Button icon={<HistoryOutlined />} onClick={handleViewHistory} size="large">
            View History
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Tasks"
              value={taskStats.total || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#667eea' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Running"
              value={taskStats.running || 0}
              prefix={<LoadingOutlined />}
              valueStyle={{ color: '#ed8936' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Completed"
              value={taskStats.completed || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#48bb78' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Failed"
              value={taskStats.failed || 0}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#f56565' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Title level={4} style={{ margin: 0 }}>
            Recent Tasks
          </Title>
        }
        extra={
          tasks.length > 0 && (
            <Button type="link" onClick={handleViewHistory}>
              View All
            </Button>
          )
        }
      >
        {tasks.length === 0 ? (
          <Empty
            description={
              <Space direction="vertical" size={12}>
                <Text>No tasks yet</Text>
                <Button type="primary" icon={<PlusCircleOutlined />} onClick={handleNewAnalysis}>
                  Start Your First Analysis
                </Button>
              </Space>
            }
          />
        ) : (
          <Row gutter={[16, 16]}>
            {tasks.map((task) => (
              <Col xs={24} sm={12} md={8} lg={6} key={task.task_id}>
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
