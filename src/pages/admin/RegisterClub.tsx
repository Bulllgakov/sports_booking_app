import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Fade,
  LinearProgress
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { addDoc, collection, setDoc, doc, writeBatch } from 'firebase/firestore'
import { auth, db, realtimeDb, functions } from '../../services/firebase'
import { ref, set } from 'firebase/database'
import { httpsCallable } from 'firebase/functions'
import { 
  Business, 
  CheckCircle,
  SportsTennis,
  CalendarMonth,
  People,
  Analytics,
  Notifications,
  Payment,
  Settings,
  Security
} from '@mui/icons-material'
import AllCourtsLogo from '../../components/AllCourtsLogo'

interface ClubData {
  name: string
  address: string
  city: string
  phone: string
  email: string
  description: string
  organizationType: string
  inn: string
  bankAccount: string
  adminPassword: string
}

const features = [
  { icon: <SportsTennis />, title: 'Управление кортами', description: 'Настройка расписания и цен' },
  { icon: <CalendarMonth />, title: 'Онлайн-бронирование', description: 'Прием заявок 24/7' },
  { icon: <People />, title: 'База клиентов', description: 'CRM система для клуба' },
  { icon: <Analytics />, title: 'Аналитика и отчеты', description: 'Статистика доходов и загрузки' },
  { icon: <Notifications />, title: 'Уведомления', description: 'SMS и email рассылки' },
  { icon: <Payment />, title: 'Онлайн-оплата', description: 'Прием платежей картами' },
  { icon: <Settings />, title: 'Гибкие настройки', description: 'Адаптация под ваш клуб' },
  { icon: <Security />, title: 'Безопасность', description: 'Защита данных клиентов' }
]

export default function RegisterClub() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [isPendingRegistration, setIsPendingRegistration] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0)
  const [showFeatures, setShowFeatures] = useState(false)
  const [clubData, setClubData] = useState<ClubData>({
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    description: '',
    organizationType: 'ИП',
    inn: '',
    bankAccount: '',
    adminPassword: ''
  })

  // Эффект для анимации прогресса и функций
  useEffect(() => {
    if (loading) {
      setShowFeatures(true)
      setCurrentFeatureIndex(0)
      setLoadingProgress(0)
      
      // Анимация прогресс бара
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval)
            return 95
          }
          return prev + Math.random() * 10
        })
      }, 500)
      
      // Смена функций
      const featureInterval = setInterval(() => {
        setCurrentFeatureIndex(prev => {
          if (prev >= features.length - 1) {
            clearInterval(featureInterval)
            return prev
          }
          return prev + 1
        })
      }, 2000)
      
      return () => {
        clearInterval(progressInterval)
        clearInterval(featureInterval)
      }
    } else {
      setShowFeatures(false)
      setLoadingProgress(0)
      setCurrentFeatureIndex(0)
    }
  }, [loading])

  // Генерация случайного пароля
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let password = ''
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted with data:', clubData)
    setError('')
    setLoading(true)

    try {
      // Валидация обязательных полей
      if (!clubData.name || !clubData.address || !clubData.city || !clubData.phone || !clubData.email) {
        setError('Заполните все обязательные поля')
        setLoading(false)
        return
      }

      // Генерируем пароль если не указан
      const password = clubData.adminPassword || generatePassword()
      console.log('Generated/provided password:', password)

      // Выходим из текущего аккаунта если есть
      if (auth.currentUser) {
        console.log('Signing out current user:', auth.currentUser.email)
        await signOut(auth)
      }
      
      // Создаем пользователя в Firebase Auth
      console.log('Creating user with email:', clubData.email)
      const userCredential = await createUserWithEmailAndPassword(auth, clubData.email, password)
      const userId = userCredential.user.uid
      console.log('User created successfully with ID:', userId)

      // Создаем новый клуб (используем тот же код что работает в VenuesManagement)
      const venueData = {
        name: clubData.name,
        address: clubData.address,
        city: clubData.city,
        phone: clubData.phone,
        email: clubData.email,
        description: clubData.description || '',
        organizationType: clubData.organizationType,
        inn: clubData.inn,
        bankAccount: clubData.bankAccount || '',
        status: 'pending', // Новые клубы требуют модерации
        createdAt: new Date(),
        updatedAt: new Date(),
        logoUrl: '',
        amenities: [],
        location: null
      }
      
      console.log('Creating venue with data:', venueData)
      
      // Для неавторизованных пользователей сразу используем Cloud Function
      let clubCreated = false
      let venueId = ''
      
      try {
        console.log('Creating club via Cloud Function...')
        console.log('Sending data:', {
          venueData,
          password: password,
          userId: userId
        })
        
        // Используем обычный HTTP запрос к Cloud Function
        const response = await fetch('https://europe-west1-sports-booking-app-1d7e5.cloudfunctions.net/createClubHttp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            venueData,
            password: password,
            userId: userId
          })
        })
        
        const result = await response.json()
        
        if (result.success) {
          console.log('Club created via Cloud Function!')
          clubCreated = true
          venueId = result.venueId
        } else {
          throw new Error(result.error || 'Unknown error')
        }
      } catch (error: any) {
        console.error('Cloud Function failed:', error)
        throw error
      }
      
      // Если ничего не сработало, сохраняем локально
      if (!clubCreated) {
        console.log('Saving registration for manual processing...')
        const registrationData = {
          id: userId,
          userId: userId,
          venueData: venueData,
          password: password,
          timestamp: new Date().toISOString(),
          status: 'pending_manual_creation'
        }
        
        localStorage.setItem('pendingClubRegistration_' + userId, JSON.stringify(registrationData))
        setIsPendingRegistration(true)
      } else {
        setIsPendingRegistration(false)
      }

      // Сохраняем данные для отображения
      setClubData({ ...clubData, adminPassword: password })
      
      // Если клуб создан успешно, доводим прогресс до 100%
      if (clubCreated || !isPendingRegistration) {
        setLoadingProgress(100)
      }
      
      // Выходим из системы после создания, чтобы не было автоматического входа
      if (auth.currentUser) {
        await signOut(auth)
        console.log('Signed out after club creation')
      }
      
      setSuccessDialogOpen(true)
      console.log('Registration completed successfully!')
      
    } catch (error: any) {
      console.error('Error creating club:', error)
      console.error('Error details:', {
        code: error?.code,
        message: error?.message,
        stack: error?.stack
      })
      
      if (error.code === 'auth/email-already-in-use') {
        setError('Этот email уже используется. Пожалуйста, войдите в систему.')
      } else if (error.code === 'auth/weak-password') {
        setError('Пароль слишком слабый. Минимум 6 символов.')
      } else if (error.code === 'auth/invalid-email') {
        setError('Неверный формат email адреса.')
      } else {
        setError('Ошибка при создании клуба: ' + (error.message || 'Неизвестная ошибка'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          marginTop: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <AllCourtsLogo size={60} className="mb-4" />
        
        <Typography component="h1" variant="h4" gutterBottom>
          Регистрация клуба
        </Typography>
        
        <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
          Создайте аккаунт для управления вашим спортивным клубом
        </Typography>
        
        <Paper sx={{ width: '100%', p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { md: '1fr 1fr' } }}>
              <Typography variant="h6" sx={{ gridColumn: '1 / -1', mb: 1 }}>
                Информация о клубе
              </Typography>
              
              <TextField
                label="Название клуба"
                value={clubData.name}
                onChange={(e) => setClubData({ ...clubData, name: e.target.value })}
                fullWidth
                required
              />
              
              <TextField
                label="Адрес"
                value={clubData.address}
                onChange={(e) => setClubData({ ...clubData, address: e.target.value })}
                fullWidth
                required
              />
              
              <TextField
                label="Город"
                value={clubData.city}
                onChange={(e) => setClubData({ ...clubData, city: e.target.value })}
                fullWidth
                required
              />
              
              <TextField
                label="Телефон"
                value={clubData.phone}
                onChange={(e) => setClubData({ ...clubData, phone: e.target.value })}
                fullWidth
                required
                placeholder="+7 (900) 123-45-67"
              />
              
              <TextField
                label="Email"
                value={clubData.email}
                onChange={(e) => setClubData({ ...clubData, email: e.target.value })}
                fullWidth
                required
                type="email"
                sx={{ gridColumn: '1 / -1' }}
              />
              
              
              <Typography variant="h6" sx={{ gridColumn: '1 / -1', mt: 2, mb: 1 }}>
                Юридическая информация
              </Typography>
              
              <FormControl fullWidth>
                <InputLabel>Форма организации</InputLabel>
                <Select
                  value={clubData.organizationType}
                  onChange={(e) => setClubData({ ...clubData, organizationType: e.target.value })}
                  label="Форма организации"
                >
                  <MenuItem value="ИП">ИП</MenuItem>
                  <MenuItem value="ООО">ООО</MenuItem>
                  <MenuItem value="Самозанятый">Самозанятый</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="ИНН"
                value={clubData.inn}
                onChange={(e) => setClubData({ ...clubData, inn: e.target.value })}
                fullWidth
              />
              
              
              <TextField
                label="Пароль администратора (необязательно)"
                value={clubData.adminPassword}
                onChange={(e) => setClubData({ ...clubData, adminPassword: e.target.value })}
                fullWidth
                type="password"
                helperText="Если не указан, будет сгенерирован автоматически"
              />
            </Box>
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                type="button"
                onClick={() => navigate('/admin/login')}
                disabled={loading}
              >
                Уже есть аккаунт?
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
              >
                {loading ? 'Создание...' : 'Создать клуб'}
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>

      {/* Диалог успешной регистрации */}
      <Dialog
        open={successDialogOpen}
        onClose={() => {}}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <Business color={isPendingRegistration ? "warning" : "success"} />
            {isPendingRegistration ? 'Регистрация отправлена!' : 'Клуб успешно создан!'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity={isPendingRegistration ? "warning" : "success"} sx={{ mb: 2 }}>
            {isPendingRegistration 
              ? 'Ваша заявка принята! Мы свяжемся с вами в течение 24 часов для завершения регистрации.'
              : 'Сохраните эти данные для входа в систему'}
          </Alert>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Название клуба
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {clubData.name}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" color="textSecondary">
                Email администратора
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {clubData.email}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" color="textSecondary">
                Пароль администратора
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {clubData.adminPassword}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 3 }}>
          <Button
            onClick={() => navigate('/')}
            variant="outlined"
          >
            На главную
          </Button>
          {!isPendingRegistration && (
            <Button
              onClick={() => window.open('/admin/login', '_blank')}
              variant="contained"
              startIcon={<Business />}
            >
              Вход для админов
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Диалог загрузки с анимацией */}
      <Dialog
        open={loading}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            borderRadius: 3
          }
        }}
      >
        <DialogContent sx={{ py: 4 }}>
          <Box textAlign="center">
            <AllCourtsLogo size={80} className="mb-4" />
            
            <Typography variant="h5" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
              Создаем ваш клуб...
            </Typography>
            
            <Box sx={{ mb: 4 }}>
              <LinearProgress 
                variant="determinate" 
                value={loadingProgress} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  backgroundColor: 'rgba(0, 168, 107, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    backgroundColor: '#00A86B'
                  }
                }}
              />
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                {Math.round(loadingProgress)}%
              </Typography>
            </Box>
            
            {showFeatures && (
              <Box sx={{ minHeight: 120 }}>
                {features.map((feature, index) => (
                  <Fade
                    key={index}
                    in={currentFeatureIndex >= index}
                    timeout={1000}
                    style={{ 
                      display: currentFeatureIndex === index ? 'block' : 'none' 
                    }}
                  >
                    <Box>
                      <Box 
                        sx={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          backgroundColor: 'rgba(0, 168, 107, 0.1)',
                          mb: 2
                        }}
                      >
                        {React.cloneElement(feature.icon, { 
                          sx: { fontSize: 30, color: '#00A86B' } 
                        })}
                      </Box>
                      <Typography variant="h6" gutterBottom>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {feature.description}
                      </Typography>
                    </Box>
                  </Fade>
                ))}
              </Box>
            )}
            
            <Typography variant="body2" color="textSecondary" sx={{ mt: 3 }}>
              Настраиваем систему управления для вашего клуба...
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    </Container>
  )
}