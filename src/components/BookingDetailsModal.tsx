import React, { useState, useEffect } from 'react'
import { Close } from '@mui/icons-material'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase'
import PaymentStatusManager from './PaymentStatusManager'
import PaymentHistory from './PaymentHistory'
import RefundModal from './RefundModal'
import PaymentTimeLimit from './PaymentTimeLimit'
import { normalizeDate, calculateEndTime, formatDuration } from '../utils/dateTime'
import { normalizeDateInClubTZ } from '../utils/clubDateTime'
import type { BookingData, firestoreToBooking } from '../types/bookingTypes'
import { getPaymentMethodName } from '../utils/paymentMethods'
import { useAuth } from '../contexts/AuthContext'

interface PaymentHistory {
  timestamp: any
  action: 'created' | 'paid' | 'cancelled'
  userId: string
  userName?: string
  note?: string
}

// Используем стандартизованный тип из bookingTypes, расширяя его необходимыми полями
interface Booking extends Omit<BookingData, 'paymentHistory'> {
  clientName: string  // Для обратной совместимости
  clientPhone: string // Для обратной совместимости
  time?: string       // Для обратной совместимости
  endTime: string     // Вычисляется из startTime + duration
  paymentHistory?: PaymentHistory[]
  paymentSmsInfo?: {
    sentAt: any
    sentTo: string
    paymentUrl: string
  }
}

interface BookingDetailsModalProps {
  booking: Booking | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export default function BookingDetailsModal({ 
  booking, 
  isOpen, 
  onClose,
  onUpdate 
}: BookingDetailsModalProps) {
  const { club } = useAuth()
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(booking)
  const [showRefundModal, setShowRefundModal] = useState(false)
  
  // Получаем часовой пояс клуба
  const clubTimezone = club?.timezone || 'Europe/Moscow'

  useEffect(() => {
    if (booking && isOpen) {
      // При открытии модалки всегда загружаем свежие данные
      loadFreshBooking(booking.id)
      
      // Подписываемся на изменения документа
      const unsubscribe = onSnapshot(doc(db, 'bookings', booking.id), (doc) => {
        if (doc.exists()) {
          const data = doc.data()
          // Используем утилиту для безопасного преобразования даты с учетом часового пояса клуба
          const bookingDate = normalizeDateInClubTZ(data.date, clubTimezone)
          const createdAt = normalizeDateInClubTZ(data.createdAt, clubTimezone)
          
          // Вычисляем endTime из startTime и duration
          const endTime = data.duration ? 
            calculateEndTime(data.startTime || data.time || '00:00', data.duration) : 
            data.endTime || ''
          
          const updatedBooking = {
            id: doc.id,
            ...data,
            date: bookingDate,
            createdAt: createdAt,
            startTime: data.startTime || data.time || '00:00',
            endTime: endTime,
            // Для обратной совместимости
            clientName: data.customerName || data.clientName,
            clientPhone: data.customerPhone || data.clientPhone,
            customerName: data.customerName || data.clientName,
            customerPhone: data.customerPhone || data.clientPhone,
            paymentStatus: data.paymentStatus || 'awaiting_payment',
            paymentHistory: data.paymentHistory || []
          } as Booking
          
          setCurrentBooking(updatedBooking)
        }
      })
      
      return () => unsubscribe()
    }
  }, [booking?.id, isOpen])

  const loadFreshBooking = async (bookingId: string) => {
    console.log('Loading fresh booking data:', bookingId)
    try {
      const bookingDoc = await getDoc(doc(db, 'bookings', bookingId))
      if (bookingDoc.exists()) {
        const data = bookingDoc.data()
        // Используем утилиту для безопасного преобразования даты с учетом часового пояса клуба
        const bookingDate = normalizeDateInClubTZ(data.date, clubTimezone)
        const createdAt = normalizeDateInClubTZ(data.createdAt, clubTimezone)
        
        // Вычисляем endTime из startTime и duration
        const endTime = data.duration ? 
          calculateEndTime(data.startTime || data.time || '00:00', data.duration) : 
          data.endTime || ''
        
        const freshBooking = {
          id: bookingDoc.id,
          ...data,
          date: bookingDate,
          createdAt: createdAt,
          startTime: data.startTime || data.time || '00:00',
          endTime: endTime,
          // Для обратной совместимости
          clientName: data.customerName || data.clientName,
          clientPhone: data.customerPhone || data.clientPhone,
          customerName: data.customerName || data.clientName,
          customerPhone: data.customerPhone || data.clientPhone,
          paymentStatus: data.paymentStatus || 'awaiting_payment',
          paymentHistory: data.paymentHistory || []
        } as Booking
        
        console.log('Fresh booking loaded with payment status:', freshBooking.paymentStatus)
        setCurrentBooking(freshBooking)
      }
    } catch (error) {
      console.error('Error loading fresh booking:', error)
    }
  }


  if (!isOpen || !currentBooking) return null

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date)
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(amount)
  }


  const statusLabels = {
    confirmed: 'Подтверждено',
    pending: 'Ожидает',
    cancelled: 'Отменено'
  }

  const statusColors = {
    confirmed: '#10B981',
    pending: '#F59E0B',
    cancelled: '#EF4444'
  }

  return (
    <>
    <div 
      className="modal active"
      onClick={(e) => {
        // Закрываем при клике на оверлей (фон)
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="modal-content" style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Детали бронирования</h2>
          <button className="modal-close" onClick={onClose}>
            <Close />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'grid', gap: '24px' }}>
            {/* Основная информация */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                Информация о бронировании
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray)' }}>Корт:</span>
                  <span style={{ fontWeight: '600' }}>{currentBooking.courtName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray)' }}>Дата:</span>
                  <span style={{ fontWeight: '600' }}>{formatDate(currentBooking.date)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray)' }}>Время:</span>
                  <span style={{ fontWeight: '600' }}>
                    {currentBooking.startTime} - {currentBooking.endTime}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray)' }}>Статус:</span>
                  <span style={{ 
                    fontWeight: '600',
                    color: statusColors[currentBooking.status]
                  }}>
                    {statusLabels[currentBooking.status]}
                  </span>
                </div>
              </div>
            </div>

            {/* Информация о клиенте */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                Информация о клиенте
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray)' }}>Имя:</span>
                  <span style={{ fontWeight: '600' }}>
                    {currentBooking.clientName || currentBooking.customerName}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray)' }}>Телефон:</span>
                  <span style={{ fontWeight: '600' }}>
                    {currentBooking.clientPhone || currentBooking.customerPhone}
                  </span>
                </div>
              </div>
            </div>

            {/* Информация о создании бронирования */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                Информация о создании
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray)' }}>Создано:</span>
                  <span style={{ fontWeight: '600' }}>
                    {currentBooking.createdBy?.userName || 'Система'}
                  </span>
                </div>
                {currentBooking.createdBy?.userRole && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--gray)' }}>Роль:</span>
                    <span style={{ fontWeight: '600' }}>
                      {currentBooking.createdBy.userRole === 'superadmin' ? 'Суперадминистратор' : 'Администратор'}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray)' }}>Дата создания:</span>
                  <span style={{ fontWeight: '600' }}>
                    {new Intl.DateTimeFormat('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }).format(currentBooking.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Информация об оплате */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                Информация об оплате
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray)' }}>Сумма:</span>
                  <span style={{ fontWeight: '600', fontSize: '18px' }}>
                    {formatAmount(currentBooking.amount)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray)' }}>Способ оплаты:</span>
                  <span style={{ fontWeight: '600' }}>
                    {getPaymentMethodName(currentBooking.paymentMethod)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--gray)' }}>Статус оплаты:</span>
                  <PaymentStatusManager
                    key={`${currentBooking.id}-${currentBooking.paymentStatus}`}
                    bookingId={currentBooking.id}
                    currentStatus={currentBooking.paymentStatus || 'awaiting_payment'}
                    paymentMethod={currentBooking.paymentMethod}
                    onStatusUpdate={async () => {
                      // Обновляем только список в родительском компоненте
                      if (onUpdate) {
                        await onUpdate()
                      }
                    }}
                    onRefund={() => {
                      setShowRefundModal(true)
                    }}
                  />
                </div>
                {/* Таймер до автоматической отмены */}
                {currentBooking.paymentStatus === 'awaiting_payment' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--gray)' }}>До отмены:</span>
                    <PaymentTimeLimit
                      createdAt={currentBooking.createdAt}
                      paymentMethod={currentBooking.paymentMethod}
                      paymentStatus={currentBooking.paymentStatus}
                    />
                  </div>
                )}
                {/* Ссылка на оплату */}
                {currentBooking.paymentMethod === 'online' && 
                 currentBooking.paymentStatus === 'awaiting_payment' && 
                 (currentBooking.paymentUrl || currentBooking.paymentSmsInfo?.paymentUrl) && (
                  <div style={{ 
                    marginTop: '12px',
                    padding: '12px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(245, 158, 11, 0.3)'
                  }}>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      color: 'var(--warning)',
                      marginBottom: '8px'
                    }}>
                      Ссылка на оплату
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: 'var(--gray)',
                      marginBottom: '8px'
                    }}>
                      {currentBooking.paymentSmsInfo ? 
                        `SMS отправлено на ${currentBooking.paymentSmsInfo.sentTo}` : 
                        'Клиент может оплатить по этой ссылке'}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      background: 'white',
                      borderRadius: '6px',
                      border: '1px solid var(--extra-light-gray)'
                    }}>
                      <input
                        type="text"
                        value={currentBooking.paymentUrl || currentBooking.paymentSmsInfo?.paymentUrl || ''}
                        readOnly
                        style={{
                          flex: 1,
                          border: 'none',
                          outline: 'none',
                          fontSize: '12px',
                          background: 'transparent'
                        }}
                      />
                      <button
                        onClick={() => {
                          const url = currentBooking.paymentUrl || currentBooking.paymentSmsInfo?.paymentUrl || ''
                          navigator.clipboard.writeText(url)
                          alert('Ссылка скопирована!')
                        }}
                        style={{
                          padding: '4px 12px',
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Копировать
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* История платежей */}
            {currentBooking.paymentHistory && currentBooking.paymentHistory.length > 0 && (
              <PaymentHistory history={currentBooking.paymentHistory} />
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
    
    {/* Модальное окно возврата */}
    <RefundModal
      isOpen={showRefundModal}
      onClose={() => {
        setShowRefundModal(false)
      }}
      booking={currentBooking}
      onSuccess={() => {
        setShowRefundModal(false)
        if (onUpdate) {
          onUpdate()
        }
      }}
    />
  </>
  )
}