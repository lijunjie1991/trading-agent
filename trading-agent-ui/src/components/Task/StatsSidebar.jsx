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
import { RESEARCH_DEPTH_OPTIONS, PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from '../../utils/constants'
import './ProcessingIndicator.css'

const { Text } = Typography

const StatsSidebar = ({ task, stats, isProcessing, taskId }) => {
  const [animatingStats, setAnimatingStats] = useState({
    toolCalls: false,
    llmCalls: false,
    reports: false,
  })
  const prevStatsRef = useRef(stats)
  const paymentStatus = (task?.paymentStatus || task?.payment_status || '').toUpperCase()
  const billingAmountValue = task?.billingAmount ?? task?.billing_amount
  const billingCurrency = task?.billingCurrency || task?.billing_currency || 'USD'

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
              {(() => {
                const depth = task?.researchDepth || task?.research_depth
                const depthOption = RESEARCH_DEPTH_OPTIONS.find(option => option.value === depth)
                return depthOption ? depthOption.label : 'N/A'
              })()}
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

          {/* Payment Status */}
          {paymentStatus ? (
            <div>
              <Text type="secondary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>
                Payment Status
              </Text>
              <Tag color={PAYMENT_STATUS_COLORS[paymentStatus] || 'default'} style={{ margin: 0 }}>
                {PAYMENT_STATUS_LABELS[paymentStatus] || paymentStatus}
              </Tag>
              {paymentStatus !== 'FREE' && (
                <Text style={{ fontSize: 11, color: '#374151', display: 'block', marginTop: 4 }}>
                  Amount: {billingAmountValue != null ? `${Number(billingAmountValue).toFixed(2)} ${billingCurrency}` : 'Pending calculation'}
                </Text>
              )}
            </div>
          ) : null}

          {task?.errorMessage && paymentStatus === 'PAYMENT_FAILED' && (
            <Text type="danger" style={{ fontSize: 11 }}>
              {task.errorMessage}
            </Text>
          )}

          {paymentStatus ? (
            <Divider style={{ margin: '4px 0' }} />
          ) : null}

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
