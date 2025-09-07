import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Box, CircularProgress } from '@mui/material'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, admin, loading } = useAuth()
  const location = useLocation()

  console.log('🛡️ ProtectedRoute check:', {
    user: user?.email || 'no user',
    admin: admin?.email || 'no admin',
    loading
  })

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    )
  }

  if (!user || !admin) {
    console.log('🚫 Access denied, redirecting to login')
    return <Navigate to="/login" replace />
  }

  // Если это тренер и он пытается зайти на дашборд или корневой путь админки, перенаправляем на календарь
  if (admin?.role === 'trainer' && (location.pathname === '/admin' || location.pathname === '/admin/' || location.pathname === '/admin/dashboard')) {
    console.log('👨‍🏫 Trainer detected, redirecting to calendar')
    return <Navigate to="/admin/bookings" replace />
  }

  return <>{children}</>
}