import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Card,
  Row,
  Col,
  Empty,
  Button,
  Space,
  Form,
  Input,
  Select,
  DatePicker,
  Pagination,
  Typography
} from 'antd'
import { PlusCircleOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import TaskCard from '../components/Task/TaskCard'
import Loading from '../components/Common/Loading'
import { queryTasks } from '../store/slices/taskSlice'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Option } = Select
const { Text } = Typography

const TaskHistory = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { tasks, loading, pagination } = useSelector((state) => state.task)
  const [form] = Form.useForm()

  // Query parameters state
  const [queryParams, setQueryParams] = useState({
    page: 0,
    pageSize: 12,
    status: undefined,
    ticker: undefined,
    taskId: undefined,
    startDate: undefined,
    endDate: undefined,
    searchKeyword: undefined,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  })

  // Initial load
  useEffect(() => {
    handleSearch()
  }, [])

  // Handle search form submission
  const handleSearch = () => {
    const values = form.getFieldsValue()

    // Convert date range to strings
    let startDate = undefined
    let endDate = undefined
    if (values.dateRange && values.dateRange.length === 2) {
      startDate = values.dateRange[0].format('YYYY-MM-DD')
      endDate = values.dateRange[1].format('YYYY-MM-DD')
    }

    const newQueryParams = {
      ...queryParams,
      page: 0, // Reset to first page on new search
      status: values.status === 'all' ? undefined : values.status?.toUpperCase(),
      startDate: startDate,
      endDate: endDate,
      searchKeyword: values.searchKeyword || undefined,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    }

    setQueryParams(newQueryParams)
    dispatch(queryTasks(newQueryParams))
  }

  // Handle reset filters
  const handleReset = () => {
    form.resetFields()
    const defaultParams = {
      page: 0,
      pageSize: 12,
      status: undefined,
      ticker: undefined,
      startDate: undefined,
      endDate: undefined,
      searchKeyword: undefined,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    }
    setQueryParams(defaultParams)
    dispatch(queryTasks(defaultParams))
  }

  // Handle pagination change
  const handlePageChange = (page, pageSize) => {
    const newQueryParams = {
      ...queryParams,
      page: page - 1, // Ant Design uses 1-based, backend uses 0-based
      pageSize: pageSize,
    }
    setQueryParams(newQueryParams)
    dispatch(queryTasks(newQueryParams))
  }

  // Handle new analysis
  const handleNewAnalysis = () => {
    navigate('/tasks/new')
  }

  if (loading && tasks.length === 0) {
    return <Loading />
  }

  return (
    <div>
      {/* Compact Search Panel */}
      <Card
        bordered={false}
        style={{
          marginBottom: 24,
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
          border: '1px solid rgba(102, 126, 234, 0.1)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <Form
          form={form}
          onFinish={handleSearch}
          initialValues={{
            status: 'all',
          }}
        >
          <Row gutter={[12, 16]} align="middle">
            {/* Search Keyword */}
            <Col xs={24} sm={12} md={8} lg={8}>
              <Form.Item name="searchKeyword" style={{ marginBottom: 0 }}>
                <Input
                  placeholder="Search by Ticker, Task ID, or Decision..."
                  allowClear
                  size="large"
                  style={{
                    borderRadius: 10,
                    background: '#fff',
                  }}
                />
              </Form.Item>
            </Col>

            {/* Status Filter */}
            <Col xs={12} sm={6} md={4} lg={3}>
              <Form.Item name="status" style={{ marginBottom: 0 }}>
                <Select
                  placeholder="Status"
                  size="large"
                  style={{
                    borderRadius: 10,
                  }}
                >
                  <Option value="all">All Status</Option>
                  <Option value="pending">Pending</Option>
                  <Option value="waiting_payment">Waiting Payment</Option>
                  <Option value="running">Running</Option>
                  <Option value="completed">Completed</Option>
                  <Option value="failed">Failed</Option>
                  <Option value="payment_failed">Payment Failed</Option>
                </Select>
              </Form.Item>
            </Col>

            {/* Date Range */}
            <Col xs={12} sm={6} md={5} lg={5}>
              <Form.Item name="dateRange" style={{ marginBottom: 0 }}>
                <RangePicker
                  size="large"
                  style={{
                    width: '100%',
                    borderRadius: 10,
                  }}
                  format="YYYY-MM-DD"
                  placeholder={['Start', 'End']}
                />
              </Form.Item>
            </Col>

            {/* Action Buttons */}
            <Col xs={24} sm={24} md={7} lg={8}>
              <Space size={8} style={{ width: '100%', justifyContent: 'flex-end', display: 'flex' }}>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  style={{
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                    flex: '0 0 auto',
                  }}
                >
                  Search
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleReset}
                  size="large"
                  style={{
                    borderRadius: 10,
                    fontWeight: 600,
                    flex: '0 0 auto',
                  }}
                >
                  Reset
                </Button>
                <Button
                  type="primary"
                  icon={<PlusCircleOutlined />}
                  onClick={handleNewAnalysis}
                  size="large"
                  style={{
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    flex: '0 0 auto',
                  }}
                >
                  New Analysis
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* Task Cards */}
      {tasks.length === 0 ? (
        <Card>
          <Empty
            description={
              <Space direction="vertical" size={12}>
                <span>No tasks found</span>
                <Button type="primary" icon={<PlusCircleOutlined />} onClick={handleNewAnalysis}>
                  Start Your First Analysis
                </Button>
              </Space>
            }
          />
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {tasks.map((task) => (
              <Col xs={24} sm={12} md={8} lg={6} key={task.taskId || task.task_id || task.id}>
                <TaskCard task={task} />
              </Col>
            ))}
          </Row>

          {/* Bottom Pagination with Summary */}
          {pagination.totalPages > 1 && (
            <div
              style={{
                marginTop: 32,
                padding: '20px',
                background: '#fafafa',
                borderRadius: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <Text type="secondary" style={{ fontSize: 14 }}>
                Showing {pagination.currentPage * pagination.pageSize + 1} - {Math.min((pagination.currentPage + 1) * pagination.pageSize, pagination.totalElements)} of {pagination.totalElements} tasks
              </Text>
              <Pagination
                current={pagination.currentPage + 1}
                pageSize={pagination.pageSize}
                total={pagination.totalElements}
                onChange={handlePageChange}
                showSizeChanger
                showQuickJumper
                pageSizeOptions={['12', '24', '48', '96']}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default TaskHistory
