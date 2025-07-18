import React from 'react'
import { 
  Box, 
  Typography, 
  Card, 
  CardContent,
  TextField,
  Button,
  Grid,
  Chip,
  Alert
} from '@mui/material'
import { Save } from '@mui/icons-material'
import { useDemoAuth } from '../../contexts/DemoAuthContext'
import { DEMO_CLUB } from '../../data/demoData'

const VenueSettings: React.FC = () => {
  const { club } = useDemoAuth()

  const handleSave = () => {
    alert('В демо-версии сохранение недоступно')
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Настройки клуба
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        В демо-версии вы можете посмотреть, как выглядят настройки клуба, но изменения не сохраняются.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Основная информация
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Название клуба"
                    value={club?.name || ''}
                    disabled
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Адрес"
                    value={club?.address || ''}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Телефон"
                    value={club?.phone || ''}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={club?.email || ''}
                    disabled
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Описание"
                    value={club?.description || ''}
                    disabled
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Удобства
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {club?.amenities?.map((amenity, index) => (
                  <Chip key={index} label={amenity} onDelete={() => {}} disabled />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Тарифный план
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Chip 
                  label="STANDARD" 
                  color="primary" 
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  До 20 кортов • Неограниченные бронирования
                </Typography>
                <Typography variant="h5" sx={{ mt: 2, mb: 1 }}>
                  2,990₽ / месяц
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Следующее списание: 1 января 2025
                </Typography>
              </Box>
              <Button variant="outlined" fullWidth disabled>
                Изменить тариф
              </Button>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Реквизиты
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                ИНН: {club?.inn || 'Не указан'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Расчетный счет: {club?.bankAccount || 'Не указан'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSave}
          disabled
        >
          Сохранить изменения
        </Button>
      </Box>
    </Box>
  )
}

export default VenueSettings