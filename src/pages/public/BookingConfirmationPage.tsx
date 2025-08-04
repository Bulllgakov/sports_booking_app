import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { format, parse } from 'date-fns'
import { ru } from 'date-fns/locale'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import '../../styles/flutter-theme.css'

interface Booking {
  id: string
  venueId: string
  courtId: string
  date: string
  startTime: string
  endTime: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  status: string
  paymentStatus?: string
  price: number
  totalPrice?: number
}

interface Venue {
  name: string
  address: string
  phone: string
  email: string
}

interface Court {
  name: string
  type: string
}

export default function BookingConfirmationPage() {
  const { clubId, bookingId } = useParams<{ clubId: string; bookingId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const [booking, setBooking] = useState<Booking | null>(null)
  const [venue, setVenue] = useState<Venue | null>(null)
  const [court, setCourt] = useState<Court | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const paymentError = searchParams.get('paymentError') === 'true'
  const isProcessing = searchParams.get('processing') === 'true'

  useEffect(() => {
    loadBookingData()
  }, [bookingId])
  
  // Если платеж еще обрабатывается, периодически проверяем статус
  useEffect(() => {
    if (isProcessing && booking && booking.paymentStatus !== 'paid') {
      const interval = setInterval(async () => {
        try {
          const bookingDoc = await getDoc(doc(db, 'bookings', bookingId!))
          if (bookingDoc.exists()) {
            const updatedBooking = bookingDoc.data()
            if (updatedBooking.paymentStatus === 'paid') {
              // Платеж обработан - перезагружаем данные
              window.location.reload()
            }
          }
        } catch (err) {
          console.error('Error checking payment status:', err)
        }
      }, 3000) // Проверяем каждые 3 секунды
      
      return () => clearInterval(interval)
    }
  }, [isProcessing, booking, bookingId])

  const loadBookingData = async () => {
    if (!bookingId) {
      setError('ID бронирования не указан')
      setLoading(false)
      return
    }

    try {
      const bookingDoc = await getDoc(doc(db, 'bookings', bookingId))
      if (!bookingDoc.exists()) {
        // Если бронирование не найдено, показываем специальное сообщение
        setError('cancelled')
        setLoading(false)
        return
      }

      const bookingData = {
        id: bookingDoc.id,
        ...bookingDoc.data()
      } as Booking

      // Проверяем статус бронирования
      // Если платеж успешный, показываем подтверждение независимо от статуса
      if (bookingData.paymentStatus === 'paid') {
        // Бронирование оплачено - продолжаем загрузку
      } else if (bookingData.status === 'cancelled' || bookingData.paymentStatus === 'cancelled') {
        setError('cancelled')
        setLoading(false)
        return
      }

      setBooking(bookingData)

      const venueDoc = await getDoc(doc(db, 'venues', bookingData.venueId))
      if (venueDoc.exists()) {
        setVenue(venueDoc.data() as Venue)
      }

      // Корты хранятся как подколлекция venues/{venueId}/courts/{courtId}
      const courtDoc = await getDoc(doc(db, 'venues', bookingData.venueId, 'courts', bookingData.courtId))
      if (courtDoc.exists()) {
        setCourt(courtDoc.data() as Court)
      }

      setLoading(false)
    } catch (err: any) {
      console.error('Error loading booking:', err)
      
      // Если ошибка доступа или бронирование не найдено, показываем специальное сообщение
      if (err?.code === 'permission-denied' || err?.code === 'not-found' || 
          err?.message?.includes('Missing or insufficient permissions')) {
        // Для оплаченных бронирований проблема может быть временной
        setError('loading-error')
      } else {
        setError('Ошибка при загрузке данных бронирования')
      }
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
          <p className="body-small">Загрузка...</p>
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
    // Специальная обработка для проблем с загрузкой
    if (error === 'loading-error') {
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
            <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-md)' }}>⏳</div>
            <h2 className="h2" style={{ marginBottom: 'var(--spacing-sm)' }}>
              Обработка платежа
            </h2>
            <p className="body" style={{ 
              color: 'var(--text-secondary)', 
              marginBottom: 'var(--spacing-xl)' 
            }}>
              Ваш платеж обрабатывается. Пожалуйста, подождите несколько секунд и обновите страницу.
            </p>
            
            <button
              className="flutter-button"
              style={{ width: '100%', marginBottom: 'var(--spacing-md)' }}
              onClick={() => window.location.reload()}
            >
              Обновить страницу
            </button>
            
            <button
              className="flutter-button secondary"
              style={{ width: '100%' }}
              onClick={() => navigate('/')}
            >
              На главную
            </button>
          </div>
        </div>
      )
    }

    // Специальная обработка для отмененного бронирования
    if (error === 'cancelled') {
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
            <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-md)' }}>⚠️</div>
            <h2 className="h2" style={{ marginBottom: 'var(--spacing-md)' }}>
              Бронирование не создано
            </h2>
            <p className="body" style={{ 
              color: 'var(--text-secondary)', 
              marginBottom: 'var(--spacing-lg)',
              lineHeight: '1.6'
            }}>
              Вы отменили процесс оплаты, поэтому бронирование не было создано.
            </p>
            <p className="body" style={{ 
              color: 'var(--text-secondary)', 
              marginBottom: 'var(--spacing-xl)',
              lineHeight: '1.6'
            }}>
              Если вы хотите забронировать корт, пожалуйста, начните процесс бронирования заново и завершите оплату.
            </p>
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 'var(--spacing-md)',
              marginTop: 'var(--spacing-xl)'
            }}>
              <button
                className="flutter-button"
                style={{ width: '100%' }}
                onClick={() => navigate(`/club/${clubId}`)}
              >
                Вернуться к клубу
              </button>
              
              <button
                className="flutter-button-outlined"
                style={{ 
                  width: '100%',
                  backgroundColor: 'transparent',
                  color: 'var(--primary)',
                  border: '2px solid var(--primary)'
                }}
                onClick={() => navigate('/')}
              >
                На главную
              </button>
            </div>
            
            {/* Контакты клуба для прямого бронирования */}
            <div style={{
              marginTop: 'var(--spacing-2xl)',
              padding: 'var(--spacing-lg)',
              backgroundColor: 'var(--background)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}>
              <p className="caption" style={{ marginBottom: 'var(--spacing-sm)' }}>
                Или позвоните в клуб для бронирования по телефону
              </p>
              <p className="body-bold" style={{ color: 'var(--primary)' }}>
                📞 Контакты клуба доступны на странице клуба
              </p>
            </div>
          </div>
        </div>
      )
    }

    // Обычная ошибка
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
            style={{ width: '100%', marginTop: 'var(--spacing-xl)' }}
            onClick={() => navigate('/')}
          >
            На главную
          </button>
        </div>
      </div>
    )
  }

  if (!booking || !venue || !court) return null

  const bookingDate = parse(booking.date, 'yyyy-MM-dd', new Date())

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)' }}>
      {/* Success header */}
      <div style={{
        backgroundColor: paymentError ? 'var(--error)' : 'var(--success)',
        padding: 'var(--spacing-3xl) var(--spacing-xl)',
        textAlign: 'center',
        color: 'white'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          backgroundColor: 'white',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--spacing-lg)',
          fontSize: '40px'
        }}>
          {paymentError ? '❌' : '✅'}
        </div>
        <h1 className="h2" style={{ color: 'white', marginBottom: 'var(--spacing-sm)' }}>
          {booking.paymentStatus === 'paid' || booking.status === 'confirmed' 
            ? 'Бронирование подтверждено!' 
            : paymentError 
              ? 'Ошибка оплаты'
              : 'Заявка отправлена!'}
        </h1>
        <p className="body" style={{ color: 'white', opacity: 0.9 }}>
          {booking.paymentStatus === 'paid' || booking.status === 'confirmed' 
            ? 'Ваше бронирование успешно оплачено и подтверждено' 
            : paymentError
              ? 'Произошла ошибка при оплате. Пожалуйста, свяжитесь с администратором'
              : 'Ваша заявка на бронирование успешно отправлена'}
        </p>
      </div>

      <div style={{ padding: 'var(--spacing-xl)' }}>
        {/* What's next */}
        <div className="flutter-card" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h3 className="body-bold" style={{ marginBottom: 'var(--spacing-md)' }}>
            Что дальше?
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'var(--success)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: 'white'
              }}>
                ✓
              </div>
              <div>
                <p className="body-bold" style={{ marginBottom: 'var(--spacing-xxs)' }}>
                  Бронирование подтверждено
                </p>
                <p className="caption">
                  Оплата прошла успешно, ваш корт забронирован
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'var(--primary-light)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: 'var(--primary)'
              }}>
                📱
              </div>
              <div>
                <p className="body-bold" style={{ marginBottom: 'var(--spacing-xxs)' }}>
                  SMS-уведомления
                </p>
                <p className="caption">
                  Получите SMS с подтверждением сейчас и напоминание за 2 часа до игры
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'var(--primary-light)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: 'var(--primary)'
              }}>
                ⚠️
              </div>
              <div>
                <p className="body-bold" style={{ marginBottom: 'var(--spacing-xxs)' }}>
                  Отмена бронирования
                </p>
                <p className="caption">
                  Отменить можно за 24 часа до игры через мобильное приложение или позвонив администратору в рабочее время
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Booking details */}
        <div className="flutter-card" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h3 className="body-bold" style={{ marginBottom: 'var(--spacing-md)' }}>
            Детали бронирования
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div>
              <p className="caption" style={{ marginBottom: 'var(--spacing-xxs)' }}>Клуб</p>
              <p className="body-bold">{venue.name}</p>
              <p className="caption">{venue.address}</p>
            </div>
            
            <div style={{ 
              height: '1px', 
              backgroundColor: 'var(--divider)',
              margin: 'var(--spacing-xs) 0'
            }}></div>
            
            <div>
              <p className="caption" style={{ marginBottom: 'var(--spacing-xxs)' }}>Корт</p>
              <p className="body-bold">{court.name}</p>
            </div>
            
            <div style={{ 
              height: '1px', 
              backgroundColor: 'var(--divider)',
              margin: 'var(--spacing-xs) 0'
            }}></div>
            
            <div style={{ display: 'flex', gap: 'var(--spacing-xl)' }}>
              <div style={{ flex: 1 }}>
                <p className="caption" style={{ marginBottom: 'var(--spacing-xxs)' }}>Дата</p>
                <p className="body-bold">
                  {format(bookingDate, 'd MMMM', { locale: ru })}
                </p>
              </div>
              <div style={{ flex: 1 }}>
                <p className="caption" style={{ marginBottom: 'var(--spacing-xxs)' }}>Время</p>
                <p className="body-bold">
                  {booking.startTime} - {booking.endTime}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="flutter-card" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h3 className="body-bold" style={{ marginBottom: 'var(--spacing-md)' }}>
            Ваши контакты
          </h3>
          <p className="body" style={{ marginBottom: 'var(--spacing-xs)' }}>
            {booking.customerName}
          </p>
          <p className="caption">{booking.customerPhone}</p>
          {booking.customerEmail && (
            <p className="caption">{booking.customerEmail}</p>
          )}
        </div>

        {/* Actions */}
        <button
          className="flutter-button"
          style={{ width: '100%', marginBottom: 'var(--spacing-md)' }}
          onClick={() => navigate(`/club/${clubId}`)}
        >
          Вернуться к клубу
        </button>

        <button
          className="flutter-button-outlined"
          style={{ 
            width: '100%',
            backgroundColor: 'transparent',
            color: 'var(--primary)',
            border: '2px solid var(--primary)'
          }}
          onClick={() => {
            window.location.href = `allcourts://booking/${bookingId}`
          }}
        >
          Открыть в приложении 📱
        </button>

        {/* Contact club */}
        <div style={{
          textAlign: 'center',
          marginTop: 'var(--spacing-3xl)',
          padding: 'var(--spacing-xl)',
          backgroundColor: 'var(--white)',
          borderRadius: 'var(--radius-md)'
        }}>
          <p className="caption" style={{ marginBottom: 'var(--spacing-sm)' }}>
            Есть вопросы? Позвоните в клуб
          </p>
          <a 
            href={`tel:${venue.phone}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
              color: 'var(--primary)',
              textDecoration: 'none',
              fontSize: 'var(--text-body-large)',
              fontWeight: 600
            }}
          >
            📞 {venue.phone}
          </a>
        </div>
      </div>
    </div>
  )
}