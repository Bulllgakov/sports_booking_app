import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { VenueSelector, VenueSelectorEmpty } from '../../components/VenueSelector'
import { 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  Timestamp,
  doc,
  getDoc,
  limit
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { normalizeDateInClubTZ } from '../../utils/clubDateTime'
import { 
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Chip,
  TextField,
  Button,
  Tabs,
  Tab,
  Alert,
  IconButton,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tooltip
} from '@mui/material'
import { 
  TrendingUp, 
  TrendingDown, 
  AttachMoney, 
  Receipt, 
  DateRange,
  AccountBalance,
  ExpandMore,
  ExpandLess,
  CheckCircle,
  HourglassEmpty,
  Cancel,
  Info,
  Download,
  Visibility,
  MoneyOff,
  CreditCard
} from '@mui/icons-material'

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
      id={`finance-tabpanel-${index}`}
      aria-labelledby={`finance-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export default function FinanceWithTabs() {
  const { admin, club } = useAuth()
  const { isSuperAdmin } = usePermission()
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [venueTimezone, setVenueTimezone] = useState<string>('Europe/Moscow')
  const [venueData, setVenueData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tabValue, setTabValue] = useState(0)
  
  // Analytics state
  const [period, setPeriod] = useState('month')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [stats, setStats] = useState({
    totalRevenue: 0,
    bookingsCount: 0,
    averageCheck: 0,
    revenueChange: 0
  })
  const [transactions, setTransactions] = useState<any[]>([])
  
  // Payouts state
  const [payouts, setPayouts] = useState<any[]>([])
  const [payoutsLoading, setPayoutsLoading] = useState(false)
  const [expandedPayout, setExpandedPayout] = useState<string | null>(null)
  const [selectedPayout, setSelectedPayout] = useState<any>(null)
  const [payoutDetailsOpen, setPayoutDetailsOpen] = useState(false)
  
  // Debts state
  const [debts, setDebts] = useState<any[]>([])
  const [debtsLoading, setDebtsLoading] = useState(false)
  const [totalDebt, setTotalDebt] = useState(0)
  
  const getPeriodDisplay = () => {
    const now = new Date()
    let startDate = new Date()
    let endDate = new Date()
    
    switch(period) {
      case 'today':
        return 'Сегодня'
      case 'yesterday':
        return 'Вчера'
      case 'week':
        startDate.setDate(now.getDate() - 7)
        return `${startDate.toLocaleDateString('ru-RU')} - ${endDate.toLocaleDateString('ru-RU')}`
      case 'month':
        startDate.setMonth(now.getMonth(), 1)
        const monthName = now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
        return monthName.charAt(0).toUpperCase() + monthName.slice(1)
      case 'year':
        return now.getFullYear().toString()
      case 'custom':
        if (customStartDate && customEndDate) {
          return `${new Date(customStartDate).toLocaleDateString('ru-RU')} - ${new Date(customEndDate).toLocaleDateString('ru-RU')}`
        }
        return 'Выберите даты'
      default:
        return ''
    }
  }

  useEffect(() => {
    if (isSuperAdmin) {
      const venueId = localStorage.getItem('selectedVenueId')
      if (venueId) {
        setSelectedVenueId(venueId)
        loadVenueData(venueId)
      } else {
        setLoading(false)
      }
    } else if (admin?.venueId) {
      loadVenueData(admin.venueId)
    }
  }, [admin, isSuperAdmin])
  
  useEffect(() => {
    const venueId = selectedVenueId || admin?.venueId
    if (venueId) {
      if (tabValue === 0) {
        loadFinanceData(venueId)
      } else if (tabValue === 1) {
        loadPayouts(venueId)
      } else if (tabValue === 2) {
        loadDebts(venueId)
      }
    }
  }, [tabValue, period, paymentMethodFilter, selectedVenueId, admin])

  const handleVenueChange = (venueId: string) => {
    setSelectedVenueId(venueId)
    localStorage.setItem('selectedVenueId', venueId)
    if (venueId) {
      loadVenueData(venueId)
    }
  }
  
  const loadVenueData = async (venueId: string) => {
    try {
      const venueDocRef = doc(db, 'venues', venueId)
      const venueDoc = await getDoc(venueDocRef)
      
      if (venueDoc.exists()) {
        const data = venueDoc.data()
        setVenueData(data)
        setVenueTimezone(data.timezone || 'Europe/Moscow')
      }
      
      loadFinanceData(venueId)
    } catch (error) {
      console.error('Error loading venue data:', error)
    }
  }

  const loadFinanceData = async (venueId?: string) => {
    const targetVenueId = venueId || admin?.venueId
    if (!targetVenueId) return

    try {
      setLoading(true)
      
      // Calculate date range based on period
      const now = new Date()
      let startDate = new Date()
      let endDate = new Date()
      
      switch(period) {
        case 'today':
          startDate.setHours(0, 0, 0, 0)
          endDate.setHours(23, 59, 59, 999)
          break
        case 'yesterday':
          startDate.setDate(now.getDate() - 1)
          startDate.setHours(0, 0, 0, 0)
          endDate.setDate(now.getDate() - 1)
          endDate.setHours(23, 59, 59, 999)
          break
        case 'week':
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(now.getMonth() - 1)
          break
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1)
          break
        case 'custom':
          if (customStartDate && customEndDate) {
            startDate = new Date(customStartDate)
            endDate = new Date(customEndDate)
            endDate.setHours(23, 59, 59, 999)
          } else {
            startDate.setMonth(now.getMonth() - 1)
          }
          break
      }

      // Load bookings for the period
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('venueId', '==', targetVenueId),
        where('paymentStatus', '==', 'paid')
      )
      
      const snapshot = await getDocs(bookingsQuery)
      let bookings = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          date: normalizeDateInClubTZ(data.date, venueTimezone),
          paymentStatus: data.paymentStatus || 'awaiting_payment',
          paymentMethod: data.paymentMethod || 'cash'
        }
      })

      // Filter by period
      bookings = bookings.filter(booking => {
        if (!booking.date) return false
        const bookingDate = new Date(booking.date)
        
        if (period === 'custom' && customEndDate) {
          return bookingDate >= startDate && bookingDate <= endDate && booking.status === 'confirmed'
        } else if (period === 'today' || period === 'yesterday') {
          return bookingDate >= startDate && bookingDate <= endDate && booking.status === 'confirmed'
        } else {
          return bookingDate >= startDate && booking.status === 'confirmed'
        }
      })

      // Filter by payment method if needed
      if (paymentMethodFilter !== 'all') {
        bookings = bookings.filter(booking => booking.paymentMethod === paymentMethodFilter)
      }

      // Calculate stats
      const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.amount || 0), 0)
      const bookingsCount = bookings.length
      const averageCheck = bookingsCount > 0 ? totalRevenue / bookingsCount : 0

      setStats({
        totalRevenue,
        bookingsCount,
        averageCheck,
        revenueChange: 15.5 // In real app, calculate from previous period
      })

      // Group bookings by date for transactions table
      const transactionsByDate = bookings.reduce((acc: any, booking) => {
        const dateKey = booking.date?.toLocaleDateString('ru-RU')
        if (!acc[dateKey]) {
          acc[dateKey] = {
            date: booking.date,
            bookings: 0,
            revenue: 0
          }
        }
        acc[dateKey].bookings++
        acc[dateKey].revenue += booking.amount || 0
        return acc
      }, {})

      setTransactions(Object.values(transactionsByDate).slice(0, 10))
    } catch (error) {
      console.error('Error loading finance data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const loadPayouts = async (venueId: string) => {
    try {
      setPayoutsLoading(true)
      
      // Load payouts for the venue
      const payoutsQuery = query(
        collection(db, 'payouts'),
        where('venueId', '==', venueId),
        orderBy('processedAt', 'desc'),
        limit(50)
      )
      
      const snapshot = await getDocs(payoutsQuery)
      const payoutsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      setPayouts(payoutsData)
    } catch (error) {
      console.error('Error loading payouts:', error)
    } finally {
      setPayoutsLoading(false)
    }
  }
  
  const loadDebts = async (venueId: string) => {
    try {
      setDebtsLoading(true)
      
      // Load debts for the venue
      const debtsQuery = query(
        collection(db, 'venue_debts'),
        where('venueId', '==', venueId),
        where('status', '==', 'pending')
      )
      
      const snapshot = await getDocs(debtsQuery)
      const debtsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      const total = debtsData.reduce((sum, debt) => sum + (debt.debtAmount || 0), 0)
      
      setDebts(debtsData)
      setTotalDebt(total)
    } catch (error) {
      console.error('Error loading debts:', error)
    } finally {
      setDebtsLoading(false)
    }
  }
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }
  
  const getPayoutStatusChip = (status: string) => {
    switch (status) {
      case 'completed':
        return <Chip icon={<CheckCircle />} label="Выплачено" color="success" size="small" />
      case 'pending':
        return <Chip icon={<HourglassEmpty />} label="В обработке" color="warning" size="small" />
      case 'failed':
        return <Chip icon={<Cancel />} label="Ошибка" color="error" size="small" />
      case 'no_payout':
        return <Chip icon={<Info />} label="Нет выплаты" color="default" size="small" />
      default:
        return <Chip label={status} size="small" />
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
    return <VenueSelectorEmpty title="Выберите клуб для просмотра финансов" />
  }
  
  const isMultiaccounts = venueData?.paymentType === 'multiaccounts'

  return (
    <Box>
      {/* Venue selector for superadmin */}
      {isSuperAdmin && (
        <VenueSelector
          selectedVenueId={selectedVenueId}
          onVenueChange={handleVenueChange}
        />
      )}
      
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Финансы
        </Typography>
        
        {isMultiaccounts && (
          <Chip 
            icon={<AccountBalance />}
            label="Мультирасчеты активны"
            color="primary"
            variant="outlined"
          />
        )}
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="finance tabs">
          <Tab label="Аналитика" />
          {isMultiaccounts && <Tab label="Выплаты" />}
          {isMultiaccounts && <Tab label="Задолженности" />}
        </Tabs>
      </Box>

      {/* Analytics Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box display="flex" justifyContent="flex-end" gap={2} mb={3}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Способ оплаты</InputLabel>
            <Select
              value={paymentMethodFilter}
              label="Способ оплаты"
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
            >
              <MenuItem value="all">Все</MenuItem>
              <MenuItem value="cash">Наличные</MenuItem>
              <MenuItem value="card_on_site">Карта на месте</MenuItem>
              <MenuItem value="transfer">Перевод</MenuItem>
              <MenuItem value="online">Онлайн оплата</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Период</InputLabel>
            <Select
              value={period}
              label="Период"
              onChange={(e) => setPeriod(e.target.value)}
            >
              <MenuItem value="today">Сегодня</MenuItem>
              <MenuItem value="yesterday">Вчера</MenuItem>
              <MenuItem value="week">Неделя</MenuItem>
              <MenuItem value="month">Месяц</MenuItem>
              <MenuItem value="year">Год</MenuItem>
              <MenuItem value="custom">Персональный период</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Custom period fields */}
        {period === 'custom' && (
          <Box display="flex" gap={2} mb={3}>
            <TextField
              label="Начальная дата"
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Конечная дата"
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <Button 
              variant="contained" 
              size="small"
              onClick={() => loadFinanceData(selectedVenueId || admin?.venueId)}
              disabled={!customStartDate || !customEndDate}
            >
              Применить
            </Button>
          </Box>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <AttachMoney color="primary" />
                  <Chip
                    size="small"
                    label={`+${stats.revenueChange}%`}
                    color="success"
                    icon={<TrendingUp />}
                  />
                </Box>
                <Typography color="text.secondary" variant="body2">
                  Общий доход
                </Typography>
                <Typography variant="h5" component="div">
                  {stats.totalRevenue.toLocaleString('ru-RU')} ₽
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Receipt color="primary" />
                </Box>
                <Typography color="text.secondary" variant="body2">
                  Количество бронирований
                </Typography>
                <Typography variant="h5" component="div">
                  {stats.bookingsCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <AttachMoney color="primary" />
                </Box>
                <Typography color="text.secondary" variant="body2">
                  Средний чек
                </Typography>
                <Typography variant="h5" component="div">
                  {Math.round(stats.averageCheck).toLocaleString('ru-RU')} ₽
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Recent Transactions */}
        <Card>
          <CardContent>
            <Typography variant="h6" component="h3" gutterBottom>
              Последние транзакции
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Дата</TableCell>
                    <TableCell align="center">Бронирований</TableCell>
                    <TableCell align="right">Сумма</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((transaction, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {transaction.date?.toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell align="center">{transaction.bookings}</TableCell>
                      <TableCell align="right">
                        {transaction.revenue.toLocaleString('ru-RU')} ₽
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Payouts Tab */}
      {isMultiaccounts && (
        <TabPanel value={tabValue} index={1}>
          {payoutsLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : payouts.length === 0 ? (
            <Alert severity="info">
              Пока нет выплат. Выплаты производятся автоматически каждый день в 10:00 МСК за предыдущий день.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width="50"></TableCell>
                    <TableCell>Дата</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell align="center">Бронирований</TableCell>
                    <TableCell align="right">Сумма от клиентов</TableCell>
                    <TableCell align="right">Комиссии</TableCell>
                    <TableCell align="right">К выплате</TableCell>
                    <TableCell align="center">Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payouts.map((payout) => (
                    <React.Fragment key={payout.id}>
                      <TableRow hover>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => setExpandedPayout(expandedPayout === payout.id ? null : payout.id)}
                          >
                            {expandedPayout === payout.id ? <ExpandLess /> : <ExpandMore />}
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          {payout.date?.toDate ? 
                            payout.date.toDate().toLocaleDateString('ru-RU') :
                            new Date(payout.date).toLocaleDateString('ru-RU')
                          }
                        </TableCell>
                        <TableCell>{getPayoutStatusChip(payout.status)}</TableCell>
                        <TableCell align="center">{payout.bookingsCount || 0}</TableCell>
                        <TableCell align="right">
                          {(payout.totalGrossAmount || 0).toLocaleString('ru-RU')} ₽
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title={`Платформа: ${(payout.platformFee || 0).toFixed(2)}₽, Эквайринг и касса: ${(payout.acquiringFee || 0).toFixed(2)}₽`}>
                            <span>
                              {((payout.platformFee || 0) + (payout.acquiringFee || 0)).toLocaleString('ru-RU')} ₽
                            </span>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right">
                          <strong>{(payout.netPayoutAmount || 0).toLocaleString('ru-RU')} ₽</strong>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedPayout(payout)
                              setPayoutDetailsOpen(true)
                            }}
                          >
                            <Visibility />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded row with details */}
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                          <Collapse in={expandedPayout === payout.id} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Детализация выплаты
                              </Typography>
                              <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                  <List dense>
                                    <ListItem>
                                      <ListItemText 
                                        primary={`Комиссия платформы AllCourt (${payout.platformCommissionPercent || 1}%)`}
                                        secondary={`${(payout.platformFee || 0).toFixed(2)} ₽`}
                                      />
                                    </ListItem>
                                    <ListItem>
                                      <ListItemText 
                                        primary={`Эквайринг и онлайн-касса (${payout.acquiringCommissionPercent || 2.6}%)`}
                                        secondary={`${(payout.acquiringFee || 0).toFixed(2)} ₽`}
                                      />
                                    </ListItem>
                                  </List>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <List dense>
                                    {payout.debtDeducted > 0 && (
                                      <ListItem>
                                        <ListItemText 
                                          primary="Удержано за возвраты"
                                          secondary={`${payout.debtDeducted.toFixed(2)} ₽`}
                                        />
                                      </ListItem>
                                    )}
                                    {payout.subscriptionFeeDeducted > 0 && (
                                      <ListItem>
                                        <ListItemText 
                                          primary={`Подписка (${payout.subscriptionPlan})`}
                                          secondary={`${payout.subscriptionFeeDeducted.toFixed(2)} ₽`}
                                        />
                                      </ListItem>
                                    )}
                                  </List>
                                </Grid>
                              </Grid>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      )}

      {/* Debts Tab */}
      {isMultiaccounts && (
        <TabPanel value={tabValue} index={2}>
          {totalDebt > 0 && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Общая задолженность: {totalDebt.toLocaleString('ru-RU')} ₽
              </Typography>
              <Typography variant="body2">
                Эта сумма будет автоматически удержана из следующих выплат.
              </Typography>
            </Alert>
          )}
          
          {debtsLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : debts.length === 0 ? (
            <Alert severity="success">
              Нет активных задолженностей по возвратам.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Дата возврата</TableCell>
                    <TableCell>Клиент</TableCell>
                    <TableCell>Бронирование</TableCell>
                    <TableCell align="right">Сумма возврата</TableCell>
                    <TableCell align="right">К удержанию</TableCell>
                    <TableCell>Причина</TableCell>
                    <TableCell>Статус</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {debts.map((debt) => (
                    <TableRow key={debt.id}>
                      <TableCell>
                        {debt.createdAt?.toDate ? 
                          debt.createdAt.toDate().toLocaleDateString('ru-RU') :
                          'Не указана'
                        }
                      </TableCell>
                      <TableCell>{debt.customerName || 'Не указан'}</TableCell>
                      <TableCell>{debt.bookingId}</TableCell>
                      <TableCell align="right">
                        {(debt.originalRefundAmount || 0).toLocaleString('ru-RU')} ₽
                      </TableCell>
                      <TableCell align="right">
                        <strong>{(debt.debtAmount || 0).toLocaleString('ru-RU')} ₽</strong>
                      </TableCell>
                      <TableCell>{debt.refundReason || 'Отмена бронирования'}</TableCell>
                      <TableCell>
                        <Chip 
                          label="Ожидает удержания" 
                          color="warning" 
                          size="small"
                          icon={<MoneyOff />}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      )}

      {/* Payout Details Dialog */}
      <Dialog
        open={payoutDetailsOpen}
        onClose={() => setPayoutDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Детали выплаты за {selectedPayout?.date?.toDate ? 
            selectedPayout.date.toDate().toLocaleDateString('ru-RU') :
            selectedPayout?.date && new Date(selectedPayout.date).toLocaleDateString('ru-RU')
          }
        </DialogTitle>
        <DialogContent>
          {selectedPayout && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Финансовые показатели
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText 
                        primary="Сумма от клиентов"
                        secondary={`${(selectedPayout.totalGrossAmount || 0).toFixed(2)} ₽`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Комиссия банка"
                        secondary={`${(selectedPayout.totalAcquiringFees || 0).toFixed(2)} ₽`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary={`Комиссия платформы (${selectedPayout.platformCommissionPercent || 1}%)`}
                        secondary={`${(selectedPayout.platformCommission || 0).toFixed(2)} ₽`}
                      />
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemText 
                        primary={<strong>К выплате</strong>}
                        secondary={<strong>{`${(selectedPayout.netPayoutAmount || 0).toFixed(2)} ₽`}</strong>}
                      />
                    </ListItem>
                  </List>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Вычеты
                  </Typography>
                  <List>
                    {selectedPayout.debtDeducted > 0 && (
                      <ListItem>
                        <ListItemText 
                          primary="Возвраты"
                          secondary={`${selectedPayout.debtDeducted.toFixed(2)} ₽`}
                        />
                      </ListItem>
                    )}
                    {selectedPayout.subscriptionFeeDeducted > 0 && (
                      <ListItem>
                        <ListItemText 
                          primary={`Подписка (${selectedPayout.subscriptionPlan})`}
                          secondary={`${selectedPayout.subscriptionFeeDeducted.toFixed(2)} ₽`}
                        />
                      </ListItem>
                    )}
                    {!selectedPayout.debtDeducted && !selectedPayout.subscriptionFeeDeducted && (
                      <ListItem>
                        <ListItemText 
                          primary="Нет вычетов"
                          secondary="Все средства выплачены полностью"
                        />
                      </ListItem>
                    )}
                  </List>
                </Grid>
              </Grid>
              
              {selectedPayout.bookingDetails && selectedPayout.bookingDetails.length > 0 && (
                <Box mt={3}>
                  <Typography variant="subtitle2" gutterBottom>
                    Бронирования ({selectedPayout.bookingsCount})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Клиент</TableCell>
                          <TableCell>Корт</TableCell>
                          <TableCell align="right">Сумма</TableCell>
                          <TableCell align="right">Комиссия банка</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedPayout.bookingDetails.slice(0, 10).map((booking: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{booking.customerName}</TableCell>
                            <TableCell>{booking.courtName}</TableCell>
                            <TableCell align="right">{booking.amount.toFixed(2)} ₽</TableCell>
                            <TableCell align="right">{booking.acquiringFee.toFixed(2)} ₽</TableCell>
                          </TableRow>
                        ))}
                        {selectedPayout.bookingDetails.length > 10 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center">
                              <Typography variant="caption" color="text.secondary">
                                ... и еще {selectedPayout.bookingDetails.length - 10} бронирований
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayoutDetailsOpen(false)}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}