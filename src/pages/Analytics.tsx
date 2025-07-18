import React from 'react'
import { 
  Box, 
  Typography, 
  Card, 
  CardContent,
  Grid,
  LinearProgress
} from '@mui/material'
import { DEMO_STATS } from '../data/demoData'

const Analytics: React.FC = () => {
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
        Аналитика
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Загрузка кортов по типам
              </Typography>
              {DEMO_STATS.courtUtilization.map((court) => (
                <Box key={court.courtId} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">{court.courtName}</Typography>
                    <Typography variant="body2">{court.utilization}%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={court.utilization} 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Финансовые показатели
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Доход за текущий месяц
                </Typography>
                <Typography variant="h4">
                  {formatCurrency(DEMO_STATS.totalRevenue)}
                </Typography>
                <Typography variant="body2" color="success.main">
                  +{DEMO_STATS.monthlyGrowth}% к прошлому месяцу
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Средний чек
                </Typography>
                <Typography variant="h5">
                  {formatCurrency(DEMO_STATS.totalRevenue / DEMO_STATS.totalBookings)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                График доходов (демо-данные)
              </Typography>
              <Box sx={{ 
                height: 300, 
                background: 'linear-gradient(180deg, #f5f5f5 0%, #e0e0e0 100%)',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Typography variant="body1" color="text.secondary">
                  График доходов за последние 30 дней
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Analytics