import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from '@mui/icons-material'
import { Alert, AlertTitle } from '@mui/material'
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import { ru } from 'date-fns/locale'
import '../styles/admin.css' // Используем те же стили, что и в админке

interface DemoBooking {
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
}

interface DemoCourt {
  id: string
  name: string
  type: 'tennis' | 'padel' | 'badminton'
  pricePerHour: number
}

// Демо данные кортов
const DEMO_COURTS: DemoCourt[] = [
  { id: '1', name: 'Корт №1', type: 'padel', pricePerHour: 2000 },
  { id: '2', name: 'Корт №2', type: 'padel', pricePerHour: 2000 },
  { id: '3', name: 'Корт №3', type: 'tennis', pricePerHour: 1500 },
  { id: '4', name: 'Корт №4', type: 'tennis', pricePerHour: 1500 },
]

// Генерация демо бронирований
const generateDemoBookings = (weekStart: Date): DemoBooking[] => {
  const bookings: DemoBooking[] = []
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
    
    const date = addDays(weekStart, dayOffset)
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
      paymentMethod: ['cash', 'transfer', 'app'][Math.floor(Math.random() * 3)] as any
    })
  }
  
  return bookings
}

const DemoBookingCalendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [bookings, setBookings] = useState<DemoBooking[]>([])
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    courtId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    duration: 1.5,
    paymentMethod: 'cash' as 'cash' | 'transfer' | 'app',
  })

  useEffect(() => {
    // Генерируем новые бронирования при изменении недели
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
    setBookings(generateDemoBookings(weekStart))
  }, [selectedDate])

  const navigateWeek = (direction: number) => {
    setSelectedDate(current => direction > 0 ? addWeeks(current, 1) : subWeeks(current, 1))
  }

  const getWeekDates = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 })
    const dates = []
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(start, i))
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' ? parseFloat(value) : value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const court = DEMO_COURTS.find(c => c.id === formData.courtId)
    if (!court) return

    const [hours, minutes] = formData.startTime.split(':').map(Number)
    const endHours = hours + Math.floor(formData.duration)
    const endMinutes = minutes + (formData.duration % 1) * 60
    const endTime = `${String(endHours + Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`

    const newBooking: DemoBooking = {
      id: `demo-${Date.now()}`,
      courtId: formData.courtId,
      courtName: court.name,
      clientName: formData.clientName,
      clientPhone: formData.clientPhone,
      date: new Date(formData.date),
      startTime: formData.startTime,
      endTime: endTime,
      status: 'confirmed',
      amount: formData.duration * court.pricePerHour,
      paymentMethod: formData.paymentMethod
    }

    setBookings([...bookings, newBooking])
    
    // Сброс формы
    setFormData({
      clientName: '',
      clientPhone: '',
      courtId: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '10:00',
      duration: 1.5,
      paymentMethod: 'cash',
    })
    
    alert('Бронирование создано (демо режим)')
  }

  const timeSlots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00']
  const weekDates = getWeekDates()
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

  return (
    <div>
      <Alert severity="info" style={{ marginBottom: '24px' }}>
        <AlertTitle>Демо режим</AlertTitle>
        Это демонстрационная версия календаря. Все данные являются тестовыми и обновляются автоматически при переключении недель.
      </Alert>
      
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
                const bookingsInSlot = DEMO_COURTS.flatMap(court => 
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
                {DEMO_COURTS.map(court => (
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
              <label className="form-label">Длительность</label>
              <select 
                className="form-select"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
              >
                <option value={1}>1 час</option>
                <option value={1.5}>1.5 часа</option>
                <option value={2}>2 часа</option>
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
                <option value="cash">Наличные</option>
                <option value="transfer">Перевод</option>
                <option value="app">Приложение</option>
              </select>
            </div>
          </div>
          
          <div style={{ marginTop: '24px' }}>
            <button type="submit" className="btn btn-primary">
              Создать бронирование
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DemoBookingCalendar