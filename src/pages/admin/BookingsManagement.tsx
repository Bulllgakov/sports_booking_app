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
  customerName?: string // Для совместимости
  customerPhone?: string // Для совместимости
  date: Date
  time?: string // Для совместимости со старыми записями
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
  pricePerHour: number
}

interface Venue {
  id: string
  name: string
}

export default function BookingsManagement() {
  const { admin } = useAuth()
  const { isSuperAdmin, canManageBookings, hasPermission } = usePermission()
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
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
      // Загружаем список клубов для суперадмина
      fetchVenues()
      const venueId = localStorage.getItem('selectedVenueId')
      if (venueId) {
        setSelectedVenueId(venueId)
        fetchCourts(venueId)
        fetchBookings(venueId)
      } else {
        setLoading(false)
      }
    } else if (admin?.venueId) {
      fetchCourts(admin.venueId)
      fetchBookings(admin.venueId)
    } else {
      setLoading(false)
    }
  }, [admin, selectedDate, isSuperAdmin])

  const fetchVenues = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'venues'))
      const venuesData = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      })) as Venue[]
      setVenues(venuesData)
    } catch (error) {
      console.error('Error fetching venues:', error)
    }
  }

  const handleVenueChange = (venueId: string) => {
    setSelectedVenueId(venueId)
    localStorage.setItem('selectedVenueId', venueId)
    fetchCourts(venueId)
    fetchBookings(venueId)
  }

  const fetchCourts = async (venueId: string) => {
    if (!venueId) return

    try {
      // Корты хранятся как подколлекция внутри документа venue
      const courtsRef = collection(db, 'venues', venueId, 'courts')
      const snapshot = await getDocs(courtsRef)
      
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

      // Пробуем сначала с составным индексом
      let snapshot
      try {
        const q = query(
          collection(db, 'bookings'),
          where('venueId', '==', venueId),
          where('date', '>=', Timestamp.fromDate(startOfWeek)),
          where('date', '<=', Timestamp.fromDate(endOfWeek)),
          orderBy('date'),
          orderBy('startTime')
        )
        snapshot = await getDocs(q)
      } catch (indexError) {
        // Если составной индекс не существует, используем простой запрос по venueId
        try {
          const q = query(
            collection(db, 'bookings'),
            where('venueId', '==', venueId),
            orderBy('date')
          )
          snapshot = await getDocs(q)
        } catch (venueIndexError) {
          // Если и этот индекс не существует, загружаем все бронирования (будет отфильтровано на клиенте)
          const q = query(
            collection(db, 'bookings'),
            orderBy('date')
          )
          snapshot = await getDocs(q)
        }
      }
      
      const bookingsData = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          date: data.date.toDate()
        }
      }) as Booking[]
      
      
      // Фильтруем на клиенте, если не удалось отфильтровать в запросе
      const filteredBookings = bookingsData.filter(booking => {
        const bookingDate = new Date(booking.date)
        const inRange = bookingDate >= startOfWeek && bookingDate <= endOfWeek
        // ВАЖНО: фильтруем также по venueId
        return inRange && booking.venueId === venueId
      })
      
      setBookings(filteredBookings)
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
        time: formData.startTime, // Добавляем поле time для совместимости
        startTime: formData.startTime,
        endTime: endTime,
        gameType: 'single', // По умолчанию single
        status: 'confirmed',
        amount: formData.duration * (court.pricePerHour || 1900),
        price: court.pricePerHour || 1900, // Добавляем цену за час
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
      alert('Ошибка при создании бронирования: ' + (error as Error).message)
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
      // Проверяем оба поля - startTime и time для совместимости
      const bookingTime = booking.startTime || booking.time
      return bookingDate.toDateString() === date.toDateString() &&
             bookingTime === time &&
             booking.courtId === courtId
    })
  }

  // Динамически создаем слоты времени на основе режима работы клуба
  const generateTimeSlots = () => {
    const slots = []
    const startHour = 7 // По умолчанию с 7:00
    const endHour = 23  // По умолчанию до 23:00
    
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
    }
    return slots
  }
  
  const timeSlots = generateTimeSlots()
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
      <div>
        <div className="section-card">
          <div className="section-header">
            <h2 className="section-title">Выберите клуб</h2>
          </div>
          <div className="form-group" style={{ maxWidth: '400px' }}>
            <label className="form-label">Клуб</label>
            <select 
              className="form-select"
              value={selectedVenueId || ''}
              onChange={(e) => handleVenueChange(e.target.value)}
            >
              <option value="">Выберите клуб для управления</option>
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>{venue.name}</option>
              ))}
            </select>
            <p className="form-hint">Выберите клуб для просмотра календаря и создания бронирований</p>
          </div>
        </div>
      </div>
    )
  }

  const canCreateBooking = hasPermission(['manage_bookings', 'manage_all_bookings', 'create_bookings'])

  return (
    <PermissionGate permission={['manage_bookings', 'manage_all_bookings', 'view_bookings']}>
    <div>
      {/* Селектор клуба для суперадмина */}
      {isSuperAdmin && (
        <div className="section-card" style={{ marginBottom: '24px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Управление клубом</label>
            <select 
              className="form-select"
              value={selectedVenueId || ''}
              onChange={(e) => handleVenueChange(e.target.value)}
              style={{ maxWidth: '400px' }}
            >
              <option value="">Выберите клуб</option>
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>{venue.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

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
            <span style={{ fontWeight: '600', minWidth: '150px', textAlign: 'center' }}>
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
            <button 
              onClick={() => setSelectedDate(new Date())}
              style={{ 
                padding: '6px 12px',
                border: '1px solid var(--extra-light-gray)',
                background: 'var(--white)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                marginLeft: '16px'
              }}
            >
              Сегодня
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
                          {booking.clientName || booking.customerName}
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