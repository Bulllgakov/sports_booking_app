import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function TrainerRedirect({ children }: { children: React.ReactNode }) {
  const { admin } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Если это тренер, перенаправляем на календарь
    if (admin?.role === 'trainer') {
      navigate('/admin/bookings', { replace: true })
    }
  }, [admin, navigate])

  // Если это тренер, не показываем дашборд
  if (admin?.role === 'trainer') {
    return null
  }

  // Для всех остальных ролей показываем дашборд
  return <>{children}</>
}