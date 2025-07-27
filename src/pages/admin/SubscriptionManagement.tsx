import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  MenuItem,
  Alert,
  LinearProgress,
  Stack,
  Divider
} from '@mui/material'
import {
  CreditCard,
  CheckCircle,
  Cancel,
  Timer,
  Warning,
  Receipt,
  AttachMoney
} from '@mui/icons-material'
import { collection, query, where, onSnapshot, doc, getDoc, Timestamp, orderBy, limit } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../../services/firebase'
import { useAuth } from '../../contexts/AuthContext'
import AdminLayout from '../../components/AdminLayout'
import { formatDate, formatCurrency } from '../../utils/formatters'

interface Subscription {
  id: string
  venueId: string
  plan: string
  status: 'active' | 'pending_payment' | 'payment_failed' | 'cancelled'
  startDate: Timestamp
  endDate: Timestamp | null
  courtsCount: number
  autoRenewal: boolean
  lastPaymentAt?: Timestamp
  lastPaymentError?: string
  gracePeriodEnd?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}

interface Invoice {
  id: string
  venueId: string
  subscriptionId: string
  orderId: string
  paymentId?: string
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded'
  description: string
  period: {
    start: Timestamp
    end: Timestamp
  }
  attempts: number
  paidAt?: Timestamp
  failedAt?: Timestamp
  refundedAt?: Timestamp
  failureReason?: string
  refundAmount?: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

interface PaymentMethod {
  id: string
  venueId: string
  type: 'card'
  last4: string
  brand: string
  expiryMonth: number
  expiryYear: number
  isDefault: boolean
  createdAt: Timestamp
}

const planNames: Record<string, string> = {
  start: 'Старт',
  standard: 'Стандарт',
  pro: 'Профи',
  premium: 'Премиум'
}

const planPrices: Record<string, number> = {
  start: 0,
  standard: 990,
  pro: 1990,
  premium: 2990
}

const planFeatures: Record<string, string[]> = {
  start: ['1 корт', 'Базовые функции', 'Email поддержка'],
  standard: ['До 3 кортов', 'Онлайн-оплата', 'SMS-уведомления', 'Статистика'],
  pro: ['До 10 кортов', 'Все функции Standard', 'Приоритетная поддержка', 'API доступ'],
  premium: ['Неограниченно кортов', 'Все функции Pro', 'Персональный менеджер', 'Кастомизация']
}

export default function SubscriptionManagement() {
  const { admin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [changePlanDialog, setChangePlanDialog] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [courtsCount, setCourtsCount] = useState(1)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!admin?.venueId) return

    // Подписка на изменения подписки
    const unsubscribeSub = onSnapshot(
      query(
        collection(db, 'subscriptions'),
        where('venueId', '==', admin.venueId),
        limit(1)
      ),
      (snapshot) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0]
          setSubscription({
            id: doc.id,
            ...doc.data()
          } as Subscription)
        } else {
          setSubscription(null)
        }
      }
    )

    // Подписка на счета
    const unsubscribeInvoices = onSnapshot(
      query(
        collection(db, 'invoices'),
        where('venueId', '==', admin.venueId),
        orderBy('createdAt', 'desc'),
        limit(20)
      ),
      (snapshot) => {
        const invoicesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Invoice))
        setInvoices(invoicesList)
      }
    )

    // Подписка на платежный метод
    const unsubscribePayment = onSnapshot(
      query(
        collection(db, 'payment_methods'),
        where('venueId', '==', admin.venueId),
        where('isDefault', '==', true),
        limit(1)
      ),
      (snapshot) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0]
          setPaymentMethod({
            id: doc.id,
            ...doc.data()
          } as PaymentMethod)
        } else {
          setPaymentMethod(null)
        }
      }
    )

    setLoading(false)

    return () => {
      unsubscribeSub()
      unsubscribeInvoices()
      unsubscribePayment()
    }
  }, [admin])

  const handleChangePlan = async () => {
    if (!selectedPlan || !courtsCount) return

    setProcessing(true)
    setError(null)

    try {
      const initPayment = httpsCallable(functions, 'initSubscriptionPayment')
      const result = await initPayment({
        venueId: admin?.venueId,
        planKey: selectedPlan,
        amount: planPrices[selectedPlan] * courtsCount,
        courtsCount: courtsCount
      })

      const response = result.data as any
      if (response.success && response.paymentUrl) {
        // Открываем страницу оплаты в новом окне
        window.open(response.paymentUrl, '_blank')
        setChangePlanDialog(false)
      } else {
        throw new Error('Failed to initialize payment')
      }
    } catch (err: any) {
      console.error('Payment initialization error:', err)
      setError(err.message || 'Ошибка при инициализации платежа')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusChip = (status: string) => {
    const statusConfig: Record<string, { label: string; color: any; icon: React.ReactElement }> = {
      active: { label: 'Активна', color: 'success', icon: <CheckCircle /> },
      pending_payment: { label: 'Ожидает оплаты', color: 'warning', icon: <Timer /> },
      payment_failed: { label: 'Ошибка оплаты', color: 'error', icon: <Warning /> },
      cancelled: { label: 'Отменена', color: 'default', icon: <Cancel /> }
    }

    const config = statusConfig[status] || statusConfig.cancelled

    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        icon={config.icon}
      />
    )
  }

  const getInvoiceStatusChip = (status: string) => {
    const statusConfig: Record<string, { label: string; color: any }> = {
      pending: { label: 'Ожидает', color: 'default' },
      processing: { label: 'Обработка', color: 'info' },
      paid: { label: 'Оплачен', color: 'success' },
      failed: { label: 'Ошибка', color: 'error' },
      refunded: { label: 'Возврат', color: 'warning' }
    }

    const config = statusConfig[status] || statusConfig.pending

    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
      />
    )
  }

  if (loading) {
    return (
      <AdminLayout>
        <Box sx={{ width: '100%' }}>
          <LinearProgress />
        </Box>
      </AdminLayout>
    )
  }

  const daysUntilExpiry = subscription?.endDate
    ? Math.floor((subscription.endDate.toMillis() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <AdminLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Управление подпиской
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Текущая подписка */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Текущий тариф
            </Typography>
            
            {subscription ? (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Тариф
                      </Typography>
                      <Typography variant="h4">
                        {planNames[subscription.plan]}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Статус
                      </Typography>
                      {getStatusChip(subscription.status)}
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Количество кортов
                      </Typography>
                      <Typography variant="body1">
                        {subscription.courtsCount}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Стоимость в месяц
                      </Typography>
                      <Typography variant="h5">
                        {formatCurrency(planPrices[subscription.plan] * subscription.courtsCount)}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Активна до
                      </Typography>
                      <Typography variant="body1">
                        {subscription.endDate ? formatDate(subscription.endDate.toDate()) : 'Бессрочно'}
                      </Typography>
                      {daysUntilExpiry > 0 && daysUntilExpiry <= 7 && (
                        <Typography variant="caption" color="warning.main">
                          Осталось {daysUntilExpiry} дней
                        </Typography>
                      )}
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Автопродление
                      </Typography>
                      <Typography variant="body1">
                        {subscription.autoRenewal ? 'Включено' : 'Отключено'}
                      </Typography>
                    </Box>

                    {subscription.lastPaymentAt && (
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Последний платеж
                        </Typography>
                        <Typography variant="body1">
                          {formatDate(subscription.lastPaymentAt.toDate())}
                        </Typography>
                      </Box>
                    )}

                    {subscription.status === 'payment_failed' && subscription.gracePeriodEnd && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          Последний платеж не прошел. Подписка будет приостановлена{' '}
                          {formatDate(subscription.gracePeriodEnd.toDate())}, если оплата не поступит.
                        </Typography>
                      </Alert>
                    )}
                  </Stack>
                </Grid>
              </Grid>
            ) : (
              <Alert severity="info">
                У вас нет активной подписки
              </Alert>
            )}

            <Divider sx={{ my: 3 }} />

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={() => {
                  setSelectedPlan(subscription?.plan || 'standard')
                  setCourtsCount(subscription?.courtsCount || 1)
                  setChangePlanDialog(true)
                }}
              >
                Изменить тариф
              </Button>

              {!paymentMethod && (
                <Button
                  variant="outlined"
                  startIcon={<CreditCard />}
                  onClick={() => {
                    // TODO: Открыть страницу привязки карты
                    alert('Функция привязки карты будет добавлена')
                  }}
                >
                  Привязать карту
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Платежный метод */}
        {paymentMethod && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Способ оплаты
              </Typography>
              
              <Stack direction="row" spacing={2} alignItems="center">
                <CreditCard fontSize="large" color="action" />
                <Box>
                  <Typography variant="body1">
                    {paymentMethod.brand} •••• {paymentMethod.last4}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Действует до {paymentMethod.expiryMonth}/{paymentMethod.expiryYear}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* История платежей */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              История платежей
            </Typography>

            {invoices.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Дата</TableCell>
                      <TableCell>Описание</TableCell>
                      <TableCell>Сумма</TableCell>
                      <TableCell>Статус</TableCell>
                      <TableCell align="right">Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          {formatDate(invoice.createdAt.toDate())}
                        </TableCell>
                        <TableCell>{invoice.description}</TableCell>
                        <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                        <TableCell>{getInvoiceStatusChip(invoice.status)}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            startIcon={<Receipt />}
                            onClick={() => {
                              // TODO: Скачать чек
                              alert('Функция скачивания чека будет добавлена')
                            }}
                          >
                            Чек
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary">
                История платежей пуста
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Диалог смены тарифа */}
        <Dialog
          open={changePlanDialog}
          onClose={() => setChangePlanDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Изменить тариф</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField
                select
                fullWidth
                label="Тариф"
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
              >
                {Object.entries(planNames)
                  .filter(([key]) => key !== 'start')
                  .map(([key, name]) => (
                    <MenuItem key={key} value={key}>
                      {name} - {formatCurrency(planPrices[key])} за корт/месяц
                    </MenuItem>
                  ))}
              </TextField>

              <TextField
                type="number"
                fullWidth
                label="Количество кортов"
                value={courtsCount}
                onChange={(e) => setCourtsCount(parseInt(e.target.value) || 1)}
                inputProps={{ min: 1, max: 100 }}
              />

              {selectedPlan && (
                <>
                  <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Возможности тарифа:
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {planFeatures[selectedPlan]?.map((feature, index) => (
                        <li key={index}>
                          <Typography variant="body2">{feature}</Typography>
                        </li>
                      ))}
                    </ul>
                  </Box>

                  <Divider />

                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Итого к оплате:
                    </Typography>
                    <Typography variant="h4">
                      {formatCurrency(planPrices[selectedPlan] * courtsCount)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      в месяц
                    </Typography>
                  </Box>
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setChangePlanDialog(false)}>
              Отмена
            </Button>
            <Button
              variant="contained"
              onClick={handleChangePlan}
              disabled={!selectedPlan || !courtsCount || processing}
              startIcon={processing ? <Timer /> : <AttachMoney />}
            >
              {processing ? 'Обработка...' : 'Перейти к оплате'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminLayout>
  )
}