import React from 'react'
import { usePermission } from '../hooks/usePermission'
import { useAuth } from '../contexts/AuthContext'
import { Alert, AlertTitle } from '@mui/material'

interface PermissionGateProps {
  children: React.ReactNode
  permission?: string | string[]
  role?: 'superadmin' | 'admin' | 'manager' | Array<'superadmin' | 'admin' | 'manager'>
  requireAll?: boolean
  fallback?: React.ReactNode
  allowTrainer?: boolean // Новый проп для разрешения доступа тренерам
}

export const PermissionGate: React.FC<PermissionGateProps> = ({ 
  children, 
  permission, 
  role,
  requireAll = false,
  fallback,
  allowTrainer = false
}) => {
  const { hasPermission, hasAllPermissions, hasRole } = usePermission()
  const { admin } = useAuth()

  // Если разрешено тренерам и текущий пользователь - тренер, даём доступ
  if (allowTrainer && admin?.role === 'trainer') {
    return <>{children}</>
  }

  // Проверка ролей
  if (role && !hasRole(role)) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <Alert severity="error" sx={{ mt: 2 }}>
        <AlertTitle>Доступ запрещен</AlertTitle>
        У вас недостаточно прав для просмотра этой страницы.
      </Alert>
    )
  }

  // Проверка прав
  if (permission) {
    const hasAccess = requireAll && Array.isArray(permission)
      ? hasAllPermissions(permission)
      : hasPermission(permission)

    if (!hasAccess) {
      return fallback ? (
        <>{fallback}</>
      ) : (
        <Alert severity="error" sx={{ mt: 2 }}>
          <AlertTitle>Доступ запрещен</AlertTitle>
          У вас недостаточно прав для просмотра этой страницы.
        </Alert>
      )
    }
  }

  return <>{children}</>
}