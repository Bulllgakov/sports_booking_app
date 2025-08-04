import React, { useState, useEffect } from 'react'
import { Close } from '@mui/icons-material'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase'
import PaymentStatusManager from './PaymentStatusManager'
import PaymentHistory from './PaymentHistory'
import RefundModal from './RefundModal'

interface PaymentHistory {
  timestamp: any
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
  paymentMethod: 'cash' | 'card_on_site' | 'transfer' | 'online' | 'sberbank_card' | 'tbank_card'
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
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(booking)
  const [showRefundModal, setShowRefundModal] = useState(false)

  useEffect(() => {
    if (booking && isOpen) {
      // При открытии модалки всегда загружаем свежие данные
      loadFreshBooking(booking.id)
      
      // Подписываемся на изменения документа
      const unsubscribe = onSnapshot(doc(db, 'bookings', booking.id), (doc) => {
        if (doc.exists()) {
          const data = doc.data()
          const updatedBooking = {
            id: doc.id,
            ...data,
            date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
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
        const freshBooking = {
          id: bookingDoc.id,
          ...data,
          date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
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

  const paymentMethodLabels = {
    cash: 'Наличные',
    card_on_site: 'Карта на месте',  
    transfer: 'Перевод на р.счет клуба (юр.лицо)',
    online: 'Онлайн',
    sberbank_card: 'На карту Сбербанка',
    tbank_card: 'На карту Т-Банка'
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
                    {paymentMethodLabels[currentBooking.paymentMethod]}
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