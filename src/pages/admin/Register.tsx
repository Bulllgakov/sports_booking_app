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
  IconButton,
  Link,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { Email, Phone, Visibility, VisibilityOff, Business, LocationOn } from '@mui/icons-material'
import InputMask from 'react-input-mask'
import AllCourtsLogo from '../../components/AllCourtsLogo'
import { 
  isValidEmail, 
  isValidPhone, 
  isValidPassword, 
  isValidClubName, 
  isValidAddress, 
  isValidName,
  isValidINN,
  normalizePhone,
  sanitizeString 
} from '../../utils/validation'

interface FormData {
  // Club data
  clubName: string
  clubAddress: string
  clubCity: string
  clubDescription: string
  organizationType: string
  inn: string
  bankAccount: string
  
  // Admin data
  adminName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

export default function Register() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [formData, setFormData] = useState<FormData>({
    clubName: '',
    clubAddress: '',
    clubCity: '',
    clubDescription: '',
    organizationType: 'ИП',
    inn: '',
    bankAccount: '',
    adminName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })

  const [errors, setErrors] = useState<Partial<FormData>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}
    
    // Club data validation
    if (!formData.clubName) {
      newErrors.clubName = 'Название клуба обязательно'
    } else if (!isValidClubName(formData.clubName)) {
      newErrors.clubName = 'Название должно быть от 3 до 200 символов'
    }
    
    if (!formData.clubAddress) {
      newErrors.clubAddress = 'Адрес клуба обязателен'
    } else if (!isValidAddress(formData.clubAddress)) {
      newErrors.clubAddress = 'Адрес должен быть от 10 до 500 символов'
    }
    
    if (!formData.clubCity) newErrors.clubCity = 'Город обязателен'
    
    // INN validation if provided
    if (formData.inn && !isValidINN(formData.inn)) {
      newErrors.inn = 'Некорректный ИНН'
    }
    
    // Admin data validation
    if (!formData.adminName) {
      newErrors.adminName = 'ФИО администратора обязательно'
    } else if (!isValidName(formData.adminName)) {
      newErrors.adminName = 'ФИО должно быть от 2 до 100 символов'
    }
    
    if (!formData.email) {
      newErrors.email = 'Email обязателен'
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Некорректный email'
    }
    
    if (!formData.phone) {
      newErrors.phone = 'Телефон обязателен'
    } else if (!isValidPhone(formData.phone)) {
      newErrors.phone = 'Некорректный номер телефона (должен быть российский формат)'
    }
    
    if (!formData.password) {
      newErrors.password = 'Пароль обязателен'
    } else {
      const passwordValidation = isValidPassword(formData.password)
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors[0] // Показываем первую ошибку
      }
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Подтвердите пароль'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Create venue/club with sanitized data
      const venueData = {
        name: sanitizeString(formData.clubName),
        address: sanitizeString(formData.clubAddress),
        city: sanitizeString(formData.clubCity),
        description: sanitizeString(formData.clubDescription),
        phone: normalizePhone(formData.phone),
        email: formData.email.toLowerCase().trim(),
        organizationType: formData.organizationType,
        inn: formData.inn.replace(/\D/g, ''), // Только цифры
        bankAccount: sanitizeString(formData.bankAccount),
        status: 'active',
        logoUrl: '',
        amenities: [],
        location: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      const venueRef = await addDoc(collection(db, 'venues'), venueData)
      
      // Create subscription for the club
      await addDoc(collection(db, 'subscriptions'), {
        venueId: venueRef.id,
        plan: 'start',
        status: 'active',
        startDate: new Date(),
        endDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        usage: {
          courtsCount: 0,
          bookingsThisMonth: 0,
          smsEmailsSent: 0,
          lastUpdated: new Date()
        }
      })
      
      // Create admin user with sanitized data
      await addDoc(collection(db, 'admins'), {
        name: sanitizeString(formData.adminName),
        email: formData.email.toLowerCase().trim(),
        phone: normalizePhone(formData.phone),
        role: 'admin',
        venueId: venueRef.id,
        permissions: ['manage_bookings', 'manage_courts', 'manage_clients', 'manage_settings'],
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      setSuccess(true)
      
      // Firebase Cloud Function автоматически отправит email с доступами
      
      // Show success message and redirect after 5 seconds
      setTimeout(() => {
        navigate('/admin/login')
      }, 5000)
      
    } catch (err: any) {
      console.error('Error creating club:', err)
      setError('Ошибка при создании клуба. Попробуйте еще раз.')
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


  if (success) {
    return (
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <Paper sx={{ width: '100%', p: 4, textAlign: 'center' }}>
            <AllCourtsLogo size={80} className="mx-auto mb-4" />
            
            <Typography variant="h5" gutterBottom color="success.main">
              Клуб успешно зарегистрирован!
            </Typography>
            
            <Typography variant="body1" paragraph>
              Данные для входа:
            </Typography>
            
            <Box sx={{ my: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2"><strong>Email:</strong> {formData.email}</Typography>
              <Typography variant="body2" color="text.secondary">
                На ваш email отправлена ссылка для входа в систему
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" paragraph>
              Вы будете перенаправлены на страницу входа через несколько секунд...
            </Typography>
            
            <CircularProgress sx={{ mt: 2 }} />
          </Paper>
        </Box>
      </Container>
    )
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
            <Box sx={{ display: 'grid', gap: 3 }}>
              {/* Данные клуба */}
              <Typography variant="h6" sx={{ mb: -1 }}>
                Данные клуба
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  fullWidth
                  label="Название клуба"
                  value={formData.clubName}
                  onChange={handleChange('clubName')}
                  error={!!errors.clubName}
                  helperText={errors.clubName}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Business />
                      </InputAdornment>
                    )
                  }}
                />
                
                <TextField
                  fullWidth
                  label="Город"
                  value={formData.clubCity}
                  onChange={handleChange('clubCity')}
                  error={!!errors.clubCity}
                  helperText={errors.clubCity}
                  required
                />
              </Box>
              
              <TextField
                fullWidth
                label="Адрес клуба"
                value={formData.clubAddress}
                onChange={handleChange('clubAddress')}
                error={!!errors.clubAddress}
                helperText={errors.clubAddress}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOn />
                    </InputAdornment>
                  )
                }}
              />
              
              <TextField
                fullWidth
                label="Описание клуба"
                value={formData.clubDescription}
                onChange={handleChange('clubDescription')}
                multiline
                rows={3}
              />
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Форма организации</InputLabel>
                  <Select
                    value={formData.organizationType}
                    onChange={(e) => setFormData({ ...formData, organizationType: e.target.value })}
                    label="Форма организации"
                  >
                    <MenuItem value="ИП">ИП</MenuItem>
                    <MenuItem value="ООО">ООО</MenuItem>
                    <MenuItem value="Самозанятый">Самозанятый</MenuItem>
                  </Select>
                </FormControl>
                
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
                
                <TextField
                  fullWidth
                  label="Расчетный счет"
                  value={formData.bankAccount}
                  onChange={handleChange('bankAccount')}
                />
              </Box>
              
              {/* Данные администратора */}
              <Typography variant="h6" sx={{ mt: 2, mb: -1 }}>
                Данные администратора
              </Typography>
              
              <TextField
                fullWidth
                label="ФИО администратора"
                value={formData.adminName}
                onChange={handleChange('adminName')}
                error={!!errors.adminName}
                helperText={errors.adminName}
                required
              />
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  error={!!errors.email}
                  helperText={errors.email}
                  required
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
                      required
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
              </Box>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  fullWidth
                  label="Пароль"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange('password')}
                  error={!!errors.password}
                  helperText={errors.password}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
                
                <TextField
                  fullWidth
                  label="Подтвердите пароль"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => navigate('/admin/login')}
                  type="button"
                >
                  Уже есть аккаунт? Войти
                </Link>
                
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ minWidth: 200 }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Зарегистрировать клуб'
                  )}
                </Button>
              </Box>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  )
}