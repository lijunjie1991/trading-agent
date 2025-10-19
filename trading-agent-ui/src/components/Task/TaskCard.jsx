import { Card, Tag, Typography, Space, Button } from 'antd'
import { EyeOutlined, ClockCircleOutlined, RocketOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getStatusColor, formatDateTime, truncateTaskId, getDecisionBadgeStatus } from '../../utils/helpers'

const { Text, Title } = Typography

const TaskCard = ({ task }) => {
  const navigate = useNavigate()

  const handleViewDetails = () => {
    navigate(`/tasks/${task.task_id}`)
  }

  return (
    <Card
      hoverable
      style={{
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
      bodyStyle={{ padding: 20 }}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {task.ticker}
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ID: {truncateTaskId(task.task_id)}
            </Text>
          </div>
          <Tag color={getStatusColor(task.status)} style={{ marginLeft: 8 }}>
            {task.status?.toUpperCase()}
          </Tag>
        </div>

        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Text type="secondary">
            <ClockCircleOutlined /> {formatDateTime(task.created_at)}
          </Text>
          <Text type="secondary">
            Analysts: {task.selected_analysts?.join(', ') || 'N/A'}
          </Text>
          <Text type="secondary">
            Research Depth: {task.research_depth || 1}
          </Text>
        </Space>

        {task.decision && (
          <div>
            <Tag color={getDecisionBadgeStatus(task.decision)} style={{ fontSize: 13 }}>
              Decision: {task.decision}
            </Tag>
          </div>
        )}

        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={handleViewDetails}
          block
          style={{
            marginTop: 8,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
          }}
        >
          View Details
        </Button>
      </Space>
    </Card>
  )
}

export default TaskCard
