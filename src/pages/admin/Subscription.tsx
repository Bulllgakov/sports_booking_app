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
  Cancel,
  Warning
} from '@mui/icons-material'
import { useAuth } from '../../contexts/AuthContext'
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { SUBSCRIPTION_PLANS, SubscriptionPlan, ClubSubscription, PLAN_MAPPING } from '../../types/subscription'
import { usePermission } from '../../hooks/usePermission'
import { VenueSelector, VenueSelectorEmpty } from '../../components/VenueSelector'
import { migrateSingleSubscription } from '../../utils/migrateSubscriptions'

export default function Subscription() {
  const { admin, club } = useAuth()
  const { isSuperAdmin } = usePermission()
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<ClubSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])
  const [moderationDialogOpen, setModerationDialogOpen] = useState(false)
  const [temporaryBlockDialogOpen, setTemporaryBlockDialogOpen] = useState(false)

  useEffect(() => {
    if (isSuperAdmin) {
      const venueId = localStorage.getItem('selectedVenueId')
      if (venueId) {
        setSelectedVenueId(venueId)
        loadSubscriptionData(venueId)
      } else {
        setLoading(false)
      }
    } else if (admin?.venueId) {
      loadSubscriptionData(admin.venueId)
    }
  }, [admin, isSuperAdmin])

  const handleVenueChange = (venueId: string) => {
    setSelectedVenueId(venueId)
    localStorage.setItem('selectedVenueId', venueId)
    if (venueId) {
      loadSubscriptionData(venueId)
    }
  }

  const loadSubscriptionData = async (venueId?: string) => {
    const targetVenueId = venueId || admin?.venueId
    if (!targetVenueId) return

    try {
      setLoading(true)
      // Загружаем данные о подписке
      const subQuery = query(
        collection(db, 'subscriptions'),
        where('venueId', '==', targetVenueId),
        where('status', 'in', ['active', 'trial'])
      )
      const subSnapshot = await getDocs(subQuery)
      
      if (!subSnapshot.empty) {
        const subData = subSnapshot.docs[0].data()
        
        // Если тариф старый, мигрируем его
        if (subData.plan === 'start' || subData.plan === 'standard') {
          await migrateSingleSubscription(targetVenueId)
          // Перезагружаем данные после миграции
          const updatedSnapshot = await getDocs(subQuery)
          if (!updatedSnapshot.empty) {
            const updatedData = updatedSnapshot.docs[0].data()
            subData.plan = updatedData.plan
          }
        }
        
        // Загружаем актуальное количество кортов из подколлекции
        const courtsQuery = query(collection(db, 'venues', targetVenueId, 'courts'))
        const courtsSnapshot = await getDocs(courtsQuery)
        const actualCourtsCount = courtsSnapshot.size
        
        // Загружаем реальное количество клиентов из бронирований
        let actualClientsCount = subData.usage?.clientsCount || 0
        try {
          const bookingsQuery = query(
            collection(db, 'bookings'),
            where('venueId', '==', targetVenueId),
            limit(1000)
          )
          const bookingsSnapshot = await getDocs(bookingsQuery)
          const uniquePhones = new Set<string>()
          
          bookingsSnapshot.docs.forEach(doc => {
            const booking = doc.data()
            const customerPhone = booking.customerPhone || booking.clientPhone
            if (customerPhone) {
              uniquePhones.add(customerPhone)
            }
          })
          
          actualClientsCount = uniquePhones.size
        } catch (error) {
          console.log('Could not load customers count from bookings, using subscription data:', error)
          // Используем значение из подписки если не можем загрузить клиентов
        }
        
        // Преобразуем старые названия тарифов в новые (на всякий случай)
        const mappedPlan = PLAN_MAPPING[subData.plan] || subData.plan
        
        setSubscription({
          id: subSnapshot.docs[0].id,
          ...subData,
          plan: mappedPlan,
          startDate: subData.startDate?.toDate(),
          endDate: subData.endDate?.toDate(),
          trialEndDate: subData.trialEndDate?.toDate(),
          nextBillingDate: subData.nextBillingDate?.toDate(),
          cancelledAt: subData.cancelledAt?.toDate(),
          usage: {
            ...subData.usage,
            courtsCount: actualCourtsCount, // Используем актуальное количество кортов
            clientsCount: actualClientsCount, // Используем реальное количество клиентов
            lastUpdated: subData.usage?.lastUpdated?.toDate()
          }
        } as ClubSubscription)
      } else {
        // Если подписки нет, нужно загрузить количество кортов и клиентов
        const courtsQuery = query(collection(db, 'venues', targetVenueId, 'courts'))
        const courtsSnapshot = await getDocs(courtsQuery)
        const actualCourtsCount = courtsSnapshot.size
        
        let actualClientsCount = 0
        try {
          const bookingsQuery = query(
            collection(db, 'bookings'),
            where('venueId', '==', targetVenueId),
            limit(1000)
          )
          const bookingsSnapshot = await getDocs(bookingsQuery)
          const uniquePhones = new Set<string>()
          
          bookingsSnapshot.docs.forEach(doc => {
            const booking = doc.data()
            const customerPhone = booking.customerPhone || booking.clientPhone
            if (customerPhone) {
              uniquePhones.add(customerPhone)
            }
          })
          
          actualClientsCount = uniquePhones.size
        } catch (error) {
          console.log('Could not load customers count for new subscription:', error)
          // Используем 0 если не можем загрузить клиентов
        }
        
        // Создаем виртуальную подписку БАЗОВЫЙ для отображения
        setSubscription({
          id: '',
          venueId: targetVenueId,
          plan: 'basic', // Используем новое название тарифа
          status: 'active',
          startDate: new Date(),
          usage: {
            courtsCount: actualCourtsCount,
            bookingsThisMonth: 0,
            smsEmailsSent: 0,
            clientsCount: actualClientsCount,
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
    // Временно блокируем выбор платных тарифов
    if (plan === 'crm' || plan === 'pro') {
      setTemporaryBlockDialogOpen(true)
      return
    }
    
    // Проверяем статус клуба
    if (club?.status === 'pending' && !isSuperAdmin) {
      setModerationDialogOpen(true)
      return
    }
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

  if (isSuperAdmin && !selectedVenueId) {
    return <VenueSelectorEmpty title="Выберите клуб для управления подпиской" />
  }

  if (!subscription) {
    return <Alert severity="error">Ошибка загрузки данных подписки</Alert>
  }

  // Преобразуем старые названия в новые
  const actualPlan = PLAN_MAPPING[subscription.plan] || subscription.plan
  const currentPlan = SUBSCRIPTION_PLANS[actualPlan as SubscriptionPlan] || SUBSCRIPTION_PLANS.basic
  const limits = currentPlan.limits
  const courtsCount = subscription?.usage?.courtsCount || 0
  const clientsCount = subscription?.usage?.clientsCount || 0

  // Функция расчета стоимости подписки на основе количества кортов
  const calculateSubscriptionPrice = (plan: SubscriptionPlan | string, courtsCount: number): number => {
    // Преобразуем старые названия в новые
    const mappedPlan = PLAN_MAPPING[plan] || plan
    const planDetails = SUBSCRIPTION_PLANS[mappedPlan as SubscriptionPlan]
    
    if (!planDetails) return 0
    
    if (mappedPlan === 'basic' || plan === 'start') {
      return 0 // Тариф БАЗОВЫЙ всегда бесплатный
    }
    
    if (mappedPlan === 'crm' || mappedPlan === 'pro' || plan === 'standard' || plan === 'pro') {
      // Если кортов нет или некорректное значение, показываем минимальную цену за 1 корт
      const courts = (courtsCount && !isNaN(courtsCount) && courtsCount > 0) ? courtsCount : 1
      const pricePerCourt = planDetails.pricePerCourt || planDetails.price
      return pricePerCourt * courts
    }
    
    return 0 // по умолчанию 0
  }
  
  // Все тарифы теперь доступны без ограничений по кортам
  const isPlanAvailable = (plan: SubscriptionPlan | string): boolean => {
    return true // Все планы доступны
  }

  // Расчет процента использования
  const clientsUsage = limits.maxClients > 0 
    ? (clientsCount / limits.maxClients) * 100 
    : 0
  const bookingsUsage = limits.maxBookingsPerMonth > 0
    ? (subscription.usage.bookingsThisMonth / limits.maxBookingsPerMonth) * 100
    : 0
  const smsUsage = limits.smsEmailNotifications > 0
    ? (subscription.usage.smsEmailsSent / limits.smsEmailNotifications) * 100
    : 0

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
                  const mappedPlan = PLAN_MAPPING[subscription.plan] || subscription.plan
                  if (mappedPlan === 'basic' || subscription.plan === 'start') {
                    return '0 ₽/месяц'
                  }
                  // Проверяем, что price является числом
                  if (isNaN(price) || price === null || price === undefined) {
                    return '0 ₽/месяц'
                  }
                  return `${Math.round(price).toLocaleString('ru-RU')} ₽/месяц`
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
            {/* Показываем количество клиентов вместо кортов для тарифа БАЗОВЫЙ */}
            {limits.maxClients > 0 && (
              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Клиенты в базе</Typography>
                  <Typography variant="body2">
                    {clientsCount} / {limits.maxClients}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={clientsUsage} 
                  color={clientsUsage > 90 ? 'error' : clientsUsage > 70 ? 'warning' : 'primary'}
                />
              </Box>
            )}
            
            <Box sx={{ mb: 2 }}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Корты</Typography>
                <Typography variant="body2">
                  {subscription.usage?.courtsCount || 0}
                </Typography>
              </Box>
            </Box>

            {limits.maxBookingsPerMonth > 0 && (
              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Бронирования в этом месяце</Typography>
                  <Typography variant="body2">
                    {subscription.usage?.bookingsThisMonth || 0} / {limits.maxBookingsPerMonth}
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
                    {subscription.usage?.smsEmailsSent || 0} / {limits.smsEmailNotifications}
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
            Последнее обновление: {subscription.usage?.lastUpdated?.toLocaleDateString('ru-RU') || 'Не указано'}
          </Typography>
        </CardContent>
      </Card>

      {/* Доступные тарифы */}
      <Typography variant="h6" gutterBottom>
        Доступные тарифы
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {['basic', 'crm', 'pro'].map((key) => {
          const plan = SUBSCRIPTION_PLANS[key as SubscriptionPlan]
          if (!plan) return null
          const isCurrentPlan = key === actualPlan || key === subscription.plan || 
                                (key === 'basic' && subscription.plan === 'start') ||
                                (key === 'crm' && subscription.plan === 'standard')
          const planPrice = calculateSubscriptionPrice(key, courtsCount)
          
          return (
            <Grid item xs={12} md={4} key={key}>
              <Card 
                sx={{ 
                  height: '100%',
                  position: 'relative',
                  border: isCurrentPlan ? 2 : 1,
                  borderColor: isCurrentPlan ? 'primary.main' : 'divider',
                  background: key === 'pro' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                            key === 'crm' || key === 'standard' ? 'linear-gradient(135deg, #667eea 0%, #4facfe 100%)' : 
                            'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                  '& .MuiCardContent-root': {
                    background: 'rgba(255, 255, 255, 0.98)',
                    height: '100%'
                  }
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
                  
                  {/* Цена тарифа */}
                  <Box sx={{ mb: 3 }}>
                    {key === 'basic' || key === 'start' ? (
                      <>
                        <Typography variant="h3" color="primary" component="div">
                          Бесплатно
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          До 1000 клиентов
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Typography variant="h3" color="primary" component="div">
                          {plan.pricePerCourt?.toLocaleString('ru-RU')} ₽
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          за корт в месяц
                        </Typography>
                        {courtsCount > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                            Итого: {planPrice.toLocaleString('ru-RU')} ₽/мес за {courtsCount} {courtsCount === 1 ? 'корт' : courtsCount < 5 ? 'корта' : 'кортов'}
                          </Typography>
                        )}
                      </>
                    )}
                  </Box>
                  
                  <List dense sx={{ mt: 2, mb: 2 }}>
                    {plan.features.slice(0, 8).map((feature, index) => (
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

                  {/* Кнопка выбора тарифа */}
                  {isCurrentPlan ? (
                    <Button
                      variant="outlined"
                      fullWidth
                      disabled
                      sx={{ mt: 2 }}
                    >
                      Текущий тариф
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      fullWidth
                      sx={{ mt: 2 }}
                      onClick={() => handleUpgrade(key as SubscriptionPlan)}
                      startIcon={<Upgrade />}
                    >
                      Выбрать
                    </Button>
                  )}
                  
                  {/* Дополнительная информация о тарифе */}
                  {(key === 'basic' || key === 'start') && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="caption">
                        Оплачивается отдельно:
                        <br />• SMS уведомления: 6₽/шт
                        <br />• Комиссия эквайринга: 3.5%
                      </Typography>
                    </Alert>
                  )}
                  {(key === 'crm' || key === 'standard') && currentPlan?.additionalFees && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="caption">
                        Оплачивается отдельно:
                        <br />• SMS уведомления: 6₽/шт
                        <br />• Комиссия эквайринга: 3.5%
                      </Typography>
                    </Alert>
                  )}
                  {key === 'pro' && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      <Typography variant="caption">
                        Включено в тариф:
                        <br />• SMS без ограничений
                        <br />• API доступ
                      </Typography>
                    </Alert>
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
      {actualPlan !== 'basic' && subscription.status === 'active' && (
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
                Вы собираетесь перейти на тариф <strong>{SUBSCRIPTION_PLANS[selectedPlan]?.name || SUBSCRIPTION_PLANS[PLAN_MAPPING[selectedPlan]]?.name}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Стоимость: {(() => {
                  const price = calculateSubscriptionPrice(selectedPlan, courtsCount)
                  if (price === 0) return 'Бесплатно'
                  if (price === -1) return 'По запросу'
                  return `${price.toLocaleString('ru-RU')} ₽/месяц`
                })()}
              </Typography>
              
              {((SUBSCRIPTION_PLANS[selectedPlan]?.price || 0) < currentPlan.price) && (
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
            Для смены тарифного плана необходимо пройти модерацию.
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
            После выполнения всех условий модерация будет пройдена автоматически, и вы сможете изменить тарифный план.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModerationDialogOpen(false)} variant="contained">
            Понятно
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог временной блокировки платных тарифов */}
      <Dialog
        open={temporaryBlockDialogOpen}
        onClose={() => setTemporaryBlockDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Warning color="info" />
            Информация о тарифах
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Весь функционал доступен на вашем текущем тарифе БАЗОВЫЙ
          </Alert>
          <Typography variant="body1">
            Другие тарифы временно недоступны к выбору. Все необходимые функции для управления клубом полностью доступны на тарифе БАЗОВЫЙ.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemporaryBlockDialogOpen(false)} variant="contained">
            Понятно
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}