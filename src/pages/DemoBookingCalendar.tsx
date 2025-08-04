import React, { useState, useEffect, useMemo } from 'react'
import { useDemoAuth } from '../contexts/DemoAuthContext'
import { ChevronLeft, ChevronRight } from '@mui/icons-material'
import { Alert, AlertTitle } from '@mui/material'
import '../styles/admin.css'

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
  paymentMethod: 'cash' | 'card_on_site' | 'transfer' | 'online' | 'sberbank_card' | 'tbank_card'
  paymentStatus?: 'awaiting_payment' | 'paid' | 'online_payment' | 'cancelled'
}

interface Court {
  id: string
  name: string
  type: string
  pricePerHour: number
  color?: string
  pricing?: {
    [key: string]: {
      basePrice: number
      intervals?: Array<{
        from: string
        to: string
        price: number
      }>
    }
  }
}

// Демо корты с новой системой ценообразования
const DEMO_COURTS: Court[] = [
  { 
    id: '1', 
    name: 'Корт №1', 
    type: 'padel', 
    pricePerHour: 2000, 
    color: '#00A86B',
    pricing: {
      monday: { basePrice: 2000 },
      tuesday: { basePrice: 2000 },
      wednesday: { basePrice: 2000 },
      thursday: { basePrice: 2000 },
      friday: { basePrice: 2000 },
      saturday: { basePrice: 2500 },
      sunday: { basePrice: 2500 }
    }
  },
  { 
    id: '2', 
    name: 'Корт №2', 
    type: 'padel', 
    pricePerHour: 2000, 
    color: '#2E86AB',
    pricing: {
      monday: { basePrice: 2000 },
      tuesday: { basePrice: 2000 },
      wednesday: { basePrice: 2000 },
      thursday: { basePrice: 2000 },
      friday: { basePrice: 2000 },
      saturday: { basePrice: 2500 },
      sunday: { basePrice: 2500 }
    }
  },
  { 
    id: '3', 
    name: 'Теннисный корт', 
    type: 'tennis', 
    pricePerHour: 1500, 
    color: '#FF6B6B',
    pricing: {
      monday: { basePrice: 1500 },
      tuesday: { basePrice: 1500 },
      wednesday: { basePrice: 1500 },
      thursday: { basePrice: 1500 },
      friday: { basePrice: 1500 },
      saturday: { basePrice: 2000 },
      sunday: { basePrice: 2000 }
    }
  },
  { 
    id: '4', 
    name: 'Бадминтон', 
    type: 'badminton', 
    pricePerHour: 1000, 
    color: '#F39C12',
    pricing: {
      monday: { basePrice: 1000 },
      tuesday: { basePrice: 1000 },
      wednesday: { basePrice: 1000 },
      thursday: { basePrice: 1000 },
      friday: { basePrice: 1000 },
      saturday: { basePrice: 1200 },
      sunday: { basePrice: 1200 }
    }
  },
]

// Генерация демо бронирований
const generateDemoBookings = (weekStart: Date): Booking[] => {
  const bookings: Booking[] = []
  const names = ['Иван Петров', 'Мария Сидорова', 'Алексей Козлов', 'Елена Новикова', 'Дмитрий Смирнов']
  const phones = ['+7 (999) 123-45-67', '+7 (988) 234-56-78', '+7 (977) 345-67-89', '+7 (966) 456-78-90', '+7 (955) 567-89-01']
  const times = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00']
  
  // Генерируем 10-15 случайных бронирований на неделю
  const bookingCount = Math.floor(Math.random() * 6) + 10
  
  for (let i = 0; i < bookingCount; i++) {
    const dayOffset = Math.floor(Math.random() * 7)
    const courtIndex = Math.floor(Math.random() * DEMO_COURTS.length)
    const timeIndex = Math.floor(Math.random() * times.length)
    const nameIndex = Math.floor(Math.random() * names.length)
    const duration = Math.random() > 0.5 ? 1 : 1.5
    
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + dayOffset)
    const startTime = times[timeIndex]
    const [hours, minutes] = startTime.split(':').map(Number)
    const endHours = hours + Math.floor(duration)
    const endMinutes = minutes + (duration % 1) * 60
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
    
    bookings.push({
      id: `demo-${i}`,
      courtId: DEMO_COURTS[courtIndex].id,
      courtName: DEMO_COURTS[courtIndex].name,
      clientName: names[nameIndex],
      clientPhone: phones[nameIndex],
      date,
      startTime,
      endTime,
      status: Math.random() > 0.1 ? 'confirmed' : 'pending',
      amount: DEMO_COURTS[courtIndex].pricePerHour * duration,
      paymentMethod: ['cash', 'card_on_site', 'transfer', 'online'][Math.floor(Math.random() * 4)] as any,
      paymentStatus: Math.random() > 0.3 ? 'paid' : 'awaiting_payment'
    })
  }
  
  return bookings
}

export default function DemoBookingCalendar() {
  const { admin, club } = useDemoAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [courts] = useState<Court[]>(DEMO_COURTS)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [hoveredSlot, setHoveredSlot] = useState<{date: Date, time: string} | null>(null)
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    // Генерируем новые бронирования при изменении недели
    const weekStart = new Date(selectedDate)
    weekStart.setDate(selectedDate.getDate() - selectedDate.getDay() + 1)
    weekStart.setHours(0, 0, 0, 0)
    setBookings(generateDemoBookings(weekStart))
  }, [selectedDate])

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

  // Генерация временных слотов
  const generateTimeSlots = () => {
    const slots = []
    const dayName = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    
    // Определяем рабочие часы в зависимости от дня недели
    const workingHours = club?.workingHours?.[dayName] || '07:00-23:00'
    const [startTime, endTime] = workingHours.split('-')
    const startHour = parseInt(startTime.split(':')[0])
    const endHour = parseInt(endTime.split(':')[0])
    
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
    }
    return slots
  }
  
  const timeSlots = useMemo(() => generateTimeSlots(), [selectedDate, club])
  const weekDates = getWeekDates()
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

  const handleSlotClick = () => {
    setShowNotification(true)
    setTimeout(() => setShowNotification(false), 3000)
  }

  return (
    <div>
      {showNotification && (
        <Alert severity="info" style={{ marginBottom: '24px' }}>
          <AlertTitle>Демо версия</AlertTitle>
          В демо версии создание бронирований недоступно
        </Alert>
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
                            const booking = bookingsInSlot[0]
                            const court = courts.find(c => c.id === booking.courtId)
                            const courtColor = court?.color || '#00A86B'
                            const r = parseInt(courtColor.slice(1, 3), 16)
                            const g = parseInt(courtColor.slice(3, 5), 16)
                            const b = parseInt(courtColor.slice(5, 7), 16)
                            return `rgba(${r}, ${g}, ${b}, 0.15)`
                          })() 
                        : isHovered
                          ? 'rgba(0, 168, 107, 0.05)'
                          : 'var(--white)',
                      padding: '8px',
                      overflow: 'hidden',
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
                    onClick={handleSlotClick}
                  >
                    {bookingsInSlot.length === 0 && isHovered && (
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
                            {booking.clientName}
                            {booking.clientPhone && (
                              <span style={{ fontSize: '9px', marginLeft: '4px' }}>
                                {booking.clientPhone}
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
      <div className="section-card">
        <h3 className="section-title">Последние бронирования</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Дата и время</th>
                <th>Корт</th>
                <th>Клиент</th>
                <th>Телефон</th>
                <th>Сумма</th>
                <th>Статус оплаты</th>
              </tr>
            </thead>
            <tbody>
              {bookings.slice(0, 10).map(booking => (
                <tr key={booking.id}>
                  <td>
                    {new Date(booking.date).toLocaleDateString('ru-RU')}{' '}
                    {booking.startTime} - {booking.endTime}
                  </td>
                  <td>{booking.courtName}</td>
                  <td>{booking.clientName}</td>
                  <td>{booking.clientPhone}</td>
                  <td>{booking.amount.toLocaleString('ru-RU')} ₽</td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: booking.paymentStatus === 'paid' ? '#10B98133' : '#F59E0B33',
                      color: booking.paymentStatus === 'paid' ? '#10B981' : '#F59E0B'
                    }}>
                      {booking.paymentStatus === 'paid' ? 'Оплачено' : 'Ожидает'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}