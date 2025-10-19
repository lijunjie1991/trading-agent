import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import MainLayout from './components/Layout/MainLayout'
import PrivateRoute from './components/Common/PrivateRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import TaskNew from './pages/TaskNew'
import TaskDetail from './pages/TaskDetail'
import TaskHistory from './pages/TaskHistory'

function App() {
  const { token } = useSelector((state) => state.auth)

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={token ? <Navigate to="/dashboard" /> : <Register />} />

      <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="tasks/new" element={<TaskNew />} />
        <Route path="tasks/:taskId" element={<TaskDetail />} />
        <Route path="tasks" element={<TaskHistory />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
