import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react'
import { Card, Typography, Empty, Space, Tag, Button } from 'antd'
import { marked } from 'marked'
import { getMessageTypeIcon, getMessageTypeLabel, formatTime } from '../../utils/helpers'
import './ProcessingIndicator.css'

const { Title, Text } = Typography

marked.setOptions({
  gfm: true,
  breaks: true,  // 允许单个换行符也产生换行效果
})

const MessagePanel = ({ messages }) => {
  const containerRef = useRef(null)
  const [newMessageIds, setNewMessageIds] = useState(new Set())
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [overflowingIds, setOverflowingIds] = useState(new Set())
  const contentRefs = useRef({})
  const prevMessageCountRef = useRef(0)

  const COLLAPSED_HEIGHT = 260
  const LONG_CONTENT_THRESHOLD = 480

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

  const measureOverflow = useCallback(() => {
    const nextOverflow = new Set()
    Object.entries(contentRefs.current).forEach(([id, element]) => {
      if (!element) return
      const contentHeight = element.scrollHeight
      if (contentHeight > COLLAPSED_HEIGHT + 4) {
        nextOverflow.add(id)
      }
    })

    setOverflowingIds((prev) => {
      if (prev.size === nextOverflow.size) {
        let allMatch = true
        prev.forEach((value) => {
          if (!nextOverflow.has(value)) {
            allMatch = false
          }
        })
        if (allMatch) {
          nextOverflow.forEach((value) => {
            if (!prev.has(value)) {
              allMatch = false
            }
          })
        }
        if (allMatch) {
          return prev
        }
      }
      return nextOverflow
    })
  }, [])

  useLayoutEffect(() => {
    measureOverflow()
  }, [messages, measureOverflow])

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return undefined
    }

    const observer = new ResizeObserver(() => {
      measureOverflow()
    })

    Object.values(contentRefs.current).forEach((element) => {
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [messages, measureOverflow])

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

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => measureOverflow())
    } else {
      setTimeout(() => measureOverflow(), 0)
    }
  }

  const buildMessageContent = (message) => {
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

    const lengthHint = stringContent.length

    if (jsonCandidate) {
      return {
        node: renderJsonContent(jsonCandidate),
        lengthHint: JSON.stringify(jsonCandidate).length || lengthHint,
      }
    }

    // 禁用自动表格检测，让 Markdown 自然渲染
    // 如果需要表格，LLM 会生成标准的 Markdown 表格格式
    // const tableSection = extractTabularSection(stringContent)
    // if (tableSection) {
    //   return {
    //     node: renderCsvSection(tableSection),
    //     lengthHint,
    //   }
    // }

    return {
      node: (
        <div
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: marked.parse(stringContent || '') }}
        />
      ),
      lengthHint,
    }
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

    // 排除 Markdown 列表 (有序/无序)
    if (/^\s*\d+\.\s/.test(line)) return false  // 1. 2. 3.
    if (/^\s*[-*+]\s/.test(line)) return false  // - * +

    // 排除包含 Markdown 加粗语法的行 (通常是列表项)
    if (/\*\*[^*]+\*\*/.test(line)) return false

    const [first, ...rest] = line.split(':')
    const key = first.trim()
    const value = rest.join(':').trim()

    if (!key || !value) return false

    // Key 应该相对简短 (真实的 key-value 表格)
    if (key.length > 50) return false

    // Key 不应该包含句子结束标点
    if (/[.!?]/.test(key)) return false

    // Key 应该比较简洁，不应该有太多空格
    const keyWords = key.split(/\s+/)
    if (keyWords.length > 6) return false

    // Value 应该相对简短 (避免误判长句子)
    if (value.length > 200) return false

    return true
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
      .replace(/\\u([\dA-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
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
              const { node: contentNode, lengthHint } = buildMessageContent(message)
              const hasLongContent = isOverflowing || lengthHint > LONG_CONTENT_THRESHOLD
              const showToggle = hasLongContent || isExpanded
              const showGradient = !isExpanded && hasLongContent

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
                      className="message-content-body"
                      style={{
                        maxHeight: isExpanded ? 'none' : COLLAPSED_HEIGHT,
                      }}
                    >
                      <div
                        ref={(element) => {
                          if (element) {
                            contentRefs.current[messageId] = element
                          } else {
                            delete contentRefs.current[messageId]
                          }
                        }}
                        className="message-content-inner"
                      >
                        <div style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.7 }}>
                          {contentNode}
                        </div>
                      </div>
                    </div>
                    {showGradient && <div className="message-content-gradient" />}
                  </div>
                  {showToggle && (
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: 0, marginTop: 8 }}
                      onClick={() => toggleExpand(messageId)}
                    >
                      {isExpanded ? 'Collapse' : 'Expand more'}
                    </Button>
                  )}
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
