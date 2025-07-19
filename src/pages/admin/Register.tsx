import React, { useState } from 'react'
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  InputAdornment,
  IconButton,
  Link
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../services/firebase'
import { SportsScore, Email, Phone, Visibility, VisibilityOff, CheckCircle } from '@mui/icons-material'
import InputMask from 'react-input-mask'

const steps = ['Контактные данные', 'Подтверждение email', 'Данные клуба']

interface FormData {
  // Step 1 - Contact
  email: string
  phone: string
  password: string
  confirmPassword: string
  
  // Step 3 - Club data
  clubName: string
  clubAddress: string
  clubDescription: string
  organizationType: string
  inn: string
  bankAccount: string
  adminName: string
}

export default function Register() {
  const navigate = useNavigate()
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    clubName: '',
    clubAddress: '',
    clubDescription: '',
    organizationType: 'ИП',
    inn: '',
    bankAccount: '',
    adminName: ''
  })

  const [errors, setErrors] = useState<Partial<FormData>>({})

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<FormData> = {}
    
    switch (step) {
      case 0: // Contact data
        if (!formData.email) newErrors.email = 'Email обязателен'
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Некорректный email'
        }
        
        if (!formData.phone) newErrors.phone = 'Телефон обязателен'
        else if (formData.phone.replace(/\D/g, '').length < 11) {
          newErrors.phone = 'Некорректный номер телефона'
        }
        
        if (!formData.password) newErrors.password = 'Пароль обязателен'
        else if (formData.password.length < 6) {
          newErrors.password = 'Пароль должен быть не менее 6 символов'
        }
        
        if (!formData.confirmPassword) {
          newErrors.confirmPassword = 'Подтвердите пароль'
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Пароли не совпадают'
        }
        break
        
      case 2: // Club data
        if (!formData.clubName) newErrors.clubName = 'Название клуба обязательно'
        if (!formData.clubAddress) newErrors.clubAddress = 'Адрес клуба обязателен'
        if (!formData.adminName) newErrors.adminName = 'ФИО администратора обязательно'
        if (!formData.inn) newErrors.inn = 'ИНН обязателен'
        else if (!/^\d{10,12}$/.test(formData.inn)) {
          newErrors.inn = 'ИНН должен содержать 10 или 12 цифр'
        }
        break
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = async () => {
    if (!validateStep(activeStep)) return
    
    if (activeStep === 0) {
      // Create user account and send verification email
      setLoading(true)
      setError(null)
      
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        )
        
        setUserId(userCredential.user.uid)
        
        // Send verification email
        await sendEmailVerification(userCredential.user)
        
        setVerificationSent(true)
        setActiveStep(1)
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          setError('Этот email уже зарегистрирован')
        } else if (err.code === 'auth/weak-password') {
          setError('Слишком слабый пароль')
        } else {
          setError('Ошибка при создании аккаунта: ' + err.message)
        }
      } finally {
        setLoading(false)
      }
    } else if (activeStep === 1) {
      // Check if email is verified
      setLoading(true)
      setError(null)
      
      try {
        await auth.currentUser?.reload()
        if (auth.currentUser?.emailVerified) {
          setActiveStep(2)
        } else {
          setError('Email еще не подтвержден. Проверьте вашу почту.')
        }
      } catch (err: any) {
        setError('Ошибка проверки: ' + err.message)
      } finally {
        setLoading(false)
      }
    } else if (activeStep === 2) {
      // Create club and admin
      setLoading(true)
      setError(null)
      
      try {
        if (!userId || !auth.currentUser) {
          throw new Error('Пользователь не найден')
        }
        
        // Create venue/club
        const venueRef = doc(db, 'venues', userId)
        await setDoc(venueRef, {
          name: formData.clubName,
          address: formData.clubAddress,
          description: formData.clubDescription,
          phone: formData.phone,
          email: formData.email,
          organizationType: formData.organizationType,
          inn: formData.inn,
          bankAccount: formData.bankAccount,
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
        
        // Create admin user
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
        
        // Redirect to admin panel
        navigate('/admin/dashboard')
      } catch (err: any) {
        setError('Ошибка при создании клуба: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleBack = () => {
    setActiveStep((prev) => prev - 1)
  }

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({ ...formData, [field]: e.target.value })
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined })
    }
  }

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) return
    
    setLoading(true)
    try {
      await sendEmailVerification(auth.currentUser)
      setError(null)
      alert('Письмо отправлено повторно')
    } catch (err: any) {
      setError('Ошибка отправки: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              error={!!errors.email}
              helperText={errors.email}
              margin="normal"
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
                  margin="normal"
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
              label="Пароль"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange('password')}
              error={!!errors.password}
              helperText={errors.password}
              margin="normal"
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
              margin="normal"
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
        )
        
      case 1:
        return (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            {verificationSent ? (
              <>
                <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Письмо отправлено!
                </Typography>
                <Typography color="textSecondary" paragraph>
                  Мы отправили письмо с подтверждением на адрес {formData.email}
                </Typography>
                <Typography color="textSecondary" paragraph>
                  Пожалуйста, проверьте вашу почту и перейдите по ссылке для подтверждения email.
                  После подтверждения нажмите кнопку "Далее".
                </Typography>
                <Button
                  variant="text"
                  onClick={resendVerificationEmail}
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  Отправить письмо повторно
                </Button>
              </>
            ) : (
              <CircularProgress />
            )}
          </Box>
        )
        
      case 2:
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Данные клуба
            </Typography>
            
            <TextField
              fullWidth
              label="Название клуба"
              value={formData.clubName}
              onChange={handleChange('clubName')}
              error={!!errors.clubName}
              helperText={errors.clubName}
              margin="normal"
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
              margin="normal"
              multiline
              rows={2}
            />
            
            <TextField
              fullWidth
              label="Описание клуба"
              value={formData.clubDescription}
              onChange={handleChange('clubDescription')}
              margin="normal"
              multiline
              rows={3}
            />
            
            <TextField
              fullWidth
              label="ФИО администратора"
              value={formData.adminName}
              onChange={handleChange('adminName')}
              error={!!errors.adminName}
              helperText={errors.adminName}
              margin="normal"
            />
            
            <TextField
              fullWidth
              select
              label="Форма организации"
              value={formData.organizationType}
              onChange={handleChange('organizationType')}
              margin="normal"
              SelectProps={{
                native: true
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
              margin="normal"
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
              margin="normal"
            />
          </Box>
        )
        
      default:
        return null
    }
  }

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
        <SportsScore sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        
        <Typography component="h1" variant="h4" gutterBottom>
          Регистрация клуба
        </Typography>
        
        <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
          Создайте аккаунт для управления вашим спортивным клубом
        </Typography>
        
        <Paper sx={{ width: '100%', p: 4 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {renderStepContent()}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              sx={{ mr: 1 }}
            >
              Назад
            </Button>
            
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} />
              ) : activeStep === steps.length - 1 ? (
                'Завершить регистрацию'
              ) : (
                'Далее'
              )}
            </Button>
          </Box>
          
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              Уже есть аккаунт?{' '}
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/admin/login')}
              >
                Войти
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}