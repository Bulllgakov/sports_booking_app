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
  getDoc
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
  Button
} from '@mui/material'
import { TrendingUp, TrendingDown, AttachMoney, Receipt, DateRange } from '@mui/icons-material'

export default function Finance() {
  const { admin } = useAuth()
  const { isSuperAdmin } = usePermission()
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [venueTimezone, setVenueTimezone] = useState<string>('Europe/Moscow')
  const [loading, setLoading] = useState(true)
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
  
  // Функция для получения отображаемого периода
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
        startDate.setMonth(now.getMonth(), 1) // Первое число текущего месяца
        const monthName = now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
        return monthName.charAt(0).toUpperCase() + monthName.slice(1) // Капитализируем первую букву
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
        loadFinanceData(venueId)
      } else {
        setLoading(false)
      }
    } else if (admin?.venueId) {
      loadFinanceData(admin.venueId)
    }
  }, [admin, isSuperAdmin, period, paymentMethodFilter])

  const handleVenueChange = (venueId: string) => {
    setSelectedVenueId(venueId)
    localStorage.setItem('selectedVenueId', venueId)
    if (venueId) {
      loadFinanceData(venueId)
    }
  }

  const loadFinanceData = async (venueId?: string) => {
    const targetVenueId = venueId || admin?.venueId
    if (!targetVenueId) return

    try {
      setLoading(true)
      
      // Загружаем информацию о клубе для получения часового пояса
      const venueDocRef = doc(db, 'venues', targetVenueId)
      const venueDoc = await getDoc(venueDocRef)
      
      if (venueDoc.exists()) {
        const venueData = venueDoc.data()
        const timezone = venueData.timezone || 'Europe/Moscow'
        setVenueTimezone(timezone)
        console.log('Club timezone:', timezone)
      }
      
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
            // Устанавливаем конец дня для endDate
            endDate.setHours(23, 59, 59, 999)
          } else {
            // Если даты не выбраны, используем последний месяц
            startDate.setMonth(now.getMonth() - 1)
          }
          break
      }

      // Load bookings for the period
      console.log('Loading finance data for venue:', targetVenueId)
      console.log('Period:', period, 'Start date:', startDate)
      
      // Простой запрос без orderBy чтобы избежать проблем с индексами
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('venueId', '==', targetVenueId)
      )
      
      const snapshot = await getDocs(bookingsQuery)
      console.log('Total bookings found:', snapshot.size)
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

      // Фильтруем по периоду на клиенте
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

      console.log('Bookings after date filter:', bookings.length)

      // Filter only paid bookings
      bookings = bookings.filter(booking => 
        booking.paymentStatus === 'paid'
      )
      
      console.log('Paid bookings:', bookings.length)

      // Filter by payment method if needed
      if (paymentMethodFilter !== 'all') {
        bookings = bookings.filter(booking => booking.paymentMethod === paymentMethodFilter)
      }

      // Calculate stats (all bookings are already paid)
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

  return (
    <Box>
      {/* Селектор клуба для суперадмина */}
      {isSuperAdmin && (
        <VenueSelector
          selectedVenueId={selectedVenueId}
          onVenueChange={handleVenueChange}
        />
      )}
      
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Финансовая аналитика
        </Typography>
        
        <Box display="flex" gap={2}>
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
              <MenuItem value="sberbank_card">Карта Сбербанк</MenuItem>
              <MenuItem value="tbank_card">Карта Т-Банк</MenuItem>
              <MenuItem value="vtb_card">Карта ВТБ</MenuItem>
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
      </Box>

      {/* Поля для персонального периода */}
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

      {/* Отображение выбранного периода */}
      <Box mb={3}>
        <Typography variant="body2" color="text.secondary">
          Период: {getPeriodDisplay()}
        </Typography>
      </Box>

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
    </Box>
  )
}