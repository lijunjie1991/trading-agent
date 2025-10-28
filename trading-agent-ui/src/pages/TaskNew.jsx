import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { message } from 'antd'
import TaskForm from '../components/Task/TaskForm'
import { startAnalysis, setCurrentTaskId } from '../store/slices/taskSlice'

const TaskNew = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { submitting, currentTaskId, error } = useSelector((state) => state.task)
  const isSubmittingRef = useRef(false)

  // Clear currentTaskId when entering this page
  useEffect(() => {
    dispatch(setCurrentTaskId(null))
  }, [dispatch])

  // Only navigate when we just submitted a new task
  useEffect(() => {
    if (currentTaskId && isSubmittingRef.current) {
      isSubmittingRef.current = false
      message.success('Analysis started successfully!')
      navigate(`/tasks/${currentTaskId}`)
    }
  }, [currentTaskId, navigate])

  useEffect(() => {
    if (error) {
      message.error(error)
      isSubmittingRef.current = false
    }
  }, [error])

  const handleSubmit = async (taskData) => {
    isSubmittingRef.current = true
    await dispatch(startAnalysis(taskData))
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <TaskForm onSubmit={handleSubmit} loading={submitting} />
    </div>
  )
}

export default TaskNew
