import React, { useEffect, useState } from 'react'
import { 
  Box, 
  Card, 
  CardContent, 
  Grid, 
  Typography, 
  LinearProgress,
  Chip
} from '@mui/material'
import { 
  TrendingUp, 
  People, 
  AttachMoney, 
  SportsTennis,
  Schedule,
  CalendarToday
} from '@mui/icons-material'
import { useDemoAuth } from '../contexts/DemoAuthContext'
import { demoAnalyticsService, demoBookingService } from '../services/demoServices'
import { DEMO_STATS } from '../data/demoData'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  color: string
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography color="text.secondary" variant="body2">
          {title}
        </Typography>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            backgroundColor: `${color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color,
          }}
        >
          {icon}
        </Box>
      </Box>
      <Typography variant="h4" component="div" sx={{ mb: 1 }}>
        {value}
      </Typography>
      {change !== undefined && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <TrendingUp sx={{ fontSize: 16, color: change > 0 ? 'success.main' : 'error.main' }} />
          <Typography
            variant="body2"
            sx={{ color: change > 0 ? 'success.main' : 'error.main' }}
          >
            {change > 0 ? '+' : ''}{change}%
          </Typography>
        </Box>
      )}
    </CardContent>
  </Card>
)

const Dashboard: React.FC = () => {
  const { club } = useDemoAuth()
  const [loading, setLoading] = useState(true)
  const [todayBookings, setTodayBookings] = useState<any[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const bookings = await demoBookingService.getBookings({ date: today })
        setTodayBookings(bookings)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return <LinearProgress />
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Добро пожаловать в {club?.name}!
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Бронирований сегодня"
            value={todayBookings.length}
            change={DEMO_STATS.monthlyGrowth}
            icon={<CalendarToday />}
            color="#00A86B"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Доход за месяц"
            value={formatCurrency(DEMO_STATS.totalRevenue)}
            change={15}
            icon={<AttachMoney />}
            color="#2E86AB"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Активных клиентов"
            value={DEMO_STATS.totalCustomers}
            change={8}
            icon={<People />}
            color="#FF6B6B"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Загрузка кортов"
            value={`${DEMO_STATS.averageOccupancy}%`}
            change={5}
            icon={<SportsTennis />}
            color="#F59E0B"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ближайшие бронирования
              </Typography>
              <Box sx={{ mt: 2 }}>
                {todayBookings.slice(0, 5).map((booking) => (
                  <Box
                    key={booking.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 2,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <Box>
                      <Typography variant="body1" fontWeight={500}>
                        {booking.customerName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {booking.courtName} • {new Date(booking.startTime).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {formatCurrency(booking.price)}
                      </Typography>
                      <Chip
                        label={booking.status === 'confirmed' ? 'Подтверждено' : 'Ожидает'}
                        size="small"
                        color={booking.status === 'confirmed' ? 'success' : 'warning'}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Популярное время
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Утро (6:00 - 12:00)</Typography>
                    <Typography variant="body2">{DEMO_STATS.popularTimes.morning}%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={DEMO_STATS.popularTimes.morning} 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">День (12:00 - 18:00)</Typography>
                    <Typography variant="body2">{DEMO_STATS.popularTimes.afternoon}%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={DEMO_STATS.popularTimes.afternoon} 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Вечер (18:00 - 23:00)</Typography>
                    <Typography variant="body2">{DEMO_STATS.popularTimes.evening}%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={DEMO_STATS.popularTimes.evening} 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Dashboard