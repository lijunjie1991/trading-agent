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
  Pagination
} from 'antd'
import { PlusCircleOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import TaskCard from '../components/Task/TaskCard'
import Loading from '../components/Common/Loading'
import { queryTasks } from '../store/slices/taskSlice'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Option } = Select

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
      ticker: values.ticker || undefined,
      taskId: values.taskId || undefined,
      startDate: startDate,
      endDate: endDate,
      searchKeyword: values.searchKeyword || undefined,
      sortBy: values.sortBy || 'createdAt',
      sortOrder: values.sortOrder || 'DESC',
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
      taskId: undefined,
      startDate: undefined,
      endDate: undefined,
      searchKeyword: undefined,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    }
    setQueryParams(defaultParams)
    dispatch(queryTasks(defaultParams))
  }

  // Handle refresh
  const handleRefresh = () => {
    dispatch(queryTasks(queryParams))
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
      {/* Search Filters Card */}
      <Card style={{ marginBottom: 24 }} title="Search Filters">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSearch}
          initialValues={{
            status: 'all',
            sortBy: 'createdAt',
            sortOrder: 'DESC',
          }}
        >
          <Row gutter={16}>
            {/* General Search */}
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Search Keyword" name="searchKeyword">
                <Input
                  placeholder="Ticker, Task ID, or Decision"
                  allowClear
                />
              </Form.Item>
            </Col>

            {/* Status Filter */}
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Status" name="status">
                <Select>
                  <Option value="all">All Status</Option>
                  <Option value="pending">Pending</Option>
                  <Option value="running">Running</Option>
                  <Option value="completed">Completed</Option>
                  <Option value="failed">Failed</Option>
                </Select>
              </Form.Item>
            </Col>

            {/* Ticker Filter */}
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Ticker" name="ticker">
                <Input placeholder="e.g. AAPL" allowClear />
              </Form.Item>
            </Col>

            {/* Task ID Filter */}
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Task ID" name="taskId">
                <Input placeholder="Enter Task ID" allowClear />
              </Form.Item>
            </Col>

            {/* Date Range Filter */}
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Analysis Date Range" name="dateRange">
                <RangePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>

            {/* Sort By */}
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="Sort By" name="sortBy">
                <Select>
                  <Option value="createdAt">Created Date</Option>
                  <Option value="completedAt">Completed Date</Option>
                  <Option value="ticker">Ticker</Option>
                  <Option value="status">Status</Option>
                </Select>
              </Form.Item>
            </Col>

            {/* Sort Order */}
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="Sort Order" name="sortOrder">
                <Select>
                  <Option value="DESC">Descending</Option>
                  <Option value="ASC">Ascending</Option>
                </Select>
              </Form.Item>
            </Col>

            {/* Action Buttons */}
            <Col xs={24} md={8}>
              <Form.Item label=" ">
                <Space>
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    htmlType="submit"
                    loading={loading}
                  >
                    Search
                  </Button>
                  <Button onClick={handleReset}>
                    Reset
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                    Refresh
                  </Button>
                  <Button
                    type="primary"
                    icon={<PlusCircleOutlined />}
                    onClick={handleNewAnalysis}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                    }}
                  >
                    New Analysis
                  </Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* Results Summary */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <span>Total: {pagination.totalElements} tasks</span>
          <span>|</span>
          <span>Page {pagination.currentPage + 1} of {pagination.totalPages}</span>
        </Space>
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

          {/* Pagination */}
          <Card style={{ marginTop: 24 }}>
            <Row justify="center">
              <Pagination
                current={pagination.currentPage + 1}
                pageSize={pagination.pageSize}
                total={pagination.totalElements}
                onChange={handlePageChange}
                showSizeChanger
                showQuickJumper
                showTotal={(total) => `Total ${total} tasks`}
                pageSizeOptions={['12', '24', '48', '96']}
              />
            </Row>
          </Card>
        </>
      )}
    </div>
  )
}

export default TaskHistory
