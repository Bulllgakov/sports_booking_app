import { useDemoAuth } from '../contexts/DemoAuthContext'

export const useDemoPermission = () => {
  const { admin } = useDemoAuth()

  const hasPermission = (permission: string | string[]): boolean => {
    return true // В демо все разрешения доступны
  }

  const hasRole = (role: 'superadmin' | 'admin' | 'manager'): boolean => {
    return admin?.role === role
  }

  const isSuperAdmin = admin?.role === 'superadmin'
  const isAdmin = admin?.role === 'admin'
  const isManager = admin?.role === 'manager'

  const canViewFinance = () => true
  const canManageClub = () => true
  const canManageCourts = () => true
  const canManageBookings = () => true
  const canManageCustomers = () => true
  const canViewAnalytics = () => true

  return {
    hasPermission,
    hasRole,
    isSuperAdmin,
    isAdmin,
    isManager,
    canViewFinance,
    canManageClub,
    canManageCourts,
    canManageBookings,
    canManageCustomers,
    canViewAnalytics,
  }
}