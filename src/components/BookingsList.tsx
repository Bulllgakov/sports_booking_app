import React, { useState, useEffect } from 'react'
import { 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  Timestamp,
  doc,
  deleteDoc
} from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuth } from '../contexts/AuthContext'
import { usePermission } from '../hooks/usePermission'
import PaymentStatusManager from './PaymentStatusManager'
import BookingDetailsModal from './BookingDetailsModal'
import { Delete, FilterList, Info } from '@mui/icons-material'

interface PaymentHistory {
  timestamp: Date
  action: 'created' | 'paid' | 'cancelled'
  userId: string
  userName?: string
  note?: string
}

interface Booking {
  id: string
  courtId: string
  courtName: string
  clientName: string
  clientPhone: string
  customerName?: string
  customerPhone?: string
  date: Date
  time?: string
  startTime: string
  endTime: string
  status: 'confirmed' | 'pending' | 'cancelled'
  amount: number
  paymentMethod: 'cash' | 'card_on_site' | 'transfer' | 'online'
  paymentStatus?: 'awaiting_payment' | 'paid' | 'online_payment' | 'cancelled'
  paymentHistory?: PaymentHistory[]
  createdBy?: {
    userId: string
    userName: string
    userRole?: string
  }
  venueId: string
  createdAt: Date
}

interface BookingsListProps {
  venueId: string
  onRefresh?: () => void
}

export default function BookingsList({ venueId, onRefresh }: BookingsListProps) {
  const { admin } = useAuth()
  const { hasPermission } = usePermission()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  useEffect(() => {
    fetchBookings()
  }, [venueId])

  const fetchBookings = async () => {
    if (!venueId) {
      console.log('No venueId provided to BookingsList')
      return
    }

    console.log('BookingsList: Fetching bookings for venue:', venueId)

    try {
      setLoading(true)
      
      // Простой запрос без orderBy чтобы избежать проблем с индексами
      const q = query(
        collection(db, 'bookings'),
        where('venueId', '==', venueId)
      )
      
      const snapshot = await getDocs(q)
      console.log('BookingsList: Found bookings:', snapshot.size)
      
      const bookingsData = snapshot.docs.map(doc => {
        const data = doc.data()
        console.log('BookingsList: Raw booking:', data)
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
        }
      }) as Booking[]
      
      // Сортируем по дате на клиенте
      const sortedBookings = bookingsData.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
      
      console.log('BookingsList: Processed and sorted bookings:', sortedBookings)
      setBookings(sortedBookings)
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (bookingId: string) => {
    if (!confirm('Вы уверены, что хотите удалить это бронирование?')) return

    try {
      await deleteDoc(doc(db, 'bookings', bookingId))
      fetchBookings()
      if (onRefresh) onRefresh()
    } catch (error) {
      console.error('Error deleting booking:', error)
      alert('Ошибка при удалении бронирования')
    }
  }

  const filteredBookings = bookings.filter(booking => {
    if (filterStatus !== 'all' && booking.status !== filterStatus) return false
    if (filterPaymentStatus !== 'all') {
      const paymentStatus = booking.paymentStatus || 'awaiting_payment'
      if (paymentStatus !== filterPaymentStatus) return false
    }
    return true
  })

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date)
  }

  const formatTime = (time: string) => {
    return time || '—'
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const paymentMethodLabels = {
    cash: 'Наличные',
    card_on_site: 'Карта на месте',
    transfer: 'Перевод',
    online: 'Онлайн'
  }

  if (loading) {
    return <div>Загрузка...</div>
  }

  return (
    <div className="section-card">
      <div className="section-header">
        <h2 className="section-title">Список бронирований</h2>
        <button 
          className="btn btn-secondary btn-icon"
          onClick={() => setShowFilters(!showFilters)}
        >
          <FilterList />
          Фильтры
        </button>
      </div>

      {showFilters && (
        <div style={{ 
          marginBottom: '24px', 
          padding: '16px', 
          background: 'var(--background)', 
          borderRadius: '8px',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div>
            <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>
              Статус бронирования
            </label>
            <select 
              className="form-select" 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              <option value="all">Все</option>
              <option value="confirmed">Подтверждено</option>
              <option value="pending">Ожидает</option>
              <option value="cancelled">Отменено</option>
            </select>
          </div>
          
          <div>
            <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>
              Статус оплаты
            </label>
            <select 
              className="form-select" 
              value={filterPaymentStatus}
              onChange={(e) => setFilterPaymentStatus(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              <option value="all">Все</option>
              <option value="awaiting_payment">Ожидает оплаты</option>
              <option value="paid">Оплачено</option>
              <option value="online_payment">Онлайн оплата</option>
              <option value="cancelled">Отменено</option>
            </select>
          </div>
        </div>
      )}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Дата и время</th>
              <th>Корт</th>
              <th>Клиент</th>
              <th>Сумма</th>
              <th>Способ оплаты</th>
              <th>Статус оплаты</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px' }}>
                  Нет бронирований
                </td>
              </tr>
            ) : (
              filteredBookings.map(booking => (
                <tr key={booking.id}>
                  <td>
                    <div>{formatDate(booking.date)}</div>
                    <div style={{ fontSize: '14px', color: 'var(--gray)' }}>
                      {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                    </div>
                  </td>
                  <td>{booking.courtName}</td>
                  <td>
                    <div>{booking.clientName || booking.customerName}</div>
                    <div style={{ fontSize: '14px', color: 'var(--gray)' }}>
                      {booking.clientPhone || booking.customerPhone}
                    </div>
                  </td>
                  <td style={{ fontWeight: '600' }}>{formatAmount(booking.amount)}</td>
                  <td>{paymentMethodLabels[booking.paymentMethod] || booking.paymentMethod}</td>
                  <td>
                    <PaymentStatusManager
                      bookingId={booking.id}
                      currentStatus={booking.paymentStatus || 'awaiting_payment'}
                      paymentMethod={booking.paymentMethod}
                      onStatusUpdate={fetchBookings}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-secondary btn-icon"
                        onClick={() => {
                          setSelectedBooking(booking)
                          setShowDetailsModal(true)
                        }}
                        title="Подробности"
                      >
                        <Info />
                      </button>
                      {hasPermission(['manage_bookings', 'manage_all_bookings']) && (
                        <button
                          className="btn btn-danger btn-icon"
                          onClick={() => handleDelete(booking.id)}
                          title="Удалить бронирование"
                        >
                          <Delete />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <BookingDetailsModal
        booking={selectedBooking}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedBooking(null)
        }}
        onUpdate={fetchBookings}
      />
    </div>
  )
}