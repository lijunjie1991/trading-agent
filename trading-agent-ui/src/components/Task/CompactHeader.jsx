import { useState, useEffect, useRef } from 'react'
import { Card, Typography, Space, Tag, Button } from 'antd'
import {
  RobotOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { getStatusColor } from '../../utils/helpers'
import './ProcessingIndicator.css'

const { Title, Text } = Typography

const CompactHeader = ({ task, finalDecision, isProcessing, lastUpdateTime, onViewReports }) => {
  const [showCelebration, setShowCelebration] = useState(false)
  const prevStatusRef = useRef(task?.status)

  // Detect when task transitions to COMPLETED
  useEffect(() => {
    if (prevStatusRef.current === 'RUNNING' && task?.status === 'COMPLETED') {
      setShowCelebration(true)
      // Remove celebration animation after it completes
      setTimeout(() => {
        setShowCelebration(false)
      }, 1500)
    }
    prevStatusRef.current = task?.status
  }, [task?.status])
  const getProcessingInfo = () => {
    if (task?.status === 'RUNNING') {
      return {
        icon: <RobotOutlined className="spinning" style={{ fontSize: 16 }} />,
        text: 'AI is analyzing',
        showTypingDots: true,
        color: '#667eea',
      }
    }
    if (task?.status === 'PENDING') {
      return {
        icon: <ClockCircleOutlined className="pulse" style={{ fontSize: 16 }} />,
        text: 'Waiting to start',
        showTypingDots: false,
        color: '#f59e0b',
      }
    }
    return null
  }

  const processingInfo = getProcessingInfo()
  const timeSinceUpdate = lastUpdateTime
    ? Math.floor((Date.now() - new Date(lastUpdateTime).getTime()) / 1000)
    : 0

  const isCompleted = task?.status === 'COMPLETED'

  return (
    <Card
      className={showCelebration ? 'celebration-animation' : ''}
      style={{
        marginBottom: 24,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
      bodyStyle={{ padding: '24px 24px 20px 24px' }}
    >
      {/* Main Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          {/* Left: Ticker and Status */}
          <div style={{ flex: '1 1 auto' }}>
            <Space align="center" size={12} wrap>
              <Title level={2} style={{ margin: 0, color: '#fff', fontSize: '36px', fontWeight: 700 }}>
                {task?.ticker || 'N/A'}
              </Title>
              <Tag
                color={getStatusColor(task?.status)}
                style={{
                  fontSize: 14,
                  padding: '6px 16px',
                  fontWeight: 600,
                  borderRadius: 6,
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                {task?.status?.toUpperCase() || 'UNKNOWN'}
              </Tag>
              {/* View Reports Button - Integrated */}
              {isCompleted && onViewReports && (
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  onClick={onViewReports}
                  className={showCelebration ? 'success-pulse' : ''}
                  style={{
                    background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 15,
                    height: 40,
                    paddingLeft: 20,
                    paddingRight: 20,
                    boxShadow: '0 4px 12px rgba(72, 187, 120, 0.4)',
                    transition: 'all 0.3s ease',
                  }}
                  size="large"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(72, 187, 120, 0.5)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(72, 187, 120, 0.4)'
                  }}
                >
                  📊 View Reports
                </Button>
              )}
            </Space>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, display: 'block', marginTop: 8 }}>
              {task?.analysisDate || task?.analysis_date || 'N/A'}
            </Text>
          </div>

          {/* Right: Final Decision (if completed) */}
          {finalDecision && (task?.status === 'COMPLETED' || task?.status === 'FAILED') && (
            <div style={{ textAlign: 'right' }}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, display: 'block', marginBottom: 6 }}>
                Final Decision
              </Text>
              <Tag
                color={
                  finalDecision.toLowerCase().includes('buy')
                    ? 'success'
                    : finalDecision.toLowerCase().includes('sell')
                    ? 'error'
                    : 'warning'
                }
                style={{
                  fontSize: 24,
                  padding: '8px 24px',
                  fontWeight: 700,
                  borderRadius: 8,
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
              >
                {finalDecision}
              </Tag>
            </div>
          )}
        </div>
      </div>

      {/* Processing Indicator Bar (embedded at bottom) */}
      {isProcessing && processingInfo && (
        <div
          className="breathing"
          style={{
            marginTop: 16,
            paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <Space size={8} align="center">
            <div
              className="icon-glow"
              style={{
                color: '#fff',
                fontSize: 16,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 24,
                padding: '2px 4px 2px 6px',
                marginLeft: '4px'
              }}
            >
              {processingInfo.icon}
            </div>
            <Text strong style={{ color: '#fff', fontSize: 14 }}>
              {processingInfo.text}
            </Text>
            {processingInfo.showTypingDots && (
              <div className="typing-dots" style={{ color: '#fff', marginLeft: 4 }}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
          </Space>

          {timeSinceUpdate > 0 && (
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
              <SyncOutlined spin style={{ marginRight: 4 }} />
              Updated {timeSinceUpdate}s ago
            </Text>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {isProcessing && (
        <div className="progress-bar shimmer" style={{ bottom: 0, left: 0, right: 0 }}>
          <div className="progress-bar-fill" style={{ background: 'rgba(255,255,255,0.4)' }} />
        </div>
      )}
    </Card>
  )
}

export default CompactHeader
