import React, { useState } from 'react'
import { Close, Warning } from '@mui/icons-material'
import { doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuth } from '../contexts/AuthContext'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../services/firebase'
import { getPaymentMethodName } from '../utils/paymentMethods'

interface RefundModalProps {
  isOpen: boolean
  onClose: () => void
  booking: {
    id: string
    amount: number
    paymentMethod: string
    paymentId?: string // ID платежа в платежной системе
    venueId: string
    courtName: string
    clientName?: string
    customerName?: string
    date: Date
    startTime: string
    endTime: string
  } | null
  onSuccess: () => void
}


export default function RefundModal({ isOpen, onClose, booking, onSuccess }: RefundModalProps) {
  const { admin } = useAuth()
  const [loading, setLoading] = useState(false)
  const [refundReason, setRefundReason] = useState('')

  if (!isOpen || !booking) return null

  const handleRefund = async () => {
    if (!admin || !booking) return
    
    if (!refundReason.trim()) {
      alert('Пожалуйста, укажите причину возврата')
      return
    }

    // Проверяем, что день бронирования еще не прошел
    const bookingDate = new Date(booking.date)
    const endOfBookingDay = new Date(
      bookingDate.getFullYear(),
      bookingDate.getMonth(),
      bookingDate.getDate(),
      23, 59, 59, 999
    )
    const now = new Date()
    
    if (now > endOfBookingDay) {
      alert(`Возврат невозможен после окончания дня бронирования (${bookingDate.toLocaleDateString('ru-RU')}). Возврат был доступен до конца этого дня.`)
      return
    }

    setLoading(true)
    
    try {
      if (booking.paymentMethod === 'online') {
        // Для онлайн оплаты отправляем запрос на возврат через облачную функцию
        const processRefund = httpsCallable(functions, 'processBookingRefund')
        const result = await processRefund({
          bookingId: booking.id,
          reason: refundReason
        })
        
        const response = result.data as any
        if (response.success) {
          alert('Запрос на возврат отправлен в платежную систему. Статус бронирования будет обновлен автоматически после подтверждения возврата.')
        } else {
          throw new Error(response.error || 'Ошибка при создании возврата')
        }
      } else {
        // Для остальных способов оплаты сразу отменяем бронирование
        const bookingRef = doc(db, 'bookings', booking.id)
        
        await updateDoc(bookingRef, {
          status: 'cancelled',
          paymentStatus: 'refunded',
          refundedAt: Timestamp.now(),
          refundReason: refundReason,
          refundedBy: {
            userId: admin.uid || '',
            userName: admin.displayName || admin.email || 'Администратор'
          },
          paymentHistory: arrayUnion({
            timestamp: Timestamp.now(),
            action: 'refunded',
            userId: admin.uid || '',
            userName: admin.displayName || admin.email || 'Администратор',
            note: `Возврат: ${refundReason}`
          })
        })
        
        alert('Возврат успешно оформлен. Бронирование отменено.')
      }
      
      onSuccess()
      onClose()
      setRefundReason('')
    } catch (error: any) {
      console.error('Error processing refund:', error)
      
      // Проверяем, если это ошибка о существующем возврате
      if (error.code === 'functions/already-exists') {
        alert(error.message || 'Возврат по этому бронированию уже выполнен или обрабатывается')
      } else {
        alert('Ошибка при оформлении возврата: ' + (error.message || 'Неизвестная ошибка'))
      }
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
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

  return (
    <div 
      className="modal active"
      onClick={(e) => {
        // Закрываем при клике на оверлей (фон)
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Оформление возврата</h2>
          <button className="modal-close" onClick={onClose}>
            <Close />
          </button>
        </div>

        <div className="modal-body">
          {/* Проверяем, если сегодня день бронирования - показываем предупреждение */}
          {(() => {
            const bookingDate = new Date(booking.date)
            const today = new Date()
            const isBookingDay = 
              bookingDate.getFullYear() === today.getFullYear() &&
              bookingDate.getMonth() === today.getMonth() &&
              bookingDate.getDate() === today.getDate()
            
            if (isBookingDay) {
              return (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid var(--danger)',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px',
                  display: 'flex',
                  gap: '12px'
                }}>
                  <Warning style={{ color: 'var(--danger)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--danger)' }}>
                      Внимание! Последний день для возврата
                    </div>
                    <div style={{ fontSize: '14px' }}>
                      Сегодня последний день, когда возможен возврат по этому бронированию. 
                      После 23:59 возврат будет недоступен.
                    </div>
                  </div>
                </div>
              )
            }
            return null
          })()}

          {/* Предупреждение о способе возврата */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid var(--warning)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            gap: '12px'
          }}>
            <Warning style={{ color: 'var(--warning)', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                Важно! Способ возврата
              </div>
              <div style={{ fontSize: '14px', color: 'var(--gray)' }}>
                Возврат должен быть осуществлен тем же способом, что и оплата.
                {booking.paymentMethod === 'online' ? (
                  <div style={{ marginTop: '8px', color: 'var(--danger)' }}>
                    Для онлайн оплаты возврат будет произведен автоматически через платежную систему.
                    Бронирование будет отменено только после подтверждения возврата от платежной системы.
                  </div>
                ) : (
                  <div style={{ marginTop: '8px' }}>
                    Способ оплаты: <strong>{getPaymentMethodName(booking.paymentMethod)}</strong>
                    <br />
                    После подтверждения возврата бронирование будет отменено немедленно.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Детали бронирования */}
          <div style={{
            background: 'var(--background)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Детали бронирования</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--gray)' }}>Клиент:</span>
                <span>{booking.clientName || booking.customerName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--gray)' }}>Корт:</span>
                <span>{booking.courtName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--gray)' }}>Дата:</span>
                <span>{formatDate(booking.date)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--gray)' }}>Время:</span>
                <span>{booking.startTime} - {booking.endTime}</span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                paddingTop: '8px',
                borderTop: '1px solid var(--extra-light-gray)',
                fontWeight: '600',
                fontSize: '18px'
              }}>
                <span>Сумма к возврату:</span>
                <span style={{ color: 'var(--danger)' }}>{formatAmount(booking.amount)}</span>
              </div>
            </div>
          </div>

          {/* Причина возврата */}
          <div className="form-group">
            <label className="form-label">Причина возврата *</label>
            <textarea
              className="form-textarea"
              placeholder="Укажите причину возврата..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={3}
              required
            />
          </div>
        </div>

        <div className="modal-footer" style={{ 
          paddingTop: '24px', 
          borderTop: '1px solid var(--extra-light-gray)',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={loading}
          >
            Отмена
          </button>
          <button 
            type="button" 
            className="btn btn-danger" 
            onClick={handleRefund}
            disabled={loading || !refundReason.trim()}
          >
            {loading ? 'Оформление...' : 'Оформить возврат'}
          </button>
        </div>
      </div>
    </div>
  )
}