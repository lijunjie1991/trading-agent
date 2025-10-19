import { Spin } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'

const Loading = ({ size = 'large', tip = 'Loading...', fullScreen = false }) => {
  const icon = <LoadingOutlined style={{ fontSize: size === 'large' ? 48 : 24 }} spin />

  if (fullScreen) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Spin indicator={icon} tip={tip} size={size} />
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '50px 0',
      }}
    >
      <Spin indicator={icon} tip={tip} size={size} />
    </div>
  )
}

export default Loading
