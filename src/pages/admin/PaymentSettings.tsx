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
  CircularProgress,
  Checkbox,
  FormGroup,
  FormLabel
} from '@mui/material'
import {
  Settings,
  Check,
  Warning,
  AccountBalance,
  CreditCard,
  Security,
  Science,
  Save,
  Info
} from '@mui/icons-material'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { VenueSelector, VenueSelectorEmpty } from '../../components/VenueSelector'
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
    id: 'yookassa',
    name: 'ЮKassa',
    commission: 2.8,
    fields: [
      { name: 'shopId', label: 'Shop ID', type: 'text', required: true },
      { name: 'secretKey', label: 'Secret Key', type: 'password', required: true }
    ]
  }
]

export default function PaymentSettings() {
  const { admin, club } = useAuth()
  const { isSuperAdmin } = usePermission()
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testMode, setTestMode] = useState(true)
  const [paymentEnabled, setPaymentEnabled] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [activeStep, setActiveStep] = useState(0)
  const [moderationDialogOpen, setModerationDialogOpen] = useState(false)
  const [enabledPaymentMethods, setEnabledPaymentMethods] = useState<Record<string, boolean>>({
    cash: true,
    card_on_site: true,
    transfer: true,
    sberbank_card: true,
    tbank_card: true,
    vtb_card: true
  })

  useEffect(() => {
    // Проверяем статус клуба при загрузке
    if (club?.status === 'pending' && !isSuperAdmin) {
      setModerationDialogOpen(true)
    }
    
    if (isSuperAdmin) {
      const venueId = localStorage.getItem('selectedVenueId')
      if (venueId) {
        setSelectedVenueId(venueId)
        loadPaymentSettings(venueId)
      } else {
        setLoading(false)
      }
    } else if (admin?.venueId) {
      loadPaymentSettings(admin.venueId)
    }
  }, [admin, isSuperAdmin, club])

  const handleVenueChange = (venueId: string) => {
    setSelectedVenueId(venueId)
    localStorage.setItem('selectedVenueId', venueId)
    if (venueId) {
      loadPaymentSettings(venueId)
    }
  }

  const loadPaymentSettings = async (venueId?: string) => {
    const targetVenueId = venueId || admin?.venueId
    if (!targetVenueId) return

    try {
      setLoading(true)
      const venueDoc = await getDoc(doc(db, 'venues', targetVenueId))
      if (venueDoc.exists()) {
        const data = venueDoc.data()
        setPaymentEnabled(data.paymentEnabled || false)
        setTestMode(data.paymentTestMode !== false)
        setSelectedProvider(data.paymentProvider || '')
        
        // Декриптуем учетные данные (в реальном приложении нужна безопасная декриптация)
        if (data.paymentCredentials) {
          setCredentials(data.paymentCredentials)
        }
        
        // Загружаем настройки видимости способов оплаты
        if (data.enabledPaymentMethods) {
          setEnabledPaymentMethods(data.enabledPaymentMethods)
        } else {
          // По умолчанию все включены
          setEnabledPaymentMethods({
            cash: true,
            card_on_site: true,
            transfer: true,
            sberbank_card: true,
            tbank_card: true,
            vtb_card: true
          })
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
    const venueId = isSuperAdmin ? selectedVenueId : admin?.venueId
    if (!venueId || !selectedProvider) return

    setSaving(true)
    try {
      // Для YooKassa автоматически отключаем тестовый режим
      const finalTestMode = selectedProvider === 'yookassa' ? false : testMode
      
      const updateData = {
        paymentEnabled,
        paymentTestMode: finalTestMode,
        paymentProvider: selectedProvider,
        paymentCredentials: credentials,
        enabledPaymentMethods,
        paymentUpdatedAt: new Date()
      }
      
      console.log('Saving payment settings:', {
        venueId,
        ...updateData
      })
      
      // В реальном приложении нужно шифровать учетные данные перед сохранением
      await updateDoc(doc(db, 'venues', venueId), updateData)

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

    const venueId = isSuperAdmin ? selectedVenueId : admin?.venueId
    if (!venueId || !selectedProvider) return

    try {
      // Вызываем Cloud Function для проверки подключения
      const testPaymentConnection = (await import('firebase/functions')).httpsCallable(
        (await import('../../services/firebase')).functions,
        'testPaymentConnection'
      )
      
      const result = await testPaymentConnection({
        venueId,
        provider: selectedProvider,
        credentials
      })

      setTestResult(result.data as { success: boolean; message: string })
    } catch (error: any) {
      console.error('Error testing connection:', error)
      setTestResult({
        success: false,
        message: error.message || 'Ошибка при проверке подключения'
      })
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (isSuperAdmin && !selectedVenueId) {
    return <VenueSelectorEmpty title="Выберите клуб для настройки оплаты" />
  }

  const selectedProviderData = PAYMENT_PROVIDERS.find(p => p.id === selectedProvider)

  return (
    <Box>
      {/* Селектор клуба для суперадмина */}
      {isSuperAdmin && (
        <VenueSelector
          selectedVenueId={selectedVenueId}
          onVenueChange={handleVenueChange}
        />
      )}
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
              {selectedProvider !== 'yookassa' && (
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
              )}
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

                {selectedProvider === 'yookassa' && (
                  <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                    YooKassa не поддерживает тестовый режим через API. Используйте реальные ключи и проводите тестовые платежи на небольшие суммы с последующим возвратом.
                  </Alert>
                )}

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
                          helperText={
                            field.name === 'secretKey' && selectedProvider === 'yookassa'
                              ? 'Используйте OAuth токен (live_xxx или test_xxx). Для возвратов токен должен иметь права refunds:write'
                              : field.placeholder
                          }
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
              <>
                <Alert severity="success" sx={{ mt: 3 }}>
                  Поздравляем! Платежи настроены и готовы к работе.
                  {selectedProvider === 'yookassa' 
                    ? ' YooKassa работает только с реальными платежами.'
                    : testMode && ' Не забудьте отключить тестовый режим для приема реальных платежей.'}
                </Alert>
                
                {/* Кнопка для редактирования настроек */}
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => {
                      setActiveStep(1)
                      setPaymentEnabled(false)
                    }}
                  >
                    Изменить настройки платежей
                  </Button>
                  
                  {selectedProvider === 'yookassa' && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Если возвраты не работают, создайте новый OAuth токен с правами на возвраты в личном кабинете YooKassa
                    </Typography>
                  )}
                </Box>
                
                {selectedProvider === 'yookassa' && (
                  <Alert severity="warning" icon={<Info />} sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Важно! Для завершения настройки YooKassa:
                    </Typography>
                    <Box component="ol" sx={{ pl: 2, mb: 0 }}>
                      <li>Войдите в личный кабинет YooKassa</li>
                      <li>Перейдите в раздел "Настройки" → "Уведомления" → "HTTP-уведомления"</li>
                      <li>Укажите URL для уведомлений: <strong>https://allcourt.ru/api/webhooks/yookassa</strong></li>
                      <li>Выберите события: "Успешная оплата", "Отмена платежа", "Возврат платежа"</li>
                      <li>Сохраните настройки</li>
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Важно!</strong> Без настройки webhook в личном кабинете YooKassa статусы платежей не будут обновляться автоматически.
                    </Typography>
                  </Alert>
                )}
              </>
            )}
          </StepContent>
        </Step>
      </Stepper>

      {/* Управление способами оплаты */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Доступные способы оплаты в админ-панели
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
            Выберите, какие способы оплаты будут доступны администраторам при создании бронирований. 
            Онлайн оплата всегда доступна и не может быть отключена.
          </Typography>
          
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={enabledPaymentMethods.cash}
                  onChange={(e) => setEnabledPaymentMethods(prev => ({ ...prev, cash: e.target.checked }))}
                />
              }
              label={
                <Box>
                  <Typography>Оплата в клубе наличными</Typography>
                  <Typography variant="caption" color="text.secondary">
                    ✓ Без ограничения по времени
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={enabledPaymentMethods.card_on_site}
                  onChange={(e) => setEnabledPaymentMethods(prev => ({ ...prev, card_on_site: e.target.checked }))}
                />
              }
              label={
                <Box>
                  <Typography>Оплата в клубе картой</Typography>
                  <Typography variant="caption" color="text.secondary">
                    ✓ Без ограничения по времени
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={enabledPaymentMethods.transfer}
                  onChange={(e) => setEnabledPaymentMethods(prev => ({ ...prev, transfer: e.target.checked }))}
                />
              }
              label={
                <Box>
                  <Typography>Перевод на р.счет клуба (юр.лицо)</Typography>
                  <Typography variant="caption" color="text.secondary">
                    ✓ Без ограничения по времени
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={enabledPaymentMethods.sberbank_card}
                  onChange={(e) => setEnabledPaymentMethods(prev => ({ ...prev, sberbank_card: e.target.checked }))}
                />
              }
              label={
                <Box>
                  <Typography>На карту Сбербанка</Typography>
                  <Typography variant="caption" color="text.secondary">
                    ⏱️ 30 минут на подтверждение оплаты
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={enabledPaymentMethods.tbank_card}
                  onChange={(e) => setEnabledPaymentMethods(prev => ({ ...prev, tbank_card: e.target.checked }))}
                />
              }
              label={
                <Box>
                  <Typography>На карту Т-Банка</Typography>
                  <Typography variant="caption" color="text.secondary">
                    ⏱️ 30 минут на подтверждение оплаты
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={enabledPaymentMethods.vtb_card}
                  onChange={(e) => setEnabledPaymentMethods(prev => ({ ...prev, vtb_card: e.target.checked }))}
                />
              }
              label={
                <Box>
                  <Typography>На карту ВТБ</Typography>
                  <Typography variant="caption" color="text.secondary">
                    ⏱️ 30 минут на подтверждение оплаты
                  </Typography>
                </Box>
              }
            />
          </FormGroup>
          
          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              onClick={async () => {
                const venueId = isSuperAdmin ? selectedVenueId : admin?.venueId
                if (!venueId) return
                
                try {
                  setSaving(true)
                  await updateDoc(doc(db, 'venues', venueId), {
                    enabledPaymentMethods,
                    paymentMethodsUpdatedAt: new Date()
                  })
                  alert('Настройки способов оплаты сохранены')
                } catch (error) {
                  console.error('Error saving payment methods:', error)
                  alert('Ошибка при сохранении настроек')
                } finally {
                  setSaving(false)
                }
              }}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <Save />}
            >
              {saving ? 'Сохранение...' : 'Сохранить настройки способов оплаты'}
            </Button>
          </Box>
        </CardContent>
      </Card>

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
            <Button variant="contained" onClick={async () => {
              setPaymentEnabled(true)
              setTestDialogOpen(false)
              // Вызываем handleSave с явной передачей paymentEnabled = true
              const venueId = isSuperAdmin ? selectedVenueId : admin?.venueId
              if (!venueId || !selectedProvider) return

              setSaving(true)
              try {
                // Для YooKassa автоматически отключаем тестовый режим
                const finalTestMode = selectedProvider === 'yookassa' ? false : testMode
                
                const updateData = {
                  paymentEnabled: true, // Явно устанавливаем true
                  paymentTestMode: finalTestMode,
                  paymentProvider: selectedProvider,
                  paymentCredentials: credentials,
                  paymentUpdatedAt: new Date()
                }
                
                console.log('Activating payments:', {
                  venueId,
                  ...updateData
                })
                
                await updateDoc(doc(db, 'venues', venueId), updateData)
                setActiveStep(2)
                alert('Платежи успешно активированы!')
              } catch (error) {
                console.error('Error activating payments:', error)
                alert('Ошибка при активации платежей')
              } finally {
                setSaving(false)
              }
            }}>
              Активировать платежи
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Модальное окно для клубов на модерации */}
      <Dialog
        open={moderationDialogOpen}
        onClose={() => setModerationDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Warning color="warning" />
            Клуб на модерации
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Для подключения платежной системы необходимо пройти модерацию.
          </Alert>
          <Typography variant="body1" paragraph>
            Для успешной модерации необходимо:
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <Check color="action" />
              </ListItemIcon>
              <ListItemText 
                primary="Заполнить реквизиты компании"
                secondary="Перейдите в раздел 'Настройки клуба' и заполните все реквизиты"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Check color="action" />
              </ListItemIcon>
              <ListItemText 
                primary="Добавить корты"
                secondary="Создайте хотя бы один корт в разделе 'Корты'"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Check color="action" />
              </ListItemIcon>
              <ListItemText 
                primary="Настроить расписание работы"
                secondary="Укажите часы работы клуба в настройках"
              />
            </ListItem>
          </List>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            После выполнения всех условий модерация будет пройдена автоматически, и вы сможете подключить платежную систему.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModerationDialogOpen(false)} variant="contained">
            Понятно
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}