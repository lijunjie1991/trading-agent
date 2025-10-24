import { useState, useEffect, useRef } from 'react'
import { Card, Typography, Space, Tag, Button, Badge } from 'antd'
import {
  RobotOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  FileTextOutlined,
  ThunderboltFilled,
  TrophyOutlined,
} from '@ant-design/icons'
import { getStatusColor } from '../../utils/helpers'
import './ProcessingIndicator.css'

const { Title, Text } = Typography

const CompactHeader = ({ task, finalDecision, isProcessing, lastUpdateTime, onViewReports }) => {
  const [showCelebration, setShowCelebration] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const cardRef = useRef(null)
  const prevStatusRef = useRef(task?.status)

  // Detect when task transitions to COMPLETED
  useEffect(() => {
    if (prevStatusRef.current === 'RUNNING' && task?.status === 'COMPLETED') {
      setShowCelebration(true)
      setTimeout(() => {
        setShowCelebration(false)
      }, 2000)
    }
    prevStatusRef.current = task?.status
  }, [task?.status])

  // Mouse tracking for interactive gradient effect
  const handleMouseMove = (e) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setMousePosition({ x, y })
  }

  const getProcessingInfo = () => {
    if (task?.status === 'RUNNING') {
      return {
        icon: <RobotOutlined className="spinning" style={{ fontSize: 18 }} />,
        text: 'AI Analysis in Progress',
        showTypingDots: true,
        color: '#667eea',
        badge: 'LIVE',
      }
    }
    if (task?.status === 'PENDING') {
      return {
        icon: <ClockCircleOutlined className="pulse" style={{ fontSize: 18 }} />,
        text: 'Queued for Processing',
        showTypingDots: false,
        color: '#f59e0b',
        badge: 'PENDING',
      }
    }
    return null
  }

  const processingInfo = getProcessingInfo()
  const timeSinceUpdate = lastUpdateTime
    ? Math.floor((Date.now() - new Date(lastUpdateTime).getTime()) / 1000)
    : 0

  const isCompleted = task?.status === 'COMPLETED'
  const isFailed = task?.status === 'FAILED'

  // Get decision emoji and styling
  const getDecisionStyle = () => {
    if (!finalDecision) return null

    const decision = finalDecision.toLowerCase()
    if (decision.includes('buy')) {
      return { emoji: '📈', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', text: 'BUY' }
    } else if (decision.includes('sell')) {
      return { emoji: '📉', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', text: 'SELL' }
    } else {
      return { emoji: '⏸️', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', text: 'HOLD' }
    }
  }

  const decisionStyle = getDecisionStyle()

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      style={{
        position: 'relative',
        marginBottom: 32,
        borderRadius: 24,
        overflow: 'hidden',
      }}
    >
      {/* Animated Background with Glass Effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: isCompleted
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #48bb78 100%)'
            : isFailed
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #ef4444 100%)'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          opacity: 0.95,
          transition: 'all 0.6s ease',
        }}
      />

      {/* Interactive Gradient Overlay */}
      {!isProcessing && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(255,255,255,0.2) 0%, transparent 50%)`,
            pointerEvents: 'none',
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* Celebration Confetti Effect */}
      {showCelebration && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)',
            animation: 'pulse 0.6s ease-in-out',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      )}

      {/* Glass Card Container */}
      <Card
        bordered={false}
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          position: 'relative',
          zIndex: 1,
        }}
        bodyStyle={{ padding: '32px' }}
      >
        {/* Main Content Container */}
        <div style={{ position: 'relative', zIndex: 3 }}>
          {/* Top Row: Ticker, Status & Decision */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 24,
          }}>
            {/* Left Section: Ticker & Status */}
            <div style={{ flex: '1 1 auto', minWidth: 280 }}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {/* Ticker with Status Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <Title
                    level={1}
                    style={{
                      margin: 0,
                      color: '#fff',
                      fontSize: '48px',
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                      textShadow: '0 2px 12px rgba(0,0,0,0.2)',
                      lineHeight: 1,
                    }}
                  >
                    {task?.ticker || 'N/A'}
                  </Title>

                  {/* Enhanced Status Tag */}
                  <Badge
                    status={isCompleted ? 'success' : isFailed ? 'error' : 'processing'}
                    text={
                      <Tag
                        style={{
                          fontSize: 13,
                          padding: '6px 18px',
                          fontWeight: 700,
                          borderRadius: 20,
                          border: 'none',
                          background: 'rgba(255, 255, 255, 0.25)',
                          backdropFilter: 'blur(10px)',
                          color: '#fff',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {task?.status || 'UNKNOWN'}
                      </Tag>
                    }
                  />
                </div>

                {/* Analysis Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ThunderboltFilled style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }} />
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: 15,
                      fontWeight: 500,
                      letterSpacing: '0.02em',
                    }}
                  >
                    Analysis Date: {task?.analysisDate || task?.analysis_date || 'N/A'}
                  </Text>
                </div>

                {/* View Reports Button - Prominently Displayed */}
                {isCompleted && onViewReports && (
                  <Button
                    type="primary"
                    icon={<FileTextOutlined style={{ fontSize: 18 }} />}
                    onClick={onViewReports}
                    className={showCelebration ? 'success-pulse' : ''}
                    size="large"
                    style={{
                      height: 48,
                      paddingLeft: 28,
                      paddingRight: 28,
                      fontSize: 16,
                      fontWeight: 700,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4), inset 0 -2px 0 rgba(0,0,0,0.1)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      marginTop: 4,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'
                      e.currentTarget.style.boxShadow = '0 12px 32px rgba(16, 185, 129, 0.5)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.4)'
                    }}
                  >
                    <TrophyOutlined style={{ fontSize: 18, marginRight: 8 }} />
                    View Complete Analysis
                  </Button>
                )}
              </Space>
            </div>

            {/* Right Section: Final Decision Display */}
            {decisionStyle && (isCompleted || isFailed) && (
              <div
                style={{
                  textAlign: 'right',
                  animation: showCelebration ? 'bounceIn 0.6s ease-out' : 'none',
                }}
              >
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'block',
                    marginBottom: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  Trading Decision
                </Text>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '16px 28px',
                    borderRadius: 16,
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  }}
                >
                  <span style={{ fontSize: 36 }}>{decisionStyle.emoji}</span>
                  <div style={{ textAlign: 'left' }}>
                    <Text
                      style={{
                        color: '#fff',
                        fontSize: 28,
                        fontWeight: 800,
                        display: 'block',
                        lineHeight: 1,
                        textShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      }}
                    >
                      {decisionStyle.text}
                    </Text>
                    <Text
                      style={{
                        color: 'rgba(255,255,255,0.8)',
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'block',
                        marginTop: 4,
                      }}
                    >
                      Recommended
                    </Text>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Processing Status Bar */}
          {isProcessing && processingInfo && (
            <div
              style={{
                marginTop: 20,
                paddingTop: 20,
                borderTop: '1px solid rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <Space size={12} align="center">
                <Badge
                  count={processingInfo.badge}
                  style={{
                    background: 'rgba(255, 255, 255, 0.3)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 10,
                    height: 20,
                    lineHeight: '20px',
                    borderRadius: 10,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}
                />
                <div
                  className="icon-glow"
                  style={{
                    color: '#fff',
                    fontSize: 18,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {processingInfo.icon}
                </div>
                <Text strong style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>
                  {processingInfo.text}
                </Text>
                {processingInfo.showTypingDots && (
                  <div className="typing-dots" style={{ marginLeft: 4 }}>
                    <span style={{ background: '#fff' }}></span>
                    <span style={{ background: '#fff' }}></span>
                    <span style={{ background: '#fff' }}></span>
                  </div>
                )}
              </Space>

              {timeSinceUpdate > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 16px',
                    borderRadius: 20,
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <SyncOutlined spin style={{ color: '#fff', fontSize: 14 }} />
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
                    Updated {timeSinceUpdate}s ago
                  </Text>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Animated Progress Bar */}
      {isProcessing && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'rgba(255,255,255,0.2)',
            overflow: 'hidden',
            borderRadius: '0 0 24px 24px',
          }}
        >
          <div
            className="progress-bar-fill"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
              animation: 'shimmer 2s infinite',
            }}
          />
        </div>
      )}
    </div>
  )
}

export default CompactHeader
