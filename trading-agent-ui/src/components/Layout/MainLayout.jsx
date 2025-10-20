import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Layout, Menu, Button, Avatar, Dropdown, Typography, Space } from 'antd'
import {
  DashboardOutlined,
  PlusCircleOutlined,
  HistoryOutlined,
  LogoutOutlined,
  UserOutlined,
  RocketOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { logout } from '../../store/slices/authSlice'

const { Header, Sider, Content } = Layout
const { Title } = Typography

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined style={{ fontSize: 20 }} />,
      label: 'Dashboard',
      style: { height: 56 },
    },
    {
      key: '/tasks/new',
      icon: <PlusCircleOutlined style={{ fontSize: 20 }} />,
      label: 'New Analysis',
      style: { height: 56 },
    },
    {
      key: '/tasks',
      icon: <HistoryOutlined style={{ fontSize: 20 }} />,
      label: 'History',
      style: { height: 56 },
    },
  ]

  const handleMenuClick = ({ key }) => {
    navigate(key)
  }

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/login')
  }

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
      danger: true,
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Modern Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={260}
        collapsedWidth={80}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          background: 'linear-gradient(180deg, #1a1f36 0%, #0f1419 100%)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
        }}
      >
        {/* Logo Section */}
        <div
          style={{
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: collapsed ? '0' : '0 24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {!collapsed ? (
            <Space size={12}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                }}
              >
                <RocketOutlined style={{ fontSize: 22, color: '#fff' }} />
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>
                  Quantum Husky
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>
                  AI-Powered Trading
                </div>
              </div>
            </Space>
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              }}
            >
              <RocketOutlined style={{ fontSize: 22, color: '#fff' }} />
            </div>
          )}
        </div>

        {/* Menu */}
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            borderRight: 0,
            marginTop: 24,
            background: 'transparent',
            fontSize: 15,
          }}
          theme="dark"
        />

        {/* Collapse Toggle Button */}
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: 0,
            right: 0,
            padding: '0 16px',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: '100%',
              height: 48,
              color: 'rgba(255,255,255,0.7)',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        </div>
      </Sider>

      {/* Main Content Area */}
      <Layout style={{ marginLeft: collapsed ? 80 : 260, transition: 'margin-left 0.2s' }}>
        {/* Modern Header */}
        <Header
          style={{
            padding: '0 32px',
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            height: 72,
          }}
        >
          <div>
            <Title level={3} style={{ margin: 0, color: '#1f2937' }}>
              {menuItems.find((item) => item.key === location.pathname)?.label || 'Quantum Husky'}
            </Title>
          </div>

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <Avatar
                size={32}
                icon={<UserOutlined />}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: '14px',
                  color: '#4b5563',
                  maxWidth: '200px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={user?.email || 'user@example.com'}
              >
                {user?.email || 'user@example.com'}
              </span>
            </div>
          </Dropdown>
        </Header>

        {/* Page Content */}
        <Content
          style={{
            margin: '32px',
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
