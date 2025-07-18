import React, { useEffect, useState } from 'react'
import { 
  Box, 
  Typography, 
  Card, 
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Chip
} from '@mui/material'
import { demoCustomerService } from '../services/demoServices'

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      const data = await demoCustomerService.getCustomers()
      setCustomers(data.sort((a, b) => b.totalSpent - a.totalSpent))
    } catch (error) {
      console.error('Error loading customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ru-RU')
  }

  if (loading) {
    return <LinearProgress />
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Клиенты
      </Typography>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Всего клиентов: {customers.length}
          </Typography>

          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Имя</TableCell>
                  <TableCell>Телефон</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="center">Бронирований</TableCell>
                  <TableCell align="right">Потрачено</TableCell>
                  <TableCell>Последний визит</TableCell>
                  <TableCell>Статус</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id} hover>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell align="center">{customer.totalBookings}</TableCell>
                    <TableCell align="right">{formatCurrency(customer.totalSpent)}</TableCell>
                    <TableCell>{formatDate(customer.lastVisit)}</TableCell>
                    <TableCell>
                      <Chip
                        label={customer.totalBookings > 5 ? 'Постоянный' : 'Новый'}
                        size="small"
                        color={customer.totalBookings > 5 ? 'success' : 'default'}
                      />
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

export default Customers