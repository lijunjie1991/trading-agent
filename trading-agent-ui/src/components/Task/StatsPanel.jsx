import { Card, Statistic, Row, Col } from 'antd'
import { ToolOutlined, RobotOutlined, FileTextOutlined } from '@ant-design/icons'

const StatsPanel = ({ stats }) => {
  return (
    <Card>
      <Row gutter={16}>
        <Col xs={24} sm={8}>
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
          />
        </Col>
        <Col xs={24} sm={8}>
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
          />
        </Col>
        <Col xs={24} sm={8}>
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
          />
        </Col>
      </Row>
    </Card>
  )
}

export default StatsPanel
