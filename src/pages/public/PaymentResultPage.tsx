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
        // Update booking status
        await updateDoc(doc(db, 'bookings', bookingId), {
          status: 'confirmed',
          paymentStatus: 'paid',
          paymentId: paymentId,
          paidAt: new Date(),
          updatedAt: new Date()
        })
        
        // Redirect to confirmation page
        navigate(`/club/${venueId}/booking-confirmation/${bookingId}`, { replace: true })
      } else {
        // Payment failed - delete the booking
        await deleteDoc(doc(db, 'bookings', bookingId))
        
        // Redirect to payment error page
        navigate(`/club/${venueId}/payment-error?paymentError=true`, { replace: true })
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