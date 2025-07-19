import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material'
import {
  Check,
  Close,
  TrendingUp,
  CalendarToday,
  Receipt,
  Upgrade,
  Cancel
} from '@mui/icons-material'
import { useAuth } from '../../contexts/AuthContext'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { SUBSCRIPTION_PLANS, SubscriptionPlan, ClubSubscription } from '../../types/subscription'
import { usePermission } from '../../hooks/usePermission'

export default function Subscription() {
  const { admin, club } = useAuth()
  const { isSuperAdmin } = usePermission()
  const [subscription, setSubscription] = useState<ClubSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])

  useEffect(() => {
    loadSubscriptionData()
  }, [admin])

  const loadSubscriptionData = async () => {
    if (!admin?.venueId) return

    try {
      // Загружаем данные о подписке
      const subQuery = query(
        collection(db, 'subscriptions'),
        where('venueId', '==', admin.venueId),
        where('status', 'in', ['active', 'trial'])
      )
      const subSnapshot = await getDocs(subQuery)
      
      if (!subSnapshot.empty) {
        const subData = subSnapshot.docs[0].data()
        setSubscription({
          id: subSnapshot.docs[0].id,
          ...subData,
          startDate: subData.startDate?.toDate(),
          endDate: subData.endDate?.toDate(),
          trialEndDate: subData.trialEndDate?.toDate(),
          nextBillingDate: subData.nextBillingDate?.toDate(),
          cancelledAt: subData.cancelledAt?.toDate(),
          usage: {
            ...subData.usage,
            lastUpdated: subData.usage?.lastUpdated?.toDate()
          }
        } as ClubSubscription)
      } else {
        // Если подписки нет, создаем бесплатную
        setSubscription({
          id: '',
          venueId: admin.venueId,
          plan: 'start',
          status: 'active',
          startDate: new Date(),
          usage: {
            courtsCount: 0,
            bookingsThisMonth: 0,
            smsEmailsSent: 0,
            lastUpdated: new Date()
          }
        })
      }

      // Загружаем историю платежей
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('venueId', '==', admin.venueId),
        where('type', '==', 'subscription')
      )
      const paymentsSnapshot = await getDocs(paymentsQuery)
      const payments = paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate()
      }))
      setPaymentHistory(payments.sort((a, b) => b.date - a.date))

      setLoading(false)
    } catch (error) {
      console.error('Error loading subscription:', error)
      setLoading(false)
    }
  }

  const handleUpgrade = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan)
    setUpgradeDialogOpen(true)
  }

  const handleConfirmUpgrade = async () => {
    // Здесь будет логика оплаты и обновления подписки
    console.log('Upgrading to plan:', selectedPlan)
    setUpgradeDialogOpen(false)
  }

  const handleCancelSubscription = async () => {
    if (confirm('Вы уверены, что хотите отменить подписку? Она будет активна до конца оплаченного периода.')) {
      // Логика отмены подписки
      console.log('Cancelling subscription')
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (!subscription) {
    return <Alert severity="error">Ошибка загрузки данных подписки</Alert>
  }

  const currentPlan = SUBSCRIPTION_PLANS[subscription.plan]
  const limits = currentPlan.limits
  const courtsCount = subscription?.usage?.courtsCount || 0

  // Функция расчета стоимости подписки на основе количества кортов
  const calculateSubscriptionPrice = (plan: SubscriptionPlan, courtsCount: number): number => {
    const planDetails = SUBSCRIPTION_PLANS[plan]
    
    if (plan === 'start') {
      return courtsCount <= 2 ? 0 : -1 // -1 означает недоступно
    }
    
    if (plan === 'standard') {
      return courtsCount >= 3 ? planDetails.pricePerCourt! * courtsCount : -1
    }
    
    if (plan === 'pro') {
      return courtsCount >= 1 ? planDetails.pricePerCourt! * courtsCount : -1
    }
    
    return -1 // premium - по запросу
  }
  
  // Проверка доступности тарифа для текущего количества кортов
  const isPlanAvailable = (plan: SubscriptionPlan): boolean => {
    if (plan === 'start') return courtsCount <= 2
    if (plan === 'standard') return courtsCount >= 3
    if (plan === 'pro') return courtsCount >= 1
    return false // premium по запросу
  }

  // Расчет процента использования
  const courtsUsage = limits.maxCourts > 0 
    ? (subscription.usage.courtsCount / limits.maxCourts) * 100 
    : 0
  const bookingsUsage = limits.maxBookingsPerMonth > 0
    ? (subscription.usage.bookingsThisMonth / limits.maxBookingsPerMonth) * 100
    : 0
  const smsUsage = limits.smsEmailNotifications > 0
    ? (subscription.usage.smsEmailsSent / limits.smsEmailNotifications) * 100
    : 0

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Управление подпиской
      </Typography>

      {/* Текущий тариф */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h6" component="h3">
                Текущий тариф: {currentPlan.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {(() => {
                  const price = calculateSubscriptionPrice(subscription.plan, courtsCount)
                  if (price === 0) return 'Бесплатно'
                  if (price === -1) return 'По запросу'
                  return `${price.toLocaleString('ru-RU')} ₽/месяц`
                })()}
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Chip 
                label={subscription.status === 'active' ? 'Активна' : 'Пробный период'} 
                color={subscription.status === 'active' ? 'success' : 'warning'}
                size="small"
              />
              {subscription.nextBillingDate && (
                <Chip 
                  label={`Следующий платеж: ${subscription.nextBillingDate.toLocaleDateString('ru-RU')}`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>

          {subscription.status === 'trial' && subscription.trialEndDate && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Пробный период заканчивается {subscription.trialEndDate.toLocaleDateString('ru-RU')}
            </Alert>
          )}

          {/* Использование лимитов */}
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
            Использование ресурсов
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Корты</Typography>
                <Typography variant="body2">
                  {subscription.usage.courtsCount} / {limits.maxCourts > 0 ? limits.maxCourts : '∞'}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={courtsUsage} 
                color={courtsUsage > 90 ? 'error' : courtsUsage > 70 ? 'warning' : 'primary'}
              />
            </Box>

            {limits.maxBookingsPerMonth > 0 && (
              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Бронирования в этом месяце</Typography>
                  <Typography variant="body2">
                    {subscription.usage.bookingsThisMonth} / {limits.maxBookingsPerMonth}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={bookingsUsage}
                  color={bookingsUsage > 90 ? 'error' : bookingsUsage > 70 ? 'warning' : 'primary'}
                />
              </Box>
            )}

            {limits.smsEmailNotifications > 0 && (
              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">SMS/Email уведомления</Typography>
                  <Typography variant="body2">
                    {subscription.usage.smsEmailsSent} / {limits.smsEmailNotifications}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={smsUsage}
                  color={smsUsage > 90 ? 'error' : smsUsage > 70 ? 'warning' : 'primary'}
                />
              </Box>
            )}
          </Box>

          <Typography variant="caption" color="text.secondary">
            Последнее обновление: {subscription.usage.lastUpdated.toLocaleDateString('ru-RU')}
          </Typography>
        </CardContent>
      </Card>

      {/* Доступные тарифы */}
      <Typography variant="h6" gutterBottom>
        Доступные тарифы
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {Object.entries(SUBSCRIPTION_PLANS).filter(([key]) => key !== 'premium').map(([key, plan]) => {
          const isCurrentPlan = key === subscription.plan
          const isDowngrade = SUBSCRIPTION_PLANS[key as SubscriptionPlan].price < currentPlan.price
          
          return (
            <Grid item xs={12} md={4} key={key}>
              <Card 
                sx={{ 
                  height: '100%',
                  position: 'relative',
                  border: isCurrentPlan ? 2 : 1,
                  borderColor: isCurrentPlan ? 'primary.main' : 'divider'
                }}
              >
                {isCurrentPlan && (
                  <Chip
                    label="Текущий тариф"
                    color="primary"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16
                    }}
                  />
                )}
                
                <CardContent>
                  <Typography variant="h5" component="h3" gutterBottom>
                    {plan.name}
                  </Typography>
                  <Typography variant="h4" color="primary" gutterBottom>
                    {(() => {
                      const price = calculateSubscriptionPrice(key as SubscriptionPlan, courtsCount)
                      if (price === 0) return 'Бесплатно'
                      if (price === -1) {
                        if (key === 'premium') return 'По запросу'
                        return isPlanAvailable(key as SubscriptionPlan) ? 'Недоступно' : `Нужно ${key === 'standard' ? '3+' : '1+'} кортов`
                      }
                      return (
                        <>
                          {price.toLocaleString('ru-RU')} ₽
                          <Typography variant="body2" component="span">/месяц</Typography>
                        </>
                      )
                    })()}
                  </Typography>
                  
                  <List dense sx={{ mt: 2 }}>
                    {plan.features.slice(0, 6).map((feature, index) => (
                      <ListItem key={index} disablePadding>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Check fontSize="small" color="success" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={feature} 
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>

                  {!isCurrentPlan && isPlanAvailable(key as SubscriptionPlan) && key !== 'premium' && (
                    <Button
                      variant={isDowngrade ? "outlined" : "contained"}
                      fullWidth
                      sx={{ mt: 2 }}
                      onClick={() => handleUpgrade(key as SubscriptionPlan)}
                      startIcon={<Upgrade />}
                    >
                      {isDowngrade ? 'Понизить тариф' : 'Повысить тариф'}
                    </Button>
                  )}
                  {key === 'premium' && !isCurrentPlan && (
                    <Button
                      variant="outlined"
                      fullWidth
                      sx={{ mt: 2 }}
                      onClick={() => window.open('mailto:sales@allcourt.ru?subject=Запрос на тариф ПРЕМИУМ', '_blank')}
                    >
                      Связаться с нами
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      {/* История платежей */}
      <Typography variant="h6" gutterBottom>
        История платежей
      </Typography>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Дата</TableCell>
              <TableCell>Описание</TableCell>
              <TableCell align="right">Сумма</TableCell>
              <TableCell>Статус</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paymentHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body2" color="text.secondary">
                    История платежей пуста
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paymentHistory.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.date?.toLocaleDateString('ru-RU')}</TableCell>
                  <TableCell>{payment.description}</TableCell>
                  <TableCell align="right">{payment.amount.toLocaleString('ru-RU')} ₽</TableCell>
                  <TableCell>
                    <Chip 
                      label={payment.status === 'success' ? 'Оплачено' : 'Ошибка'} 
                      color={payment.status === 'success' ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Действия */}
      {subscription.plan !== 'start' && subscription.status === 'active' && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Cancel />}
            onClick={handleCancelSubscription}
          >
            Отменить подписку
          </Button>
        </Box>
      )}

      {/* Диалог обновления тарифа */}
      <Dialog open={upgradeDialogOpen} onClose={() => setUpgradeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Изменение тарифа
        </DialogTitle>
        <DialogContent>
          {selectedPlan && (
            <>
              <Typography variant="body1" gutterBottom>
                Вы собираетесь перейти на тариф <strong>{SUBSCRIPTION_PLANS[selectedPlan].name}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Стоимость: {(() => {
                  const price = calculateSubscriptionPrice(selectedPlan, courtsCount)
                  if (price === 0) return 'Бесплатно'
                  if (price === -1) return 'По запросу'
                  return `${price.toLocaleString('ru-RU')} ₽/месяц`
                })()}
              </Typography>
              
              {SUBSCRIPTION_PLANS[selectedPlan].price < currentPlan.price && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  При понижении тарифа некоторые функции могут стать недоступны. 
                  Убедитесь, что новые лимиты соответствуют вашим потребностям.
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpgradeDialogOpen(false)}>
            Отмена
          </Button>
          <Button variant="contained" onClick={handleConfirmUpgrade}>
            Подтвердить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}