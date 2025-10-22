import { Space, Typography, Badge } from 'antd'
import {
  LoadingOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import './ProcessingIndicator.css'

const { Text } = Typography

const ProcessingIndicator = ({ status, lastUpdateTime }) => {
  if (status !== 'RUNNING' && status !== 'PENDING') {
    return null
  }

  const getStatusConfig = () => {
    if (status === 'RUNNING') {
      return {
        icon: <RobotOutlined className="processing-icon spinning" />,
        text: 'AI Agent is analyzing...',
        subText: 'Real-time data streaming',
        color: '#667eea',
        badgeStatus: 'processing',
      }
    }
    return {
      icon: <ClockCircleOutlined className="processing-icon pulse" />,
      text: 'Task pending...',
      subText: 'Waiting for processing',
      color: '#f59e0b',
      badgeStatus: 'warning',
    }
  }

  const config = getStatusConfig()
  const timeSinceUpdate = lastUpdateTime
    ? Math.floor((Date.now() - new Date(lastUpdateTime).getTime()) / 1000)
    : 0

  return (
    <div className="processing-indicator-container">
      <div className="processing-indicator-content">
        <div className="pulse-ring" style={{ borderColor: config.color }} />
        <Space size={16} align="center">
          <div className="icon-wrapper" style={{ color: config.color }}>
            {config.icon}
          </div>
          <div>
            <Space align="center" size={8}>
              <Text strong style={{ fontSize: 16, color: config.color }}>
                {config.text}
              </Text>
              <Badge status={config.badgeStatus} />
            </Space>
            <div style={{ marginTop: 4 }}>
              <Space split={<Text type="secondary">•</Text>} size={8}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {config.subText}
                </Text>
                {timeSinceUpdate > 0 && (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    <SyncOutlined spin /> Last update {timeSinceUpdate}s ago
                  </Text>
                )}
              </Space>
            </div>
          </div>
        </Space>
      </div>
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ background: config.color }} />
      </div>
    </div>
  )
}

export default ProcessingIndicator
