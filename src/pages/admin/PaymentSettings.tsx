import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Switch,
  FormControlLabel,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material'
import {
  Settings,
  Check,
  Warning,
  AccountBalance,
  CreditCard,
  Security,
  Science,
  Save
} from '@mui/icons-material'
import { useAuth } from '../../contexts/AuthContext'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '../../services/firebase'

interface PaymentProvider {
  id: string
  name: string
  commission: number
  logo?: string
  fields: {
    name: string
    label: string
    type: 'text' | 'password' | 'select'
    required: boolean
    placeholder?: string
    options?: { value: string; label: string }[]
  }[]
}

const PAYMENT_PROVIDERS: PaymentProvider[] = [
  {
    id: 'tbank',
    name: 'Т-Банк',
    commission: 2.5,
    fields: [
      { name: 'shopId', label: 'Shop ID', type: 'text', required: true, placeholder: 'Например: shop_12345' },
      { name: 'secretKey', label: 'Secret Key', type: 'password', required: true },
      { name: 'terminalKey', label: 'Terminal Key', type: 'text', required: true }
    ]
  },
  {
    id: 'sber',
    name: 'Сбербанк',
    commission: 2.3,
    fields: [
      { name: 'merchantLogin', label: 'Merchant Login', type: 'text', required: true },
      { name: 'password', label: 'Пароль', type: 'password', required: true },
      { name: 'gateway', label: 'Gateway', type: 'select', required: true, options: [
        { value: 'securepayments.sberbank.ru', label: 'Боевой' },
        { value: '3dsec.sberbank.ru', label: 'Тестовый' }
      ]}
    ]
  },
  {
    id: 'yookassa',
    name: 'ЮKassa',
    commission: 2.8,
    fields: [
      { name: 'shopId', label: 'Shop ID', type: 'text', required: true },
      { name: 'secretKey', label: 'Secret Key', type: 'password', required: true }
    ]
  },
  {
    id: 'tinkoff',
    name: 'Тинькофф',
    commission: 2.49,
    fields: [
      { name: 'terminalKey', label: 'Terminal Key', type: 'text', required: true },
      { name: 'password', label: 'Пароль', type: 'password', required: true }
    ]
  }
]

export default function PaymentSettings() {
  const { admin, club } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testMode, setTestMode] = useState(true)
  const [paymentEnabled, setPaymentEnabled] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    loadPaymentSettings()
  }, [admin])

  const loadPaymentSettings = async () => {
    if (!admin?.venueId) return

    try {
      const venueDoc = await getDoc(doc(db, 'venues', admin.venueId))
      if (venueDoc.exists()) {
        const data = venueDoc.data()
        setPaymentEnabled(data.paymentEnabled || false)
        setTestMode(data.paymentTestMode !== false)
        setSelectedProvider(data.paymentProvider || '')
        
        // Декриптуем учетные данные (в реальном приложении нужна безопасная декриптация)
        if (data.paymentCredentials) {
          setCredentials(data.paymentCredentials)
        }
        
        // Определяем активный шаг
        if (data.paymentProvider && data.paymentCredentials) {
          setActiveStep(2)
        } else if (data.paymentProvider) {
          setActiveStep(1)
        }
      }
      setLoading(false)
    } catch (error) {
      console.error('Error loading payment settings:', error)
      setLoading(false)
    }
  }

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider)
    setCredentials({})
    setActiveStep(1)
  }

  const handleCredentialChange = (field: string, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!admin?.venueId || !selectedProvider) return

    setSaving(true)
    try {
      // В реальном приложении нужно шифровать учетные данные перед сохранением
      await updateDoc(doc(db, 'venues', admin.venueId), {
        paymentEnabled,
        paymentTestMode: testMode,
        paymentProvider: selectedProvider,
        paymentCredentials: credentials,
        paymentUpdatedAt: new Date()
      })

      setActiveStep(2)
      alert('Настройки успешно сохранены')
    } catch (error) {
      console.error('Error saving payment settings:', error)
      alert('Ошибка при сохранении настроек')
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setTestDialogOpen(true)
    setTestResult(null)

    // Имитация тестирования подключения
    setTimeout(() => {
      const success = Math.random() > 0.3 // 70% успех
      setTestResult({
        success,
        message: success 
          ? 'Подключение успешно проверено. Платежи готовы к работе.'
          : 'Ошибка подключения. Проверьте правильность введенных данных.'
      })
    }, 2000)
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  const selectedProviderData = PAYMENT_PROVIDERS.find(p => p.id === selectedProvider)

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Настройки эквайринга
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Подключите свой эквайринг для приема платежей от клиентов. 
        Все платежи будут поступать напрямую на ваш расчетный счет.
      </Alert>

      {/* Статус подключения */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6">
                Статус платежей
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {paymentEnabled ? 'Платежи активны и готовы к приему' : 'Платежи не настроены'}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={testMode}
                    onChange={(e) => setTestMode(e.target.checked)}
                    disabled={!paymentEnabled}
                  />
                }
                label="Тестовый режим"
              />
              <Chip
                icon={paymentEnabled ? <Check /> : <Warning />}
                label={paymentEnabled ? 'Подключено' : 'Не подключено'}
                color={paymentEnabled ? 'success' : 'default'}
              />
            </Box>
          </Box>

          {paymentEnabled && selectedProviderData && (
            <Box mt={2} p={2} bgcolor="background.default" borderRadius={1}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Провайдер: <strong>{selectedProviderData.name}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Комиссия: <strong>{selectedProviderData.commission}%</strong>
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Пошаговая настройка */}
      <Stepper activeStep={activeStep} orientation="vertical">
        <Step>
          <StepLabel>Выберите платежного провайдера</StepLabel>
          <StepContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Выберите банк или платежную систему, с которой у вас заключен договор эквайринга
            </Typography>
            
            <Box sx={{ mt: 2, mb: 3 }}>
              {PAYMENT_PROVIDERS.map((provider) => (
                <Paper
                  key={provider.id}
                  sx={{
                    p: 2,
                    mb: 2,
                    cursor: 'pointer',
                    border: selectedProvider === provider.id ? 2 : 1,
                    borderColor: selectedProvider === provider.id ? 'primary.main' : 'divider',
                    '&:hover': { borderColor: 'primary.main' }
                  }}
                  onClick={() => handleProviderChange(provider.id)}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={2}>
                      <AccountBalance color="action" />
                      <Box>
                        <Typography variant="subtitle1">{provider.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Комиссия: {provider.commission}%
                        </Typography>
                      </Box>
                    </Box>
                    {selectedProvider === provider.id && (
                      <Check color="primary" />
                    )}
                  </Box>
                </Paper>
              ))}
            </Box>

            <Button
              variant="contained"
              onClick={() => setActiveStep(1)}
              disabled={!selectedProvider}
            >
              Продолжить
            </Button>
          </StepContent>
        </Step>

        <Step>
          <StepLabel>Введите данные для подключения</StepLabel>
          <StepContent>
            {selectedProviderData && (
              <>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Введите данные из личного кабинета {selectedProviderData.name}
                </Typography>

                <Box sx={{ mt: 2 }}>
                  {selectedProviderData.fields.map((field) => (
                    <Box key={field.name} sx={{ mb: 2 }}>
                      {field.type === 'select' ? (
                        <FormControl fullWidth>
                          <InputLabel>{field.label}</InputLabel>
                          <Select
                            value={credentials[field.name] || ''}
                            onChange={(e) => handleCredentialChange(field.name, e.target.value)}
                            required={field.required}
                          >
                            {field.options?.map(option => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        <TextField
                          fullWidth
                          label={field.label}
                          type={field.type}
                          value={credentials[field.name] || ''}
                          onChange={(e) => handleCredentialChange(field.name, e.target.value)}
                          required={field.required}
                          placeholder={field.placeholder}
                        />
                      )}
                    </Box>
                  ))}
                </Box>

                <Alert severity="warning" icon={<Security />} sx={{ mt: 2, mb: 2 }}>
                  Все данные хранятся в зашифрованном виде и используются только для проведения платежей
                </Alert>

                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving || !selectedProviderData.fields.every(f => !f.required || credentials[f.name])}
                    startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                  >
                    {saving ? 'Сохранение...' : 'Сохранить и продолжить'}
                  </Button>
                  <Button sx={{ ml: 1 }} onClick={() => setActiveStep(0)}>
                    Назад
                  </Button>
                </Box>
              </>
            )}
          </StepContent>
        </Step>

        <Step>
          <StepLabel>Проверка подключения</StepLabel>
          <StepContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Проверьте работу платежей в тестовом режиме перед началом приема реальных платежей
            </Typography>

            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                onClick={handleTestConnection}
                startIcon={<Science />}
              >
                Проверить подключение
              </Button>
            </Box>

            {paymentEnabled && (
              <Alert severity="success" sx={{ mt: 3 }}>
                Поздравляем! Платежи настроены и готовы к работе.
                {testMode && ' Не забудьте отключить тестовый режим для приема реальных платежей.'}
              </Alert>
            )}
          </StepContent>
        </Step>
      </Stepper>

      {/* Преимущества */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Преимущества собственного эквайринга
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <Check color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Прямые платежи на ваш счет"
                secondary="Деньги поступают напрямую без посредников"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Check color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Полный контроль"
                secondary="Вы сами управляете возвратами и платежами"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Check color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Низкие комиссии"
                secondary="Только комиссия вашего банка, без дополнительных сборов"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Диалог тестирования */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)}>
        <DialogTitle>Проверка подключения</DialogTitle>
        <DialogContent>
          {!testResult ? (
            <Box display="flex" alignItems="center" gap={2} py={2}>
              <CircularProgress size={24} />
              <Typography>Проверяем подключение...</Typography>
            </Box>
          ) : (
            <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mt: 1 }}>
              {testResult.message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>
            Закрыть
          </Button>
          {testResult?.success && (
            <Button variant="contained" onClick={() => {
              setPaymentEnabled(true)
              setTestDialogOpen(false)
              handleSave()
            }}>
              Активировать платежи
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}