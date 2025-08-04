import { useAuth } from '../contexts/AuthContext'

type Permission = 
  | 'manage_all_venues'
  | 'manage_all_bookings'
  | 'manage_all_users'
  | 'manage_platform_settings'
  | 'view_all_reports'
  | 'manage_finance'
  | 'manage_admins'
  | 'manage_bookings'
  | 'manage_courts'
  | 'manage_club'
  | 'view_reports'
  | 'view_bookings'
  | 'create_bookings'

export const usePermission = () => {
  const { admin } = useAuth()

  const hasPermission = (permission: Permission | Permission[]): boolean => {
    if (!admin) return false

    // Суперадмин имеет все права
    if (admin.role === 'superadmin') return true

    // Проверка для массива прав (любое из)
    if (Array.isArray(permission)) {
      return permission.some(p => admin.permissions.includes(p))
    }

    // Проверка одного права
    return admin.permissions.includes(permission)
  }

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    if (!admin) return false

    // Суперадмин имеет все права
    if (admin.role === 'superadmin') return true

    // Проверка всех прав
    return permissions.every(p => admin.permissions.includes(p))
  }

  const hasRole = (role: 'superadmin' | 'admin' | 'manager' | Array<'superadmin' | 'admin' | 'manager'>): boolean => {
    if (!admin) return false

    if (Array.isArray(role)) {
      return role.includes(admin.role)
    }

    return admin.role === role
  }

  const canAccessVenue = (venueId: string): boolean => {
    if (!admin) return false

    // Суперадмин имеет доступ ко всем клубам
    if (admin.role === 'superadmin') return true

    // Админ и менеджер имеют доступ только к своему клубу
    return admin.venueId === venueId
  }

  const canManageAdmins = (): boolean => {
    return hasPermission('manage_admins')
  }

  const canManageAllVenues = (): boolean => {
    return hasPermission('manage_all_venues')
  }

  const canViewFinance = (): boolean => {
    return hasPermission(['manage_finance', 'view_reports'])
  }

  const canManageBookings = (): boolean => {
    return hasPermission(['manage_bookings', 'manage_all_bookings'])
  }

  const canManageCourts = (): boolean => {
    return hasPermission(['manage_courts', 'manage_all_venues'])
  }

  const canManageClub = (): boolean => {
    // Суперадмин всегда может управлять клубами
    if (admin?.role === 'superadmin') return true
    
    // Администратор клуба может управлять своим клубом
    // (даже если у него временно отсутствует право manage_club)
    if (admin?.role === 'admin' && admin?.venueId) return true
    
    // Проверка конкретных прав
    return hasPermission(['manage_club', 'manage_all_venues'])
  }

  const canViewReports = (): boolean => {
    return hasPermission(['view_reports', 'view_all_reports'])
  }

  return {
    hasPermission,
    hasAllPermissions,
    hasRole,
    canAccessVenue,
    canManageAdmins,
    canManageAllVenues,
    canViewFinance,
    canManageBookings,
    canManageCourts,
    canManageClub,
    canViewReports,
    permissions: admin?.permissions || [],
    role: admin?.role || null,
    isSuperAdmin: admin?.role === 'superadmin',
    isAdmin: admin?.role === 'admin',
    isManager: admin?.role === 'manager'
  }
}