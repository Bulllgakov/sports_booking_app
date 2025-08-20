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
import PaymentTimeLimit from './PaymentTimeLimit'
import BookingDetailsModal from './BookingDetailsModal'
import RefundModal from './RefundModal'
import { Delete, FilterList, Info } from '@mui/icons-material'
import { getPaymentMethodName } from '../utils/paymentMethods'

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
  paymentMethod: 'cash' | 'card_on_site' | 'transfer' | 'online' | 'sberbank_card' | 'tbank_card' | 'vtb_card'
  paymentStatus?: 'awaiting_payment' | 'paid' | 'cancelled' | 'refunded' | 'error'
  paymentId?: string
  paymentHistory?: PaymentHistory[]
  createdBy?: {
    userId: string
    userName: string
    userRole?: string
  }
  venueId: string
  createdAt: Date
  // Поля для тренера
  trainerId?: string
  trainerName?: string
  trainerPrice?: number
  trainerCommission?: number
  totalAmount?: number
}

interface BookingsListProps {
  venueId: string
  bookings?: Booking[]
  onRefresh?: () => void
  clubTimezone?: string
}

export default function BookingsList({ venueId, bookings: propsBookings, onRefresh, clubTimezone = 'Europe/Moscow' }: BookingsListProps) {
  const { admin, club } = useAuth()
  const { hasPermission, isSuperAdmin } = usePermission()
  
  // Получаем часовой пояс клуба
  const getClubTimezone = () => club?.timezone || clubTimezone || 'Europe/Moscow'
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all')
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all')
  const [filterTrainer, setFilterTrainer] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [refundBooking, setRefundBooking] = useState<Booking | null>(null)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc') // desc = новые первыми

  useEffect(() => {
    // Если бронирования переданы через props, используем их
    if (propsBookings) {
      // console.log('BookingsList received bookings:', propsBookings.length, 'total')
      
      
      setBookings(propsBookings)
      setLoading(false)
    } else {
      // Иначе загружаем сами
      fetchBookings()
    }
  }, [venueId, propsBookings])

  const fetchBookings = async () => {
    // Если бронирования переданы через props, не загружаем их заново
    if (propsBookings) {
      return
    }
    
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
        
        // Преобразуем даты правильно - НЕ нормализуем createdAt, так как это точное время!
        let createdAt: Date
        if (data.createdAt?.toDate) {
          createdAt = data.createdAt.toDate()
        } else if (data.createdAt instanceof Date) {
          createdAt = data.createdAt
        } else if (typeof data.createdAt === 'string') {
          createdAt = new Date(data.createdAt)
        } else if (data.createdAt?.seconds) {
          // Firestore Timestamp объект
          createdAt = new Date(data.createdAt.seconds * 1000)
        } else {
          // Если нет даты создания, используем текущую дату как fallback
          createdAt = new Date()
          console.warn('No createdAt for booking:', doc.id)
        }
        
        // Преобразуем дату бронирования
        let bookingDate: Date
        if (data.date?.toDate) {
          bookingDate = data.date.toDate()
        } else if (data.date instanceof Date) {
          bookingDate = data.date
        } else if (typeof data.date === 'string') {
          bookingDate = new Date(data.date)
        } else if (data.date?.seconds) {
          bookingDate = new Date(data.date.seconds * 1000)
        } else {
          bookingDate = new Date()
        }
        
        return {
          id: doc.id,
          ...data,
          date: bookingDate,
          createdAt: createdAt
        }
      }) as Booking[]
      
      // НЕ сортируем здесь, сортировка будет в filteredBookings
      console.log('BookingsList: Processed bookings:', bookingsData)
      setBookings(bookingsData)
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  // Проверка, можно ли удалить бронирование
  const canDeleteBooking = (booking: Booking): boolean => {
    // Только суперадмин может удалять
    if (!isSuperAdmin) return false
    
    // Можно удалить если:
    // 1. Бронирование отменено И (нет оплаты ИЛИ оплата возвращена)
    // 2. ИЛИ статус оплаты = error (ошибка оплаты)
    const isCancelled = booking.status === 'cancelled'
    const hasNoPayment = !booking.paymentStatus || booking.paymentStatus === 'awaiting_payment' || booking.paymentStatus === 'cancelled'
    const isRefunded = booking.paymentStatus === 'refunded'
    const hasError = booking.paymentStatus === 'error'
    
    return (isCancelled && (hasNoPayment || isRefunded)) || hasError
  }

  const handleDelete = async (bookingId: string, booking: Booking) => {
    // Проверяем права и условия
    if (!canDeleteBooking(booking)) {
      alert('Удалить можно только отмененное бронирование без оплаты/с возвратом средств, или бронирование с ошибкой оплаты')
      return
    }
    
    if (!confirm('Вы уверены, что хотите удалить это бронирование?\n\nЭто действие необратимо!')) return

    try {
      await deleteDoc(doc(db, 'bookings', bookingId))
      // Если есть функция обновления от родителя, вызываем её
      if (onRefresh) {
        onRefresh()
      } else {
        // Иначе обновляем локально
        fetchBookings()
      }
    } catch (error) {
      console.error('Error deleting booking:', error)
      alert('Ошибка при удалении бронирования')
    }
  }

  // Фильтруем бронирования
  const filteredByStatus = bookings.filter(booking => {
    
    if (filterStatus !== 'all' && booking.status !== filterStatus) return false
    if (filterPaymentStatus !== 'all') {
      const paymentStatus = booking.paymentStatus || 'awaiting_payment'
      if (paymentStatus !== filterPaymentStatus) return false
    }
    if (filterPaymentMethod !== 'all' && booking.paymentMethod !== filterPaymentMethod) return false
    if (filterTrainer !== 'all') {
      if (filterTrainer === 'no_trainer' && booking.trainerId) return false
      if (filterTrainer !== 'no_trainer' && booking.trainerId !== filterTrainer) return false
    }
    return true
  })

  // console.log('BookingsList: After filtering:', filteredByStatus.length, 'bookings (from', bookings.length, 'total)')
  
  // Сортируем отфильтрованные бронирования
  const filteredBookings = [...filteredByStatus].sort((a, b) => {
    // Нормализуем даты для сортировки
    let dateA: Date
    let dateB: Date
    
    // Для a
    if (a.createdAt instanceof Date) {
      dateA = a.createdAt
    } else if (a.createdAt?.toDate) {
      dateA = a.createdAt.toDate()
    } else if (a.createdAt?.seconds) {
      dateA = new Date(a.createdAt.seconds * 1000)
    } else if (typeof a.createdAt === 'string') {
      dateA = new Date(a.createdAt)
    } else {
      // Fallback на дату бронирования
      if (a.date instanceof Date) {
        dateA = a.date
      } else if (a.date?.toDate) {
        dateA = a.date.toDate()
      } else if (a.date?.seconds) {
        dateA = new Date(a.date.seconds * 1000)
      } else {
        dateA = new Date(0)
      }
    }
    
    // Для b
    if (b.createdAt instanceof Date) {
      dateB = b.createdAt
    } else if (b.createdAt?.toDate) {
      dateB = b.createdAt.toDate()
    } else if (b.createdAt?.seconds) {
      dateB = new Date(b.createdAt.seconds * 1000)
    } else if (typeof b.createdAt === 'string') {
      dateB = new Date(b.createdAt)
    } else {
      // Fallback на дату бронирования
      if (b.date instanceof Date) {
        dateB = b.date
      } else if (b.date?.toDate) {
        dateB = b.date.toDate()
      } else if (b.date?.seconds) {
        dateB = new Date(b.date.seconds * 1000)
      } else {
        dateB = new Date(0)
      }
    }
    
    // Сортируем в зависимости от sortOrder
    if (sortOrder === 'desc') {
      // Новые первыми
      return dateB.getTime() - dateA.getTime()
    } else {
      // Старые первыми
      return dateA.getTime() - dateB.getTime()
    }
  })

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: getClubTimezone()
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
  
  // Получаем уникальных тренеров из бронирований
  const uniqueTrainers = Array.from(
    new Map(
      bookings
        .filter(b => b.trainerId && b.trainerName)
        .map(b => [b.trainerId, { id: b.trainerId, name: b.trainerName }])
    ).values()
  ).sort((a, b) => (a.name || '').localeCompare(b.name || ''))


  if (loading) {
    return <div>Загрузка...</div>
  }

  return (
    <div className="section-card">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 className="section-title">Список бронирований</h2>
          {filteredBookings.length !== bookings.length && (
            <span style={{ 
              fontSize: '14px', 
              color: 'var(--gray)',
              padding: '4px 12px',
              background: 'var(--background)',
              borderRadius: '4px'
            }}>
              Показано: {filteredBookings.length} из {bookings.length}
            </span>
          )}
        </div>
        <button 
          className="btn btn-secondary btn-icon"
          onClick={() => setShowFilters(!showFilters)}
        >
          <FilterList />
          Фильтры
        </button>
      </div>

      {showFilters && (
        <div 
          className="booking-filters-mobile"
          style={{ 
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
              <option value="expired">Время истекло</option>
              <option value="cancelled">Отменено</option>
              <option value="refunded">Возвращено</option>
              <option value="error">Ошибка оплаты</option>
            </select>
          </div>
          
          <div>
            <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>
              Способ оплаты
            </label>
            <select 
              className="form-select" 
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              <option value="all">Все</option>
              <option value="cash">Наличные</option>
              <option value="card_on_site">Карта на месте</option>
              <option value="transfer">Перевод на счет</option>
              <option value="online">ЮKassa (онлайн)</option>
              <option value="sberbank_card">Перевод Сбербанк</option>
              <option value="tbank_card">Перевод Т-Банк</option>
              <option value="vtb_card">Перевод ВТБ</option>
            </select>
          </div>
          
          <div>
            <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>
              Тренер
            </label>
            <select 
              className="form-select" 
              value={filterTrainer}
              onChange={(e) => setFilterTrainer(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              <option value="all">Все</option>
              <option value="no_trainer">Без тренера</option>
              {uniqueTrainers.map(trainer => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Кнопка сброса фильтров */}
          {(filterStatus !== 'all' || filterPaymentStatus !== 'all' || 
            filterPaymentMethod !== 'all' || filterTrainer !== 'all') && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={() => {
                  setFilterStatus('all')
                  setFilterPaymentStatus('all')
                  setFilterPaymentMethod('all')
                  setFilterTrainer('all')
                }}
                style={{
                  padding: '8px 16px',
                  background: 'var(--error)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>
      )}

      <div className="table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table>
          <thead>
            <tr>
              <th 
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Дата создания
                  <span style={{ color: 'var(--primary)' }}>
                    {sortOrder === 'desc' ? '↓' : '↑'}
                  </span>
                </div>
              </th>
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
                <td colSpan={8} style={{ textAlign: 'center', padding: '48px' }}>
                  Нет бронирований
                </td>
              </tr>
            ) : (
              filteredBookings.map(booking => (
                <tr key={booking.id}>
                  <td>
                    {(() => {
                      // Нормализуем дату создания для отображения
                      let createdDate: Date | null = null
                      
                      if (booking.createdAt instanceof Date) {
                        createdDate = booking.createdAt
                      } else if (booking.createdAt?.toDate) {
                        createdDate = booking.createdAt.toDate()
                      } else if (booking.createdAt?.seconds) {
                        createdDate = new Date(booking.createdAt.seconds * 1000)
                      } else if (typeof booking.createdAt === 'string') {
                        createdDate = new Date(booking.createdAt)
                      }
                      
                      if (createdDate && !isNaN(createdDate.getTime())) {
                        return (
                          <>
                            <div>{formatDate(createdDate)}</div>
                            <div style={{ fontSize: '14px', color: 'var(--gray)' }}>
                              {createdDate.toLocaleTimeString('ru-RU', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                timeZone: getClubTimezone()
                              })}
                            </div>
                          </>
                        )
                      } else {
                        return (
                          <>
                            <div>Неизвестно</div>
                            <div style={{ fontSize: '14px', color: 'var(--gray)' }}>—</div>
                          </>
                        )
                      }
                    })()}
                  </td>
                  <td>
                    <div>{formatDate(booking.date)}</div>
                    <div style={{ fontSize: '14px', color: 'var(--gray)' }}>
                      {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                    </div>
                  </td>
                  <td>
                    <div>{booking.courtName}</div>
                    {booking.trainerName && (
                      <div style={{ fontSize: '14px', color: 'var(--primary)' }}>
                        Тренер: {booking.trainerName}
                      </div>
                    )}
                  </td>
                  <td>
                    <div>{booking.clientName || booking.customerName}</div>
                    <div style={{ fontSize: '14px', color: 'var(--gray)' }}>
                      {booking.clientPhone || booking.customerPhone}
                    </div>
                  </td>
                  <td style={{ fontWeight: '600' }}>{formatAmount(booking.totalAmount || booking.amount)}</td>
                  <td>{getPaymentMethodName(booking.paymentMethod)}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <PaymentStatusManager
                        bookingId={booking.id}
                        currentStatus={booking.paymentStatus || 'awaiting_payment'}
                        paymentMethod={booking.paymentMethod}
                        onStatusUpdate={fetchBookings}
                        onRefund={() => {
                          setRefundBooking(booking)
                          setShowRefundModal(true)
                        }}
                      />
                      {(() => {
                        // Логируем для отладки бронирований с онлайн оплатой
                        if (booking.paymentMethod === 'online' && !booking.createdAt) {
                          console.log('WARNING: Online booking without createdAt:', booking.id)
                        }
                        return booking.createdAt ? (
                          <PaymentTimeLimit
                            createdAt={booking.createdAt}
                            paymentMethod={booking.paymentMethod}
                            paymentStatus={booking.paymentStatus}
                          />
                        ) : null
                      })()}
                    </div>
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
                      {canDeleteBooking(booking) && (
                        <button
                          className="btn btn-danger btn-icon"
                          onClick={() => handleDelete(booking.id, booking)}
                          title="Удалить бронирование (отмененные без оплаты или с ошибкой)"
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
      
      <RefundModal
        isOpen={showRefundModal}
        onClose={() => {
          setShowRefundModal(false)
          setRefundBooking(null)
        }}
        booking={refundBooking}
        onSuccess={() => {
          fetchBookings()
          setShowRefundModal(false)
          setRefundBooking(null)
        }}
        clubTimezone={clubTimezone}
      />
    </div>
  )
}