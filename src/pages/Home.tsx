import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  Grid,
  Card,
  CardContent,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { PhoneAndroid, Web, QrCode2 } from '@mui/icons-material'

export default function Home() {
  const navigate = useNavigate()

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box textAlign="center" mb={6}>
        <Typography variant="h2" component="h1" gutterBottom>
          Sports Booking
        </Typography>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          Система бронирования спортивных кортов
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
          Мобильное приложение для клиентов и веб-панель управления для клубов
        </Typography>
      </Box>

      <Grid container spacing={4} mb={6}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <PhoneAndroid sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Для клиентов
              </Typography>
              <Typography variant="body1" color="text.secondary" mb={3}>
                Скачайте мобильное приложение для бронирования кортов, поиска партнеров и оплаты
              </Typography>
              <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
                <Button variant="outlined" disabled>
                  App Store
                </Button>
                <Button variant="outlined" disabled>
                  Google Play
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Web sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Для клубов
              </Typography>
              <Typography variant="body1" color="text.secondary" mb={3}>
                Веб-панель управления для администраторов спортивных клубов
              </Typography>
              <Button 
                variant="contained" 
                size="large"
                onClick={() => navigate('/admin/login')}
              >
                Войти в админ-панель
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <QrCode2 sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          QR-код для клиентов
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={3}>
          Разместите этот QR-код в вашем клубе, чтобы клиенты могли скачать приложение
        </Typography>
        <Box
          sx={{
            maxWidth: 200,
            height: 200,
            mx: 'auto',
            bgcolor: 'grey.100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 2,
          }}
        >
          <Typography color="text.secondary">
            QR-код приложения
          </Typography>
        </Box>
      </Paper>
    </Container>
  )
}