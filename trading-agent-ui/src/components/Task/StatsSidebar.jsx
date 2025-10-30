import { Card, Statistic, Row, Col, Typography, Space, Tag, Divider, Popover } from 'antd'
import {
  ToolOutlined,
  RobotOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  QuestionCircleOutlined,
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
  const hasPaidAmount = billingAmountValue != null && billingAmountValue > 0 && paymentStatus === 'PAID'

  const formatBillingAmount = (amount, currency) => {
    if (amount === undefined || amount === null) return null
    const numeric = typeof amount === 'number' ? amount : Number(amount)
    if (Number.isNaN(numeric)) return null
    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
    })
    return formatter.format(numeric)
  }

  const renderPricingDetails = () => {
    const depthValue = task?.researchDepth ?? task?.research_depth
    const depthOption = RESEARCH_DEPTH_OPTIONS.find((option) => option.value === depthValue)
    const analysts = task?.selectedAnalysts ?? task?.selected_analysts ?? []
    const pricingBreakdown = task?.pricingBreakdown

    return (
      <div style={{
        maxWidth: 280,
        padding: '16px',
        background: 'rgba(17, 24, 39, 0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: 12,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}>
        <div style={{ marginBottom: 14 }}>
          <Text strong style={{ fontSize: 14, color: '#f9fafb', letterSpacing: '-0.01em' }}>
            💰 Pricing Breakdown
          </Text>
        </div>
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>Research Depth</Text>
            <Text strong style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.9)' }}>
              {depthOption?.label || 'N/A'}
            </Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>Analysts Selected</Text>
            <Text strong style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.9)' }}>
              {analysts.length}
            </Text>
          </div>
          {pricingBreakdown && (
            <>
              <div style={{
                height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
                margin: '4px 0'
              }} />
              <div>
                <Text style={{
                  fontSize: 11,
                  color: 'rgba(255, 255, 255, 0.5)',
                  display: 'block',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Calculation
                </Text>
                <div style={{
                  fontSize: 11,
                  color: '#a5b4fc',
                  fontFamily: 'SF Mono, Monaco, Courier New, monospace',
                  background: 'rgba(99, 102, 241, 0.15)',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  lineHeight: 1.5
                }}>
                  {pricingBreakdown.calculationFormula ||
                    `$${pricingBreakdown.basePrice} × ${pricingBreakdown.researchDepthFactor} × ${pricingBreakdown.analystFactor}`}
                </div>
              </div>
            </>
          )}
          <div style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
            margin: '4px 0'
          }} />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 0 4px'
          }}>
            <Text strong style={{ fontSize: 13, color: '#f9fafb' }}>Total Amount</Text>
            <Text strong style={{
              fontSize: 16,
              color: '#a5b4fc',
              letterSpacing: '-0.02em',
              textShadow: '0 0 20px rgba(165, 180, 252, 0.3)'
            }}>
              {formatBillingAmount(billingAmountValue, billingCurrency)}
            </Text>
          </div>
        </Space>
      </div>
    )
  }

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
      {/* Cost Display - Compact */}
      {hasPaidAmount && (
        <div style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: 10,
          padding: '12px 14px',
          marginBottom: 12,
          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.8)', display: 'block', marginBottom: 2 }}>
                Analysis Cost
              </Text>
              <Text strong style={{ fontSize: 18, color: '#fff', letterSpacing: '-0.02em' }}>
                {formatBillingAmount(billingAmountValue, billingCurrency)}
              </Text>
            </div>
            <Popover
              content={renderPricingDetails()}
              title={null}
              trigger="click"
              placement="bottomRight"
              overlayInnerStyle={{
                padding: 0,
                background: 'transparent',
                boxShadow: 'none'
              }}
            >
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
              }}
              >
                <QuestionCircleOutlined style={{ fontSize: 14, color: '#fff' }} />
              </div>
            </Popover>
          </div>
        </div>
      )}

      {/* Stats Card */}
      <Card
        className="stats-sidebar"
        title={<Text strong style={{ fontSize: 13 }}>Live Statistics</Text>}
        style={{ marginBottom: 12 }}
        className={isProcessing ? 'shimmer stats-sidebar' : 'stats-sidebar'}
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
      <Card className="stats-sidebar" title={<Text strong style={{ fontSize: 13 }}>Task Details</Text>} bodyStyle={{ padding: '12px' }}>
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
