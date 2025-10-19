import { Card, Typography, Space, Tag } from 'antd'
import { CheckCircleOutlined, LoadingOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { AGENT_TEAMS, AGENT_STATUS } from '../../utils/constants'

const { Title, Text } = Typography

const AgentPanel = ({ agentStatuses }) => {
  const getStatusIcon = (status) => {
    if (status === AGENT_STATUS.COMPLETED) return <CheckCircleOutlined style={{ color: '#48bb78' }} />
    if (status === AGENT_STATUS.RUNNING) return <LoadingOutlined style={{ color: '#ed8936' }} />
    return <ClockCircleOutlined style={{ color: '#a0aec0' }} />
  }

  const getStatusColor = (status) => {
    if (status === AGENT_STATUS.COMPLETED) return 'success'
    if (status === AGENT_STATUS.RUNNING) return 'processing'
    return 'default'
  }

  const renderAgentGroup = (title, agents) => (
    <div key={title} style={{ marginBottom: 20 }}>
      <Text
        type="secondary"
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          display: 'block',
          marginBottom: 10,
        }}
      >
        {title}
      </Text>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        {agents.map((agent) => {
          const status = agentStatuses[agent.id] || AGENT_STATUS.PENDING
          return (
            <div
              key={agent.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                background: status === AGENT_STATUS.RUNNING ? '#fffaf0' : '#fff',
                borderRadius: 6,
                border: `2px solid ${
                  status === AGENT_STATUS.COMPLETED
                    ? '#48bb78'
                    : status === AGENT_STATUS.RUNNING
                    ? '#ed8936'
                    : '#e2e8f0'
                }`,
                boxShadow: status === AGENT_STATUS.RUNNING ? '0 2px 10px rgba(237, 137, 54, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'all 0.3s',
              }}
            >
              <Space>
                {getStatusIcon(status)}
                <Text style={{ fontSize: 13, fontWeight: 500 }}>{agent.name}</Text>
              </Space>
              <Tag color={getStatusColor(status)} style={{ fontSize: 11, fontWeight: 600 }}>
                {status}
              </Tag>
            </div>
          )
        })}
      </Space>
    </div>
  )

  return (
    <Card
      title={
        <Space>
          <Title level={5} style={{ margin: 0 }}>
            Agent Progress
          </Title>
        </Space>
      }
      style={{
        height: '100%',
        overflow: 'auto',
      }}
      bodyStyle={{
        padding: 16,
      }}
    >
      {renderAgentGroup('Analyst Team', AGENT_TEAMS.ANALYSTS)}
      {renderAgentGroup('Research Team', AGENT_TEAMS.RESEARCHERS)}
      {renderAgentGroup('Trading Team', AGENT_TEAMS.TRADERS)}
      {renderAgentGroup('Risk Management', AGENT_TEAMS.RISK_MANAGERS)}
    </Card>
  )
}

export default AgentPanel
