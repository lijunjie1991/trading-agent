import { Card, Tag, Typography, Space, Progress } from 'antd'
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  LineChartOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getStatusColor, formatDateTime, getDecisionBadgeStatus } from '../../utils/helpers'

const { Text } = Typography

const TaskCard = ({ task }) => {
  const navigate = useNavigate()

  const handleViewDetails = () => {
    const taskId = task.taskId || task.task_id
    if (!taskId) {
      console.error('TaskCard - Missing taskId!', task)
      return
    }
    navigate(`/tasks/${taskId}`)
  }

  const finalDecision = task.finalDecision || task.final_decision || task.decision
  const researchDepth = task.researchDepth || task.research_depth || 1
  const analysisDate = task.analysisDate || task.analysis_date
  const completedAt = task.completedAt || task.completed_at
  const errorMessage = task.errorMessage || task.error_message

  // 状态图标映射
  const statusIcons = {
    PENDING: <ClockCircleOutlined />,
    RUNNING: <SyncOutlined spin />,
    COMPLETED: <CheckCircleOutlined />,
    FAILED: <CloseCircleOutlined />,
  }

  // 深度描述映射
  const depthLabels = {
    1: 'Shallow',
    2: 'Medium',
    3: 'Deep',
    4: 'Very Deep',
    5: 'Maximum',
  }

  // 计算任务耗时
  const getDuration = () => {
    if (!completedAt) return null
    const created = new Date(task.createdAt || task.created_at)
    const completed = new Date(completedAt)
    const seconds = Math.floor((completed - created) / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }

  return (
    <Card
      hoverable
      onClick={handleViewDetails}
      style={{
        borderRadius: 16,
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        height: '100%',
        minHeight: 320,
        maxHeight: 320,
        display: 'flex',
        flexDirection: 'column',
      }}
      bodyStyle={{
        padding: 24,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.18)'
        e.currentTarget.style.transform = 'translateY(-6px)'
        e.currentTarget.style.borderColor = '#667eea'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.borderColor = '#e5e7eb'
      }}
    >
      {/* Header Section - Ticker & Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 4, lineHeight: 1 }}>
            {task.ticker}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Task ID: {(task.taskId || task.task_id || '').slice(0, 8)}...
          </Text>
        </div>
        <Tag
          icon={statusIcons[task.status]}
          color={getStatusColor(task.status)}
          style={{
            fontSize: 11,
            padding: '6px 12px',
            fontWeight: 600,
            borderRadius: 6,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            border: 'none',
            margin: 0,
          }}
        >
          {task.status}
        </Tag>
      </div>

      {/* Decision Badge - Always reserve space */}
      <div style={{ minHeight: 48, marginBottom: 16, display: 'flex', alignItems: 'center' }}>
        {finalDecision ? (
          <Tag
            color={getDecisionBadgeStatus(finalDecision)}
            style={{
              fontSize: 16,
              padding: '10px 18px',
              fontWeight: 700,
              borderRadius: 8,
              border: 'none',
              margin: 0,
            }}
          >
            📊 {finalDecision}
          </Tag>
        ) : task.status === 'RUNNING' ? (
          <div style={{ width: '100%' }}>
            <Progress percent={65} status="active" strokeColor="#667eea" showInfo={false} size="small" />
            <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
              Analyzing market data...
            </Text>
          </div>
        ) : task.status === 'FAILED' ? (
          <Text type="danger" style={{ fontSize: 13 }} ellipsis={{ tooltip: errorMessage }}>
            ⚠️ {errorMessage || 'Analysis failed'}
          </Text>
        ) : (
          <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>
            Waiting for analysis...
          </Text>
        )}
      </div>

      {/* Info Grid - Clean Label: Value Format */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          {/* Analysis Date */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: '#9ca3af', minWidth: 100 }}>
              Analysis Date:
            </Text>
            <Text style={{ fontSize: 12, color: '#111827', fontWeight: 500 }}>
              {analysisDate || 'N/A'}
            </Text>
          </div>

          {/* Created Time */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: '#9ca3af', minWidth: 100 }}>
              Created At:
            </Text>
            <Text style={{ fontSize: 12, color: '#4b5563' }}>
              {formatDateTime(task.createdAt || task.created_at)}
            </Text>
          </div>

          {/* Duration - Always show for consistency */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: '#9ca3af', minWidth: 100 }}>
              Duration:
            </Text>
            <Text style={{ fontSize: 12, color: getDuration() ? '#10b981' : '#9ca3af', fontWeight: getDuration() ? 600 : 400 }}>
              {getDuration() || 'N/A'}
            </Text>
          </div>

          {/* Analysts - Single line with ellipsis */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: '#9ca3af', minWidth: 100, flexShrink: 0 }}>
              Analysts:
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: '#4b5563',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1
              }}
              title={(task.selectedAnalysts || task.selected_analysts || []).join(', ')}
            >
              {(task.selectedAnalysts || task.selected_analysts || []).join(', ') || 'N/A'}
            </Text>
          </div>

          {/* Research Depth */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: '#9ca3af', minWidth: 100 }}>
              Research Depth:
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <div style={{ display: 'flex', gap: 3, minWidth: 70 }}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    style={{
                      width: 12,
                      height: 6,
                      borderRadius: 3,
                      background: level <= researchDepth ? '#667eea' : '#e5e7eb',
                      transition: 'all 0.3s',
                      boxShadow: level <= researchDepth ? '0 1px 2px rgba(102, 126, 234, 0.3)' : 'none',
                    }}
                  />
                ))}
              </div>
              <Text style={{ fontSize: 12, color: '#667eea', fontWeight: 600 }}>
                {depthLabels[researchDepth] || 'Shallow'}
              </Text>
            </div>
          </div>
        </Space>
      </div>
    </Card>
  )
}

export default TaskCard
