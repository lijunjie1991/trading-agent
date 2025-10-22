import { useEffect, useRef, useState } from 'react'
import { Card, Statistic, Row, Col } from 'antd'
import { ToolOutlined, RobotOutlined, FileTextOutlined } from '@ant-design/icons'
import './ProcessingIndicator.css'

const StatsPanel = ({ stats, isProcessing }) => {
  const [animatingStats, setAnimatingStats] = useState({
    toolCalls: false,
    llmCalls: false,
    reports: false,
  })
  const prevStatsRef = useRef(stats)

  useEffect(() => {
    const prevStats = prevStatsRef.current
    const newAnimatingStats = {}

    // Detect changes in each stat
    if (prevStats.toolCalls !== stats.toolCalls) {
      newAnimatingStats.toolCalls = true
    }
    if (prevStats.llmCalls !== stats.llmCalls) {
      newAnimatingStats.llmCalls = true
    }
    if (prevStats.reports !== stats.reports) {
      newAnimatingStats.reports = true
    }

    // Trigger animation if any stat changed
    if (Object.keys(newAnimatingStats).length > 0) {
      setAnimatingStats(newAnimatingStats)

      // Reset animation after it completes
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

  const getValueClassName = (statName) => {
    return animatingStats[statName] ? 'stat-value-update' : ''
  }

  const getCardClassName = () => {
    return isProcessing ? 'shimmer' : ''
  }

  return (
    <Card className={getCardClassName()}>
      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <div className={animatingStats.toolCalls ? 'stat-card-pulse' : ''}>
            <Statistic
              title="Tool Calls"
              value={stats.toolCalls || 0}
              prefix={<ToolOutlined />}
              valueStyle={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
              className={getValueClassName('toolCalls')}
            />
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className={animatingStats.llmCalls ? 'stat-card-pulse' : ''}>
            <Statistic
              title="LLM Calls"
              value={stats.llmCalls || 0}
              prefix={<RobotOutlined />}
              valueStyle={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
              className={getValueClassName('llmCalls')}
            />
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className={animatingStats.reports ? 'stat-card-pulse' : ''}>
            <Statistic
              title="Reports"
              value={stats.reports || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
              className={getValueClassName('reports')}
            />
          </div>
        </Col>
      </Row>
    </Card>
  )
}

export default StatsPanel
