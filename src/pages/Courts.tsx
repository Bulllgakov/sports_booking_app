import React, { useEffect, useState } from 'react'
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Chip,
  Button,
  LinearProgress
} from '@mui/material'
import { Add, Edit } from '@mui/icons-material'
import { demoCourtService } from '../services/demoServices'

const Courts: React.FC = () => {
  const [courts, setCourts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCourts()
  }, [])

  const loadCourts = async () => {
    try {
      const data = await demoCourtService.getCourts()
      setCourts(data)
    } catch (error) {
      console.error('Error loading courts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCourtTypeColor = (type: string) => {
    switch (type) {
      case 'padel': return '#2E86AB'
      case 'tennis': return '#00A86B'
      case 'badminton': return '#FF6B6B'
      default: return '#6B7280'
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(price)
  }

  if (loading) {
    return <LinearProgress />
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Корты
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => alert('В демо-версии добавление кортов недоступно')}
        >
          Добавить корт
        </Button>
      </Box>

      <Grid container spacing={3}>
        {courts.map((court) => (
          <Grid item xs={12} md={6} lg={4} key={court.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {court.name}
                    </Typography>
                    <Chip
                      label={court.type === 'padel' ? 'Падел' : court.type === 'tennis' ? 'Теннис' : 'Бадминтон'}
                      size="small"
                      sx={{ 
                        backgroundColor: `${getCourtTypeColor(court.type)}20`,
                        color: getCourtTypeColor(court.type),
                        fontWeight: 600
                      }}
                    />
                  </Box>
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    onClick={() => alert('В демо-версии редактирование недоступно')}
                  >
                    Изменить
                  </Button>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Покрытие: {court.surface}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {court.indoor ? 'Крытый' : 'Открытый'} • {court.lighting ? 'С освещением' : 'Без освещения'}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Цены:
                  </Typography>
                  <Typography variant="body2">
                    Стандарт: {formatPrice(court.pricePerHour.default)}/час
                  </Typography>
                  <Typography variant="body2">
                    Утро: {formatPrice(court.pricePerHour.morning)}/час
                  </Typography>
                  <Typography variant="body2">
                    Вечер: {formatPrice(court.pricePerHour.evening)}/час
                  </Typography>
                </Box>

                {court.amenities && court.amenities.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Удобства:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {court.amenities.map((amenity: string, index: number) => (
                        <Chip
                          key={index}
                          label={amenity}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

export default Courts