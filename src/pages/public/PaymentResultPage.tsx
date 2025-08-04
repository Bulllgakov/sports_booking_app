import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import '../../styles/flutter-theme.css'

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    handlePaymentResult()
  }, [searchParams])

  const handlePaymentResult = async () => {
    // Get payment result from URL parameters
    const paymentId = searchParams.get('paymentId')
    const bookingId = searchParams.get('orderId') || searchParams.get('OrderId')
    const status = searchParams.get('status') || searchParams.get('Status')
    
    if (!bookingId) {
      setError('Неверные параметры платежа')
      setLoading(false)
      return
    }

    try {
      // Get booking
      const bookingDoc = await getDoc(doc(db, 'bookings', bookingId))
      
      if (!bookingDoc.exists()) {
        setError('Бронирование не найдено')
        setLoading(false)
        return
      }

      const booking = bookingDoc.data()
      const venueId = booking.venueId

      // Check payment status
      const isSuccess = status === 'success' || status === 'CONFIRMED' || status === 'succeeded'
      
      if (isSuccess) {
        // Платеж успешный - проверяем текущий статус бронирования
        // Webhook уже должен был обновить статус, мы просто проверяем
        const currentBooking = bookingDoc.data()
        
        if (currentBooking.paymentStatus === 'paid' || currentBooking.status === 'confirmed') {
          // Бронирование уже оплачено через webhook - просто перенаправляем
          navigate(`/club/${venueId}/booking-confirmation/${bookingId}`, { replace: true })
        } else {
          // Если webhook еще не обработал, ждем немного и проверяем снова
          setTimeout(async () => {
            const updatedBookingDoc = await getDoc(doc(db, 'bookings', bookingId))
            if (updatedBookingDoc.exists()) {
              const updatedBooking = updatedBookingDoc.data()
              if (updatedBooking.paymentStatus === 'paid' || updatedBooking.status === 'confirmed') {
                navigate(`/club/${venueId}/booking-confirmation/${bookingId}`, { replace: true })
              } else {
                // Если все еще не обновлено, перенаправляем с предупреждением
                navigate(`/club/${venueId}/booking-confirmation/${bookingId}?processing=true`, { replace: true })
              }
            }
          }, 2000) // Ждем 2 секунды для обработки webhook
        }
      } else {
        // Payment failed - НЕ удаляем бронирование сразу, оно будет отменено автоматически
        // Просто перенаправляем на страницу ошибки
        navigate(`/club/${venueId}/payment-error?paymentError=true&bookingId=${bookingId}`, { replace: true })
      }
    } catch (err) {
      console.error('Error processing payment result:', err)
      setError('Ошибка при обработке результата платежа')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: 'var(--background)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--extra-light-gray)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p className="body-small">Обработка платежа...</p>
        </div>
        <style>
          {`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: 'var(--background)',
        padding: 'var(--spacing-xl)'
      }}>
        <div className="flutter-card" style={{ 
          maxWidth: '600px', 
          margin: '0 auto',
          textAlign: 'center',
          padding: 'var(--spacing-2xl)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-md)' }}>❌</div>
          <h2 className="h2" style={{ marginBottom: 'var(--spacing-sm)' }}>Ошибка</h2>
          <p className="body" style={{ color: 'var(--text-secondary)' }}>{error}</p>
          <button
            className="flutter-button"
            style={{ marginTop: 'var(--spacing-lg)' }}
            onClick={() => navigate('/')}
          >
            На главную
          </button>
        </div>
      </div>
    )
  }

  return null
}