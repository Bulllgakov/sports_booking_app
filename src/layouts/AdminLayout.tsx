import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Dashboard,
  Business,
  SportsTennis,
  CalendarMonth,
  People,
  AttachMoney,
  TrendingUp,
  Settings,
  Menu,
  Close,
  Notifications,
  AccountCircle,
  SupervisorAccount,
  Store,
  ExitToApp,
  CreditCard,
  CardMembership,
} from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import { usePermission } from '../hooks/usePermission'
import '../styles/admin.css'

interface NavItem {
  path: string
  label: string
  icon: React.ReactElement
  permission?: string | string[]
  roles?: Array<'superadmin' | 'admin' | 'manager'>
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { club, logout, admin } = useAuth()
  const { hasPermission, hasRole, isSuperAdmin, canViewFinance, canManageClub } = usePermission()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Динамически формируем навигационные элементы на основе прав
  const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Главная', icon: <Dashboard /> },
    ...(isSuperAdmin ? [
      { path: '/venues', label: 'Все клубы', icon: <Store /> },
      { path: '/admins', label: 'Администраторы', icon: <SupervisorAccount /> },
    ] : []),
    ...(canManageClub() ? [
      { path: '/club', label: 'Управление клубом', icon: <Business /> },
    ] : []),
    { 
      path: '/subscription', 
      label: 'Подписка', 
      icon: <CardMembership />,
      permission: ['manage_club', 'manage_all_venues']
    },
    { 
      path: '/payment-settings', 
      label: 'Настройки оплаты', 
      icon: <CreditCard />,
      permission: ['manage_club', 'manage_all_venues']
    },
    { 
      path: '/courts', 
      label: 'Корты', 
      icon: <SportsTennis />,
      permission: ['manage_courts', 'manage_all_venues']
    },
    { 
      path: '/bookings', 
      label: 'Бронирования', 
      icon: <CalendarMonth />,
      permission: ['manage_bookings', 'manage_all_bookings', 'view_bookings']
    },
    { 
      path: '/customers', 
      label: 'Клиенты', 
      icon: <People />,
      permission: ['manage_all_users', 'manage_club']
    },
    ...(canViewFinance() ? [
      { path: '/finance', label: 'Финансы', icon: <AttachMoney /> },
    ] : []),
    { 
      path: '/marketing', 
      label: 'Маркетинг', 
      icon: <TrendingUp />,
      roles: ['superadmin', 'admin']
    },
    { path: '/settings', label: 'Настройки', icon: <Settings /> },
  ].filter(item => {
    // Фильтруем элементы на основе прав
    if (item.permission && !hasPermission(item.permission)) return false
    if (item.roles && !hasRole(item.roles)) return false
    return true
  })

  const isActive = (path: string) => location.pathname === path

  const handleNavClick = (path: string) => {
    navigate(path)
    if (window.innerWidth <= 768) {
      setSidebarOpen(false)
    }
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // Получить название текущей страницы
  const getCurrentPageTitle = () => {
    const currentItem = navItems.find(item => isActive(item.path))
    return currentItem?.label || 'Главная'
  }

  return (
    <>
      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} 
        onClick={toggleSidebar}
      />
      
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'active' : ''}`}>
        <button className="sidebar-close" onClick={toggleSidebar}>
          <Close />
        </button>
        
        <div className="logo-section">
          <div className="platform-logo">
            <div className="logo-icon">ВК</div>
            <div className="logo-text">Все Корты</div>
          </div>
          
          <div className="club-info">
            <div className="club-logo">
              {club?.logoUrl ? (
                <img src={club.logoUrl} alt={club.name} />
              ) : (
                club?.name?.substring(0, 2).toUpperCase() || 'CL'
              )}
            </div>
            <div className="club-name">{club?.name || 'Загрузка...'}</div>
          </div>
        </div>
        
        <nav className="nav-menu">
          {navItems.map((item) => (
            <a
              key={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => handleNavClick(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
      </aside>
      
      {/* Main Content */}
      <div className="main-container">
        {/* Header */}
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="menu-toggle" onClick={toggleSidebar}>
              <Menu />
            </button>
            <h1 className="page-title">{getCurrentPageTitle()}</h1>
          </div>
          
          <div className="header-actions">
            <button className="notification-btn">
              <Notifications fontSize="small" />
            </button>
            
            <div className="user-menu">
              <button className="user-btn">
                <AccountCircle fontSize="small" />
                <span className="user-name">{admin?.name}</span>
                <span className="user-role">{admin?.role}</span>
              </button>
              <button className="logout-btn" onClick={logout} title="Выйти">
                <ExitToApp fontSize="small" />
              </button>
            </div>
          </div>
        </header>
        
        {/* Content */}
        <div className="content">
          <Outlet />
        </div>
      </div>
    </>
  )
}