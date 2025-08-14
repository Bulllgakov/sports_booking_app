import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { format, parse } from 'date-fns'
import { ru } from 'date-fns/locale'
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore'
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
  paymentUrl?: string
  paymentMethod?: string
  price: number
  totalPrice?: number
  createdAt?: any
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
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  
  const paymentError = searchParams.get('paymentError') === 'true'
  const isProcessing = searchParams.get('processing') === 'true'

  useEffect(() => {
    console.log('BookingConfirmationPage loaded with params:', {
      bookingId,
      clubId,
      searchParams: Array.from(searchParams.entries())
    })
    loadBookingData()
  }, [bookingId])
  
  // Таймер для неоплаченных бронирований
  useEffect(() => {
    if (booking && booking.paymentStatus === 'awaiting_payment' && booking.createdAt) {
      const calculateTimeLeft = () => {
        const createdAt = booking.createdAt.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt)
        const now = new Date()
        const elapsed = Math.floor((now.getTime() - createdAt.getTime()) / 1000)
        const remaining = Math.max(0, 15 * 60 - elapsed) // 15 минут = 900 секунд
        
        if (remaining === 0) {
          // Время истекло - перезагружаем страницу
          window.location.reload()
        }
        
        return remaining
      }
      
      // Первый расчет
      setTimeLeft(calculateTimeLeft())
      
      // Обновляем каждую секунду
      const timer = setInterval(() => {
        setTimeLeft(calculateTimeLeft())
      }, 1000)
      
      return () => clearInterval(timer)
    }
  }, [booking])
  
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

      // Логирование для отладки
      console.log('Booking data loaded:', {
        id: bookingData.id,
        paymentStatus: bookingData.paymentStatus,
        paymentUrl: bookingData.paymentUrl,
        paymentMethod: bookingData.paymentMethod,
        status: bookingData.status
      })

      // Проверяем статус бронирования
      // Если платеж успешный, показываем подтверждение независимо от статуса
      if (bookingData.paymentStatus === 'paid') {
        // Бронирование оплачено - продолжаем загрузку
      } else if (bookingData.status === 'cancelled' || bookingData.paymentStatus === 'cancelled' || bookingData.paymentStatus === 'expired') {
        // Бронирование отменено (неважно по какой причине - истекло время или отменено вручную)
        setError('cancelled')
        setLoading(false)
        return
      } else if (!bookingData.paymentStatus && bookingData.status === 'pending') {
        // Старое бронирование без paymentStatus - считаем его неоплаченным
        bookingData.paymentStatus = 'awaiting_payment'
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
      
      // Если ошибка доступа или бронирование не найдено
      if (err?.code === 'permission-denied' || err?.code === 'not-found' || 
          err?.message?.includes('Missing or insufficient permissions')) {
        // Бронирование не найдено или нет прав доступа
        setError('not-found')
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

  // Специальная обработка для processing параметра (платеж обрабатывается)
  if (isProcessing && !booking) {
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
            Ваш платеж обрабатывается. Пожалуйста, подождите несколько секунд...
          </p>
          
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--extra-light-gray)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
        </div>
      </div>
    )
  }

  if (error) {
    // Специальная обработка для не найденного бронирования
    if (error === 'not-found') {
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
            <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-md)' }}>🔍</div>
            <h2 className="h2" style={{ marginBottom: 'var(--spacing-md)' }}>
              Бронирование не найдено
            </h2>
            <p className="body" style={{ 
              color: 'var(--text-secondary)', 
              marginBottom: 'var(--spacing-xl)',
              lineHeight: '1.6'
            }}>
              Бронирование с таким ID не существует или было удалено.
            </p>
            
            <button
              className="flutter-button"
              style={{ width: '100%' }}
              onClick={() => navigate('/')}
            >
              На главную
            </button>
          </div>
        </div>
      )
    }

    // Специальная обработка для отмененного бронирования (включая истекшее время оплаты)
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
            <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-md)' }}>❌</div>
            <h2 className="h2" style={{ marginBottom: 'var(--spacing-md)' }}>
              Бронирование отменено
            </h2>
            <p className="body" style={{ 
              color: 'var(--text-secondary)', 
              marginBottom: 'var(--spacing-lg)',
              lineHeight: '1.6'
            }}>
              Данное бронирование было отменено. Возможные причины:
            </p>
            <ul style={{
              textAlign: 'left',
              marginBottom: 'var(--spacing-xl)',
              paddingLeft: 'var(--spacing-xl)',
              color: 'var(--text-secondary)',
              lineHeight: '1.8'
            }}>
              <li>Истекло время оплаты (15 минут)</li>
              <li>Бронирование было отменено администратором</li>
              <li>Вы отменили бронирование в приложении</li>
            </ul>
            
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

  // Дата всегда должна быть Timestamp
  const bookingDate = booking.date.toDate ? booking.date.toDate() : new Date(booking.date)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)' }}>
      {/* Success header */}
      <div style={{
        backgroundColor: booking.paymentStatus === 'awaiting_payment' 
          ? 'var(--warning)' 
          : paymentError 
            ? 'var(--error)' 
            : 'var(--success)',
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
          {booking.paymentStatus === 'awaiting_payment' 
            ? '⏰' 
            : paymentError 
              ? '❌' 
              : '✅'}
        </div>
        <h1 className="h2" style={{ color: 'white', marginBottom: 'var(--spacing-sm)' }}>
          {booking.paymentStatus === 'paid' || booking.status === 'confirmed' 
            ? 'Бронирование подтверждено!' 
            : booking.paymentStatus === 'awaiting_payment'
              ? 'Требуется оплата!'
              : paymentError 
                ? 'Ошибка оплаты'
                : 'Заявка отправлена!'}
        </h1>
        <p className="body" style={{ color: 'white', opacity: 0.9 }}>
          {booking.paymentStatus === 'paid' || booking.status === 'confirmed' 
            ? 'Ваше бронирование успешно оплачено и подтверждено' 
            : booking.paymentStatus === 'awaiting_payment'
              ? 'Бронирование будет автоматически отменено, если не будет оплачено в течение 15 минут'
              : paymentError
                ? 'Произошла ошибка при оплате. Пожалуйста, свяжитесь с администратором'
                : 'Ваша заявка на бронирование успешно отправлена'}
        </p>
        
        {/* Таймер прямо в хедере для неоплаченных */}
        {booking.paymentStatus === 'awaiting_payment' && timeLeft !== null && (
          <div style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: 'white',
            marginTop: 'var(--spacing-lg)',
            padding: 'var(--spacing-md)',
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: 'var(--radius-md)',
            display: 'inline-block'
          }}>
            ⏳ Осталось: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </div>
        )}
      </div>

      <div style={{ padding: 'var(--spacing-xl)' }}>
        {/* Кнопка оплаты для неоплаченных бронирований */}
        {console.log('Button display check:', {
          paymentStatus: booking.paymentStatus,
          hasPaymentUrl: !!booking.paymentUrl,
          paymentUrl: booking.paymentUrl,
          shouldShowButton: booking.paymentStatus === 'awaiting_payment' && booking.paymentUrl
        })}
        {booking.paymentStatus === 'awaiting_payment' && booking.paymentUrl && (
          <div className="flutter-card" style={{ 
            marginBottom: 'var(--spacing-xl)',
            backgroundColor: '#FFF3CD',
            border: '3px solid var(--warning)',
            boxShadow: '0 4px 20px rgba(255, 193, 7, 0.3)'
          }}>
            <h3 className="h3" style={{ 
              marginBottom: 'var(--spacing-md)',
              color: '#856404',
              fontSize: '20px',
              textAlign: 'center'
            }}>
              ⚠️ Завершите оплату, чтобы подтвердить бронирование
            </h3>
            
            <p className="body" style={{ 
              marginBottom: 'var(--spacing-lg)',
              color: '#856404',
              textAlign: 'center',
              fontSize: '16px'
            }}>
              Без оплаты бронирование будет автоматически отменено
            </p>
            
            <button
              className="flutter-button"
              style={{ 
                width: '100%',
                backgroundColor: 'var(--success)',
                fontSize: '18px',
                padding: 'var(--spacing-lg) var(--spacing-xl)',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                animation: 'pulse 2s infinite'
              }}
              onClick={() => {
                if (booking.paymentUrl) {
                  window.location.href = booking.paymentUrl
                }
              }}
            >
              💳 Оплатить сейчас
            </button>
            
            {/* Кнопка отмены бронирования */}
            <button
              className="flutter-button-outlined"
              style={{ 
                width: '100%',
                marginTop: 'var(--spacing-md)',
                backgroundColor: 'transparent',
                color: '#856404',
                border: '2px solid #856404',
                fontSize: '16px',
                padding: 'var(--spacing-md) var(--spacing-lg)'
              }}
              onClick={async () => {
                if (window.confirm('Вы уверены, что хотите отменить бронирование? Это действие нельзя отменить.')) {
                  try {
                    // Отменяем бронирование
                    await updateDoc(doc(db, 'bookings', bookingId), {
                      status: 'cancelled',
                      paymentStatus: 'cancelled',
                      cancelledAt: Timestamp.now(),
                      cancelledBy: 'customer',
                      cancelReason: 'Отменено клиентом на странице ожидания оплаты'
                    })
                    
                    alert('Бронирование успешно отменено')
                    // Перезагружаем страницу для обновления статуса
                    window.location.reload()
                  } catch (error) {
                    console.error('Error cancelling booking:', error)
                    alert('Ошибка при отмене бронирования. Попробуйте еще раз.')
                  }
                }
              }}
            >
              Отменить бронирование
            </button>
            
            <style>
              {`
                @keyframes pulse {
                  0% { transform: scale(1); }
                  50% { transform: scale(1.02); }
                  100% { transform: scale(1); }
                }
              `}
            </style>
          </div>
        )}
        
        {/* What's next - скрываем для страницы ожидания оплаты */}
        {booking.paymentStatus !== 'awaiting_payment' && (
          <div className="flutter-card" style={{ marginBottom: 'var(--spacing-xl)' }}>
            <h3 className="body-bold" style={{ marginBottom: 'var(--spacing-md)' }}>
              Что дальше?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
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
              
              <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#25D366',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: 'white',
                  fontSize: '18px'
                }}>
                  💬
                </div>
                <div>
                  <p className="body-bold" style={{ marginBottom: 'var(--spacing-xxs)' }}>
                    Нужен тренер?
                  </p>
                  {venue && venue.phone && (
                    <>
                      <p className="caption" style={{ marginBottom: 'var(--spacing-sm)' }}>
                        Напишите на WhatsApp
                      </p>
                      <a 
                        href={`https://wa.me/${venue.phone.replace(/[^0-9]/g, '').replace(/^8/, '7')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 16px',
                          backgroundColor: '#25D366',
                          color: 'white',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          fontSize: '14px',
                          fontWeight: '600',
                          transition: 'transform 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                        <span>WhatsApp</span>
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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