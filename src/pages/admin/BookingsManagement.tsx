import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { PermissionGate } from '../../components/PermissionGate'
import { 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc, 
  addDoc,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
  arrayUnion
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { ChevronLeft, ChevronRight } from '@mui/icons-material'
import { Alert, AlertTitle } from '@mui/material'
import BookingsList from '../../components/BookingsList'
import BookingDetailsModal from '../../components/BookingDetailsModal'
import CreateBookingModal from '../../components/CreateBookingModal'

interface PaymentHistory {
  timestamp: Date
  action: 'created' | 'paid' | 'cancelled'
  userId: string
  userName?: string
  note?: string
}

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
  paymentMethod: 'cash' | 'card_on_site' | 'transfer' | 'online'
  paymentStatus?: 'awaiting_payment' | 'paid' | 'online_payment' | 'cancelled'
  paymentHistory?: PaymentHistory[]
  createdBy?: {
    userId: string
    userName: string
    userRole?: string
  }
  venueId: string
  createdAt: Date
}

interface Court {
  id: string
  name: string
  type: string
  pricePerHour: number
  color?: string
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
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    courtId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    duration: 1.5,
    paymentMethod: 'cash' as 'cash' | 'card_on_site' | 'transfer' | 'online',
  })
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [existingBookings, setExistingBookings] = useState<any[]>([])
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedSlotDate, setSelectedSlotDate] = useState<Date | null>(null)
  const [selectedSlotTime, setSelectedSlotTime] = useState<string | null>(null)
  const [hoveredSlot, setHoveredSlot] = useState<{date: Date, time: string} | null>(null)

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
      // Загружаем данные клуба для обычного админа
      fetchVenueData(admin.venueId)
      fetchCourts(admin.venueId)
      fetchBookings(admin.venueId)
    } else {
      setLoading(false)
    }
  }, [admin, selectedDate, isSuperAdmin])

  // Обновляем доступные слоты при изменении длительности
  useEffect(() => {
    const slots = generateAvailableTimeSlots(formData.duration)
    setAvailableSlots(slots)
    
    // Если текущее время больше не доступно, выбираем первое доступное
    if (!slots.includes(formData.startTime) && slots.length > 0) {
      setFormData(prev => ({
        ...prev,
        startTime: slots[0]
      }))
    }
  }, [formData.duration, formData.date, venues, selectedVenueId, admin?.venueId])

  // Загружаем бронирования при изменении корта или даты
  useEffect(() => {
    if (formData.courtId && formData.date) {
      fetchExistingBookings()
    }
  }, [formData.courtId, formData.date])

  const fetchVenueData = async (venueId: string) => {
    try {
      const venueDoc = await getDoc(doc(db, 'venues', venueId))
      if (venueDoc.exists()) {
        const venueData = {
          id: venueDoc.id,
          ...venueDoc.data()
        } as Venue
        setVenues([venueData]) // Для обычного админа только его клуб
      }
    } catch (error) {
      console.error('Error fetching venue data:', error)
    }
  }

  const fetchVenues = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'venues'))
      const venuesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
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

      // Упрощенный запрос без лишних индексов
      console.log('Fetching bookings for venue:', venueId)
      console.log('Date range:', startOfWeek, 'to', endOfWeek)
      
      // Простой запрос без orderBy чтобы избежать проблем с индексами
      const q = query(
        collection(db, 'bookings'),
        where('venueId', '==', venueId)
      )
      
      const snapshot = await getDocs(q)
      console.log('Found bookings:', snapshot.size)
      
      const bookingsData = snapshot.docs.map(doc => {
        const data = doc.data()
        console.log('Raw booking data:', data)
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now())
        }
      }) as Booking[]
      
      console.log('All bookings data:', bookingsData)
      
      // Фильтруем на клиенте, если не удалось отфильтровать в запросе
      const filteredBookings = bookingsData.filter(booking => {
        const bookingDate = new Date(booking.date)
        const inRange = bookingDate >= startOfWeek && bookingDate <= endOfWeek
        console.log('Booking date:', bookingDate, 'In range:', inRange, 'Venue match:', booking.venueId === venueId)
        // ВАЖНО: фильтруем также по venueId
        return inRange && booking.venueId === venueId
      })
      
      // Сортируем по дате на клиенте
      const sortedBookings = filteredBookings.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
      
      console.log('Filtered and sorted bookings:', sortedBookings)
      setBookings(sortedBookings)
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchExistingBookings = async () => {
    if (!selectedVenueId && !admin?.venueId) return
    if (!formData.courtId || !formData.date) return

    try {
      const bookingsRef = collection(db, 'bookings')
      const q = query(
        bookingsRef,
        where('venueId', '==', selectedVenueId || admin?.venueId),
        where('courtId', '==', formData.courtId),
        where('date', '==', Timestamp.fromDate(new Date(formData.date)))
      )
      
      const snapshot = await getDocs(q)
      const bookings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      setExistingBookings(bookings)
    } catch (error) {
      console.error('Error fetching bookings:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    if (name === 'duration') {
      const newDuration = parseFloat(value)
      const availableSlots = generateAvailableTimeSlots(newDuration)
      setAvailableSlots(availableSlots)
      
      // Если текущее время больше не доступно, выбираем первое доступное
      if (!availableSlots.includes(formData.startTime) && availableSlots.length > 0) {
        setFormData(prev => ({
          ...prev,
          duration: newDuration,
          startTime: availableSlots[0]
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          duration: newDuration
        }))
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
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

  // Проверка, занят ли временной слот
  const isSlotOccupied = (startTime: string, duration: number) => {
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const slotStart = startHour + startMinute / 60
    const slotEnd = slotStart + duration

    return existingBookings.some(booking => {
      const [bookingStartHour, bookingStartMinute] = booking.startTime.split(':').map(Number)
      const [bookingEndHour, bookingEndMinute] = booking.endTime.split(':').map(Number)
      const bookingStart = bookingStartHour + bookingStartMinute / 60
      const bookingEnd = bookingEndHour + bookingEndMinute / 60

      // Проверяем пересечение временных интервалов
      return (slotStart < bookingEnd && slotEnd > bookingStart)
    })
  }

  // Генерация доступных временных слотов с учетом длительности
  const generateAvailableTimeSlots = (duration: number) => {
    const venue = venues.find(v => v.id === (selectedVenueId || admin?.venueId))
    const isWeekend = formData.date ? 
      (new Date(formData.date).getDay() === 0 || new Date(formData.date).getDay() === 6) :
      false
    
    const workingHoursStr = venue?.workingHours?.[isWeekend ? 'weekend' : 'weekday'] || 
                           (isWeekend ? '08:00-22:00' : '07:00-23:00')
    
    const [startTimeStr, endTimeStr] = workingHoursStr.split('-')
    const [startHour] = startTimeStr.split(':').map(Number)
    const [endHour] = endTimeStr.split(':').map(Number)
    
    const slots: string[] = []
    const maxStartTime = endHour - duration
    
    // Всегда генерируем слоты с интервалом 30 минут
    for (let hour = startHour; hour <= maxStartTime; hour += 0.5) {
      const wholeHour = Math.floor(hour)
      const minutes = (hour % 1) * 60
      const timeString = `${String(wholeHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      
      // Проверяем, что бронирование не выйдет за пределы рабочего времени
      if (hour + duration <= endHour) {
        slots.push(timeString)
      }
    }
    
    return slots
  }

  // Динамически создаем слоты времени на основе режима работы клуба
  const generateTimeSlots = () => {
    const slots = []
    
    // Получаем текущий клуб
    const currentVenue = venues.find(v => v.id === (selectedVenueId || admin?.venueId))
    
    // Определяем, будний это день или выходной для выбранной даты
    const isWeekend = formData.date ? 
      (new Date(formData.date).getDay() === 0 || new Date(formData.date).getDay() === 6) :
      false
    
    // Получаем режим работы
    const workingHoursStr = currentVenue?.workingHours?.[isWeekend ? 'weekend' : 'weekday'] || 
                           (isWeekend ? '08:00-22:00' : '07:00-23:00')
    
    // Парсим время работы
    let startHour = 7
    let endHour = 23
    
    if (workingHoursStr && workingHoursStr.includes('-')) {
      const [openTime, closeTime] = workingHoursStr.split('-').map(t => t.trim())
      if (openTime && closeTime) {
        startHour = parseInt(openTime.split(':')[0])
        endHour = parseInt(closeTime.split(':')[0])
      }
    }
    
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
    }
    return slots
  }
  
  const timeSlots = useMemo(() => generateTimeSlots(), [venues, selectedVenueId, admin?.venueId, formData.date])
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
                
                const isSelected = selectedSlotDate && selectedSlotTime && 
                  date.toDateString() === selectedSlotDate.toDateString() && 
                  time === selectedSlotTime
                const isHovered = hoveredSlot && 
                  date.toDateString() === hoveredSlot.date.toDateString() && 
                  time === hoveredSlot.time
                
                return (
                  <div 
                    key={`${time}-${dateIndex}`} 
                    className="booking-slot"
                    style={{
                      position: 'relative',
                      cursor: 'pointer',
                      minHeight: '60px',
                      background: bookingsInSlot.length > 0 
                        ? (() => {
                            // Находим цвет корта для первого бронирования
                            const booking = bookingsInSlot[0]
                            const court = courts.find(c => c.id === booking.courtId)
                            const courtColor = court?.color || '#00A86B'
                            // Преобразуем HEX в RGBA с прозрачностью
                            const r = parseInt(courtColor.slice(1, 3), 16)
                            const g = parseInt(courtColor.slice(3, 5), 16)
                            const b = parseInt(courtColor.slice(5, 7), 16)
                            return `rgba(${r}, ${g}, ${b}, 0.15)`
                          })() 
                        : isSelected 
                          ? 'rgba(0, 168, 107, 0.2)'
                          : isHovered
                            ? 'rgba(0, 168, 107, 0.05)'
                            : 'var(--white)',
                      padding: '8px',
                      overflow: 'hidden',
                      border: isSelected ? '2px solid var(--primary)' : '2px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={() => {
                      if (bookingsInSlot.length === 0) {
                        setHoveredSlot({date, time})
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredSlot(null)
                    }}
                    onClick={() => {
                      if (bookingsInSlot.length > 0) {
                        // Если есть бронирование, показываем детали
                        setSelectedBooking(bookingsInSlot[0])
                        setShowDetailsModal(true)
                      } else {
                        // Если слот пустой, открываем форму создания
                        setSelectedSlotDate(date)
                        setSelectedSlotTime(time)
                        setShowCreateModal(true)
                      }
                    }}
                  >
                    {bookingsInSlot.length === 0 && (isHovered || isSelected) && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: '12px',
                        color: 'var(--primary)',
                        fontWeight: '600',
                        textAlign: 'center'
                      }}>
                        {time}
                      </div>
                    )}
                    {bookingsInSlot.map((booking, idx) => {
                      const paymentStatus = booking.paymentStatus || 'awaiting_payment'
                      const statusColors = {
                        awaiting_payment: '#F59E0B',
                        paid: '#10B981',
                        online_payment: '#3B82F6',
                        cancelled: '#EF4444'
                      }
                      const statusLabels = {
                        awaiting_payment: 'Ожидает',
                        paid: 'Оплачено',
                        online_payment: 'Онлайн',
                        cancelled: 'Отменено'
                      }
                      
                      return (
                        <div key={idx} style={{ 
                          fontSize: '11px',
                          marginBottom: '4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          <div style={{ 
                            fontWeight: '600', 
                            color: 'var(--dark)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {(() => {
                              const court = courts.find(c => c.id === booking.courtId)
                              if (court?.color) {
                                return (
                                  <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '2px',
                                    backgroundColor: court.color,
                                    flexShrink: 0
                                  }} />
                                )
                              }
                              return null
                            })()}
                            {booking.courtName}
                          </div>
                          <div className="booking-slot-details" style={{ color: 'var(--gray)', fontSize: '10px' }}>
                            {booking.clientName || booking.customerName}
                            {(booking.clientPhone || booking.customerPhone) && (
                              <span style={{ fontSize: '9px', marginLeft: '4px' }}>
                                {booking.clientPhone || booking.customerPhone}
                              </span>
                            )}
                          </div>
                          <div className="booking-slot-status" style={{ 
                            fontSize: '9px',
                            marginTop: '2px',
                            color: statusColors[paymentStatus],
                            fontWeight: '500'
                          }}>
                            {statusLabels[paymentStatus]}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Список бронирований */}
      <BookingsList 
        venueId={selectedVenueId || admin?.venueId || ''} 
        onRefresh={() => fetchBookings(selectedVenueId || admin?.venueId || '')}
      />
      
      {/* Модальное окно деталей бронирования */}
      <BookingDetailsModal
        booking={selectedBooking}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedBooking(null)
        }}
        onUpdate={() => fetchBookings(selectedVenueId || admin?.venueId || '')}
      />
      
      {/* Модальное окно создания бронирования */}
      <CreateBookingModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setSelectedSlotDate(null)
          setSelectedSlotTime(null)
        }}
        onSuccess={() => {
          fetchBookings(selectedVenueId || admin?.venueId || '')
        }}
        venueId={selectedVenueId || admin?.venueId || ''}
        preSelectedDate={selectedSlotDate || undefined}
        preSelectedTime={selectedSlotTime || undefined}
      />
    </div>
    </PermissionGate>
  )
}