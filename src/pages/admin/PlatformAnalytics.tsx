import React, { useState, useEffect } from 'react'
import { usePermission } from '../../hooks/usePermission'
import { 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  Timestamp,
  limit
} from 'firebase/firestore'
import { db } from '../../services/firebase'
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
  CircularProgress,
  Alert,
  TextField,
  Button,
  Tabs,
  Tab,
  Chip,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip
} from '@mui/material'
import { 
  TrendingUp, 
  TrendingDown, 
  AttachMoney, 
  Receipt, 
  ShowChart,
  AccountBalance,
  CreditCard,
  LocalAtm,
  Visibility,
  Download,
  Assessment
} from '@mui/icons-material'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts'

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
      id={`platform-tabpanel-${index}`}
      aria-labelledby={`platform-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export default function PlatformAnalytics() {
  const { isSuperAdmin } = usePermission()
  const [loading, setLoading] = useState(true)
  const [tabValue, setTabValue] = useState(0)
  
  // Period selection
  const [period, setPeriod] = useState('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  
  // Analytics data
  const [stats, setStats] = useState({
    totalRevenue: 0,
    platformCommission: 0,
    acquiringFees: 0,
    netProfit: 0,
    profitMargin: 0,
    transactionsCount: 0,
    averageTransaction: 0,
    averageAcquiringRate: 0
  })
  
  const [venueAnalytics, setVenueAnalytics] = useState<any[]>([])
  const [paymentMethodAnalytics, setPaymentMethodAnalytics] = useState<any[]>([])
  const [platformTransactions, setPlatformTransactions] = useState<any[]>([])
  
  useEffect(() => {
    if (!isSuperAdmin) {
      setLoading(false)
      return
    }
    
    loadPlatformAnalytics()
  }, [period, customStartDate, customEndDate, isSuperAdmin])
  
  const loadPlatformAnalytics = async () => {
    try {
      setLoading(true)
      
      // Calculate date range
      const now = new Date()
      let startDate = new Date()
      let endDate = new Date()
      
      switch(period) {
        case 'today':
          startDate.setHours(0, 0, 0, 0)
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
          }
          break
      }
      
      // Load payouts data for analytics
      const payoutsQuery = query(
        collection(db, 'payouts'),
        where('processedAt', '>=', Timestamp.fromDate(startDate)),
        where('processedAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('processedAt', 'desc'),
        limit(1000)
      )
      
      const payoutsSnapshot = await getDocs(payoutsQuery)
      
      let totalRevenue = 0
      let totalPlatformCommission = 0
      let totalAcquiringFees = 0
      let totalActualAcquiringFees = 0
      let transactionsCount = 0
      const venueStats: Record<string, any> = {}
      const methodStats: Record<string, any> = {}
      
      payoutsSnapshot.forEach(doc => {
        const payout = doc.data()
        
        totalRevenue += payout.totalGrossAmount || 0
        totalPlatformCommission += payout.platformFee || 0
        totalAcquiringFees += payout.acquiringFee || 0
        
        // If we have actual acquiring fees from T-Bank
        if (payout.actualAcquiringFees) {
          totalActualAcquiringFees += payout.actualAcquiringFees
        }
        
        transactionsCount += payout.bookingsCount || 0
        
        // Aggregate by venue
        const venueId = payout.venueId
        if (!venueStats[venueId]) {
          venueStats[venueId] = {
            venueId,
            venueName: payout.venueName,
            revenue: 0,
            platformCommission: 0,
            acquiringFees: 0,
            netProfit: 0,
            transactionsCount: 0
          }
        }
        venueStats[venueId].revenue += payout.totalGrossAmount || 0
        venueStats[venueId].platformCommission += payout.platformFee || 0
        venueStats[venueId].acquiringFees += payout.acquiringFee || 0
        venueStats[venueId].transactionsCount += payout.bookingsCount || 0
        
        // Aggregate by payment method (if available)
        if (payout.bookingDetails) {
          payout.bookingDetails.forEach((booking: any) => {
            const method = booking.paymentMethod || 'card'
            if (!methodStats[method]) {
              methodStats[method] = {
                method,
                revenue: 0,
                count: 0,
                acquiringFees: 0
              }
            }
            methodStats[method].revenue += booking.amount || 0
            methodStats[method].count++
            methodStats[method].acquiringFees += booking.actualAcquiringFee || 0
          })
        }
      })
      
      // Calculate net profit
      const actualAcquiring = totalActualAcquiringFees || totalAcquiringFees
      const netProfit = totalPlatformCommission + totalAcquiringFees - actualAcquiring
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
      const averageAcquiringRate = totalRevenue > 0 ? (actualAcquiring / totalRevenue) * 100 : 0
      
      // Calculate venue net profits
      Object.values(venueStats).forEach((venue: any) => {
        venue.netProfit = venue.platformCommission // Simplified, in reality would subtract actual acquiring
        venue.profitMargin = venue.revenue > 0 ? (venue.netProfit / venue.revenue) * 100 : 0
      })
      
      setStats({
        totalRevenue,
        platformCommission: totalPlatformCommission,
        acquiringFees: totalAcquiringFees,
        netProfit,
        profitMargin,
        transactionsCount,
        averageTransaction: transactionsCount > 0 ? totalRevenue / transactionsCount : 0,
        averageAcquiringRate
      })
      
      setVenueAnalytics(Object.values(venueStats).sort((a, b) => b.revenue - a.revenue))
      
      // Prepare payment method data for pie chart
      const methodData = Object.values(methodStats).map((method: any) => ({
        name: getPaymentMethodName(method.method),
        value: method.count,
        revenue: method.revenue,
        averageAcquiring: method.count > 0 ? (method.acquiringFees / method.revenue) * 100 : 0
      }))
      setPaymentMethodAnalytics(methodData)
      
    } catch (error) {
      console.error('Error loading platform analytics:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const getPaymentMethodName = (method: string) => {
    const names: Record<string, string> = {
      card: 'Банковская карта',
      sbp: 'СБП',
      apple_pay: 'Apple Pay',
      google_pay: 'Google Pay',
      yandex_pay: 'Yandex Pay'
    }
    return names[method] || method
  }
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }
  
  const exportToExcel = () => {
    // TODO: Implement Excel export
    alert('Экспорт в Excel будет добавлен в следующей версии')
  }
  
  if (!isSuperAdmin) {
    return (
      <Alert severity="error">
        Доступ запрещен. Этот раздел доступен только суперадминистраторам.
      </Alert>
    )
  }
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']
  
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Аналитика платформы
        </Typography>
        
        <Box display="flex" gap={2}>
          <TextField
            select
            size="small"
            label="Период"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            sx={{ minWidth: 120 }}
            SelectProps={{ native: true }}
          >
            <option value="today">Сегодня</option>
            <option value="week">Неделя</option>
            <option value="month">Месяц</option>
            <option value="year">Год</option>
            <option value="custom">Произвольный</option>
          </TextField>
          
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={exportToExcel}
          >
            Экспорт
          </Button>
        </Box>
      </Box>
      
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
        </Box>
      )}
      
      {/* Key Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <AttachMoney color="primary" />
                <Chip
                  size="small"
                  label={`${stats.profitMargin.toFixed(1)}%`}
                  color={stats.profitMargin > 0 ? "success" : "error"}
                  icon={stats.profitMargin > 0 ? <TrendingUp /> : <TrendingDown />}
                />
              </Box>
              <Typography color="text.secondary" variant="body2">
                Общий оборот
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
                <AccountBalance color="success" />
              </Box>
              <Typography color="text.secondary" variant="body2">
                Чистая прибыль
              </Typography>
              <Typography variant="h5" component="div" color="success.main">
                {stats.netProfit.toLocaleString('ru-RU')} ₽
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Маржинальность: {stats.profitMargin.toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <CreditCard color="warning" />
              </Box>
              <Typography color="text.secondary" variant="body2">
                Средний эквайринг
              </Typography>
              <Typography variant="h5" component="div">
                {stats.averageAcquiringRate.toFixed(2)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Заложено: 2.6%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Receipt color="info" />
              </Box>
              <Typography color="text.secondary" variant="body2">
                Транзакций
              </Typography>
              <Typography variant="h5" component="div">
                {stats.transactionsCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Средний чек: {Math.round(stats.averageTransaction).toLocaleString('ru-RU')} ₽
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="По клубам" />
          <Tab label="По способам оплаты" />
          <Tab label="Детализация" />
        </Tabs>
      </Box>
      
      {/* By Venues Tab */}
      <TabPanel value={tabValue} index={0}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Клуб</TableCell>
                <TableCell align="right">Оборот</TableCell>
                <TableCell align="right">Комиссия платформы</TableCell>
                <TableCell align="right">Эквайринг (план)</TableCell>
                <TableCell align="right">Чистая прибыль</TableCell>
                <TableCell align="center">Маржа</TableCell>
                <TableCell align="center">Транзакций</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {venueAnalytics.map((venue) => (
                <TableRow key={venue.venueId} hover>
                  <TableCell>{venue.venueName}</TableCell>
                  <TableCell align="right">
                    {venue.revenue.toLocaleString('ru-RU')} ₽
                  </TableCell>
                  <TableCell align="right">
                    {venue.platformCommission.toLocaleString('ru-RU')} ₽
                  </TableCell>
                  <TableCell align="right">
                    {venue.acquiringFees.toLocaleString('ru-RU')} ₽
                  </TableCell>
                  <TableCell align="right">
                    <strong>{venue.netProfit.toLocaleString('ru-RU')} ₽</strong>
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={`${venue.profitMargin.toFixed(1)}%`}
                      size="small"
                      color={venue.profitMargin > 2 ? "success" : "warning"}
                    />
                  </TableCell>
                  <TableCell align="center">{venue.transactionsCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
      
      {/* By Payment Methods Tab */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Распределение по способам оплаты
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentMethodAnalytics}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethodAnalytics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Эффективность по способам оплаты
                </Typography>
                <List>
                  {paymentMethodAnalytics.map((method, index) => (
                    <React.Fragment key={method.name}>
                      <ListItem>
                        <ListItemText
                          primary={method.name}
                          secondary={
                            <Box>
                              <Typography variant="body2">
                                Оборот: {method.revenue.toLocaleString('ru-RU')} ₽
                              </Typography>
                              <Typography variant="body2">
                                Средний эквайринг: {method.averageAcquiring.toFixed(2)}%
                              </Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={Math.min(method.averageAcquiring * 40, 100)}
                                color={method.averageAcquiring < 1.5 ? "success" : method.averageAcquiring < 2.5 ? "warning" : "error"}
                                sx={{ mt: 1 }}
                              />
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < paymentMethodAnalytics.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
      
      {/* Detailed Transactions Tab */}
      <TabPanel value={tabValue} index={2}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Детальная информация по транзакциям с реальными комиссиями эквайринга будет доступна после интеграции с webhook Т-Банка.
        </Alert>
        
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Сводка по комиссиям
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Собрано комиссий с клубов
                  </Typography>
                  <Typography variant="h6">
                    {(stats.platformCommission + stats.acquiringFees).toLocaleString('ru-RU')} ₽
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Фактический эквайринг (оценка)
                  </Typography>
                  <Typography variant="h6">
                    {stats.acquiringFees.toLocaleString('ru-RU')} ₽
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Чистая прибыль платформы
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {stats.netProfit.toLocaleString('ru-RU')} ₽
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  )
}