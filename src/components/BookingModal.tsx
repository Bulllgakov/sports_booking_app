import React, { useState, useEffect } from 'react'
import { format, addDays, startOfToday, parse, isBefore, isAfter, setHours, setMinutes } from 'date-fns'
import { ru } from 'date-fns/locale'
import { collection, query, where, getDocs, Timestamp, addDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import '../styles/flutter-theme.css'

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  court: {
    id: string
    name: string
    type: 'padel' | 'tennis' | 'badminton'
    pricePerHour: number
  }
  venue: {
    id: string
    name: string
    workingHours?: {
      [key: string]: { open: string; close: string }
    }
  }
}

interface TimeSlot {
  time: string
  available: boolean
  price: number
}

export default function BookingModal({ isOpen, onClose, court, venue }: BookingModalProps) {
  const [step, setStep] = useState<'date' | 'time' | 'gameType' | 'confirm'>('date')
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday())
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [selectedGameType, setSelectedGameType] = useState<'single' | 'double'>('single')
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  useEffect(() => {
    if (step === 'time' && selectedDate) {
      loadTimeSlots()
    }
  }, [step, selectedDate])

  const loadTimeSlots = async () => {
    console.log('Loading time slots for date:', selectedDate)
    setLoading(true)
    try {
      // Get existing bookings for the selected date
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)

      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('courtId', '==', court.id),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay)),
        where('status', 'in', ['confirmed', 'pending'])
      )

      const bookingsSnapshot = await getDocs(bookingsQuery)
      const bookedTimes = new Set(
        bookingsSnapshot.docs.map(doc => doc.data().time)
      )

      // Generate time slots based on working hours
      const dayOfWeek = format(selectedDate, 'EEEE', { locale: ru }).toLowerCase()
      console.log('Day of week:', dayOfWeek, 'Working hours:', venue.workingHours)
      const workingHours = venue.workingHours?.[dayOfWeek] || venue.workingHours?.['weekday'] || { open: '07:00', close: '23:00' }
      
      const slots: TimeSlot[] = []
      
      // Проверяем формат workingHours
      let openTime = '07:00'
      let closeTime = '23:00'
      
      if (typeof workingHours === 'string') {
        // Формат "07:00-23:00"
        const [open, close] = workingHours.split('-')
        openTime = open || '07:00'
        closeTime = close || '23:00'
      } else if (workingHours && typeof workingHours === 'object') {
        // Формат { open: '07:00', close: '23:00' }
        openTime = workingHours.open || '07:00'
        closeTime = workingHours.close || '23:00'
      }
      
      const [openHour, openMinute] = openTime.split(':').map(Number)
      const [closeHour, closeMinute] = closeTime.split(':').map(Number)
      
      const currentDate = new Date()
      const isToday = format(selectedDate, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')

      for (let hour = openHour; hour < closeHour; hour++) {
        const timeString = `${hour.toString().padStart(2, '0')}:00`
        const slotTime = setMinutes(setHours(new Date(selectedDate), hour), 0)
        
        // Skip past times for today
        if (isToday && isBefore(slotTime, currentDate)) {
          continue
        }

        slots.push({
          time: timeString,
          available: !bookedTimes.has(timeString),
          price: court.pricePerHour
        })
      }

      setTimeSlots(slots)
      console.log('Loaded time slots:', slots.length)
    } catch (error) {
      console.error('Error loading time slots:', error)
      setTimeSlots([]) // Обнуляем слоты при ошибке
    } finally {
      setLoading(false)
    }
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setSelectedTime('')
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    setStep('gameType')
  }

  const handleGameTypeSelect = (type: 'single' | 'double') => {
    setSelectedGameType(type)
    setStep('confirm')
  }

  const handleConfirmBooking = async () => {
    if (!customerName || !customerPhone) {
      alert('Пожалуйста, заполните все поля')
      return
    }

    setLoading(true)
    try {
      const bookingData = {
        courtId: court.id,
        courtName: court.name,
        venueId: venue.id,
        venueName: venue.name,
        date: Timestamp.fromDate(selectedDate),
        time: selectedTime,
        gameType: selectedGameType,
        customerName,
        customerPhone,
        price: court.pricePerHour,
        status: 'pending',
        createdAt: Timestamp.now()
      }

      const docRef = await addDoc(collection(db, 'bookings'), bookingData)
      alert(`Бронирование создано! ID: ${docRef.id}`)
      onClose()
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Ошибка при создании бронирования')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const renderDateStep = () => {
    const dates = []
    for (let i = 0; i < 14; i++) {
      dates.push(addDays(startOfToday(), i))
    }

    return (
      <>
        <h3 className="h3" style={{ marginBottom: 'var(--spacing-lg)' }}>Выберите дату</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: 'var(--spacing-sm)',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {dates.map((date) => {
            const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
            return (
              <button
                key={date.toISOString()}
                onClick={() => handleDateSelect(date)}
                style={{
                  padding: 'var(--spacing-md)',
                  border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--extra-light-gray)'}`,
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'var(--primary-light)' : 'var(--white)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center'
                }}
              >
                <div className="caption-bold">{format(date, 'EEE', { locale: ru })}</div>
                <div className="h3">{format(date, 'd')}</div>
                <div className="caption">{format(date, 'MMM', { locale: ru })}</div>
              </button>
            )
          })}
        </div>
        <div style={{ marginTop: 'var(--spacing-xl)', textAlign: 'right' }}>
          <button
            className="flutter-button"
            onClick={() => setStep('time')}
            disabled={!selectedDate}
          >
            Выбрать время
          </button>
        </div>
      </>
    )
  }

  const renderTimeStep = () => (
    <>
      <h3 className="h3" style={{ marginBottom: 'var(--spacing-lg)' }}>
        Выберите время на {format(selectedDate, 'd MMMM', { locale: ru })}
      </h3>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--spacing-3xl)' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: 'var(--spacing-sm)',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {timeSlots.map((slot) => (
            <button
              key={slot.time}
              onClick={() => handleTimeSelect(slot.time)}
              disabled={!slot.available}
              style={{
                padding: 'var(--spacing-md)',
                border: `2px solid ${selectedTime === slot.time ? 'var(--primary)' : 'var(--extra-light-gray)'}`,
                borderRadius: 'var(--radius-md)',
                background: selectedTime === slot.time ? 'var(--primary-light)' : slot.available ? 'var(--white)' : 'var(--extra-light-gray)',
                cursor: slot.available ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                opacity: slot.available ? 1 : 0.5
              }}
            >
              <div className="body-bold">{slot.time}</div>
              <div className="caption">{slot.price}₽</div>
            </button>
          ))}
        </div>
      )}
      <div style={{ marginTop: 'var(--spacing-xl)', display: 'flex', justifyContent: 'space-between' }}>
        <button
          className="flutter-button-outlined"
          onClick={() => setStep('date')}
          style={{ background: 'var(--white)', color: 'var(--primary)', border: '2px solid var(--primary)' }}
        >
          Назад
        </button>
        <button
          className="flutter-button"
          onClick={() => setStep('gameType')}
          disabled={!selectedTime}
        >
          Далее
        </button>
      </div>
    </>
  )

  const renderGameTypeStep = () => (
    <>
      <h3 className="h3" style={{ marginBottom: 'var(--spacing-lg)' }}>Выберите тип игры</h3>
      <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
        <button
          onClick={() => handleGameTypeSelect('single')}
          style={{
            padding: 'var(--spacing-lg)',
            border: `2px solid ${selectedGameType === 'single' ? 'var(--primary)' : 'var(--extra-light-gray)'}`,
            borderRadius: 'var(--radius-md)',
            background: selectedGameType === 'single' ? 'var(--primary-light)' : 'var(--white)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            textAlign: 'left'
          }}
        >
          <div className="body-bold">Одиночная игра</div>
          <div className="caption" style={{ color: 'var(--gray)' }}>1 на 1</div>
        </button>
        <button
          onClick={() => handleGameTypeSelect('double')}
          style={{
            padding: 'var(--spacing-lg)',
            border: `2px solid ${selectedGameType === 'double' ? 'var(--primary)' : 'var(--extra-light-gray)'}`,
            borderRadius: 'var(--radius-md)',
            background: selectedGameType === 'double' ? 'var(--primary-light)' : 'var(--white)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            textAlign: 'left'
          }}
        >
          <div className="body-bold">Парная игра</div>
          <div className="caption" style={{ color: 'var(--gray)' }}>2 на 2</div>
        </button>
      </div>
      <div style={{ marginTop: 'var(--spacing-xl)', display: 'flex', justifyContent: 'space-between' }}>
        <button
          className="flutter-button-outlined"
          onClick={() => setStep('time')}
          style={{ background: 'var(--white)', color: 'var(--primary)', border: '2px solid var(--primary)' }}
        >
          Назад
        </button>
        <button
          className="flutter-button"
          onClick={() => setStep('confirm')}
        >
          Далее
        </button>
      </div>
    </>
  )

  const renderConfirmStep = () => (
    <>
      <h3 className="h3" style={{ marginBottom: 'var(--spacing-lg)' }}>Подтверждение бронирования</h3>
      
      <div className="info-section" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="body">Корт:</span>
            <span className="body-bold">{court.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="body">Дата:</span>
            <span className="body-bold">{format(selectedDate, 'd MMMM yyyy', { locale: ru })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="body">Время:</span>
            <span className="body-bold">{selectedTime}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="body">Тип игры:</span>
            <span className="body-bold">{selectedGameType === 'single' ? 'Одиночная' : 'Парная'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="body">Стоимость:</span>
            <span className="body-bold" style={{ color: 'var(--primary)' }}>{court.pricePerHour}₽</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
        <input
          type="text"
          placeholder="Ваше имя"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          style={{
            padding: 'var(--spacing-md)',
            border: '1px solid var(--extra-light-gray)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-body)'
          }}
        />
        <input
          type="tel"
          placeholder="Телефон"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          style={{
            padding: 'var(--spacing-md)',
            border: '1px solid var(--extra-light-gray)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-body)'
          }}
        />
      </div>

      <div style={{ marginTop: 'var(--spacing-xl)', display: 'flex', justifyContent: 'space-between' }}>
        <button
          className="flutter-button-outlined"
          onClick={() => setStep('gameType')}
          style={{ background: 'var(--white)', color: 'var(--primary)', border: '2px solid var(--primary)' }}
        >
          Назад
        </button>
        <button
          className="flutter-button"
          onClick={handleConfirmBooking}
          disabled={loading || !customerName || !customerPhone}
        >
          {loading ? 'Создание...' : 'Подтвердить'}
        </button>
      </div>
    </>
  )

  return (
    <>
      <div 
        className="modal-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: isOpen ? 'block' : 'none',
          animation: 'fadeIn 0.2s ease'
        }}
      />
      <div 
        className="modal-content"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--white)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--spacing-2xl)',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          zIndex: 1001,
          display: isOpen ? 'block' : 'none',
          boxShadow: 'var(--shadow-xl)',
          animation: 'slideIn 0.3s ease'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 'var(--spacing-md)',
            right: 'var(--spacing-md)',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: 'var(--gray)'
          }}
        >
          ×
        </button>

        {step === 'date' && renderDateStep()}
        {step === 'time' && renderTimeStep()}
        {step === 'gameType' && renderGameTypeStep()}
        {step === 'confirm' && renderConfirmStep()}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: translate(-50%, -45%);
          }
          to { 
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--extra-light-gray);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}