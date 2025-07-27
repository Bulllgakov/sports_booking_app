import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Divider,
  FormControlLabel,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  CircularProgress
} from '@mui/material'
import { Edit, Save, Cancel, Payment, Settings, TrendingUp } from '@mui/icons-material'
import { doc, getDoc, setDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { usePermission } from '../../hooks/usePermission'
import { PermissionGate } from '../../components/PermissionGate'
import { SUBSCRIPTION_PLANS } from '../../types/subscription'

interface BillingConfig {
  tbank: {
    terminalKey: string
    password: string
    notificationUrl: string
    testMode: boolean
  }
  autoRenewal: boolean
  gracePeriodDays: number
  createdAt?: Date
  updatedAt?: Date
}

interface BillingStats {
  totalRevenue: number
  activeSubscriptions: number
  pendingPayments: number
  failedPayments: number
}

export default function BillingSettings() {
  const { isSuperAdmin } = usePermission()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<BillingConfig>({
    tbank: {
      terminalKey: '',
      password: '',
      notificationUrl: 'https://europe-west1-sports-booking-app-1d7e5.cloudfunctions.net/tbankWebhook',
      testMode: true
    },
    autoRenewal: true,
    gracePeriodDays: 3
  })
  const [editMode, setEditMode] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [stats, setStats] = useState<BillingStats>({
    totalRevenue: 0,
    activeSubscriptions: 0,
    pendingPayments: 0,
    failedPayments: 0
  })
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [planPrices, setPlanPrices] = useState<Record<string, number>>({})

  useEffect(() => {
    loadBillingConfig()
    loadBillingStats()
    loadPlanPrices()
  }, [])

  const loadBillingConfig = async () => {
    try {
      const docRef = doc(db, 'settings', 'billing')
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const data = docSnap.data() as BillingConfig
        setConfig(data)
      }
    } catch (error) {
      console.error('Error loading billing config:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBillingStats = async () => {
    try {
      // Загружаем активные подписки
      const activeSubsQuery = query(
        collection(db, 'subscriptions'),
        where('status', '==', 'active')
      )
      const activeSubsSnap = await getDocs(activeSubsQuery)
      
      // Загружаем статистику платежей (будет реализовано позже)
      setStats({
        totalRevenue: 0, // TODO: подсчитать из коллекции invoices
        activeSubscriptions: activeSubsSnap.size,
        pendingPayments: 0, // TODO: подсчитать из коллекции invoices
        failedPayments: 0 // TODO: подсчитать из коллекции invoices
      })
    } catch (error) {
      console.error('Error loading billing stats:', error)
    }
  }

  const loadPlanPrices = () => {
    const prices: Record<string, number> = {}
    Object.entries(SUBSCRIPTION_PLANS).forEach(([key, plan]) => {
      prices[key] = plan.price
    })
    setPlanPrices(prices)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const docRef = doc(db, 'settings', 'billing')
      await setDoc(docRef, {
        ...config,
        updatedAt: new Date()
      }, { merge: true })
      
      setEditMode(false)
      alert('Настройки биллинга сохранены')
    } catch (error) {
      console.error('Error saving billing config:', error)
      alert('Ошибка при сохранении настроек')
    } finally {
      setSaving(false)
    }
  }

  const handlePlanPriceUpdate = async (planKey: string) => {
    try {
      // TODO: Обновить цены в системе
      alert(`Цена тарифа ${SUBSCRIPTION_PLANS[planKey].name} обновлена`)
      setEditingPlan(null)
    } catch (error) {
      console.error('Error updating plan price:', error)
      alert('Ошибка при обновлении цены')
    }
  }

  if (!isSuperAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          У вас нет доступа к настройкам биллинга
        </Alert>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <PermissionGate requiredPermission="superadmin">
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Настройки биллинга
        </Typography>

        {/* Статистика */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <TrendingUp color="primary" />
                  <Typography color="textSecondary" gutterBottom>
                    Общий доход
                  </Typography>
                </Box>
                <Typography variant="h5">
                  {stats.totalRevenue.toLocaleString('ru-RU')} ₽
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <Payment color="success" />
                  <Typography color="textSecondary" gutterBottom>
                    Активные подписки
                  </Typography>
                </Box>
                <Typography variant="h5">
                  {stats.activeSubscriptions}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <Payment color="warning" />
                  <Typography color="textSecondary" gutterBottom>
                    Ожидают оплаты
                  </Typography>
                </Box>
                <Typography variant="h5">
                  {stats.pendingPayments}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <Payment color="error" />
                  <Typography color="textSecondary" gutterBottom>
                    Неудачные платежи
                  </Typography>
                </Box>
                <Typography variant="h5">
                  {stats.failedPayments}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Настройки Т-Банк */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Настройки Т-Банк
              </Typography>
              {!editMode ? (
                <Button
                  startIcon={<Edit />}
                  onClick={() => setEditMode(true)}
                  variant="outlined"
                >
                  Редактировать
                </Button>
              ) : (
                <Box>
                  <Button
                    startIcon={<Cancel />}
                    onClick={() => {
                      setEditMode(false)
                      loadBillingConfig()
                    }}
                    sx={{ mr: 1 }}
                  >
                    Отмена
                  </Button>
                  <Button
                    startIcon={<Save />}
                    onClick={handleSave}
                    variant="contained"
                    disabled={saving}
                  >
                    Сохранить
                  </Button>
                </Box>
              )}
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Terminal Key"
                  value={config.tbank.terminalKey}
                  onChange={(e) => setConfig({
                    ...config,
                    tbank: { ...config.tbank, terminalKey: e.target.value }
                  })}
                  fullWidth
                  disabled={!editMode}
                  helperText="Ключ терминала для рекуррентных платежей"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={config.tbank.password}
                  onChange={(e) => setConfig({
                    ...config,
                    tbank: { ...config.tbank, password: e.target.value }
                  })}
                  fullWidth
                  disabled={!editMode}
                  helperText="Пароль для API Т-Банк"
                  InputProps={{
                    endAdornment: editMode && (
                      <Button size="small" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? 'Скрыть' : 'Показать'}
                      </Button>
                    )
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Notification URL"
                  value={config.tbank.notificationUrl}
                  onChange={(e) => setConfig({
                    ...config,
                    tbank: { ...config.tbank, notificationUrl: e.target.value }
                  })}
                  fullWidth
                  disabled={!editMode}
                  helperText="URL для получения уведомлений от Т-Банк"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.tbank.testMode}
                      onChange={(e) => setConfig({
                        ...config,
                        tbank: { ...config.tbank, testMode: e.target.checked }
                      })}
                      disabled={!editMode}
                    />
                  }
                  label="Тестовый режим"
                />
                {config.tbank.testMode && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Включен тестовый режим. Реальные платежи не будут проводиться.
                  </Alert>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Общие настройки биллинга */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Общие настройки
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.autoRenewal}
                      onChange={(e) => setConfig({
                        ...config,
                        autoRenewal: e.target.checked
                      })}
                      disabled={!editMode}
                    />
                  }
                  label="Автоматическое продление подписок"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Льготный период (дней)"
                  type="number"
                  value={config.gracePeriodDays}
                  onChange={(e) => setConfig({
                    ...config,
                    gracePeriodDays: parseInt(e.target.value) || 0
                  })}
                  fullWidth
                  disabled={!editMode}
                  helperText="Количество дней после неудачного платежа до блокировки"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Управление тарифами */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Тарифные планы
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Тариф</TableCell>
                    <TableCell>Описание</TableCell>
                    <TableCell align="right">Цена за корт/мес</TableCell>
                    <TableCell align="center">Статус</TableCell>
                    <TableCell align="center">Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
                    <TableRow key={key}>
                      <TableCell>
                        <Typography variant="subtitle2">{plan.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {plan.features[0]}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {editingPlan === key ? (
                          <TextField
                            type="number"
                            value={planPrices[key]}
                            onChange={(e) => setPlanPrices({
                              ...planPrices,
                              [key]: parseInt(e.target.value) || 0
                            })}
                            size="small"
                            sx={{ width: 120 }}
                          />
                        ) : (
                          <Typography>
                            {plan.price === 0 ? 'Бесплатно' : `${plan.price.toLocaleString('ru-RU')} ₽`}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label="Активен"
                          color="success"
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {editingPlan === key ? (
                          <>
                            <IconButton
                              size="small"
                              onClick={() => handlePlanPriceUpdate(key)}
                              color="primary"
                            >
                              <Save />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingPlan(null)
                                loadPlanPrices()
                              }}
                            >
                              <Cancel />
                            </IconButton>
                          </>
                        ) : (
                          <IconButton
                            size="small"
                            onClick={() => setEditingPlan(key)}
                            disabled={key === 'start'} // Нельзя редактировать бесплатный тариф
                          >
                            <Edit />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
    </PermissionGate>
  )
}