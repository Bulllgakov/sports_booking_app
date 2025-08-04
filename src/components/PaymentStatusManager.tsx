import React, { useState, useEffect } from 'react'
import { updateDoc, doc, arrayUnion, Timestamp, getDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuth } from '../contexts/AuthContext'
import { CheckCircle, Cancel, AttachMoney, Timer } from '@mui/icons-material'

interface PaymentStatusManagerProps {
  bookingId: string
  currentStatus: 'awaiting_payment' | 'paid' | 'online_payment' | 'cancelled' | 'refunded'
  paymentMethod?: 'cash' | 'card_on_site' | 'transfer' | 'online' | 'sberbank_card' | 'tbank_card'
  onStatusUpdate?: () => void
  onRefund?: () => void
}

const statusLabels = {
  awaiting_payment: 'Ожидает оплаты',
  paid: 'Оплачено',
  online_payment: 'Онлайн оплата',
  cancelled: 'Отменено',
  refunded: 'Возврат'
}

const statusColors = {
  awaiting_payment: '#F59E0B',
  paid: '#10B981',
  online_payment: '#3B82F6',
  cancelled: '#EF4444',
  refunded: '#8B5CF6'
}

const statusIcons = {
  awaiting_payment: Timer,
  paid: CheckCircle,
  online_payment: AttachMoney,
  cancelled: Cancel,
  refunded: Cancel
}

export default function PaymentStatusManager({ 
  bookingId, 
  currentStatus, 
  paymentMethod,
  onStatusUpdate,
  onRefund 
}: PaymentStatusManagerProps) {
  const { admin } = useAuth()
  const [isUpdating, setIsUpdating] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [newStatus, setNewStatus] = useState<'paid' | 'cancelled' | null>(null)
  const [localStatus, setLocalStatus] = useState(currentStatus)

  // Синхронизируем локальный статус с внешним
  useEffect(() => {
    console.log('PaymentStatusManager: currentStatus changed to', currentStatus)
    setLocalStatus(currentStatus)
  }, [currentStatus])

  // Подписываемся на изменения документа в реальном времени
  useEffect(() => {
    if (!bookingId) return

    console.log('PaymentStatusManager: subscribing to booking changes')
    const unsubscribe = onSnapshot(doc(db, 'bookings', bookingId), (doc) => {
      if (doc.exists()) {
        const data = doc.data()
        const newStatus = data.paymentStatus || 'awaiting_payment'
        console.log('PaymentStatusManager: realtime update, status:', newStatus)
        setLocalStatus(newStatus as typeof localStatus)
      }
    })

    return () => unsubscribe()
  }, [bookingId])

  // Запрещаем менять статус для онлайн оплаты (только через вебхук)
  const canChangeStatus = localStatus === 'awaiting_payment' && paymentMethod !== 'online'

  const handleStatusChange = async (status: 'paid' | 'cancelled') => {
    if (!admin) {
      alert('Ошибка: пользователь не авторизован')
      return
    }

    setIsUpdating(true)
    try {
      const bookingRef = doc(db, 'bookings', bookingId)
      
      // Сначала получаем текущий документ
      const bookingDoc = await getDoc(bookingRef)
      
      if (!bookingDoc.exists()) {
        throw new Error('Бронирование не найдено')
      }
      
      const currentData = bookingDoc.data()
      const currentHistory = currentData.paymentHistory || []
      
      // Убеждаемся, что все поля определены
      const historyEntry = {
        timestamp: Timestamp.now(),
        action: status,
        userId: admin.uid || 'unknown',
        userName: admin.displayName || admin.email || 'Администратор'
      }

      // Создаем объект обновления с проверкой всех полей
      const updateData: Record<string, any> = {
        paymentStatus: status
      }

      // Добавляем историю платежей, только если она корректна
      if (Array.isArray(currentHistory)) {
        updateData.paymentHistory = [...currentHistory, historyEntry]
      } else {
        updateData.paymentHistory = [historyEntry]
      }

      // Обновляем статус бронирования если оплата отменена
      if (status === 'cancelled') {
        updateData.status = 'cancelled'
      }

      // Фильтруем undefined значения
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key]
        }
      })

      await updateDoc(bookingRef, updateData)

      // Закрываем диалог сразу
      setShowConfirm(false)
      setNewStatus(null)
      
      // Ждем немного чтобы Firestore точно обновился
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Обновляем локальный статус сразу
      setLocalStatus(status)
      
      if (onStatusUpdate) {
        await onStatusUpdate()
      }
    } catch (error: any) {
      console.error('Error updating payment status:', error)
      
      // Более детальная обработка ошибок
      let errorMessage = 'Ошибка при обновлении статуса оплаты'
      if (error.code === 'permission-denied') {
        errorMessage = 'У вас нет прав для изменения статуса оплаты'
      } else if (error.code === 'not-found') {
        errorMessage = 'Бронирование не найдено'
      } else if (error.message) {
        errorMessage = `Ошибка: ${error.message}`
      }
      
      alert(errorMessage)
    } finally {
      setIsUpdating(false)
    }
  }

  // Защита от undefined статуса
  const safeStatus = localStatus || 'awaiting_payment'
  const StatusIcon = statusIcons[safeStatus] || statusIcons.awaiting_payment
  
  console.log('PaymentStatusManager render:', {
    bookingId,
    currentStatus,
    localStatus,
    safeStatus,
    canChangeStatus
  })

  return (
    <>
      <div style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '8px',
        padding: '6px 12px',
        background: `${statusColors[safeStatus]}1A`,
        color: statusColors[safeStatus],
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: '600'
      }}>
        <StatusIcon style={{ fontSize: '18px' }} />
        <span>{statusLabels[safeStatus]}</span>
        
        {/* Кнопки изменения статуса для неоплаченных */}
        {canChangeStatus && (
          <div style={{ marginLeft: '8px', display: 'flex', gap: '4px' }}>
            <button
              onClick={() => {
                setNewStatus('paid')
                setShowConfirm(true)
              }}
              disabled={isUpdating}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                background: '#10B981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                opacity: isUpdating ? 0.6 : 1
              }}
            >
              Оплачено
            </button>
            <button
              onClick={() => {
                setNewStatus('cancelled')
                setShowConfirm(true)
              }}
              disabled={isUpdating}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                background: '#EF4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                opacity: isUpdating ? 0.6 : 1
              }}
            >
              Отменить
            </button>
          </div>
        )}
        
        {/* Кнопка возврата для оплаченных */}
        {localStatus === 'paid' && onRefund && (
          <button
            onClick={onRefund}
            disabled={isUpdating}
            style={{
              marginLeft: '8px',
              padding: '4px 8px',
              fontSize: '12px',
              background: '#8B5CF6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              opacity: isUpdating ? 0.5 : 1
            }}
            title="Оформить возврат"
          >
            Возврат
          </button>
        )}
      </div>

      {showConfirm && newStatus && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ marginBottom: '16px' }}>Подтверждение</h3>
            <p style={{ marginBottom: '24px' }}>
              Вы уверены, что хотите изменить статус оплаты на "{statusLabels[newStatus]}"?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowConfirm(false)
                  setNewStatus(null)
                }}
                style={{
                  padding: '8px 16px',
                  background: '#E5E7EB',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
              <button
                onClick={() => handleStatusChange(newStatus)}
                disabled={isUpdating}
                style={{
                  padding: '8px 16px',
                  background: newStatus === 'paid' ? '#10B981' : '#EF4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  opacity: isUpdating ? 0.6 : 1
                }}
              >
                {isUpdating ? 'Обновление...' : 'Подтвердить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}