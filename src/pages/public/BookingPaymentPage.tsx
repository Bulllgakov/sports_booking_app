import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { format, parse, addMinutes, isAfter, isBefore } from 'date-fns'
import { ru } from 'date-fns/locale'
import { doc, getDoc, addDoc, collection, updateDoc, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db, functions } from '../../services/firebase'
import { httpsCallable } from 'firebase/functions'
import '../../styles/flutter-theme.css'

interface Court {
  id: string
  name: string
  type: string
  venueId: string
}

interface Venue {
  id: string
  name: string
  paymentEnabled?: boolean
  paymentProvider?: string
}

export default function BookingPaymentPage() {
  const { clubId, courtId } = useParams<{ clubId: string; courtId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  // Get booking parameters from URL
  const date = searchParams.get('date') || ''
  const time = searchParams.get('time') || ''
  const duration = parseInt(searchParams.get('duration') || '60')
  const gameType = searchParams.get('gameType') || 'simple'
  const playersCount = parseInt(searchParams.get('playersCount') || '1')
  const price = parseInt(searchParams.get('price') || '0')
  const pricePerPlayer = parseInt(searchParams.get('pricePerPlayer') || '0')
  
  // Get customer data from URL if passed from modal
  const customerName = searchParams.get('customerName') || ''
  const customerPhone = searchParams.get('customerPhone') || ''
  const customerEmail = searchParams.get('customerEmail') || ''
  
  const [court, setCourt] = useState<Court | null>(null)
  const [venue, setVenue] = useState<Venue | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [autoSubmitted, setAutoSubmitted] = useState(false)
  
  // Form fields - initialize with URL params if available
  const [name, setName] = useState(customerName)
  const [phone, setPhone] = useState(customerPhone)
  const [email, setEmail] = useState(customerEmail)
  
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    loadData()
  }, [clubId, courtId])
  
  // Auto-submit if all data is provided from modal
  useEffect(() => {
    if (!loading && court && venue && customerName && customerPhone && !submitting && !autoSubmitted) {
      setAutoSubmitted(true)
      // Small delay to ensure everything is loaded
      setTimeout(() => {
        handleSubmit()
      }, 500)
    }
  }, [loading, court, venue, customerName, customerPhone, submitting, autoSubmitted])

  const loadData = async () => {
    if (!clubId || !courtId) {
      setError('Некорректные параметры')
      setLoading(false)
      return
    }

    try {
      // Load court data from venue subcollection
      const courtDoc = await getDoc(doc(db, 'venues', clubId, 'courts', courtId))
      if (!courtDoc.exists()) {
        setError('Корт не найден')
        setLoading(false)
        return
      }

      const courtData = {
        id: courtDoc.id,
        ...courtDoc.data(),
        venueId: clubId
      } as Court
      setCourt(courtData)

      // Load venue data
      const venueDoc = await getDoc(doc(db, 'venues', clubId))
      if (venueDoc.exists()) {
        const venueData = {
          id: venueDoc.id,
          ...venueDoc.data()
        } as Venue
        setVenue(venueData)
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Ошибка при загрузке данных')
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = parse(dateString, 'yyyy-MM-dd', new Date())
    return format(date, 'd MMMM', { locale: ru })
  }

  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + durationMinutes
    const endHours = Math.floor(totalMinutes / 60)
    const endMinutes = totalMinutes % 60
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
  }

  const formatPhone = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Format as Russian phone number
    if (digits.length <= 1) return digits
    if (digits.length <= 4) return `+7 (${digits.slice(1)})`
    if (digits.length <= 7) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4)}`
    if (digits.length <= 9) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setPhone(formatted)
  }

  const validateForm = () => {
    if (!name.trim()) {
      alert('Пожалуйста, введите ваше имя')
      return false
    }
    
    if (!phone || phone.replace(/\D/g, '').length < 11) {
      alert('Пожалуйста, введите корректный номер телефона')
      return false
    }
    
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      alert('Пожалуйста, введите корректный email')
      return false
    }
    
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm() || !court || !venue) return
    
    setSubmitting(true)
    
    try {
      // ВАЖНО: Проверяем доступность слота перед созданием бронирования
      // Используем Timestamp для запроса (все даты теперь в формате Timestamp)
      const queryDate = new Date(date + 'T00:00:00')
      const startOfDay = new Date(queryDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(queryDate)
      endOfDay.setHours(23, 59, 59, 999)
      
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('courtId', '==', courtId),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
      )
      const bookingsSnapshot = await getDocs(bookingsQuery)
      
      // Фильтруем существующие бронирования по той же логике, что и в календаре
      const existingBookings = bookingsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(booking => {
          const status = booking.status || 'pending'
          const paymentStatus = booking.paymentStatus || 'awaiting_payment'
          
          return (
            status !== 'cancelled' && 
            paymentStatus !== 'cancelled' && 
            paymentStatus !== 'refunded' &&
            paymentStatus !== 'error' &&
            (
              status === 'confirmed' || 
              status === 'pending' ||
              paymentStatus === 'paid' || 
              paymentStatus === 'awaiting_payment'
            )
          )
        })
      
      // Проверяем пересечение времени с существующими бронированиями
      const requestedStart = parse(time, 'HH:mm', new Date())
      const requestedEnd = addMinutes(requestedStart, duration)
      
      for (const booking of existingBookings) {
        const bookingStart = parse(booking.startTime, 'HH:mm', new Date())
        const bookingEnd = parse(booking.endTime, 'HH:mm', new Date())
        
        // Проверяем пересечение временных интервалов
        if (
          (isAfter(requestedStart, bookingStart) && isBefore(requestedStart, bookingEnd)) ||
          (isAfter(requestedEnd, bookingStart) && isBefore(requestedEnd, bookingEnd)) ||
          (isBefore(requestedStart, bookingStart) && isAfter(requestedEnd, bookingEnd)) ||
          (format(requestedStart, 'HH:mm') === booking.startTime)
        ) {
          setSubmitting(false)
          alert('К сожалению, выбранное время уже занято. Пожалуйста, выберите другое время.')
          // Перенаправляем обратно на выбор времени
          navigate(`/club/${clubId}/court/${courtId}/time?date=${date}`)
          return
        }
      }
      
      // Проверка лимитов перед созданием бронирования (только для публичных интерфейсов)
      try {
        const validateBooking = httpsCallable(functions, 'validateBookingRequest')
        await validateBooking({
          phoneNumber: phone,
          venueId: clubId,
          source: 'web' // Указываем что это веб-версия, не админка
        })
      } catch (error: any) {
        setSubmitting(false)
        alert(error.message || 'Не удалось создать бронирование. Попробуйте позже.')
        return
      }
      
      // Create booking
      // Конвертируем строковую дату в Timestamp для единообразия
      const dateObj = new Date(date + 'T00:00:00')
      const dateTimestamp = Timestamp.fromDate(dateObj)
      
      const bookingData = {
        courtId,
        courtName: court.name,
        venueId: clubId,
        venueName: venue.name,
        date: dateTimestamp, // Используем Timestamp вместо строки
        startTime: time,
        endTime: calculateEndTime(time, duration),
        duration,
        gameType,
        playersCount: gameType === 'open' || gameType === 'open_join' ? playersCount : 1,
        totalPrice: price,
        pricePerPlayer: gameType === 'open' || gameType === 'open_join' ? pricePerPlayer : price,
        customerName: name,
        customerPhone: phone,
        customerEmail: email || null,
        status: 'pending',
        paymentStatus: 'awaiting_payment',
        paymentMethod: 'online', // Веб-страница всегда использует онлайн оплату
        paymentHistory: [{
          timestamp: Timestamp.now(),
          action: 'created',
          userId: 'web-booking',
          userName: name || 'Клиент',
          note: 'Бронирование создано через веб-сайт'
        }],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
      
      const bookingRef = await addDoc(collection(db, 'bookings'), bookingData)
      
      // Check if payment is enabled for the venue
      if (venue.paymentEnabled && venue.paymentProvider) {
        try {
          // Initialize payment
          const initBookingPayment = httpsCallable(functions, 'initBookingPayment')
          const paymentResult = await initBookingPayment({
            bookingId: bookingRef.id,
            amount: price,
            description: `Бронирование ${court.name} на ${formatDate(date)} ${time}`,
            returnUrl: `${window.location.origin}/club/${clubId}/booking-confirmation/${bookingRef.id}`,
            userId: '', // Empty for anonymous users
            customerEmail: email || undefined,
            customerPhone: phone
          })
          
          const paymentData = paymentResult.data as any
          console.log('Payment initialization result:', paymentData)
          
          if (paymentData.success && paymentData.paymentUrl) {
            // Update booking with payment info
            console.log('Updating booking with payment info:', {
              bookingId: bookingRef.id,
              paymentId: paymentData.paymentId,
              paymentUrl: paymentData.paymentUrl,
              paymentProvider: venue.paymentProvider
            })
            
            await updateDoc(bookingRef, {
              paymentId: paymentData.paymentId,
              paymentUrl: paymentData.paymentUrl,
              paymentProvider: venue.paymentProvider
            })
            
            console.log('Booking updated successfully, redirecting to payment page')
            // Redirect to payment page
            window.location.href = paymentData.paymentUrl
          } else {
            throw new Error(paymentData.error || 'Ошибка инициализации платежа')
          }
        } catch (paymentError: any) {
          console.error('Payment initialization error:', paymentError)
          
          // If payment fails, still create booking but with error status
          await updateDoc(bookingRef, {
            paymentStatus: 'error',
            paymentError: paymentError.message
          })
          
          alert('Ошибка при создании платежа. Пожалуйста, свяжитесь с администратором клуба.')
          navigate(`/club/${clubId}/booking-confirmation/${bookingRef.id}?paymentError=true`)
        }
      } else {
        // No payment required, confirm booking immediately
        await updateDoc(bookingRef, {
          status: 'confirmed',
          paymentStatus: 'not_required'
        })
        
        navigate(`/club/${clubId}/booking-confirmation/${bookingRef.id}`)
      }
    } catch (err) {
      console.error('Error creating booking:', err)
      alert('Ошибка при создании бронирования. Попробуйте еще раз.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || (customerName && customerPhone && submitting)) {
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
          <p className="body-small">{submitting ? 'Создание бронирования...' : 'Загрузка...'}</p>
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
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'var(--white)',
        padding: 'var(--spacing-md) var(--spacing-xl)',
        boxShadow: 'var(--shadow-sm)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: '40px',
              height: '40px',
              background: 'var(--divider)',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}
          >
            ←
          </button>
          <div>
            <h1 className="h3">Оплата бронирования</h1>
          </div>
        </div>
      </div>

      <div style={{ 
        padding: isMobile ? 'var(--spacing-md)' : 'var(--spacing-xl)',
        paddingBottom: 'calc(100px + var(--spacing-xl))',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Booking details */}
        <div className="flutter-card" style={{ marginBottom: 'var(--spacing-md)' }}>
          <h3 className="body-bold" style={{ marginBottom: 'var(--spacing-md)' }}>
            Детали бронирования
          </h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
            <div>
              <p className="body">{venue?.name}</p>
              <p className="body-small" style={{ color: 'var(--gray)' }}>{court?.name}</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
            <div>
              <p className="body">{formatDate(date)}</p>
              <p className="body-small" style={{ color: 'var(--gray)' }}>
                {time}-{calculateEndTime(time, duration)}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="h3" style={{ color: 'var(--primary)' }}>
                {(gameType === 'open' || gameType === 'open_join') && playersCount > 1
                  ? `${pricePerPlayer} ₽/чел`
                  : `${price} ₽`}
              </p>
              {(gameType === 'open' || gameType === 'open_join') && playersCount > 1 && (
                <p className="caption" style={{ color: 'var(--gray)' }}>
                  Всего: {price} ₽
                </p>
              )}
            </div>
          </div>
          
          {(gameType === 'open' || gameType === 'open_join') && (
            <div style={{
              marginTop: 'var(--spacing-sm)',
              padding: 'var(--spacing-sm)',
              backgroundColor: 'var(--chip-background)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)'
            }}>
              <span style={{ fontSize: '16px' }}>👥</span>
              <span className="caption" style={{ color: 'var(--primary-dark)' }}>
                {gameType === 'open_join' 
                  ? 'Присоединение к открытой игре' 
                  : `Открытая игра • ${playersCount} игрока`}
              </span>
            </div>
          )}
        </div>

        {/* Contact form */}
        <div className="flutter-card" style={{ marginBottom: 'var(--spacing-md)' }}>
          <h3 className="body-bold" style={{ marginBottom: 'var(--spacing-md)' }}>
            Контактные данные
          </h3>
          
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ваше имя"
              style={{
                width: '100%',
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--background)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-body)',
                outline: 'none'
              }}
            />
          </div>
          
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="Номер телефона"
              style={{
                width: '100%',
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--background)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-body)',
                outline: 'none'
              }}
            />
          </div>
          
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (необязательно)"
              style={{
                width: '100%',
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--background)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-body)',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Payment info */}
        <div style={{
          padding: 'var(--spacing-md)',
          backgroundColor: venue?.paymentEnabled ? 'rgba(255, 152, 0, 0.08)' : 'var(--chip-background)',
          borderRadius: 'var(--radius-md)',
          border: venue?.paymentEnabled ? '1px solid rgba(255, 152, 0, 0.3)' : '1px solid var(--primary-light)',
          display: 'flex',
          gap: 'var(--spacing-sm)',
          alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: '20px', color: venue?.paymentEnabled ? '#ff9800' : 'var(--primary)' }}>
            {venue?.paymentEnabled ? '⏱️' : 'ℹ️'}
          </span>
          <div style={{ flex: 1 }}>
            <p className="caption" style={{ 
              color: venue?.paymentEnabled ? '#e65100' : 'var(--primary-dark)',
              fontWeight: venue?.paymentEnabled ? '500' : '400',
              marginBottom: venue?.paymentEnabled ? '8px' : '0'
            }}>
              {venue?.paymentEnabled 
                ? 'Бронирование будет подтверждено только после успешной оплаты. Возврат по бронированию осуществляется не позже 12 часов до игры в мобильном приложении'
                : 'Оплата производится на месте при посещении клуба'}
            </p>
            {venue?.paymentEnabled && (
              <p className="caption" style={{ 
                color: '#e65100',
                fontWeight: '600',
                fontSize: '14px'
              }}>
                ⚠️ На оплату дается 10 минут. После этого бронирование будет автоматически отменено.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="sticky-bottom-bar" style={{
        padding: 'var(--spacing-xl)',
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0'
      }}>
        <button
          className="flutter-button"
          style={{ width: '100%' }}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Создание бронирования...' : venue?.paymentEnabled ? 'Перейти к оплате' : 'Забронировать'}
        </button>
      </div>
    </div>
  )
}