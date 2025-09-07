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
  Grid,
  Checkbox,
  FormGroup,
  FormLabel,
  Divider
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
  Info,
  BusinessCenter,
  AttachMoney,
  Description,
  CheckCircle,
  HourglassEmpty,
  Cancel,
  AccountBalanceWallet,
  Refresh
} from '@mui/icons-material'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { VenueSelector, VenueSelectorEmpty } from '../../components/VenueSelector'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../../services/firebase'

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
  const [venueData, setVenueData] = useState<any>(null)
  
  // Multiaccounts state
  const [paymentType, setPaymentType] = useState<'multiaccounts' | 'direct'>('multiaccounts')
  const [platformCommissionPercent, setPlatformCommissionPercent] = useState(1.0) // Комиссия платформы
  const [acquiringCommissionPercent, setAcquiringCommissionPercent] = useState(2.6) // Эквайринг и касса
  const [multiaccountsStatus, setMultiaccountsStatus] = useState<'not_configured' | 'pending' | 'active' | 'rejected'>('not_configured')
  const [requisitesComplete, setRequisitesComplete] = useState(false)
  const [missingRequisites, setMissingRequisites] = useState<string[]>([])
  
  // Direct acquiring state
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
    // Check club status
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
        setVenueData(data)
        
        // Load payment type (default to multiaccounts for new venues)
        setPaymentType(data.paymentType || 'multiaccounts')
        setPlatformCommissionPercent(data.platformCommissionPercent || 1.0)
        setAcquiringCommissionPercent(data.acquiringCommissionPercent || 2.6)
        
        // Check if requisites are complete
        const requisitesFields = [
          'organizationType', 'legalName', 'inn', 'ogrn',
          'legalAddress', 'bankName', 'bik', 'correspondentAccount',
          'settlementAccount', 'financeEmail', 'financePhone'
        ]
        const missing = requisitesFields.filter(field => !data[field])
        setMissingRequisites(missing)
        setRequisitesComplete(missing.length === 0)
        
        // Load multiaccounts status
        if (data.multiaccountsConfig) {
          setMultiaccountsStatus(data.multiaccountsConfig.status || 'not_configured')
        }
        
        // Load direct acquiring settings
        setPaymentEnabled(data.paymentEnabled || false)
        setTestMode(data.paymentTestMode !== false)
        setSelectedProvider(data.paymentProvider || '')
        
        if (data.paymentCredentials) {
          setCredentials(data.paymentCredentials)
        }
        
        if (data.enabledPaymentMethods) {
          setEnabledPaymentMethods(data.enabledPaymentMethods)
        }
        
        // Determine active step for direct acquiring
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

  const handleSubmitMultiaccounts = async () => {
    const venueId = isSuperAdmin ? selectedVenueId : admin?.venueId
    if (!venueId) return
    
    setSaving(true)
    try {
      // Update status to pending
      await updateDoc(doc(db, 'venues', venueId), {
        'multiaccountsConfig.status': 'pending',
        'multiaccountsConfig.registeredAt': new Date(),
        paymentType: 'multiaccounts',
        platformCommissionPercent: platformCommissionPercent,
        acquiringCommissionPercent: acquiringCommissionPercent
      })
      
      // TODO: Call Cloud Function to register with Tbank
      // const registerClubInMultiaccounts = httpsCallable(functions, 'registerClubInMultiaccounts')
      // await registerClubInMultiaccounts({ venueId })
      
      setMultiaccountsStatus('pending')
      alert('Заявка на подключение Мультирасчетов отправлена!')
    } catch (error) {
      console.error('Error submitting multiaccounts:', error)
      alert('Ошибка при отправке заявки')
    } finally {
      setSaving(false)
    }
  }

  const handleCheckMultiaccountsStatus = async () => {
    const venueId = isSuperAdmin ? selectedVenueId : admin?.venueId
    if (!venueId) return
    
    setSaving(true)
    try {
      // Call Cloud Function to check status
      const checkMultiaccountsStatus = httpsCallable(functions, 'checkMultiaccountsStatus')
      const result = await checkMultiaccountsStatus({ venueId })
      const data = result.data as any
      
      if (data.success) {
        if (data.status === 'active') {
          // Update status to active
          await updateDoc(doc(db, 'venues', venueId), {
            'multiaccountsConfig.status': 'active',
            'multiaccountsConfig.activatedAt': new Date(),
            'multiaccountsConfig.recipientId': data.recipientId
          })
          setMultiaccountsStatus('active')
          alert('✅ Мультирасчеты успешно активированы!')
        } else if (data.status === 'rejected') {
          // Update status to rejected
          await updateDoc(doc(db, 'venues', venueId), {
            'multiaccountsConfig.status': 'rejected',
            'multiaccountsConfig.rejectionReason': data.reason
          })
          setMultiaccountsStatus('rejected')
          alert(`❌ Заявка отклонена: ${data.reason}`)
        } else {
          alert('Заявка все еще на рассмотрении. Проверьте позже.')
        }
      } else {
        alert(data.error || 'Ошибка при проверке статуса')
      }
    } catch (error) {
      console.error('Error checking status:', error)
      alert('Ошибка при проверке статуса заявки')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDirectAcquiring = async () => {
    const venueId = isSuperAdmin ? selectedVenueId : admin?.venueId
    if (!venueId || !selectedProvider) return

    setSaving(true)
    try {
      const finalTestMode = selectedProvider === 'yookassa' ? false : testMode
      
      const updateData = {
        paymentEnabled,
        paymentTestMode: finalTestMode,
        paymentProvider: selectedProvider,
        paymentCredentials: credentials,
        enabledPaymentMethods,
        paymentType: 'direct',
        paymentUpdatedAt: new Date()
      }
      
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
      {/* Venue selector for superadmin */}
      {isSuperAdmin && (
        <VenueSelector
          selectedVenueId={selectedVenueId}
          onVenueChange={handleVenueChange}
        />
      )}
      
      <Typography variant="h5" component="h2" gutterBottom>
        Настройки приема платежей
      </Typography>

      {/* Payment type selector (only for superadmin) */}
      {isSuperAdmin && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Тип приема платежей
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Внимание:</strong> Переключение типа приема платежей доступно только суперадминистраторам.
                Изменение типа платежей может повлиять на процесс обработки всех будущих платежей.
              </Typography>
            </Alert>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Способ приема платежей</InputLabel>
              <Select
                value={paymentType}
                label="Способ приема платежей"
                onChange={(e) => {
                  const newPaymentType = e.target.value as 'multiaccounts' | 'direct'
                  setPaymentType(newPaymentType)
                }}
              >
                <MenuItem value="multiaccounts">
                  Мультирасчеты от Т-Банка (рекомендуется)
                </MenuItem>
                <MenuItem value="direct">
                  Собственный эквайринг (для существующих клубов)
                </MenuItem>
              </Select>
            </FormControl>
            
            {paymentType === 'multiaccounts' && (
              <Box sx={{ mt: 2, mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Комиссия платформы AllCourt (%)"
                      type="number"
                      value={platformCommissionPercent}
                      onChange={(e) => setPlatformCommissionPercent(Number(e.target.value))}
                      inputProps={{ min: 0, max: 100, step: 0.1 }}
                      fullWidth
                      disabled={!isSuperAdmin}
                      helperText="Комиссия за использование платформы"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Эквайринг и онлайн-касса (%)"
                      type="number"
                      value={acquiringCommissionPercent}
                      onChange={(e) => setAcquiringCommissionPercent(Number(e.target.value))}
                      inputProps={{ min: 0, max: 100, step: 0.1 }}
                      fullWidth
                      disabled={!isSuperAdmin}
                      helperText="Комиссия банка и фискализация"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Alert severity="info">
                      <Typography variant="subtitle2">
                        Общая комиссия: {(platformCommissionPercent + acquiringCommissionPercent).toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        С каждого платежа в 1000₽ будет удержано {((platformCommissionPercent + acquiringCommissionPercent) * 10).toFixed(0)}₽,
                        клуб получит {(1000 - (platformCommissionPercent + acquiringCommissionPercent) * 10).toFixed(0)}₽
                      </Typography>
                    </Alert>
                  </Grid>
                </Grid>
                
                {/* Кнопка сохранения комиссий для суперадмина */}
                {isSuperAdmin && (
                  venueData?.platformCommissionPercent !== platformCommissionPercent || 
                  venueData?.acquiringCommissionPercent !== acquiringCommissionPercent
                ) && (
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={async () => {
                        const venueId = selectedVenueId || admin?.venueId
                        if (venueId) {
                          try {
                            setSaving(true)
                            await updateDoc(doc(db, 'venues', venueId), {
                              platformCommissionPercent: platformCommissionPercent,
                              acquiringCommissionPercent: acquiringCommissionPercent
                            })
                            
                            // Обновляем локальные данные
                            setVenueData({
                              ...venueData,
                              platformCommissionPercent,
                              acquiringCommissionPercent
                            })
                            
                            alert(`✅ Комиссии успешно обновлены`)
                          } catch (error) {
                            console.error('Error updating commissions:', error)
                            alert('❌ Ошибка при сохранении комиссий')
                          } finally {
                            setSaving(false)
                          }
                        }
                      }}
                      disabled={saving}
                    >
                      {saving ? 'Сохранение...' : 'Сохранить комиссии'}
                    </Button>
                  </Box>
                )}
              </Box>
            )}
            
            {/* Показываем кнопку сохранения только если тип изменился */}
            {venueData && venueData.paymentType !== paymentType && (
              <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={async () => {
                    const venueId = selectedVenueId || admin?.venueId
                    if (venueId) {
                      // Показываем диалог подтверждения
                      const confirmMessage = paymentType === 'direct' 
                        ? 'Вы уверены, что хотите переключить клуб на собственный эквайринг? Платежи будут поступать напрямую на счет клуба.'
                        : `Вы уверены, что хотите переключить клуб на Мультирасчеты? Платежи будут проходить через платформу с общей комиссией ${(platformCommissionPercent + acquiringCommissionPercent).toFixed(1)}%.`
                      
                      if (!confirm(confirmMessage)) {
                        // Возвращаем старое значение
                        setPaymentType(venueData.paymentType || 'multiaccounts')
                        return
                      }
                      
                      try {
                        setSaving(true)
                        const updateData: any = {
                          paymentType: paymentType,
                          paymentTypeUpdatedAt: new Date()
                        }
                        
                        if (paymentType === 'direct') {
                          // При переключении на direct сбрасываем настройки мультирасчетов
                          updateData.multiaccountsConfig = {
                            status: 'not_applicable',
                            note: 'Клуб использует собственный эквайринг'
                          }
                          updateData.platformCommissionPercent = 0
                          updateData.acquiringCommissionPercent = 0
                        } else {
                          // При переключении на multiaccounts устанавливаем начальные настройки
                          updateData.multiaccountsConfig = {
                            status: 'not_configured',
                            note: 'Требуется настройка Мультирасчетов'
                          }
                          updateData.platformCommissionPercent = platformCommissionPercent || 1.0
                          updateData.acquiringCommissionPercent = acquiringCommissionPercent || 2.6
                        }
                        
                        await updateDoc(doc(db, 'venues', venueId), updateData)
                        
                        // Обновляем локальные данные
                        setVenueData({...venueData, ...updateData})
                        
                        alert(`✅ Тип платежей успешно изменен на: ${paymentType === 'direct' ? 'Собственный эквайринг' : 'Мультирасчеты'}`)
                      } catch (error) {
                        console.error('Error updating payment type:', error)
                        alert('❌ Ошибка при изменении типа платежей')
                        // Откатываем изменение при ошибке
                        setPaymentType(venueData.paymentType || 'multiaccounts')
                      } finally {
                        setSaving(false)
                      }
                    }
                  }}
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                >
                  {saving ? 'Сохранение...' : 'Сохранить изменение типа платежей'}
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={() => {
                    // Отменяем изменение
                    setPaymentType(venueData.paymentType || 'multiaccounts')
                    setPlatformCommissionPercent(venueData.platformCommissionPercent || 1.0)
                    setAcquiringCommissionPercent(venueData.acquiringCommissionPercent || 2.6)
                  }}
                  disabled={saving}
                >
                  Отмена
                </Button>
              </Box>
            )}
            
            {/* Отдельная кнопка для сохранения комиссии */}
            {isSuperAdmin && paymentType === 'multiaccounts' && venueData && 
             venueData.paymentType === 'multiaccounts' && 
             (venueData.platformCommissionPercent !== platformCommissionPercent || 
              venueData.acquiringCommissionPercent !== acquiringCommissionPercent) && (
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={async () => {
                    const venueId = selectedVenueId || admin?.venueId
                    if (venueId) {
                      try {
                        await updateDoc(doc(db, 'venues', venueId), {
                          platformCommissionPercent: platformCommissionPercent,
                          acquiringCommissionPercent: acquiringCommissionPercent,
                          commissionUpdatedAt: new Date()
                        })
                        setVenueData({
                          ...venueData, 
                          platformCommissionPercent, 
                          acquiringCommissionPercent
                        })
                        alert(`✅ Комиссии обновлены: платформа ${platformCommissionPercent}% + эквайринг ${acquiringCommissionPercent}%`)
                      } catch (error) {
                        console.error('Error updating commission:', error)
                        alert('❌ Ошибка при обновлении комиссий')
                      }
                    }
                  }}
                >
                  Сохранить изменения комиссий
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Multiaccounts section */}
      {paymentType === 'multiaccounts' && (
        <>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Мультирасчеты от Т-Банка - современное решение для приема платежей
            </Typography>
            <Typography variant="body2">
              Все платежи проходят через защищенную платформу AllCourt. 
              Деньги автоматически выплачиваются вам на следующий рабочий день за вычетом комиссий (платформа {platformCommissionPercent}% + эквайринг {acquiringCommissionPercent}%).
            </Typography>
          </Alert>

          {/* Multiaccounts status */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Статус подключения Мультирасчетов
              </Typography>
              
              {multiaccountsStatus === 'not_configured' && (
                <>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    {!requisitesComplete ? (
                      <>
                        <Typography variant="subtitle2" gutterBottom>
                          Для подключения необходимо заполнить реквизиты компании
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Перейдите в раздел "Управление клубом" → вкладка "Реквизиты" и заполните следующие обязательные поля:
                        </Typography>
                        <Box component="ul" sx={{ m: 0, pl: 2 }}>
                          {missingRequisites.map(field => {
                            const fieldLabels: Record<string, string> = {
                              'organizationType': 'Тип организации (ООО, ИП и т.д.)',
                              'legalName': 'Юридическое наименование',
                              'inn': 'ИНН',
                              'ogrn': 'ОГРН/ОГРНИП',
                              'legalAddress': 'Юридический адрес',
                              'bankName': 'Наименование банка',
                              'bik': 'БИК банка',
                              'correspondentAccount': 'Корреспондентский счет',
                              'settlementAccount': 'Расчетный счет',
                              'financeEmail': 'Email для финансовых уведомлений',
                              'financePhone': 'Телефон для финансовых вопросов'
                            }
                            return (
                              <li key={field}>
                                <Typography variant="body2" color="error">
                                  {fieldLabels[field] || field}
                                </Typography>
                              </li>
                            )
                          })}
                        </Box>
                      </>
                    ) : (
                      <>
                        <Typography variant="subtitle2" gutterBottom>
                          Реквизиты заполнены. Вы можете подать заявку на подключение.
                        </Typography>
                      </>
                    )}
                  </Alert>
                  
                  <Button
                    variant="contained"
                    onClick={requisitesComplete ? handleSubmitMultiaccounts : undefined}
                    disabled={!requisitesComplete || saving}
                    startIcon={saving ? <CircularProgress size={20} /> : <BusinessCenter />}
                    href={!requisitesComplete ? '/admin/club-management?tab=requisites' : undefined}
                  >
                    {!requisitesComplete ? 'Заполнить реквизиты' : 'Подать заявку на подключение'}
                  </Button>
                </>
              )}
              
              {multiaccountsStatus === 'pending' && (
                <>
                  <Alert severity="info" icon={<HourglassEmpty />}>
                    <Typography variant="subtitle2" gutterBottom>
                      Заявка на рассмотрении
                    </Typography>
                    <Typography variant="body2">
                      Ваша заявка проходит проверку. Обычно это занимает 1-2 рабочих дня.
                      Мы отправим уведомление на указанный email после одобрения.
                    </Typography>
                  </Alert>
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={handleCheckMultiaccountsStatus}
                      disabled={saving}
                      startIcon={saving ? <CircularProgress size={20} /> : <Refresh />}
                    >
                      Проверить статус заявки
                    </Button>
                    <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                      Нажмите после получения письма от Т-Банка с одобрением заявки
                    </Typography>
                  </Box>
                </>
              )}
              
              {multiaccountsStatus === 'active' && (
                <Alert severity="success" icon={<CheckCircle />}>
                  <Typography variant="subtitle2" gutterBottom>
                    Мультирасчеты активны
                  </Typography>
                  <Typography variant="body2">
                    Все платежи автоматически обрабатываются через платформу.
                    Выплаты производятся ежедневно в 10:00 МСК за предыдущий день.
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Chip 
                      label={`Общая комиссия: ${(platformCommissionPercent + acquiringCommissionPercent).toFixed(1)}%`}
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                </Alert>
              )}
              
              {multiaccountsStatus === 'rejected' && (
                <Alert severity="error" icon={<Cancel />}>
                  <Typography variant="subtitle2" gutterBottom>
                    Заявка отклонена
                  </Typography>
                  <Typography variant="body2">
                    {venueData?.multiaccountsConfig?.rejectionReason || 'Пожалуйста, проверьте правильность заполнения реквизитов и подайте заявку повторно.'}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleSubmitMultiaccounts}
                      disabled={!requisitesComplete || saving}
                    >
                      Подать заявку повторно
                    </Button>
                  </Box>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Advantages of Multiaccounts */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Преимущества Мультирасчетов
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <AccountBalanceWallet color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Быстрое подключение"
                        secondary="Начните принимать платежи уже через 1-2 дня"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <AttachMoney color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Ежедневные выплаты"
                        secondary="Получайте деньги на следующий рабочий день"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Security color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Безопасность платежей"
                        secondary="Защита от мошенничества и чарджбэков"
                      />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} md={6}>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <Description color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Детальная отчетность"
                        secondary="Полная прозрачность всех транзакций"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Settings color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Автоматические возвраты"
                        secondary="Система сама обработает возвраты средств"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Check color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Общая комиссия ${(platformCommissionPercent + acquiringCommissionPercent).toFixed(1)}%`}
                        secondary="Прозрачная и понятная комиссия"
                      />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Payment flow info */}
          {multiaccountsStatus === 'active' && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Как работают выплаты
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="1. Клиент оплачивает бронирование"
                      secondary="Деньги поступают на счет платформы AllCourt"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="2. Автоматический расчет"
                      secondary={`Вычитается комиссия платформы (${platformCommissionPercent}%) и эквайринг (${acquiringCommissionPercent}%)`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="3. Ежедневные выплаты"
                      secondary="В 10:00 МСК автоматическая выплата за предыдущий день"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="4. Уведомление о выплате"
                      secondary="Email с детализацией всех транзакций и комиссий"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Direct acquiring section (only if selected by superadmin) */}
      {paymentType === 'direct' && isSuperAdmin && (
        <>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Собственный эквайринг - для клубов с существующими договорами
            </Typography>
            <Typography variant="body2">
              Этот режим предназначен только для клубов, которые уже имеют договор эквайринга.
              Все платежи будут поступать напрямую на расчетный счет клуба.
            </Typography>
          </Alert>

          {/* Direct acquiring status */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">
                    Статус эквайринга
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
                    Комиссия банка: <strong>{selectedProviderData.commission}%</strong>
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Step-by-step setup */}
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
                      onClick={() => {
                        setSelectedProvider(provider.id)
                        setCredentials({})
                        setActiveStep(1)
                      }}
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
                        YooKassa не поддерживает тестовый режим через API. 
                        Используйте реальные ключи и проводите тестовые платежи на небольшие суммы с последующим возвратом.
                      </Alert>
                    )}

                    <Box sx={{ mt: 2 }}>
                      {selectedProviderData.fields.map((field) => (
                        <Box key={field.name} sx={{ mb: 2 }}>
                          <TextField
                            fullWidth
                            label={field.label}
                            type={field.type}
                            value={credentials[field.name] || ''}
                            onChange={(e) => setCredentials(prev => ({ ...prev, [field.name]: e.target.value }))}
                            required={field.required}
                            placeholder={field.placeholder}
                            helperText={
                              field.name === 'secretKey' && selectedProvider === 'yookassa'
                                ? 'Используйте OAuth токен. Для возвратов токен должен иметь права refunds:write'
                                : field.placeholder
                            }
                          />
                        </Box>
                      ))}
                    </Box>

                    <Alert severity="warning" icon={<Security />} sx={{ mt: 2, mb: 2 }}>
                      Все данные хранятся в зашифрованном виде и используются только для проведения платежей
                    </Alert>

                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="contained"
                        onClick={handleSaveDirectAcquiring}
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
              <StepLabel>Настройка завершена</StepLabel>
              <StepContent>
                {paymentEnabled && (
                  <>
                    <Alert severity="success" sx={{ mb: 3 }}>
                      Поздравляем! Эквайринг настроен и готов к работе.
                      {selectedProvider === 'yookassa' 
                        ? ' YooKassa работает только с реальными платежами.'
                        : testMode && ' Не забудьте отключить тестовый режим для приема реальных платежей.'}
                    </Alert>
                    
                    {selectedProvider === 'yookassa' && (
                      <Alert severity="warning" icon={<Info />} sx={{ mb: 3 }}>
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
                      </Alert>
                    )}
                  </>
                )}
              </StepContent>
            </Step>
          </Stepper>
        </>
      )}

      {/* Payment methods management */}
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
              label="Оплата в клубе наличными"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={enabledPaymentMethods.card_on_site}
                  onChange={(e) => setEnabledPaymentMethods(prev => ({ ...prev, card_on_site: e.target.checked }))}
                />
              }
              label="Оплата в клубе картой"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={enabledPaymentMethods.transfer}
                  onChange={(e) => setEnabledPaymentMethods(prev => ({ ...prev, transfer: e.target.checked }))}
                />
              }
              label="Перевод на р.счет клуба (юр.лицо)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={enabledPaymentMethods.sberbank_card}
                  onChange={(e) => setEnabledPaymentMethods(prev => ({ ...prev, sberbank_card: e.target.checked }))}
                />
              }
              label="На карту Сбербанка"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={enabledPaymentMethods.tbank_card}
                  onChange={(e) => setEnabledPaymentMethods(prev => ({ ...prev, tbank_card: e.target.checked }))}
                />
              }
              label="На карту Т-Банка"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={enabledPaymentMethods.vtb_card}
                  onChange={(e) => setEnabledPaymentMethods(prev => ({ ...prev, vtb_card: e.target.checked }))}
                />
              }
              label="На карту ВТБ"
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

      {/* Moderation dialog */}
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
                secondary="Перейдите в раздел 'Управление клубом' → вкладка 'Реквизиты'"
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