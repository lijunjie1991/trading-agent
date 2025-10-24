import { useState } from 'react'
import { Typography, Tag, Button, Space, Collapse, Table } from 'antd'
import { CheckCircleOutlined, WarningOutlined, DownOutlined, UpOutlined } from '@ant-design/icons'
import { marked } from 'marked'

const { Text } = Typography
const { Panel } = Collapse

// Helper function to detect and parse CSV content
const parseCSVContent = (content) => {
  const lines = content.split('\n')
  const csvLines = []
  const nonCSVLines = []
  let inCSVBlock = false

  lines.forEach((line, index) => {
    // Check if line looks like CSV (contains commas and not a markdown heading)
    const isCSVLike = line.includes(',') && !line.trim().startsWith('#')

    if (isCSVLike) {
      if (!inCSVBlock) {
        inCSVBlock = true
        csvLines.push([])
      }
      csvLines[csvLines.length - 1].push(line)
    } else {
      if (inCSVBlock) {
        inCSVBlock = false
      }
      nonCSVLines.push({ index, line, isCSV: false })
    }
  })

  return { csvLines, nonCSVLines, hasCSV: csvLines.length > 0 && csvLines[0].length > 0 }
}

// Helper function to convert CSV block to table data
const csvToTableData = (csvLines) => {
  if (!csvLines || csvLines.length === 0) return null

  const rows = csvLines.map(line =>
    line.split(',').map(cell => cell.trim())
  )

  if (rows.length === 0) return null

  // First row is header
  const headers = rows[0]
  const dataRows = rows.slice(1)

  const columns = headers.map((header, index) => ({
    title: header || `Column ${index + 1}`,
    dataIndex: `col${index}`,
    key: `col${index}`,
    ellipsis: true,
    width: index === 0 ? 200 : undefined, // First column wider for labels
  }))

  const dataSource = dataRows.map((row, rowIndex) => {
    const rowData = { key: rowIndex }
    row.forEach((cell, colIndex) => {
      rowData[`col${colIndex}`] = cell
    })
    return rowData
  })

  return { columns, dataSource }
}

const ToolResultRenderer = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!data) return null

  const {
    tool_name,
    truncated = false,
    result_length = 0,
    result_preview = '',
  } = data

  // First, get the content
  let normalizedContent = result_preview

  // The content comes from JSON parsing, so \n in the JSON string
  // has already been converted to actual newline characters by JSON.parse()
  // We don't need to do any replacement here - the newlines are already there

  // Check if content contains CSV data (lines with commas)
  const hasCSVLikeContent = typeof normalizedContent === 'string' &&
    normalizedContent.split('\n').some(line =>
      line.includes(',') && !line.trim().startsWith('#')
    )

  // Detect if the content is markdown-like
  // Check for markdown headings (# at start of line), lists, or other markdown syntax
  const isMarkdownContent = typeof normalizedContent === 'string' && (
    /^#{1,6}\s/.test(normalizedContent) ||           // Heading at start: # Title
    /\n#{1,6}\s/.test(normalizedContent) ||          // Heading after newline
    normalizedContent.includes('\n- ') ||            // Unordered list with dash
    normalizedContent.includes('\n* ') ||            // Unordered list with asterisk
    /^\d+\.\s/m.test(normalizedContent) ||          // Numbered list at start
    /\n\d+\.\s/m.test(normalizedContent) ||          // Numbered list after newline
    normalizedContent.includes('**') ||              // Bold text
    normalizedContent.includes('__') ||              // Bold text alternative
    /\[.+\]\(.+\)/.test(normalizedContent)          // Links [text](url)
  )

  // Parse mixed markdown + CSV content
  let csvParsed = null
  if (hasCSVLikeContent && typeof normalizedContent === 'string') {
    const lines = normalizedContent.split('\n')
    const markdownLines = []
    const csvLines = []
    let collectingCSV = false

    lines.forEach(line => {
      const isCSVLine = line.includes(',') && !line.trim().startsWith('#')
      if (isCSVLine) {
        if (!collectingCSV) {
          collectingCSV = true
        }
        csvLines.push(line)
      } else {
        collectingCSV = false
        markdownLines.push(line)
      }
    })

    if (csvLines.length > 0) {
      csvParsed = {
        markdownContent: markdownLines.join('\n'),
        tableData: csvToTableData(csvLines)
      }
    }
  }

  // Try to parse the preview as JSON if it doesn't look like markdown or CSV
  let parsedContent = null
  let isJsonContent = false
  if (!isMarkdownContent && !hasCSVLikeContent && typeof normalizedContent === 'string') {
    try {
      parsedContent = JSON.parse(result_preview)
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
            {csvParsed && csvParsed.tableData ? (
              // Render mixed Markdown + CSV Table
              <div>
                {/* Render markdown headings/comments first */}
                {csvParsed.markdownContent && csvParsed.markdownContent.trim() && (
                  <div
                    className="markdown-content"
                    style={{
                      fontSize: 13,
                      color: '#2d3748',
                      lineHeight: 1.8,
                      marginBottom: 16,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(csvParsed.markdownContent, { breaks: true, gfm: true })
                    }}
                  />
                )}
                {/* Render CSV as table */}
                <Table
                  columns={csvParsed.tableData.columns}
                  dataSource={csvParsed.tableData.dataSource}
                  pagination={false}
                  size="small"
                  bordered
                  scroll={{ x: 'max-content' }}
                  style={{
                    fontSize: 12,
                  }}
                />
              </div>
            ) : isJsonContent ? (
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
              // Render as markdown with breaks enabled (single \n creates <br>)
              <div
                className="markdown-content"
                style={{
                  fontSize: 13,
                  color: '#2d3748',
                  lineHeight: 1.8,
                }}
                dangerouslySetInnerHTML={{
                  __html: marked.parse(normalizedContent || '', { breaks: true, gfm: true })
                }}
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
            {!isExpanded && normalizedContent.length > 500 && !csvParsed && (
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
    </div>
  )
}

export default ToolResultRenderer
