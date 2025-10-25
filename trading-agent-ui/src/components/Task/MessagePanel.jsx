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

    // 将 content 转换为文本字符串
    let textContent = ''

    if (typeof content === 'string') {
      textContent = content
    } else if (typeof content === 'object' && content !== null) {
      // 如果是对象，尝试提取有意义的文本内容
      if (content.content) {
        textContent = content.content
      } else if (content.text) {
        textContent = content.text
      } else {
        // 否则显示 JSON 字符串
        textContent = JSON.stringify(content, null, 2)
      }
    } else {
      textContent = String(content || '')
    }

    // 检测是否为 markdown 格式
    const isMarkdown = detectMarkdown(textContent)

    if (isMarkdown) {
      // 使用 markdown 渲染
      return (
        <div
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: marked.parse(textContent || '') }}
        />
      )
    } else {
      // 使用纯文本渲染
      return (
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: 0,
            fontFamily: 'inherit',
            fontSize: 13,
            color: '#4a5568',
            lineHeight: 1.7,
          }}
        >
          {textContent}
        </pre>
      )
    }
  }

  // 检测文本是否为 markdown 格式
  const detectMarkdown = (text) => {
    if (!text || typeof text !== 'string') return false

    // Markdown 特征：标题、列表、代码块、粗体、链接等
    const markdownPatterns = [
      /^#{1,6}\s/m,           // 标题 (# ## ###)
      /^\s*[-*+]\s/m,         // 无序列表
      /^\s*\d+\.\s/m,         // 有序列表
      /```[\s\S]*```/,        // 代码块
      /`[^`]+`/,              // 行内代码
      /\*\*[^*]+\*\*/,        // 粗体
      /\*[^*]+\*/,            // 斜体
      /\[.+\]\(.+\)/,         // 链接
      /^\s*>/m,               // 引用
      /\|.+\|/,               // 表格
    ]

    // 如果匹配到任意一个 markdown 特征，则认为是 markdown
    return markdownPatterns.some(pattern => pattern.test(text))
  }

  const getMessageBorderColor = (type) => {
    const colors = {
      System: '#4299e1',      // 蓝色 - 系统消息
      Reasoning: '#48bb78',   // 绿色 - 推理消息
      tool_call: '#ed8936',   // 橙色 - 工具调用
      Analysis: '#9f7aea',    // 紫色 - 分析消息
    }
    return colors[type] || '#cbd5e0'
  }

  const getMessageBackground = (type) => {
    const backgrounds = {
      System: '#ebf8ff',      // 浅蓝色背景
      Reasoning: '#f0fff4',   // 浅绿色背景
      tool_call: '#fffaf0',   // 浅橙色背景
      Analysis: '#faf5ff',    // 浅紫色背景
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
      style={{ display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ flex: 1, overflow: 'hidden', padding: 0 }}
    >
      <div
        ref={containerRef}
        style={{
          maxHeight: '1000px',
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
