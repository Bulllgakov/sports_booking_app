import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Dashboard,
  Business,
  SportsTennis,
  CalendarMonth,
  People,
  Settings,
  Menu,
  Close,
  Notifications,
  AccountCircle,
  ExitToApp,
  TrendingUp,
} from '@mui/icons-material'
import { useDemoAuth } from '../contexts/DemoAuthContext'
import '../styles/admin.css'

interface NavItem {
  path: string
  label: string
  icon: React.ReactElement
}

export default function DemoAdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { club, logout, admin } = useDemoAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Главная', icon: <Dashboard /> },
    { path: '/calendar', label: 'Календарь', icon: <CalendarMonth /> },
    { path: '/courts', label: 'Корты', icon: <SportsTennis /> },
    { path: '/customers', label: 'Клиенты', icon: <People /> },
    { path: '/analytics', label: 'Аналитика', icon: <TrendingUp /> },
    { path: '/settings', label: 'Настройки', icon: <Settings /> },
  ]

  const handleNavigation = (path: string) => {
    navigate(path)
    setSidebarOpen(false)
  }

  return (
    <div className="admin-layout">
      {/* Mobile sidebar overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'active' : ''}`}>
        <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
          <Close />
        </button>
        
        <div className="logo-section">
          <div className="platform-logo">
            <div className="logo-icon">ВК</div>
            <div className="logo-text">Все Корты</div>
          </div>
          
          {club && (
            <div className="club-info">
              <div className="club-logo">
                {club.logoUrl ? (
                  <img src={club.logoUrl} alt={club.name} />
                ) : (
                  club.name.substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="club-name">{club.name}</div>
            </div>
          )}
        </div>

        <nav className="nav-menu">
          {navItems.map((item) => (
            <a
              key={item.path}
              href="#"
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                handleNavigation(item.path)
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="main-container">
        <header className="header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
            <Menu />
          </button>
          
          <h1 className="page-title">
            {navItems.find(item => item.path === location.pathname)?.label || 'Админ-панель'}
          </h1>

          <div className="header-actions">
            <button className="notification-btn">
              <Notifications />
            </button>

            <div className="user-menu">
              <button className="user-btn">
                <AccountCircle />
                {admin && (
                  <>
                    <div>
                      <div className="user-name">{admin.name}</div>
                      <div className="user-role">{admin.role}</div>
                    </div>
                  </>
                )}
              </button>
              
              <button className="logout-btn" onClick={logout}>
                <ExitToApp />
              </button>
            </div>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}