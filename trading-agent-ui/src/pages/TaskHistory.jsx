import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Card, Row, Col, Empty, Button, Space, Select, Input } from 'antd'
import { PlusCircleOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import TaskCard from '../components/Task/TaskCard'
import Loading from '../components/Common/Loading'
import { fetchTasks } from '../store/slices/taskSlice'

const { Search } = Input
const { Option } = Select

const TaskHistory = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { tasks, loading } = useSelector((state) => state.task)
  const [filteredTasks, setFilteredTasks] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    dispatch(fetchTasks())
  }, [dispatch])

  useEffect(() => {
    let filtered = tasks

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((task) => task.status === statusFilter)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (task) =>
          task.ticker?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.taskId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.task_id?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredTasks(filtered)
  }, [tasks, statusFilter, searchTerm])

  const handleRefresh = () => {
    dispatch(fetchTasks())
  }

  const handleNewAnalysis = () => {
    navigate('/tasks/new')
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Space>
              <Search
                placeholder="Search by ticker or task ID"
                allowClear
                style={{ width: 300 }}
                onSearch={setSearchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 150 }}
              >
                <Option value="all">All Status</Option>
                <Option value="pending">Pending</Option>
                <Option value="running">Running</Option>
                <Option value="completed">Completed</Option>
                <Option value="failed">Failed</Option>
              </Select>
            </Space>
          </Col>
          <Col>
            <Space>
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
          </Col>
        </Row>
      </Card>

      {filteredTasks.length === 0 ? (
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
        <Row gutter={[16, 16]}>
          {filteredTasks.map((task) => (
            <Col xs={24} sm={12} md={8} lg={6} key={task.taskId || task.task_id || task.id}>
              <TaskCard task={task} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}

export default TaskHistory
