import { useEffect, useRef, useState } from 'react'
import { Card, Typography, Empty, Space, Tag } from 'antd'
import { marked } from 'marked'
import { getMessageTypeIcon, getMessageTypeLabel, formatTime } from '../../utils/helpers'
import './ProcessingIndicator.css'

const { Title, Text } = Typography

const MessagePanel = ({ messages }) => {
  const containerRef = useRef(null)
  const [newMessageIds, setNewMessageIds] = useState(new Set())
  const prevMessageCountRef = useRef(0)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
    }

    // Detect new messages and add animation
    if (messages.length > prevMessageCountRef.current) {
      const newIds = new Set()
      messages.slice(0, messages.length - prevMessageCountRef.current).forEach((msg) => {
        newIds.add(msg.id || `${msg.createdAt}-${msg.messageType}`)
      })
      setNewMessageIds(newIds)

      // Remove animation class after animation completes
      setTimeout(() => {
        setNewMessageIds(new Set())
      }, 2000)
    }

    prevMessageCountRef.current = messages.length
  }, [messages])

  const renderMessageContent = (message) => {
    // Database returns messageType and content
    const { messageType, content } = message
    const type = messageType
    const data = content

    if (type === 'status') {
      return (
        <div>
          <Text strong>Status: </Text>
          <Tag color={data.status === 'completed' ? 'success' : data.status === 'failed' ? 'error' : 'processing'}>
            {data.status}
          </Tag>
          <br />
          {data.message && (
            <>
              <Text strong>Message: </Text>
              <Text>{data.message}</Text>
              <br />
            </>
          )}
          {data.decision && (
            <>
              <Text strong>Decision: </Text>
              <Tag
                color={
                  data.decision.toLowerCase().includes('buy')
                    ? 'success'
                    : data.decision.toLowerCase().includes('sell')
                    ? 'error'
                    : 'warning'
                }
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                {data.decision}
              </Tag>
            </>
          )}
          {data.error && (
            <>
              <Text strong type="danger">
                Error:{' '}
              </Text>
              <Text type="danger">{data.error}</Text>
            </>
          )}
        </div>
      )
    }

    if (type === 'message') {
      return (
        <div
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: marked.parse(data.content || '') }}
        />
      )
    }

    if (type === 'tool_call') {
      return (
        <div>
          <Text strong>Tool: </Text>
          <Tag color="blue">{data.tool_name}</Tag>
          <br />
          <Text strong style={{ marginTop: 8, display: 'block' }}>
            Arguments:
          </Text>
          <pre
            style={{
              background: '#2d3748',
              color: '#e2e8f0',
              padding: 10,
              borderRadius: 6,
              overflow: 'auto',
              fontSize: 11,
              marginTop: 8,
            }}
          >
            {JSON.stringify(data.args, null, 2)}
          </pre>
        </div>
      )
    }

    if (type === 'report') {
      return (
        <div>
          <Text strong>Report Type: </Text>
          <Tag color="purple">{data.report_type}</Tag>
          <div
            className="markdown-content"
            style={{ marginTop: 12 }}
            dangerouslySetInnerHTML={{ __html: marked.parse(data.content || '') }}
          />
        </div>
      )
    }

    return <Text>{JSON.stringify(data)}</Text>
  }

  const getMessageBorderColor = (type) => {
    const colors = {
      status: '#4299e1',
      message: '#48bb78',
      tool_call: '#ed8936',
      report: '#9f7aea',
      agent_status: '#a0aec0',
    }
    return colors[type] || '#cbd5e0'
  }

  const getMessageBackground = (type) => {
    const backgrounds = {
      status: '#ebf8ff',
      message: '#f0fff4',
      tool_call: '#fffaf0',
      report: '#faf5ff',
      agent_status: '#f7fafc',
    }
    return backgrounds[type] || '#f7fafc'
  }

  return (
    <Card
      title={
        <Space>
          <Title level={5} style={{ margin: 0 }}>
            Messages & Tools
          </Title>
          {messages.length > 0 && (
            <Tag color="blue">{messages.length} messages</Tag>
          )}
        </Space>
      }
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ flex: 1, overflow: 'hidden', padding: 0 }}
    >
      <div
        ref={containerRef}
        style={{
          height: '100%',
          overflowY: 'auto',
          padding: 16,
        }}
      >
        {messages.length === 0 ? (
          <Empty description="No messages yet" style={{ marginTop: 50 }} />
        ) : (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {messages.map((message, index) => {
              const messageId = message.id || `${message.createdAt}-${message.messageType}`
              const isNewMessage = newMessageIds.has(messageId)

              return (
                <div
                  key={messageId}
                  className={`slide-in ${isNewMessage ? 'message-slide-in new-message-highlight' : ''}`}
                  style={{
                    padding: 15,
                    borderLeft: `4px solid ${getMessageBorderColor(message.messageType)}`,
                    background: getMessageBackground(message.messageType),
                    borderRadius: 6,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  }}
                >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Text strong style={{ fontSize: 13 }}>
                    {getMessageTypeIcon(message.messageType)} {getMessageTypeLabel(message.messageType)}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {formatTime(message.createdAt)}
                  </Text>
                </div>
                <div style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.7 }}>
                  {renderMessageContent(message)}
                </div>
              </div>
              )
            })}
          </Space>
        )}
      </div>
    </Card>
  )
}

export default MessagePanel
