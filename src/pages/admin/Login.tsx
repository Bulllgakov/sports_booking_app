import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '../../services/firebase'
import { doc, getDoc } from 'firebase/firestore'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Авторизация через Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      
      // Проверка, что пользователь является админом
      const adminDoc = await getDoc(doc(db, 'admins', userCredential.user.uid))
      
      if (!adminDoc.exists()) {
        throw new Error('У вас нет прав доступа к админ-панели')
      }

      // Перенаправление на dashboard
      navigate('/admin/dashboard')
    } catch (error: any) {
      console.error('Login error:', error)
      if (error.code === 'auth/user-not-found') {
        setError('Пользователь не найден')
      } else if (error.code === 'auth/wrong-password') {
        setError('Неверный пароль')
      } else if (error.code === 'auth/invalid-email') {
        setError('Неверный формат email')
      } else {
        setError(error.message || 'Ошибка авторизации')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f5f5f5',
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Админ-панель
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Вход для сотрудников клубов
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              autoComplete="email"
              autoFocus
            />
            <TextField
              fullWidth
              label="Пароль"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              autoComplete="current-password"
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
                ),
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Вход...' : 'Войти'}
            </Button>
          </form>

          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
            Забыли пароль? Обратитесь к администратору системы
          </Typography>
          
          <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary" align="center">
              Хотите зарегистрировать свой клуб?{' '}
              <Button
                variant="text"
                onClick={() => navigate('/register')}
                sx={{ textTransform: 'none' }}
              >
                Создать аккаунт
              </Button>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}