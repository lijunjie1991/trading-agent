import { useState } from 'react'
import { Typography, Tag, Button, Space, Collapse } from 'antd'
import { CheckCircleOutlined, WarningOutlined, DownOutlined, UpOutlined } from '@ant-design/icons'
import { marked } from 'marked'

const { Text } = Typography
const { Panel } = Collapse

const ToolResultRenderer = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!data) return null

  const {
    tool_name,
    truncated = false,
    result_length = 0,
    result_preview = '',
  } = data

  // Normalize line breaks - convert \n to actual newlines if needed
  const normalizedContent = typeof result_preview === 'string'
    ? result_preview.replace(/\\n/g, '\n')
    : result_preview

  // Detect if the content is markdown-like (contains ## or * or numbered lists)
  const isMarkdownContent = normalizedContent.includes('##') ||
                           normalizedContent.includes('\n- ') ||
                           /^\d+\.\s/.test(normalizedContent)

  // Try to parse the preview as JSON if it doesn't look like markdown
  let parsedContent = null
  let isJsonContent = false
  if (!isMarkdownContent) {
    try {
      parsedContent = JSON.parse(normalizedContent)
      isJsonContent = true
    } catch (e) {
      // Not JSON, will render as text or markdown
    }
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Tool Name and Status */}
      <div style={{ marginBottom: 12 }}>
        <Space size={8} wrap>
          <Text strong>Tool:</Text>
          <Tag color="cyan" style={{ fontWeight: 500 }}>
            {tool_name || 'Unknown'}
          </Tag>
          {truncated && (
            <Tag icon={<WarningOutlined />} color="warning">
              Truncated
            </Tag>
          )}
          {!truncated && (
            <Tag icon={<CheckCircleOutlined />} color="success">
              Complete
            </Tag>
          )}
          <Text type="secondary" style={{ fontSize: 12 }}>
            Length: {result_length} chars
          </Text>
        </Space>
      </div>

      {/* Result Content */}
      <div
        style={{
          background: '#f7fafc',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        {/* Preview Section */}
        <div style={{ padding: 12 }}>
          <Text strong style={{ fontSize: 13, color: '#4a5568', marginBottom: 8, display: 'block' }}>
            Result:
          </Text>

          <div
            style={{
              maxHeight: isExpanded ? 'none' : '200px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {isJsonContent ? (
              // Render JSON in a code block
              <pre
                style={{
                  background: '#2d3748',
                  color: '#e2e8f0',
                  padding: 12,
                  borderRadius: 6,
                  overflow: 'auto',
                  fontSize: 11,
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {JSON.stringify(parsedContent, null, 2)}
              </pre>
            ) : isMarkdownContent ? (
              // Render as markdown
              <div
                className="markdown-content"
                style={{
                  fontSize: 13,
                  color: '#2d3748',
                  lineHeight: 1.8,
                }}
                dangerouslySetInnerHTML={{ __html: marked.parse(normalizedContent || '') }}
              />
            ) : (
              // Render as plain text with formatting
              <pre
                style={{
                  background: 'white',
                  color: '#2d3748',
                  padding: 12,
                  borderRadius: 6,
                  fontSize: 12,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  lineHeight: 1.6,
                }}
              >
                {normalizedContent}
              </pre>
            )}

            {/* Fade overlay when collapsed */}
            {!isExpanded && normalizedContent.length > 500 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 60,
                  background: 'linear-gradient(to bottom, transparent, #f7fafc)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
        </div>

        {/* Expand/Collapse Button */}
        {normalizedContent.length > 500 && (
          <div
            style={{
              borderTop: '1px solid #e2e8f0',
              padding: '8px 12px',
              background: '#edf2f7',
              textAlign: 'center',
            }}
          >
            <Button
              type="link"
              size="small"
              icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
              onClick={() => setIsExpanded(!isExpanded)}
              style={{ fontWeight: 500 }}
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </Button>
          </div>
        )}
      </div>

      {/* Truncation Notice */}
      {truncated && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 12px',
            background: '#fffaf0',
            border: '1px solid #fed7aa',
            borderRadius: 6,
          }}
        >
          <Text type="warning" style={{ fontSize: 12 }}>
            <WarningOutlined style={{ marginRight: 6 }} />
            This result was truncated. Full content length: {result_length} characters.
          </Text>
        </div>
      )}
    </div>
  )
}

export default ToolResultRenderer
