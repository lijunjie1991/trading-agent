import { Card, Statistic, Row, Col, Typography, Space, Tag, Divider } from 'antd'
import {
  ToolOutlined,
  RobotOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import { useEffect, useRef, useState } from 'react'
import { formatDateTime } from '../../utils/helpers'
import './ProcessingIndicator.css'

const { Text } = Typography

const StatsSidebar = ({ task, stats, isProcessing, taskId }) => {
  const [animatingStats, setAnimatingStats] = useState({
    toolCalls: false,
    llmCalls: false,
    reports: false,
  })
  const prevStatsRef = useRef(stats)

  useEffect(() => {
    const prevStats = prevStatsRef.current
    const newAnimatingStats = {}

    if (prevStats.toolCalls !== stats.toolCalls) {
      newAnimatingStats.toolCalls = true
    }
    if (prevStats.llmCalls !== stats.llmCalls) {
      newAnimatingStats.llmCalls = true
    }
    if (prevStats.reports !== stats.reports) {
      newAnimatingStats.reports = true
    }

    if (Object.keys(newAnimatingStats).length > 0) {
      setAnimatingStats(newAnimatingStats)
      setTimeout(() => {
        setAnimatingStats({
          toolCalls: false,
          llmCalls: false,
          reports: false,
        })
      }, 600)
    }

    prevStatsRef.current = stats
  }, [stats])

  return (
    <div style={{ position: 'sticky', top: 24 }}>
      {/* Stats Card */}
      <Card
        title={<Text strong style={{ fontSize: 13 }}>Live Statistics</Text>}
        style={{ marginBottom: 12 }}
        className={isProcessing ? 'shimmer' : ''}
        bodyStyle={{ padding: '12px' }}
      >
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div className={animatingStats.toolCalls ? 'stat-card-pulse' : ''} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space size={6}>
              <ToolOutlined style={{ fontSize: 14, color: '#667eea' }} />
              <Text style={{ fontSize: 12, color: '#78716c' }}>Tool Calls</Text>
            </Space>
            <Text
              strong
              style={{ fontSize: 18, color: '#667eea' }}
              className={animatingStats.toolCalls ? 'stat-value-update' : ''}
            >
              {stats.toolCalls || 0}
            </Text>
          </div>

          <Divider style={{ margin: '4px 0' }} />

          <div className={animatingStats.llmCalls ? 'stat-card-pulse' : ''} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space size={6}>
              <RobotOutlined style={{ fontSize: 14, color: '#8b5cf6' }} />
              <Text style={{ fontSize: 12, color: '#78716c' }}>LLM Calls</Text>
            </Space>
            <Text
              strong
              style={{ fontSize: 18, color: '#8b5cf6' }}
              className={animatingStats.llmCalls ? 'stat-value-update' : ''}
            >
              {stats.llmCalls || 0}
            </Text>
          </div>

          <Divider style={{ margin: '4px 0' }} />

          <div className={animatingStats.reports ? 'stat-card-pulse' : ''} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space size={6}>
              <FileTextOutlined style={{ fontSize: 14, color: '#10b981' }} />
              <Text style={{ fontSize: 12, color: '#78716c' }}>Reports</Text>
            </Space>
            <Text
              strong
              style={{ fontSize: 18, color: '#10b981' }}
              className={animatingStats.reports ? 'stat-value-update' : ''}
            >
              {stats.reports || 0}
            </Text>
          </div>
        </Space>
      </Card>

      {/* Metadata Card */}
      <Card title={<Text strong style={{ fontSize: 13 }}>Task Details</Text>} bodyStyle={{ padding: '12px' }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          {/* Task ID */}
          <div>
            <Text type="secondary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 2 }}>
              Task ID
            </Text>
            <Text style={{ fontSize: 11, wordBreak: 'break-all' }}>
              {task?.taskId || taskId}
            </Text>
          </div>

          <Divider style={{ margin: '4px 0' }} />

          {/* Research Depth */}
          <div>
            <Text type="secondary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 2 }}>
              Research Depth
            </Text>
            <Text style={{ fontSize: 11 }}>
              Level {task?.researchDepth || task?.research_depth || 'N/A'}
            </Text>
          </div>

          <Divider style={{ margin: '4px 0' }} />

          {/* Created */}
          <div>
            <Space size={4}>
              <CalendarOutlined style={{ fontSize: 10, color: '#78716c' }} />
              <Text type="secondary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Created
              </Text>
            </Space>
            <Text style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
              {task?.createdAt
                ? formatDateTime(task.createdAt)
                : task?.created_at
                ? formatDateTime(task.created_at)
                : 'N/A'}
            </Text>
          </div>

          <Divider style={{ margin: '4px 0' }} />

          {/* Completed */}
          <div>
            <Space size={4}>
              <ClockCircleOutlined style={{ fontSize: 10, color: '#78716c' }} />
              <Text type="secondary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Completed
              </Text>
            </Space>
            <Text style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
              {task?.completedAt
                ? formatDateTime(task.completedAt)
                : task?.completed_at
                ? formatDateTime(task.completed_at)
                : isProcessing ? (
                  <Text type="secondary" italic style={{ fontSize: 11 }}>In Progress...</Text>
                ) : 'N/A'}
            </Text>
          </div>

          <Divider style={{ margin: '4px 0' }} />

          {/* Selected Analysts */}
          <div>
            <Text type="secondary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>
              Analysts
            </Text>
            <Space wrap size={[4, 4]}>
              {(task?.selectedAnalysts || task?.selected_analysts || []).map((analyst, idx) => (
                <Tag key={idx} color="blue" style={{ margin: 0, fontSize: 10, padding: '2px 6px' }}>
                  {analyst}
                </Tag>
              ))}
            </Space>
          </div>
        </Space>
      </Card>
    </div>
  )
}

export default StatsSidebar
