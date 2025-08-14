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
  Payment,
  School,
} from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import { usePermission } from '../hooks/usePermission'
import AllCourtsLogo from '../components/AllCourtsLogo'
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
    { path: '/admin/dashboard', label: 'Главная', icon: <Dashboard /> },
    { 
      path: '/admin/bookings', 
      label: 'Календарь', 
      icon: <CalendarMonth />,
      permission: ['manage_bookings', 'manage_all_bookings', 'view_bookings']
    },
    { 
      path: '/admin/trainers', 
      label: 'Тренеры', 
      icon: <School />,
      permission: ['manage_club', 'manage_all_venues']
    },
    ...(isSuperAdmin ? [
      { path: '/admin/venues', label: 'Все клубы', icon: <Store /> },
      { path: '/admin/billing-settings', label: 'Настройки биллинга', icon: <Payment /> },
      { path: '/admin/admins', label: 'Администраторы', icon: <SupervisorAccount /> },
    ] : []),
    ...(canManageClub() ? [
      { path: '/admin/club', label: 'Управление клубом', icon: <Business /> },
    ] : []),
    { 
      path: '/admin/subscription', 
      label: 'Подписка', 
      icon: <CardMembership />,
      permission: ['manage_club', 'manage_all_venues']
    },
    { 
      path: '/admin/payment-settings', 
      label: 'Настройки оплаты', 
      icon: <CreditCard />,
      permission: ['manage_club', 'manage_all_venues']
    },
    { 
      path: '/admin/courts', 
      label: 'Корты', 
      icon: <SportsTennis />,
      permission: ['manage_courts', 'manage_all_venues']
    },
    { 
      path: '/admin/customers', 
      label: 'Клиенты', 
      icon: <People />,
      permission: ['manage_all_users', 'manage_club']
    },
    ...(canViewFinance() ? [
      { path: '/admin/finance', label: 'Финансы', icon: <AttachMoney /> },
    ] : []),
    { 
      path: '/admin/marketing', 
      label: 'Маркетинг', 
      icon: <TrendingUp />,
      roles: ['superadmin', 'admin']
    },
    ...(isSuperAdmin ? [
      { path: '/admin/settings', label: 'Системные настройки', icon: <Settings /> },
    ] : []),
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
            <AllCourtsLogo size={40} />
            <div className="logo-text">Все Корты</div>
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
            
            {/* Название клуба для обычных админов */}
            {!isSuperAdmin && club && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                marginRight: '16px',
                padding: '8px 16px',
                background: 'var(--background)',
                borderRadius: '8px',
                border: '1px solid var(--extra-light-gray)'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: 'var(--primary)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '700',
                  overflow: 'hidden'
                }}>
                  {club.logoUrl ? (
                    <img src={club.logoUrl} alt={club.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    club.name?.substring(0, 2).toUpperCase() || 'CL'
                  )}
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start'
                }}>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: 'var(--dark)',
                    lineHeight: '1.2' 
                  }}>
                    {club.name}
                  </span>
                  <span style={{ 
                    fontSize: '12px', 
                    color: 'var(--gray)',
                    lineHeight: '1.2' 
                  }}>
                    {admin?.role === 'admin' ? 'Администратор' : 'Менеджер'}
                  </span>
                </div>
              </div>
            )}
            
            <div className="user-menu">
              {/* Показываем информацию о пользователе только для обычных админов */}
              {!isSuperAdmin && (
                <div className="user-info">
                  <span className="user-name">{admin?.name}</span>
                  <span className="user-role">{admin?.role}</span>
                </div>
              )}
              
              {/* Для суперадмина показываем только иконку и кнопку выхода */}
              {isSuperAdmin && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  marginRight: '8px'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    background: '#ef4444',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}>
                    SA
                  </div>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: 'var(--dark)'
                  }}>
                    Суперадминистратор
                  </span>
                </div>
              )}
              
              {!isSuperAdmin && (
                <button className="user-btn">
                  <AccountCircle fontSize="small" />
                </button>
              )}
              
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