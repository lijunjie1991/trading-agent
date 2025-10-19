import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { message } from 'antd'
import TaskForm from '../components/Task/TaskForm'
import { startAnalysis } from '../store/slices/taskSlice'

const TaskNew = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { submitting, currentTaskId, error } = useSelector((state) => state.task)

  useEffect(() => {
    if (currentTaskId) {
      message.success('Analysis started successfully!')
      navigate(`/tasks/${currentTaskId}`)
    }
  }, [currentTaskId, navigate])

  useEffect(() => {
    if (error) {
      message.error(error)
    }
  }, [error])

  const handleSubmit = async (taskData) => {
    await dispatch(startAnalysis(taskData))
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <TaskForm onSubmit={handleSubmit} loading={submitting} />
    </div>
  )
}

export default TaskNew
