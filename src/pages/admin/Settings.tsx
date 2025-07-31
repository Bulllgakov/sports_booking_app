import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  Alert,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Snackbar
} from '@mui/material'
import { Settings as SettingsIcon, Email, Security, Storage, Delete, Add } from '@mui/icons-material'
import TestEmailButton from '../../components/TestEmailButton'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { usePermission } from '../../hooks/usePermission'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../services/firebase'

interface NotificationSettings {
  superAdminEmails: string[]
  createdAt?: Date
  updatedAt?: Date
}

export default function Settings() {
  const { admin } = useAuth()
  const { isSuperAdmin } = usePermission()
  const navigate = useNavigate()
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    superAdminEmails: []
  })
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [error, setError] = useState('')

  // Проверка доступа - только для суперадминов
  React.useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/admin/dashboard')
    } else {
      loadNotificationSettings()
    }
  }, [isSuperAdmin, navigate])

  const loadNotificationSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'notifications')
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const data = docSnap.data() as NotificationSettings
        setNotificationSettings(data)
      }
    } catch (error) {
      console.error('Error loading notification settings:', error)
      setError('Ошибка загрузки настроек')
    } finally {
      setLoading(false)
    }
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleAddEmail = async () => {
    if (!newEmail) {
      setError('Введите email')
      return
    }

    if (!validateEmail(newEmail)) {
      setError('Неверный формат email')
      return
    }

    if (notificationSettings.superAdminEmails.includes(newEmail)) {
      setError('Этот email уже добавлен')
      return
    }

    setSaving(true)
    setError('')

    try {
      const updatedEmails = [...notificationSettings.superAdminEmails, newEmail]
      const docRef = doc(db, 'settings', 'notifications')
      
      await setDoc(docRef, {
        superAdminEmails: updatedEmails,
        updatedAt: new Date()
      }, { merge: true })

      setNotificationSettings({
        ...notificationSettings,
        superAdminEmails: updatedEmails
      })
      setNewEmail('')
      setShowSuccessMessage(true)
    } catch (error) {
      console.error('Error adding email:', error)
      setError('Ошибка при добавлении email')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveEmail = async (emailToRemove: string) => {
    setSaving(true)
    setError('')

    try {
      const updatedEmails = notificationSettings.superAdminEmails.filter(email => email !== emailToRemove)
      const docRef = doc(db, 'settings', 'notifications')
      
      await updateDoc(docRef, {
        superAdminEmails: updatedEmails,
        updatedAt: new Date()
      })

      setNotificationSettings({
        ...notificationSettings,
        superAdminEmails: updatedEmails
      })
      setShowSuccessMessage(true)
    } catch (error) {
      console.error('Error removing email:', error)
      setError('Ошибка при удалении email')
    } finally {
      setSaving(false)
    }
  }

  if (!isSuperAdmin) {
    return null
  }

  return (
    <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <SettingsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight="bold">
            Системные настройки
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          Данный раздел доступен только суперадминистраторам системы
        </Alert>

        <Grid container spacing={3}>
          {/* Email уведомления суперадминов */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Email color="primary" />
                  <Typography variant="h6">Email уведомления для суперадминистраторов</Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  Эти email адреса будут получать уведомления о новых регистрациях клубов и других важных событиях
                </Typography>

                <Divider sx={{ my: 2 }} />

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Email для уведомлений"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddEmail()
                            }
                          }}
                          error={!!error}
                          helperText={error}
                          disabled={saving}
                        />
                        <Button
                          variant="contained"
                          onClick={handleAddEmail}
                          disabled={saving || !newEmail}
                          startIcon={<Add />}
                        >
                          Добавить
                        </Button>
                      </Box>
                    </Box>

                    <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                      {notificationSettings.superAdminEmails.length === 0 ? (
                        <ListItem>
                          <ListItemText 
                            primary="Нет добавленных email адресов"
                            primaryTypographyProps={{ color: 'text.secondary', align: 'center' }}
                          />
                        </ListItem>
                      ) : (
                        notificationSettings.superAdminEmails.map((email) => (
                          <ListItem key={email}>
                            <ListItemText 
                              primary={email}
                              primaryTypographyProps={{ fontWeight: 500 }}
                            />
                            <ListItemSecondaryAction>
                              <IconButton 
                                edge="end" 
                                aria-label="delete"
                                onClick={() => handleRemoveEmail(email)}
                                disabled={saving}
                              >
                                <Delete />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))
                      )}
                    </List>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Email настройки */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Email color="primary" />
                  <Typography variant="h6">Email уведомления</Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  Тестирование работы email уведомлений системы
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Текущие настройки:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    SMTP сервер: smtp.timeweb.ru:465
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    От кого: noreply@allcourt.ru
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Reply-to: support@allcourt.ru
                  </Typography>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Действия:
                  </Typography>
                  <TestEmailButton defaultEmail={admin?.email || ''} />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Нажмите кнопку для отправки тестового письма
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Безопасность */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Security color="primary" />
                  <Typography variant="h6">Безопасность</Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  Настройки безопасности и доступа
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" color="text.secondary">
                  Раздел в разработке
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* База данных */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Storage color="primary" />
                  <Typography variant="h6">База данных</Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  Информация о базе данных
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Firestore:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Проект: sports-booking-app-1d7e5
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Регион: europe-west1
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Snackbar
          open={showSuccessMessage}
          autoHideDuration={3000}
          onClose={() => setShowSuccessMessage(false)}
          message="Настройки сохранены"
        />
    </Box>
  )
}