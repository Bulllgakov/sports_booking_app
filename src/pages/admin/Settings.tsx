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
  Snackbar,
  Tabs,
  Tab,
  Switch,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  AlertTitle
} from '@mui/material'
import { 
  Settings as SettingsIcon, 
  Email, 
  Security, 
  Storage, 
  Delete, 
  Add,
  Phone,
  Send,
  Refresh,
  Shield,
  Payment,
  CheckCircle,
  HourglassEmpty,
  Cancel,
  Error,
  HourglassBottom,
  SearchOff
} from '@mui/icons-material'
import TestEmailButton from '../../components/TestEmailButton'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { usePermission } from '../../hooks/usePermission'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

const functions = getFunctions(undefined, 'europe-west1')

interface NotificationSettings {
  superAdminEmails: string[]
  createdAt?: Date
  updatedAt?: Date
}

interface SMSSettings {
  provider: 'smsru'
  testMode: boolean
  smsruApiId: string
}

interface SMSTemplate {
  enabled: boolean
  template: string
  hoursBeforeGame?: number
}

interface SMSTemplatesSettings {
  bookingConfirmation: SMSTemplate
  bookingReminder: SMSTemplate
  bookingCancellation: SMSTemplate
  bookingModification: SMSTemplate
  authCode: SMSTemplate
}

interface SMSLog {
  id: string
  phone: string
  message: string
  success: boolean
  testMode?: boolean
  error?: string
  timestamp: Date | null
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

export default function Settings() {
  const { admin } = useAuth()
  const { isSuperAdmin } = usePermission()
  const navigate = useNavigate()
  const [tabValue, setTabValue] = useState(0)
  
  // Email settings state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    superAdminEmails: []
  })
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [error, setError] = useState('')

  // SMS settings state
  const [smsSettings, setSmsSettings] = useState<SMSSettings>({
    provider: 'smsru',
    testMode: false,
    smsruApiId: '',
  })
  const [smsLoading, setSmsLoading] = useState(true)
  const [smsSaving, setSmsSaving] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testing, setTesting] = useState(false)
  
  // SMS templates state
  const [smsTemplates, setSmsTemplates] = useState<SMSTemplatesSettings>({
    bookingConfirmation: {
      enabled: true,
      template: "Бронирование подтверждено! {venue}, {date} в {time}"
    },
    bookingReminder: {
      enabled: true,
      template: "Напоминание: через 2 часа игра в {venue}, корт {court}",
      hoursBeforeGame: 2
    },
    bookingCancellation: {
      enabled: true,
      template: "Игра {date} в {time} в {venue} отменена"
    },
    bookingModification: {
      enabled: true,
      template: "Изменение: игра перенесена на {time}, корт {court}"
    },
    authCode: {
      enabled: true,
      template: "Ваш код для входа в Все Корты: {code}"
    },
    paymentLink: {
      enabled: true,
      template: "Оплатите бронь по ссылке: {link}"
    }
  })
  const [templatesSaving, setTemplatesSaving] = useState(false)
  const [smsStats, setSmsStats] = useState<{
    totalSent: number
    lastSent: Date | null
    recentLogs: SMSLog[]
  }>({
    totalSent: 0,
    lastSent: null,
    recentLogs: [],
  })

  // Проверка доступа - только для суперадминов
  React.useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/admin/dashboard')
    } else {
      loadNotificationSettings()
      loadSMSSettings()
      loadSMSStats()
      loadSMSTemplates()
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

  const loadSMSSettings = async () => {
    try {
      const getSMSSettings = httpsCallable(functions, 'getSMSSettings')
      const result = await getSMSSettings()
      const data = result.data as any
      // Временно фильтруем поля SMSC до обновления функций
      setSmsSettings({
        provider: 'smsru',
        testMode: data.testMode || false,
        smsruApiId: data.smsruApiId || ''
      })
    } catch (error) {
      console.error('Error loading SMS settings:', error)
    } finally {
      setSmsLoading(false)
    }
  }

  const loadSMSStats = async () => {
    try {
      const getSMSStats = httpsCallable(functions, 'getSMSStats')
      const result = await getSMSStats()
      const data = result.data as any
      
      // Безопасное преобразование даты
      let lastSent = null
      if (data.lastSent) {
        try {
          lastSent = new Date(data.lastSent)
          if (isNaN(lastSent.getTime())) {
            lastSent = null
          }
        } catch (e) {
          console.error('Error parsing lastSent date:', e)
          lastSent = null
        }
      }
      
      // Безопасное преобразование логов
      const recentLogs = (data.recentLogs || []).map((log: any) => {
        let timestamp = null
        if (log.timestamp) {
          try {
            timestamp = new Date(log.timestamp)
            if (isNaN(timestamp.getTime())) {
              timestamp = null
            }
          } catch (e) {
            console.error('Error parsing log timestamp:', e)
            timestamp = null
          }
        }
        
        return {
          ...log,
          timestamp,
        }
      })
      
      setSmsStats({
        totalSent: data.totalSent || 0,
        lastSent,
        recentLogs,
      })
    } catch (error) {
      console.error('Error loading SMS stats:', error)
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

  const handleSaveSMSSettings = async () => {
    setSmsSaving(true)
    try {
      const updateSMSSettings = httpsCallable(functions, 'updateSMSSettings')
      await updateSMSSettings(smsSettings)
      setShowSuccessMessage(true)
      await loadSMSSettings()
    } catch (error) {
      console.error('Error saving SMS settings:', error)
      setError('Ошибка сохранения настроек SMS')
    } finally {
      setSmsSaving(false)
    }
  }

  const handleTestSMS = async () => {
    if (!testPhone) {
      setError('Введите номер телефона для тестирования')
      return
    }

    setTesting(true)
    try {
      const testSMSSending = httpsCallable(functions, 'testSMSSending')
      const result = await testSMSSending({ phoneNumber: testPhone })
      const data = result.data as any
      
      if (data.success) {
        setShowSuccessMessage(true)
      } else {
        setError(data.message)
      }
      
      // Обновляем статистику
      await loadSMSStats()
    } catch (error) {
      console.error('Error testing SMS:', error)
      setError('Ошибка отправки тестового SMS')
    } finally {
      setTesting(false)
    }
  }
  
  const loadSMSTemplates = async () => {
    try {
      const getSMSTemplates = httpsCallable(functions, 'getSMSTemplates')
      const result = await getSMSTemplates()
      const data = result.data as SMSTemplatesSettings
      
      // Безопасно объединяем загруженные данные с дефолтными значениями
      setSmsTemplates({
        bookingConfirmation: {
          enabled: data?.bookingConfirmation?.enabled ?? true,
          template: data?.bookingConfirmation?.template || "Бронирование подтверждено! {venue}, {date} в {time}"
        },
        bookingReminder: {
          enabled: data?.bookingReminder?.enabled ?? true,
          template: data?.bookingReminder?.template || "Напоминание: через 2 часа игра в {venue}, корт {court}",
          hoursBeforeGame: data?.bookingReminder?.hoursBeforeGame || 2
        },
        bookingCancellation: {
          enabled: data?.bookingCancellation?.enabled ?? true,
          template: data?.bookingCancellation?.template || "Игра {date} в {time} в {venue} отменена"
        },
        bookingModification: {
          enabled: data?.bookingModification?.enabled ?? true,
          template: data?.bookingModification?.template || "Изменение: игра перенесена на {time}, корт {court}"
        },
        authCode: {
          enabled: data?.authCode?.enabled ?? true,
          template: data?.authCode?.template || "Ваш код для входа в Все Корты: {code}"
        },
        paymentLink: {
          enabled: data?.paymentLink?.enabled ?? true,
          template: data?.paymentLink?.template || "Оплатите бронь по ссылке: {link}"
        }
      })
    } catch (error) {
      console.error('Error loading SMS templates:', error)
    }
  }
  
  const handleSaveSMSTemplates = async () => {
    setTemplatesSaving(true)
    try {
      const updateSMSTemplates = httpsCallable(functions, 'updateSMSTemplates')
      await updateSMSTemplates(smsTemplates)
      setShowSuccessMessage(true)
    } catch (error) {
      console.error('Error saving SMS templates:', error)
      setError('Ошибка сохранения шаблонов SMS')
    } finally {
      setTemplatesSaving(false)
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

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Email уведомления" />
          <Tab label="SMS настройки" />
          <Tab label="Безопасность" />
          <Tab label="База данных" />
          <Tab label="Страницы оплаты" />
        </Tabs>
      </Box>

      {/* Email уведомления */}
      <TabPanel value={tabValue} index={0}>
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
                          error={!!error && tabValue === 0}
                          helperText={tabValue === 0 ? error : ''}
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

          {/* Email тестирование */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Email color="primary" />
                  <Typography variant="h6">Тестирование Email</Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  Проверка работы email уведомлений
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
                </Box>

                <TestEmailButton defaultEmail={admin?.email || ''} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* SMS настройки */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {/* Основные настройки SMS */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Phone color="primary" />
                  <Typography variant="h6">Настройки SMS</Typography>
                </Box>

                {smsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Shield fontSize="small" />
                        <Typography variant="body2">
                          API ключи хранятся в зашифрованном виде
                        </Typography>
                      </Box>
                    </Alert>

                    <Box sx={{ mb: 3 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={smsSettings.testMode}
                            onChange={(e) => setSmsSettings({ ...smsSettings, testMode: e.target.checked })}
                          />
                        }
                        label={smsSettings.testMode ? "Тестовый режим" : "Боевой режим"}
                      />
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        SMS провайдер: SMS.RU
                      </Typography>
                    </Box>

                    <TextField
                      fullWidth
                      label="API ID для SMS.RU"
                      value={smsSettings.smsruApiId}
                      onChange={(e) => setSmsSettings({ ...smsSettings, smsruApiId: e.target.value })}
                      type="password"
                      sx={{ mb: 2 }}
                      helperText="Получите API ID в личном кабинете SMS.RU"
                    />

                    <Button
                      variant="contained"
                      fullWidth
                      onClick={handleSaveSMSSettings}
                      disabled={smsSaving}
                    >
                      Сохранить настройки
                    </Button>

                    <Divider sx={{ my: 3 }} />

                    <Typography variant="h6" gutterBottom>
                      Тестирование отправки
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        fullWidth
                        placeholder="+7 (999) 123-45-67"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                      />
                      <Button
                        variant="outlined"
                        onClick={handleTestSMS}
                        disabled={testing}
                        startIcon={<Send />}
                      >
                        Отправить
                      </Button>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Статистика SMS */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">Статистика SMS</Typography>
                  <IconButton onClick={loadSMSStats} size="small">
                    <Refresh />
                  </IconButton>
                </Box>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Typography variant="h4" color="primary">
                      {smsStats.totalSent}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Всего отправлено
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1">
                      {smsStats.lastSent && !isNaN(smsStats.lastSent.getTime()) 
                        ? format(smsStats.lastSent, 'dd.MM.yyyy HH:mm', { locale: ru }) 
                        : 'Нет данных'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Последняя отправка
                    </Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>
                  Последние отправки
                </Typography>

                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Дата</TableCell>
                        <TableCell>Телефон</TableCell>
                        <TableCell>Статус</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {smsStats.recentLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {log.timestamp && !isNaN(log.timestamp.getTime()) 
                              ? format(log.timestamp, 'dd.MM HH:mm') 
                              : '-'}
                          </TableCell>
                          <TableCell>{log.phone}</TableCell>
                          <TableCell>
                            <Chip
                              label={log.testMode ? 'Тест' : log.success ? 'Успешно' : 'Ошибка'}
                              size="small"
                              color={log.testMode ? 'info' : log.success ? 'success' : 'error'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Шаблоны SMS уведомлений */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Phone color="primary" />
                  <Typography variant="h6">Шаблоны SMS уведомлений</Typography>
                </Box>

                <Typography variant="body2" color="text.secondary" paragraph>
                  Настройте тексты SMS уведомлений (максимум 70 символов)
                </Typography>

                <Alert severity="warning" sx={{ mb: 2 }}>
                  <AlertTitle>Важная информация</AlertTitle>
                  SMS уведомления о бронировании отправляются <strong>только при онлайн оплате</strong> через YooKassa или T-Bank. 
                  При оплате наличными, картой в клубе или переводом SMS не отправляются, даже если администратор отметит оплату как полученную.
                </Alert>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={3}>
                  {/* Подтверждение бронирования */}
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2">Подтверждение бронирования</Typography>
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={smsTemplates.bookingConfirmation?.enabled ?? true}
                              onChange={(e) => setSmsTemplates({
                                ...smsTemplates,
                                bookingConfirmation: {
                                  ...smsTemplates.bookingConfirmation,
                                  enabled: e.target.checked
                                }
                              })}
                            />
                          }
                          label=""
                        />
                      </Box>
                      <TextField
                        fullWidth
                        size="small"
                        value={smsTemplates.bookingConfirmation?.template || ''}
                        onChange={(e) => setSmsTemplates({
                          ...smsTemplates,
                          bookingConfirmation: {
                            ...smsTemplates.bookingConfirmation,
                            template: e.target.value
                          }
                        })}
                        disabled={!smsTemplates.bookingConfirmation?.enabled}
                        helperText={
                          <>
                            <span>{`${(smsTemplates.bookingConfirmation?.template || '').length}/70 символов. Доступны: {venue}, {date}, {time}`}</span>
                            <br />
                            <small style={{ color: '#f57c00' }}>⚠️ Отправляется только при онлайн оплате через YooKassa/T-Bank</small>
                          </>
                        }
                        error={(smsTemplates.bookingConfirmation?.template || '').length > 70}
                      />
                    </Box>
                  </Grid>

                  {/* Напоминание за 2 часа */}
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2">Напоминание (за 2 часа)</Typography>
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={smsTemplates.bookingReminder?.enabled ?? true}
                              onChange={(e) => setSmsTemplates({
                                ...smsTemplates,
                                bookingReminder: {
                                  ...smsTemplates.bookingReminder,
                                  enabled: e.target.checked
                                }
                              })}
                            />
                          }
                          label=""
                        />
                      </Box>
                      <TextField
                        fullWidth
                        size="small"
                        value={smsTemplates.bookingReminder?.template || ''}
                        onChange={(e) => setSmsTemplates({
                          ...smsTemplates,
                          bookingReminder: {
                            ...smsTemplates.bookingReminder,
                            template: e.target.value
                          }
                        })}
                        disabled={!smsTemplates.bookingReminder?.enabled}
                        helperText={
                          <>
                            <span>{`${(smsTemplates.bookingReminder?.template || '').length}/70 символов. Доступны: {venue}, {court}, {time}`}</span>
                            <br />
                            <small style={{ color: '#f57c00' }}>⚠️ Отправляется только для оплаченных онлайн бронирований за 2 часа до игры</small>
                          </>
                        }
                        error={(smsTemplates.bookingReminder?.template || '').length > 70}
                      />
                    </Box>
                  </Grid>

                  {/* Отмена бронирования */}
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2">Отмена бронирования</Typography>
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={smsTemplates.bookingCancellation?.enabled ?? true}
                              onChange={(e) => setSmsTemplates({
                                ...smsTemplates,
                                bookingCancellation: {
                                  ...smsTemplates.bookingCancellation,
                                  enabled: e.target.checked
                                }
                              })}
                            />
                          }
                          label=""
                        />
                      </Box>
                      <TextField
                        fullWidth
                        size="small"
                        value={smsTemplates.bookingCancellation?.template || ''}
                        onChange={(e) => setSmsTemplates({
                          ...smsTemplates,
                          bookingCancellation: {
                            ...smsTemplates.bookingCancellation,
                            template: e.target.value
                          }
                        })}
                        disabled={!smsTemplates.bookingCancellation?.enabled}
                        helperText={
                          <>
                            <span>{`${(smsTemplates.bookingCancellation?.template || '').length}/70 символов. Доступны: {venue}, {date}, {time}`}</span>
                            <br />
                            <small style={{ color: '#f57c00' }}>⚠️ Отправляется только при автоматической отмене или возврате онлайн платежа</small>
                          </>
                        }
                        error={(smsTemplates.bookingCancellation?.template || '').length > 70}
                      />
                    </Box>
                  </Grid>

                  {/* Изменение бронирования */}
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2">Изменение бронирования</Typography>
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={smsTemplates.bookingModification?.enabled ?? true}
                              onChange={(e) => setSmsTemplates({
                                ...smsTemplates,
                                bookingModification: {
                                  ...smsTemplates.bookingModification,
                                  enabled: e.target.checked
                                }
                              })}
                            />
                          }
                          label=""
                        />
                      </Box>
                      <TextField
                        fullWidth
                        size="small"
                        value={smsTemplates.bookingModification?.template || ''}
                        onChange={(e) => setSmsTemplates({
                          ...smsTemplates,
                          bookingModification: {
                            ...smsTemplates.bookingModification,
                            template: e.target.value
                          }
                        })}
                        disabled={!smsTemplates.bookingModification?.enabled}
                        helperText={
                          <>
                            <span>{`${(smsTemplates.bookingModification?.template || '').length}/70 символов. Доступны: {time}, {court}`}</span>
                            <br />
                            <small>Отправляется при изменении времени, корта или даты бронирования</small>
                          </>
                        }
                        error={(smsTemplates.bookingModification?.template || '').length > 70}
                      />
                    </Box>
                  </Grid>

                  {/* Код авторизации */}
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2">Код авторизации</Typography>
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={smsTemplates.authCode?.enabled ?? true}
                              onChange={(e) => setSmsTemplates({
                                ...smsTemplates,
                                authCode: {
                                  ...smsTemplates.authCode,
                                  enabled: e.target.checked
                                }
                              })}
                            />
                          }
                          label=""
                        />
                      </Box>
                      <TextField
                        fullWidth
                        size="small"
                        value={smsTemplates.authCode?.template || ''}
                        onChange={(e) => setSmsTemplates({
                          ...smsTemplates,
                          authCode: {
                            ...smsTemplates.authCode,
                            template: e.target.value
                          }
                        })}
                        disabled={!smsTemplates.authCode?.enabled}
                        helperText={
                          <>
                            <span>{`${(smsTemplates.authCode?.template || '').length}/70 символов. Доступны: {code}`}</span>
                            <br />
                            <small>Отправляется при авторизации по SMS в мобильном приложении</small>
                          </>
                        }
                        error={(smsTemplates.authCode?.template || '').length > 70}
                      />
                    </Box>
                  </Grid>

                  {/* Ссылка на оплату */}
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2">Ссылка на оплату</Typography>
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={smsTemplates.paymentLink?.enabled ?? true}
                              onChange={(e) => setSmsTemplates({
                                ...smsTemplates,
                                paymentLink: {
                                  ...smsTemplates.paymentLink,
                                  enabled: e.target.checked
                                }
                              })}
                            />
                          }
                          label=""
                        />
                      </Box>
                      <TextField
                        fullWidth
                        size="small"
                        value={smsTemplates.paymentLink?.template || ''}
                        onChange={(e) => setSmsTemplates({
                          ...smsTemplates,
                          paymentLink: {
                            ...smsTemplates.paymentLink,
                            template: e.target.value
                          }
                        })}
                        disabled={!smsTemplates.paymentLink?.enabled}
                        helperText={
                          <>
                            <span>{`${(smsTemplates.paymentLink?.template || '').length}/70 символов. Доступны: {name}, {date}, {time}, {link}`}</span>
                            <br />
                            <small>Отправляется при создании бронирования с онлайн оплатой в админ панели</small>
                          </>
                        }
                        error={(smsTemplates.paymentLink?.template || '').length > 70}
                      />
                    </Box>
                  </Grid>
                </Grid>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleSaveSMSTemplates}
                  disabled={templatesSaving}
                  startIcon={templatesSaving ? <CircularProgress size={20} /> : null}
                >
                  {templatesSaving ? 'Сохранение...' : 'Сохранить шаблоны'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Безопасность */}
      <TabPanel value={tabValue} index={2}>
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
      </TabPanel>

      {/* База данных */}
      <TabPanel value={tabValue} index={3}>
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
      </TabPanel>

      {/* Страницы оплаты */}
      <TabPanel value={tabValue} index={4}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Payment color="primary" fontSize="large" />
                  <Typography variant="h5" fontWeight="bold">
                    Страницы подтверждения бронирования и оплаты
                  </Typography>
                </Box>

                <Alert severity="info" sx={{ mb: 3 }}>
                  <AlertTitle>О страницах оплаты</AlertTitle>
                  После создания бронирования с онлайн оплатой, клиент перенаправляется на страницу оплаты YooKassa. 
                  После оплаты или отмены, он возвращается на страницу подтверждения, которая показывает разное содержимое 
                  в зависимости от статуса бронирования и оплаты.
                </Alert>

                <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                  Состояния страницы подтверждения
                </Typography>

                {/* Успешная оплата */}
                <Paper sx={{ p: 2, mb: 2, backgroundColor: '#e8f5e9' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CheckCircle sx={{ color: '#4caf50' }} />
                    <Typography variant="subtitle1" fontWeight="bold">
                      1. Успешная оплата
                    </Typography>
                  </Box>
                  <Typography variant="body2" paragraph>
                    <strong>Когда появляется:</strong> После успешной оплаты через YooKassa
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Статус в БД:</strong> <code>paymentStatus: 'paid'</code>, <code>status: 'confirmed'</code>
                  </Typography>
                  <Typography variant="body2">
                    <strong>Что видит клиент:</strong> Зеленый хедер с галочкой ✅, заголовок "Бронирование подтверждено!", 
                    детали бронирования, инструкции по отмене
                  </Typography>
                </Paper>

                {/* Ожидание оплаты */}
                <Paper sx={{ p: 2, mb: 2, backgroundColor: '#fff3cd' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <HourglassEmpty sx={{ color: '#ff9800' }} />
                    <Typography variant="subtitle1" fontWeight="bold">
                      2. Ожидание оплаты
                    </Typography>
                  </Box>
                  <Typography variant="body2" paragraph>
                    <strong>Когда появляется:</strong> Клиент вышел из YooKassa без оплаты (нажал "Отменить" или вернулся назад)
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Статус в БД:</strong> <code>paymentStatus: 'awaiting_payment'</code>
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Что видит клиент:</strong> Желтый хедер с часами ⏰, заголовок "Требуется оплата!", 
                    большой таймер обратного отсчета (15:00 → 00:00), анимированная кнопка "Оплатить сейчас"
                  </Typography>
                  <Typography variant="body2" color="warning.main">
                    <strong>⚠️ Важно:</strong> Бронирование автоматически отменяется через 15 минут без оплаты
                  </Typography>
                </Paper>

                {/* Бронирование отменено */}
                <Paper sx={{ p: 2, mb: 2, backgroundColor: '#ffebee' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Cancel sx={{ color: '#f44336' }} />
                    <Typography variant="subtitle1" fontWeight="bold">
                      3. Бронирование отменено
                    </Typography>
                  </Box>
                  <Typography variant="body2" paragraph>
                    <strong>Когда появляется:</strong>
                  </Typography>
                  <ul style={{ margin: '8px 0 8px 24px' }}>
                    <li><Typography variant="body2">Истекло 15 минут без оплаты</Typography></li>
                    <li><Typography variant="body2">Админ отменил бронирование</Typography></li>
                    <li><Typography variant="body2">Клиент отменил через мобильное приложение</Typography></li>
                  </ul>
                  <Typography variant="body2" paragraph>
                    <strong>Статус в БД:</strong> <code>status: 'cancelled'</code> или <code>paymentStatus: 'cancelled'/'expired'</code>
                  </Typography>
                  <Typography variant="body2">
                    <strong>Что видит клиент:</strong> Красный крестик ❌, заголовок "Бронирование отменено", 
                    список возможных причин отмены
                  </Typography>
                </Paper>

                {/* Ошибка оплаты */}
                <Paper sx={{ p: 2, mb: 2, backgroundColor: '#ffebee' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Error sx={{ color: '#f44336' }} />
                    <Typography variant="subtitle1" fontWeight="bold">
                      4. Ошибка оплаты
                    </Typography>
                  </Box>
                  <Typography variant="body2" paragraph>
                    <strong>Когда появляется:</strong> Техническая ошибка при создании платежа в YooKassa/T-Bank
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Статус в БД:</strong> <code>paymentStatus: 'error'</code>
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>URL параметр:</strong> <code>?paymentError=true</code>
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Что видит клиент:</strong> Красный хедер с крестиком ❌, заголовок "Ошибка оплаты", 
                    рекомендация связаться с администратором
                  </Typography>
                  <Typography variant="body2" color="warning.main">
                    <strong>⚠️ Важно:</strong> Бронирования с этим статусом НЕ занимают слоты в календаре и могут быть удалены суперадмином
                  </Typography>
                </Paper>

                {/* Возврат средств */}
                <Paper sx={{ p: 2, mb: 2, backgroundColor: '#e8eaf6' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Cancel sx={{ color: '#8B5CF6' }} />
                    <Typography variant="subtitle1" fontWeight="bold">
                      5. Возврат средств
                    </Typography>
                  </Box>
                  <Typography variant="body2" paragraph>
                    <strong>Когда появляется:</strong> Администратор выполнил возврат средств клиенту
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Статус в БД:</strong> <code>paymentStatus: 'refunded'</code>
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Что видит клиент:</strong> Информация о возврате средств
                  </Typography>
                  <Typography variant="body2" color="info.main">
                    <strong>ℹ️ Важно:</strong> Бронирования с этим статусом НЕ занимают слоты в календаре
                  </Typography>
                </Paper>

                {/* Обработка платежа */}
                <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <HourglassBottom sx={{ color: '#9e9e9e' }} />
                    <Typography variant="subtitle1" fontWeight="bold">
                      6. Обработка платежа
                    </Typography>
                  </Box>
                  <Typography variant="body2" paragraph>
                    <strong>Когда появляется:</strong> Платеж обрабатывается банком (редкий случай)
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>URL параметр:</strong> <code>?processing=true</code>
                  </Typography>
                  <Typography variant="body2">
                    <strong>Что видит клиент:</strong> Песочные часы ⏳, заголовок "Обработка платежа", 
                    анимированный спиннер, автоматическая проверка статуса каждые 3 секунды
                  </Typography>
                </Paper>

                {/* Бронирование не найдено */}
                <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <SearchOff sx={{ color: '#9e9e9e' }} />
                    <Typography variant="subtitle1" fontWeight="bold">
                      7. Бронирование не найдено
                    </Typography>
                  </Box>
                  <Typography variant="body2" paragraph>
                    <strong>Когда появляется:</strong> Неверный ID бронирования или бронирование удалено
                  </Typography>
                  <Typography variant="body2">
                    <strong>Что видит клиент:</strong> Лупа 🔍, заголовок "Бронирование не найдено", 
                    кнопка "На главную"
                  </Typography>
                </Paper>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" sx={{ mb: 2 }}>
                  Технические детали
                </Typography>

                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Автоматическая отмена неоплаченных бронирований
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • <strong>Таймер:</strong> 15 минут с момента создания
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • <strong>Cloud Function:</strong> <code>cancelExpiredBookings</code> (запускается каждые 5 минут)
                  </Typography>
                  <Typography variant="body2">
                    • <strong>Условие отмены:</strong> <code>paymentStatus === 'awaiting_payment' && createdAt {`>`} 15 минут назад</code>
                  </Typography>
                </Paper>

                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    URL структура
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • Основной URL: <code>/club/{'{clubId}'}/booking-confirmation/{'{bookingId}'}</code>
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • Параметр ошибки: <code>?paymentError=true</code>
                  </Typography>
                  <Typography variant="body2">
                    • Параметр обработки: <code>?processing=true</code>
                  </Typography>
                </Paper>

                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Статусы в базе данных
                  </Typography>
                  <Box sx={{ mt: 1, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                    <pre style={{ margin: 0, fontSize: '12px' }}>
{`// Статус бронирования
status: 'pending' | 'confirmed' | 'cancelled'

// Статус оплаты
paymentStatus: 
  | 'awaiting_payment' // Ожидает оплаты (начальный статус)
  | 'paid'           // Оплачено (наличные/карта на месте)
  | 'online_payment' // Оплачено онлайн (YooKassa/T-Bank)
  | 'cancelled'      // Отменено
  | 'refunded'       // Возвращено
  | 'error'          // Ошибка (не занимает слот)
  | 'expired'        // Истекло время (15 минут)
  | 'not_required'   // Не требуется (редко)`}
                    </pre>
                  </Box>
                </Paper>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <Snackbar
        open={showSuccessMessage}
        autoHideDuration={3000}
        onClose={() => setShowSuccessMessage(false)}
        message="Настройки сохранены"
      />
    </Box>
  )
}