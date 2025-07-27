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
  limit
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { FileDownload, Send } from '@mui/icons-material'

interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  bookingsCount: number
  lastVisit?: Date
  totalSpent: number
  hasApp: boolean
  venueId: string
  createdAt: Date
}

export default function CustomersManagement() {
  const { admin } = useAuth()
  const { isSuperAdmin } = usePermission()
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (isSuperAdmin) {
      const venueId = localStorage.getItem('selectedVenueId')
      if (venueId) {
        setSelectedVenueId(venueId)
        fetchCustomers(venueId)
      } else {
        setLoading(false)
      }
    } else if (admin?.venueId) {
      fetchCustomers(admin.venueId)
    }
  }, [admin, isSuperAdmin])

  const handleVenueChange = (venueId: string) => {
    setSelectedVenueId(venueId)
    localStorage.setItem('selectedVenueId', venueId)
    if (venueId) {
      fetchCustomers(venueId)
    }
  }

  const fetchCustomers = async (venueId?: string) => {
    const targetVenueId = venueId || admin?.venueId
    if (!targetVenueId) return

    try {
      setLoading(true)
      // В реальном приложении клиенты бы хранились в отдельной коллекции
      // Сейчас мы соберем их из бронирований
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('venueId', '==', targetVenueId),
        orderBy('createdAt', 'desc'),
        limit(100)
      )
      
      const snapshot = await getDocs(bookingsQuery)
      const customerMap = new Map<string, Customer>()
      
      snapshot.docs.forEach(doc => {
        const booking = doc.data()
        const customerId = booking.clientPhone // Используем телефон как ID
        
        if (customerMap.has(customerId)) {
          const existing = customerMap.get(customerId)!
          existing.bookingsCount++
          existing.totalSpent += booking.amount || 0
          if (booking.date?.toDate() > existing.lastVisit!) {
            existing.lastVisit = booking.date.toDate()
          }
        } else {
          customerMap.set(customerId, {
            id: customerId,
            name: booking.clientName,
            phone: booking.clientPhone,
            bookingsCount: 1,
            lastVisit: booking.date?.toDate(),
            totalSpent: booking.amount || 0,
            hasApp: booking.paymentMethod === 'app',
            venueId: admin.venueId,
            createdAt: booking.createdAt?.toDate() || new Date()
          })
        }
      })
      
      setCustomers(Array.from(customerMap.values()))
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  )

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarColor = (name: string) => {
    const colors = ['var(--primary)', 'var(--padel)', 'var(--badminton)', 'var(--tennis)']
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  const formatDate = (date?: Date) => {
    if (!date) return 'Нет данных'
    
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Сегодня'
    if (diffDays === 1) return 'Вчера'
    if (diffDays < 7) return `${diffDays} дней назад`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} недель назад`
    return date.toLocaleDateString('ru-RU')
  }

  const handleExport = () => {
    const csvContent = [
      ['Имя', 'Телефон', 'Количество бронирований', 'Потрачено', 'Последний визит'].join(','),
      ...filteredCustomers.map(customer => [
        customer.name,
        customer.phone,
        customer.bookingsCount,
        customer.totalSpent,
        customer.lastVisit?.toLocaleDateString('ru-RU') || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `customers_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading) {
    return <div>Загрузка...</div>
  }

  if (isSuperAdmin && !selectedVenueId) {
    return <VenueSelectorEmpty title="Выберите клуб для просмотра клиентов" />
  }

  return (
    <div>
      {/* Селектор клуба для суперадмина */}
      {isSuperAdmin && (
        <VenueSelector
          selectedVenueId={selectedVenueId}
          onVenueChange={handleVenueChange}
        />
      )}
      <div className="section-card">
        <div className="section-header">
          <h2 className="section-title">База клиентов</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="search" 
              className="form-input" 
              placeholder="Поиск по имени или телефону" 
              style={{ width: '300px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="btn btn-secondary" onClick={handleExport}>
              <FileDownload fontSize="small" />
              Экспорт
            </button>
          </div>
        </div>
        
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Клиент</th>
                <th>Телефон</th>
                <th>Бронирований</th>
                <th>Потрачено</th>
                <th>Последний визит</th>
                <th>Статус в приложении</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--gray)' }}>
                    Клиенты не найдены
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => (
                  <tr key={customer.id}>
                    <td>
                      <div className="customer-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="customer-avatar" style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: getAvatarColor(customer.name),
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '600',
                          fontSize: '16px'
                        }}>
                          {getInitials(customer.name)}
                        </div>
                        <div>
                          <div className="customer-name" style={{ fontWeight: '600', color: 'var(--dark)' }}>
                            {customer.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{customer.phone}</td>
                    <td>{customer.bookingsCount}</td>
                    <td>{customer.totalSpent.toLocaleString('ru-RU')}₽</td>
                    <td>{formatDate(customer.lastVisit)}</td>
                    <td>
                      {customer.hasApp ? (
                        <span style={{ color: 'var(--success)' }}>✅ Установлено</span>
                      ) : (
                        <span style={{ color: 'var(--warning)' }}>📱 Не установлено</span>
                      )}
                    </td>
                    <td>
                      {customer.hasApp ? (
                        <button className="btn btn-secondary">Детали</button>
                      ) : (
                        <button className="btn btn-secondary">
                          <Send fontSize="small" />
                          Отправить SMS
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="section-card">
        <h2 className="section-title">Статистика по клиентам</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--primary)' }}>
              {customers.length}
            </div>
            <div style={{ color: 'var(--gray)', fontSize: '14px' }}>Всего клиентов</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--primary)' }}>
              {customers.filter(c => c.hasApp).length}
            </div>
            <div style={{ color: 'var(--gray)', fontSize: '14px' }}>С приложением</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--primary)' }}>
              {Math.round(customers.filter(c => c.hasApp).length / customers.length * 100)}%
            </div>
            <div style={{ color: 'var(--gray)', fontSize: '14px' }}>Конверсия в приложение</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--primary)' }}>
              {customers.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString('ru-RU')}₽
            </div>
            <div style={{ color: 'var(--gray)', fontSize: '14px' }}>Общий доход</div>
          </div>
        </div>
      </div>
    </div>
  )
}