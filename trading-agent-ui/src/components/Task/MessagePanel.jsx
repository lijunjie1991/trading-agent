import { useEffect, useRef, useState } from 'react'
import { Card, Typography, Empty, Space, Tag, Button } from 'antd'
import { marked } from 'marked'
import { getMessageTypeIcon, getMessageTypeLabel, formatTime } from '../../utils/helpers'
import './ProcessingIndicator.css'

const { Title, Text } = Typography

marked.setOptions({
  gfm: true,
  breaks: true,
})

const MessagePanel = ({ messages }) => {
  const containerRef = useRef(null)
  const [newMessageIds, setNewMessageIds] = useState(new Set())
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [overflowingIds, setOverflowingIds] = useState(new Set())
  const contentRefs = useRef({})
  const prevMessageCountRef = useRef(0)

  const COLLAPSED_HEIGHT = 260

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

  useEffect(() => {
    const validIds = new Set(messages.map((msg) => msg.id || `${msg.createdAt}-${msg.messageType}`))

    setExpandedIds((prev) => {
      const next = new Set()
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id)
      })
      return next
    })

    Object.keys(contentRefs.current).forEach((key) => {
      if (!validIds.has(key)) {
        delete contentRefs.current[key]
      }
    })
  }, [messages])

  useEffect(() => {
    const nextOverflow = new Set()
    Object.entries(contentRefs.current).forEach(([id, element]) => {
      if (element && element.scrollHeight > COLLAPSED_HEIGHT + 16) {
        nextOverflow.add(id)
      }
    })
    setOverflowingIds(nextOverflow)
  }, [messages, expandedIds])

  const toggleExpand = (messageId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(messageId)) {
        next.delete(messageId)
      } else {
        next.add(messageId)
      }
      return next
    })
  }

  const renderMessageContent = (message) => {
    const { content } = message

    let stringContent = ''
    let jsonCandidate = null

    if (typeof content === 'object' && content !== null) {
      if (typeof content.content === 'string') {
        stringContent = normalizeMultilineContent(content.content)
      } else if (typeof content.text === 'string') {
        stringContent = normalizeMultilineContent(content.text)
      } else if (content.content && typeof content.content === 'object') {
        jsonCandidate = content.content
        stringContent = normalizeMultilineContent(JSON.stringify(content.content, null, 2))
      } else {
        jsonCandidate = content
        stringContent = normalizeMultilineContent(JSON.stringify(content, null, 2))
      }
    } else if (typeof content === 'string') {
      stringContent = normalizeMultilineContent(content)
    } else {
      stringContent = normalizeMultilineContent(String(content || ''))
    }

    if (!jsonCandidate) {
      jsonCandidate = tryParseJsonString(stringContent)
    }

    if (jsonCandidate) {
      return renderJsonContent(jsonCandidate)
    }

    const tableSection = extractTabularSection(stringContent)
    if (tableSection) {
      return renderCsvSection(tableSection)
    }

    const isMarkdown = detectMarkdown(stringContent)

    if (isMarkdown) {
      return (
        <div
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: marked.parse(stringContent || '') }}
        />
      )
    }

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
        {stringContent}
      </pre>
    )
  }

  const renderJsonContent = (data) => {
    if (Array.isArray(data) && data.length > 0 && data.every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
      const headers = Array.from(new Set(data.flatMap((item) => Object.keys(item))))
      const rows = data.map((item) => headers.map((key) => formatTableCell(item[key])))
      return renderTable(headers, rows)
    }

    return (
      <pre className="json-content">
        {JSON.stringify(data, null, 2)}
      </pre>
    )
  }

  const renderCsvSection = ({ headers, rows, before, after }) => (
    <div>
      {before && before.trim() && (
        <div
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: marked.parse(before) }}
        />
      )}
      {renderTable(headers, rows)}
      {after && after.trim() && (
        <div
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: marked.parse(after) }}
        />
      )}
    </div>
  )

  const renderTable = (headers, rows) => (
    <div className="csv-table-wrapper">
      <table className="csv-table">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={`${header}-${index}`}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const detectMarkdown = (text) => {
    if (!text || typeof text !== 'string') return false

    const markdownPatterns = [
      /^#{1,6}\s/m,
      /^\s*[-*+]\s/m,
      /^\s*\d+\.\s/m,
      /```[\s\S]*```/,
      /`[^`]+`/,
      /\*\*[^*]+\*\*/,
      /\*[^*]+\*/,
      /\[.+\]\(.+\)/,
      /^\s*>/m,
      /\|.+\|/,
    ]

    return markdownPatterns.some((pattern) => pattern.test(text))
  }

  const tryParseJsonString = (value) => {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (!trimmed) return null
    if (!['{', '['].includes(trimmed[0])) return null

    try {
      const parsed = JSON.parse(trimmed)
      return typeof parsed === 'object' && parsed !== null ? parsed : null
    } catch (error) {
      return null
    }
  }

  const extractTabularSection = (text) => {
    if (!text || typeof text !== 'string') return null

    const lines = text.split('\n')
    let currentBlock = []
    let startIndex = -1

    const flushBlock = (endIndex) => {
      if (currentBlock.length === 0) return null

      const blockLines = currentBlock.slice()
      currentBlock = []

      const hasComma = blockLines.every(isCommaSeparatedLine)
      const hasColon = !hasComma && blockLines.every(isColonSeparatedLine)

      if (!hasComma && !hasColon) return null
      if (hasColon && blockLines.length < 3) return null

      const { headers, rows } = hasComma
        ? parseCommaSeparatedBlock(blockLines)
        : parseColonSeparatedBlock(blockLines)

      if (!rows.length) return null

      const before = lines.slice(0, startIndex).join('\n').trim()
      const after = lines.slice(endIndex).join('\n').trim()

      return { headers, rows, before, after }
    }

    for (let index = 0; index <= lines.length; index += 1) {
      const line = lines[index] ?? ''
      const trimmed = line.trim()

      if (isPotentialTableLine(trimmed)) {
        if (currentBlock.length === 0) {
          startIndex = index
        }
        currentBlock.push(trimmed)
      } else if (currentBlock.length > 0) {
        const blockResult = flushBlock(index)
        if (blockResult) {
          return blockResult
        }
        startIndex = -1
      }
    }

    return null
  }

  const isPotentialTableLine = (line) => {
    if (!line) return false
    if (/^#{1,6}\s/.test(line)) return false
    if (/^\s*[-*+]\s/.test(line)) return false
    if (line.startsWith('```')) return false
    return isCommaSeparatedLine(line) || isColonSeparatedLine(line)
  }

  const isCommaSeparatedLine = (line) => {
    if (!line.includes(',')) return false
    const cells = line.split(',').map((cell) => cell.trim())
    return cells.filter(Boolean).length >= 2
  }

  const isColonSeparatedLine = (line) => {
    if (!line.includes(':')) return false
    if (/^https?:\/\//i.test(line)) return false
    const [first, ...rest] = line.split(':')
    const key = first.trim()
    const value = rest.join(':').trim()
    if (!key || !value) return false
    if (key.length > 50) return false
    return /^[\w\-()/\s.]+$/.test(key)
  }

  const parseCommaSeparatedBlock = (blockLines) => {
    const rows = blockLines.map((line) => line.split(',').map((cell) => cell.trim()))
    const columnCount = Math.max(...rows.map((row) => row.length))

    const alignedRows = rows.map((row) => {
      if (row.length === columnCount) return row
      return [...row, ...new Array(columnCount - row.length).fill('')]
    })

    const headerCandidate = alignedRows[0]
    const headerIsTextual = headerCandidate.some((cell) => /[A-Za-z]/.test(cell))

    const headers = headerIsTextual
      ? headerCandidate.map((cell, index) => formatTableCell(cell) || `Column ${index + 1}`)
      : headerCandidate.map((_, index) => `Column ${index + 1}`)

    const dataRows = headerIsTextual ? alignedRows.slice(1) : alignedRows

    return {
      headers,
      rows: dataRows.map((row) => row.map((cell) => formatTableCell(cell))),
    }
  }

  const parseColonSeparatedBlock = (blockLines) => {
    const rows = blockLines
      .map((line) => {
        const [first, ...rest] = line.split(':')
        if (!rest.length) return null
        const key = first.trim()
        const value = rest.join(':').trim()
        return [formatTableCell(key), formatTableCell(value)]
      })
      .filter(Boolean)

    return {
      headers: ['Label', 'Value'],
      rows,
    }
  }

  const formatTableCell = (value) => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'number' && Number.isFinite(value)) return value.toString()
    if (typeof value === 'string') return value
    return JSON.stringify(value)
  }

  const getMessageBorderColor = (type) => {
    const colors = {
      System: '#4299e1',
      Reasoning: '#48bb78',
      tool_call: '#ed8936',
      Analysis: '#9f7aea',
    }
    return colors[type] || '#cbd5e0'
  }

  const getMessageBackground = (type) => {
    const backgrounds = {
      System: '#ebf8ff',
      Reasoning: '#f0fff4',
      tool_call: '#fffaf0',
      Analysis: '#faf5ff',
    }
    return backgrounds[type] || '#f7fafc'
  }

  const normalizeMultilineContent = (value) => {
    if (typeof value !== 'string') return value

    let normalized = value
      .replace(/\r\n/g, '\n')
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')

    const trimmed = normalized.trim()
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      normalized = trimmed.slice(1, -1)
    }

    return normalized
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\')
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
            {messages.map((message) => {
              const messageId = message.id || `${message.createdAt}-${message.messageType}`
              const isNewMessage = newMessageIds.has(messageId)
              const isExpanded = expandedIds.has(messageId)
              const isOverflowing = overflowingIds.has(messageId)

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
                  <div
                    className={`message-content-wrapper ${isExpanded ? 'expanded' : 'collapsed'}`}
                  >
                    <div
                      ref={(element) => {
                        if (element) {
                          contentRefs.current[messageId] = element
                        } else {
                          delete contentRefs.current[messageId]
                        }
                      }}
                      className="message-content-body"
                      style={{
                        maxHeight: isExpanded ? 'none' : COLLAPSED_HEIGHT,
                      }}
                    >
                      <div style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.7 }}>
                        {renderMessageContent(message)}
                      </div>
                    </div>
                    {!isExpanded && isOverflowing && <div className="message-content-gradient" />}
                  </div>
                  {isOverflowing && (
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: 0, marginTop: 8 }}
                      onClick={() => toggleExpand(messageId)}
                    >
                      {isExpanded ? '收起内容' : '展开更多'}
                    </Button>
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
