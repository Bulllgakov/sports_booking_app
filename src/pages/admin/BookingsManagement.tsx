import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { PermissionGate } from '../../components/PermissionGate'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  orderBy,
  Timestamp,
  doc,
  updateDoc
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { ChevronLeft, ChevronRight } from '@mui/icons-material'
import { Alert, AlertTitle } from '@mui/material'

interface Booking {
  id: string
  courtId: string
  courtName: string
  clientName: string
  clientPhone: string
  date: Date
  startTime: string
  endTime: string
  status: 'confirmed' | 'pending' | 'cancelled'
  amount: number
  paymentMethod: 'cash' | 'transfer' | 'app'
  venueId: string
  createdAt: Date
}

interface Court {
  id: string
  name: string
  type: string
}

export default function BookingsManagement() {
  const { admin } = useAuth()
  const { isSuperAdmin, canManageBookings, hasPermission } = usePermission()
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    courtId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    duration: 1.5,
    paymentMethod: 'cash' as Booking['paymentMethod'],
  })

  useEffect(() => {
    if (isSuperAdmin) {
      const venueId = localStorage.getItem('selectedVenueId')
      if (venueId) {
        setSelectedVenueId(venueId)
        fetchCourts(venueId)
        fetchBookings(venueId)
      }
    } else if (admin?.venueId) {
      fetchCourts(admin.venueId)
      fetchBookings(admin.venueId)
    }
  }, [admin, selectedDate, isSuperAdmin])

  const fetchCourts = async (venueId: string) => {
    if (!venueId) return

    try {
      const q = query(collection(db, 'courts'), where('venueId', '==', venueId))
      const snapshot = await getDocs(q)
      const courtsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Court[]
      setCourts(courtsData)
    } catch (error) {
      console.error('Error fetching courts:', error)
    }
  }

  const fetchBookings = async (venueId: string) => {
    if (!venueId) return

    try {
      setLoading(true)
      const startOfWeek = new Date(selectedDate)
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1)
      startOfWeek.setHours(0, 0, 0, 0)
      
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      const q = query(
        collection(db, 'bookings'),
        where('venueId', '==', venueId),
        where('date', '>=', Timestamp.fromDate(startOfWeek)),
        where('date', '<=', Timestamp.fromDate(endOfWeek)),
        orderBy('date'),
        orderBy('startTime')
      )
      
      const snapshot = await getDocs(q)
      const bookingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate()
      })) as Booking[]
      
      setBookings(bookingsData)
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' ? parseFloat(value) : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const venueId = isSuperAdmin ? selectedVenueId : admin?.venueId
    if (!venueId) return

    try {
      const court = courts.find(c => c.id === formData.courtId)
      if (!court) return

      const [hours, minutes] = formData.startTime.split(':').map(Number)
      const endHours = hours + Math.floor(formData.duration)
      const endMinutes = minutes + (formData.duration % 1) * 60
      const endTime = `${String(endHours + Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`

      await addDoc(collection(db, 'bookings'), {
        venueId: venueId,
        courtId: formData.courtId,
        courtName: court.name,
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        date: Timestamp.fromDate(new Date(formData.date)),
        startTime: formData.startTime,
        endTime: endTime,
        status: 'confirmed',
        amount: formData.duration * 1900, // Примерная цена
        paymentMethod: formData.paymentMethod,
        createdAt: Timestamp.now()
      })

      setShowBookingForm(false)
      setFormData({
        clientName: '',
        clientPhone: '',
        courtId: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '10:00',
        duration: 1.5,
        paymentMethod: 'cash',
      })
      fetchBookings(venueId)
    } catch (error) {
      console.error('Error creating booking:', error)
    }
  }

  const navigateWeek = (direction: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() + direction * 7)
    setSelectedDate(newDate)
  }

  const getWeekDates = () => {
    const dates = []
    const startOfWeek = new Date(selectedDate)
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1)
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const getBookingsForSlot = (date: Date, time: string, courtId: string) => {
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.date)
      return bookingDate.toDateString() === date.toDateString() &&
             booking.startTime === time &&
             booking.courtId === courtId
    })
  }

  const timeSlots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00']
  const weekDates = getWeekDates()
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

  if (loading) {
    return <div>Загрузка...</div>
  }

  if (!hasPermission(['manage_bookings', 'manage_all_bookings', 'view_bookings'])) {
    return (
      <Alert severity="error">
        <AlertTitle>Доступ запрещен</AlertTitle>
        У вас недостаточно прав для просмотра бронирований.
      </Alert>
    )
  }

  if (isSuperAdmin && !selectedVenueId) {
    return (
      <Alert severity="info">
        <AlertTitle>Выберите клуб</AlertTitle>
        Перейдите в раздел "Все клубы" и выберите клуб для управления бронированиями.
      </Alert>
    )
  }

  const canCreateBooking = hasPermission(['manage_bookings', 'manage_all_bookings', 'create_bookings'])

  return (
    <PermissionGate permission={['manage_bookings', 'manage_all_bookings', 'view_bookings']}>
    <div>
      <div className="section-card">
        <div className="calendar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 className="section-title">Календарь бронирований</h2>
          <div className="calendar-nav" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => navigateWeek(-1)}
              style={{ 
                width: '32px', 
                height: '32px', 
                border: '1px solid var(--extra-light-gray)',
                background: 'var(--white)',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ChevronLeft />
            </button>
            <span style={{ fontWeight: '600' }}>
              {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
            </span>
            <button 
              onClick={() => navigateWeek(1)}
              style={{ 
                width: '32px', 
                height: '32px', 
                border: '1px solid var(--extra-light-gray)',
                background: 'var(--white)',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ChevronRight />
            </button>
          </div>
        </div>
        
        <div className="calendar-grid" style={{
          display: 'grid',
          gridTemplateColumns: '60px repeat(7, 1fr)',
          gap: '1px',
          background: 'var(--extra-light-gray)',
          border: '1px solid var(--extra-light-gray)',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{ background: 'var(--white)', padding: '12px' }}></div>
          {weekDates.map((date, index) => (
            <div key={index} className="day-header" style={{ 
              fontWeight: '600', 
              textAlign: 'center',
              background: 'var(--background)',
              padding: '12px'
            }}>
              {dayNames[index]} {date.getDate()}
            </div>
          ))}
          
          {timeSlots.map(time => (
            <React.Fragment key={time}>
              <div className="time-slot" style={{ 
                fontSize: '12px',
                color: 'var(--gray)',
                textAlign: 'center',
                padding: '8px',
                background: 'var(--white)'
              }}>
                {time}
              </div>
              {weekDates.map((date, dateIndex) => {
                const bookingsInSlot = courts.flatMap(court => 
                  getBookingsForSlot(date, time, court.id)
                )
                
                return (
                  <div 
                    key={`${time}-${dateIndex}`} 
                    className="booking-slot"
                    style={{
                      position: 'relative',
                      cursor: 'pointer',
                      minHeight: '60px',
                      background: bookingsInSlot.length > 0 ? 'rgba(0, 168, 107, 0.1)' : 'var(--white)',
                      padding: '8px',
                      overflow: 'hidden'
                    }}
                  >
                    {bookingsInSlot.map((booking, idx) => (
                      <div key={idx} style={{ 
                        fontSize: '11px',
                        marginBottom: '4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        <div style={{ fontWeight: '600', color: 'var(--dark)' }}>
                          {booking.courtName}
                        </div>
                        <div style={{ color: 'var(--gray)' }}>
                          {booking.clientName}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      <div className="section-card">
        <div className="section-header">
          <h2 className="section-title">Создать бронирование</h2>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="form-group">
              <label className="form-label">Имя клиента</label>
              <input 
                type="text" 
                className="form-input" 
                name="clientName"
                value={formData.clientName}
                onChange={handleInputChange}
                placeholder="Введите имя"
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Телефон</label>
              <input 
                type="tel" 
                className="form-input" 
                name="clientPhone"
                value={formData.clientPhone}
                onChange={handleInputChange}
                placeholder="+7 (___) ___-__-__"
                required
              />
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
            <div className="form-group">
              <label className="form-label">Корт</label>
              <select 
                className="form-select"
                name="courtId"
                value={formData.courtId}
                onChange={handleInputChange}
                required
              >
                <option value="">Выберите корт</option>
                {courts.map(court => (
                  <option key={court.id} value={court.id}>{court.name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Дата</label>
              <input 
                type="date" 
                className="form-input"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Время начала</label>
              <select 
                className="form-select"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
              >
                {timeSlots.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="form-group">
              <label className="form-label">Длительность (часов)</label>
              <select 
                className="form-select"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
              >
                <option value="1">1 час</option>
                <option value="1.5">1.5 часа</option>
                <option value="2">2 часа</option>
                <option value="2.5">2.5 часа</option>
                <option value="3">3 часа</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Способ оплаты</label>
              <select 
                className="form-select"
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleInputChange}
              >
                <option value="cash">Оплата в клубе наличными</option>
                <option value="transfer">Перевод на счет клуба</option>
                <option value="app">Оплачено через приложение</option>
              </select>
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary">Создать бронирование</button>
        </form>
      </div>
    </div>
    </PermissionGate>
  )
}