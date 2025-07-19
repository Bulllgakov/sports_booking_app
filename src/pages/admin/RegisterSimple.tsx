import React, { useState } from 'react'
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../services/firebase'
import { SportsScore, Email, Phone, Person, Business } from '@mui/icons-material'
import InputMask from 'react-input-mask'

interface FormData {
  // Contact data
  email: string
  phone: string
  adminName: string
  
  // Club data
  clubName: string
  clubAddress: string
  clubDescription: string
  organizationType: string
  inn: string
}

export default function RegisterSimple() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successDialog, setSuccessDialog] = useState(false)
  const [credentials, setCredentials] = useState<{email: string, password: string} | null>(null)
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    phone: '',
    adminName: '',
    clubName: '',
    clubAddress: '',
    clubDescription: '',
    organizationType: 'ИП',
    inn: ''
  })

  const [errors, setErrors] = useState<Partial<FormData>>({})

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {}
    
    if (!formData.email) newErrors.email = 'Email обязателен'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Некорректный email'
    }
    
    if (!formData.phone) newErrors.phone = 'Телефон обязателен'
    else if (formData.phone.replace(/\D/g, '').length < 11) {
      newErrors.phone = 'Некорректный номер телефона'
    }
    
    if (!formData.adminName) newErrors.adminName = 'ФИО обязательно'
    if (!formData.clubName) newErrors.clubName = 'Название клуба обязательно'
    if (!formData.clubAddress) newErrors.clubAddress = 'Адрес клуба обязателен'
    
    if (!formData.inn) newErrors.inn = 'ИНН обязателен'
    else if (!/^\d{10,12}$/.test(formData.inn)) {
      newErrors.inn = 'ИНН должен содержать 10 или 12 цифр'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const generatePassword = (): string => {
    const length = 12
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return password
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Генерируем пароль
      const password = generatePassword()
      
      // Создаем пользователя
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        password
      )
      
      const userId = userCredential.user.uid
      
      // Создаем venue/club
      const venueRef = doc(db, 'venues', userId)
      await setDoc(venueRef, {
        name: formData.clubName,
        address: formData.clubAddress,
        description: formData.clubDescription,
        phone: formData.phone,
        email: formData.email,
        organizationType: formData.organizationType,
        inn: formData.inn,
        logoUrl: '',
        amenities: [],
        subscription: {
          plan: 'start',
          status: 'active',
          courtsCount: 0,
          startDate: serverTimestamp(),
          endDate: null
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      // Создаем admin user
      const adminRef = doc(db, 'admins', userId)
      await setDoc(adminRef, {
        name: formData.adminName,
        email: formData.email,
        phone: formData.phone,
        role: 'admin',
        venueId: userId,
        permissions: [
          'manage_club',
          'manage_courts',
          'manage_bookings',
          'view_reports',
          'manage_finance'
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      // Сохраняем временные данные для отображения
      setCredentials({
        email: formData.email,
        password: password
      })
      
      setSuccessDialog(true)
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Этот email уже зарегистрирован')
      } else if (err.code === 'auth/weak-password') {
        setError('Ошибка создания пароля')
      } else {
        setError('Ошибка при создании аккаунта: ' + err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({ ...formData, [field]: e.target.value })
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined })
    }
  }

  const handleSuccessClose = () => {
    navigate('/admin/dashboard')
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
        <SportsScore sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        
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
                Контактные данные
              </Typography>
              
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                error={!!errors.email}
                helperText={errors.email}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  )
                }}
              />
              
              <InputMask
                mask="+7 (999) 999-99-99"
                value={formData.phone}
                onChange={handleChange('phone')}
              >
                {(inputProps: any) => (
                  <TextField
                    {...inputProps}
                    fullWidth
                    label="Телефон"
                    error={!!errors.phone}
                    helperText={errors.phone}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone />
                        </InputAdornment>
                      )
                    }}
                  />
                )}
              </InputMask>
              
              <TextField
                fullWidth
                label="ФИО администратора"
                value={formData.adminName}
                onChange={handleChange('adminName')}
                error={!!errors.adminName}
                helperText={errors.adminName}
                sx={{ gridColumn: '1 / -1' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  )
                }}
              />
              
              <Typography variant="h6" sx={{ gridColumn: '1 / -1', mt: 2, mb: 1 }}>
                Данные клуба
              </Typography>
              
              <TextField
                fullWidth
                label="Название клуба"
                value={formData.clubName}
                onChange={handleChange('clubName')}
                error={!!errors.clubName}
                helperText={errors.clubName}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SportsScore />
                    </InputAdornment>
                  )
                }}
              />
              
              <TextField
                fullWidth
                label="Адрес клуба"
                value={formData.clubAddress}
                onChange={handleChange('clubAddress')}
                error={!!errors.clubAddress}
                helperText={errors.clubAddress}
              />
              
              <TextField
                fullWidth
                label="Описание клуба"
                value={formData.clubDescription}
                onChange={handleChange('clubDescription')}
                multiline
                rows={3}
                sx={{ gridColumn: '1 / -1' }}
              />
              
              <TextField
                fullWidth
                select
                label="Форма организации"
                value={formData.organizationType}
                onChange={handleChange('organizationType')}
                SelectProps={{
                  native: true
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Business />
                    </InputAdornment>
                  )
                }}
              >
                <option value="ИП">ИП</option>
                <option value="ООО">ООО</option>
                <option value="Самозанятый">Самозанятый</option>
              </TextField>
              
              <TextField
                fullWidth
                label="ИНН"
                value={formData.inn}
                onChange={handleChange('inn')}
                error={!!errors.inn}
                helperText={errors.inn}
                inputProps={{
                  maxLength: 12,
                  pattern: '[0-9]*'
                }}
              />
            </Box>
            
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Уже есть аккаунт?{' '}
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => navigate('/login')}
                  type="button"
                >
                  Войти
                </Link>
              </Typography>
              
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ minWidth: 200 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Зарегистрировать клуб'}
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
      
      {/* Success Dialog */}
      <Dialog open={successDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SportsScore sx={{ color: 'success.main' }} />
            Клуб успешно зарегистрирован!
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 3 }}>
            Поздравляем! Ваш клуб "{formData.clubName}" успешно зарегистрирован в системе "Все Корты".
          </Alert>
          
          <Typography variant="h6" gutterBottom>
            Ваши данные для входа:
          </Typography>
          
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="body2" color="textSecondary">
              Email:
            </Typography>
            <Typography variant="body1" sx={{ fontFamily: 'monospace', mb: 2 }}>
              {credentials?.email}
            </Typography>
            
            <Typography variant="body2" color="textSecondary">
              Временный пароль:
            </Typography>
            <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
              {credentials?.password}
            </Typography>
          </Paper>
          
          <Alert severity="warning" sx={{ mt: 2 }}>
            Важно! Сохраните эти данные. Рекомендуем сразу изменить пароль после первого входа.
          </Alert>
          
          <Typography variant="body2" sx={{ mt: 2 }}>
            Теперь вы можете:
          </Typography>
          <ul>
            <li>Настроить профиль клуба</li>
            <li>Добавить корты и расписание</li>
            <li>Принимать онлайн-бронирования</li>
            <li>Управлять клиентской базой</li>
          </ul>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSuccessClose} variant="contained" size="large">
            Войти в админ-панель
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}