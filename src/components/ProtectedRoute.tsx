import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Box, CircularProgress } from '@mui/material'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, admin, loading } = useAuth()

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

  return <>{children}</>
}