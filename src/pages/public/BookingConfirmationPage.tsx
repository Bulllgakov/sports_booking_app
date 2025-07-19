import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  price: number
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
  
  const [booking, setBooking] = useState<Booking | null>(null)
  const [venue, setVenue] = useState<Venue | null>(null)
  const [court, setCourt] = useState<Court | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadBookingData()
  }, [bookingId])

  const loadBookingData = async () => {
    if (!bookingId) {
      setError('ID бронирования не указан')
      setLoading(false)
      return
    }

    try {
      const bookingDoc = await getDoc(doc(db, 'bookings', bookingId))
      if (!bookingDoc.exists()) {
        setError('Бронирование не найдено')
        setLoading(false)
        return
      }

      const bookingData = {
        id: bookingDoc.id,
        ...bookingDoc.data()
      } as Booking

      setBooking(bookingData)

      const venueDoc = await getDoc(doc(db, 'venues', bookingData.venueId))
      if (venueDoc.exists()) {
        setVenue(venueDoc.data() as Venue)
      }

      const courtDoc = await getDoc(doc(db, 'courts', bookingData.courtId))
      if (courtDoc.exists()) {
        setCourt(courtDoc.data() as Court)
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading booking:', err)
      setError('Ошибка при загрузке данных бронирования')
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

  if (!booking || !venue || !court) return null

  const bookingDate = parse(booking.date, 'yyyy-MM-dd', new Date())

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)' }}>
      {/* Success header */}
      <div style={{
        backgroundColor: 'var(--success)',
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
          ✅
        </div>
        <h1 className="h2" style={{ color: 'white', marginBottom: 'var(--spacing-sm)' }}>
          Заявка отправлена!
        </h1>
        <p className="body" style={{ color: 'white', opacity: 0.9 }}>
          Ваша заявка на бронирование успешно отправлена
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
                backgroundColor: 'var(--primary-light)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: 'var(--primary)'
              }}>
                1
              </div>
              <div>
                <p className="body-bold" style={{ marginBottom: 'var(--spacing-xxs)' }}>
                  Ожидайте звонка
                </p>
                <p className="caption">
                  Менеджер клуба свяжется с вами в течение 30 минут
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
                2
              </div>
              <div>
                <p className="body-bold" style={{ marginBottom: 'var(--spacing-xxs)' }}>
                  Подтверждение бронирования
                </p>
                <p className="caption">
                  Вы получите SMS с подтверждением
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
                3
              </div>
              <div>
                <p className="body-bold" style={{ marginBottom: 'var(--spacing-xxs)' }}>
                  Оплата в клубе
                </p>
                <p className="caption">
                  Оплатите бронирование при посещении клуба
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