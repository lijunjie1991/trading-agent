import { Steps } from 'antd'
import { CheckCircleOutlined, LoadingOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { WORKFLOW_STAGES } from '../../utils/constants'

const WorkflowProgress = ({ currentStage, completedStages = [] }) => {
  const stages = [
    {
      title: 'Analysis',
      description: 'Market, Social, News, Fundamentals',
      stage: WORKFLOW_STAGES.ANALYSIS,
    },
    {
      title: 'Research',
      description: 'Bull & Bear Researchers, Manager',
      stage: WORKFLOW_STAGES.RESEARCH,
    },
    {
      title: 'Trading',
      description: 'Investment Plan Generation',
      stage: WORKFLOW_STAGES.TRADING,
    },
    {
      title: 'Risk Management',
      description: 'Risk Analysts & Manager',
      stage: WORKFLOW_STAGES.RISK,
    },
  ]

  const getStepStatus = (stage) => {
    if (completedStages.includes(stage)) {
      return 'finish'
    }
    if (currentStage === stage) {
      return 'process'
    }
    return 'wait'
  }

  const getStepIcon = (stage) => {
    if (completedStages.includes(stage)) {
      return <CheckCircleOutlined />
    }
    if (currentStage === stage) {
      return <LoadingOutlined />
    }
    return <ClockCircleOutlined />
  }

  const items = stages.map((stage) => ({
    title: stage.title,
    description: stage.description,
    status: getStepStatus(stage.stage),
    icon: getStepIcon(stage.stage),
  }))

  return (
    <div
      style={{
        padding: '24px',
        background: '#f8f9fa',
        borderRadius: 8,
        marginBottom: 24,
      }}
    >
      <Steps
        current={stages.findIndex((s) => s.stage === currentStage)}
        items={items}
        responsive={false}
      />
    </div>
  )
}

export default WorkflowProgress
