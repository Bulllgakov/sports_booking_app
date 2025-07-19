import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { format, parse, addMinutes, isAfter, isBefore, startOfToday, isToday, addDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'
import '../../styles/flutter-theme.css'

interface Court {
  id: string
  name: string
  type: 'padel' | 'tennis' | 'badminton'
  pricePerHour: number
  venueId: string
}

interface Venue {
  id: string
  name: string
  workingHours?: {
    [key: string]: { open: string; close: string }
  }
  bookingDurations?: {
    [key: number]: boolean
  }
}

interface Booking {
  id: string
  courtId: string
  date: string
  startTime: string
  endTime: string
  status: 'confirmed' | 'pending' | 'cancelled'
}

interface TimeSlot {
  time: string
  available: boolean
  price: number
}

interface DateOption {
  date: Date
  day: string
  dayNumber: string
}

export default function TimeSelectionPage() {
  const { clubId, courtId } = useParams<{ clubId: string; courtId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const dateParam = searchParams.get('date')
  const selectedDate = dateParam ? parse(dateParam, 'yyyy-MM-dd', new Date()) : new Date()
  
  const [court, setCourt] = useState<Court | null>(null)
  const [venue, setVenue] = useState<Venue | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [duration, setDuration] = useState<number>(60)
  const [availableDurations, setAvailableDurations] = useState<number[]>([60, 90, 120])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [dateOptions, setDateOptions] = useState<DateOption[]>([])
  const [selectedDateIndex, setSelectedDateIndex] = useState(0)

  useEffect(() => {
    generateDateOptions()
  }, [])

  useEffect(() => {
    loadData()
  }, [clubId, courtId, selectedDateIndex])

  useEffect(() => {
    if (venue && court) {
      generateTimeSlots()
    }
  }, [venue, court, bookings, duration, selectedDateIndex])

  const generateDateOptions = () => {
    const options: DateOption[] = []
    const daysOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    
    // Find which index corresponds to the selected date
    let foundIndex = -1
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(startOfToday(), i)
      options.push({
        date,
        day: daysOfWeek[date.getDay()],
        dayNumber: format(date, 'd')
      })
      
      if (format(date, 'yyyy-MM-dd') === dateParam) {
        foundIndex = i
      }
    }
    
    setDateOptions(options)
    setSelectedDateIndex(foundIndex >= 0 ? foundIndex : 0)
  }

  const loadData = async () => {
    if (!clubId || !courtId) {
      setError('Некорректные параметры')
      setLoading(false)
      return
    }

    try {
      const courtDoc = await getDoc(doc(db, 'courts', courtId))
      if (!courtDoc.exists()) {
        setError('Корт не найден')
        setLoading(false)
        return
      }

      const courtData = {
        id: courtDoc.id,
        ...courtDoc.data()
      } as Court

      setCourt(courtData)

      const venueDoc = await getDoc(doc(db, 'venues', clubId))
      if (venueDoc.exists()) {
        const venueData = {
          id: venueDoc.id,
          ...venueDoc.data()
        } as Venue
        setVenue(venueData)
        
        // Обновляем доступные длительности
        if (venueData.bookingDurations) {
          const durations = [60, 90, 120].filter(d => venueData.bookingDurations![d] !== false)
          setAvailableDurations(durations)
          // Если текущая длительность недоступна, выбираем первую доступную
          if (!durations.includes(duration)) {
            setDuration(durations[0] || 60)
          }
        }
      }

      // Load bookings for selected date
      const currentDate = dateOptions[selectedDateIndex]?.date || selectedDate
      const dateString = format(currentDate, 'yyyy-MM-dd')
      
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('courtId', '==', courtId),
        where('date', '==', dateString),
        where('status', 'in', ['confirmed', 'pending'])
      )
      const bookingsSnapshot = await getDocs(bookingsQuery)
      const bookingsData = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[]
      
      setBookings(bookingsData)
      setLoading(false)
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Ошибка при загрузке данных')
      setLoading(false)
    }
  }

  const generateTimeSlots = () => {
    if (!venue?.workingHours || !court) return

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const currentDate = dateOptions[selectedDateIndex]?.date || selectedDate
    const dayOfWeek = days[currentDate.getDay()]
    const hours = venue.workingHours[dayOfWeek]
    
    if (!hours) return

    const slots: TimeSlot[] = []
    const openTime = parse(hours.open, 'HH:mm', currentDate)
    const closeTime = parse(hours.close, 'HH:mm', currentDate)
    
    let currentTime = openTime
    const now = new Date()

    while (isBefore(currentTime, closeTime)) {
      const timeString = format(currentTime, 'HH:mm')
      const endTime = addMinutes(currentTime, duration)
      
      let isAvailable = true
      if (isToday(currentDate) && isBefore(currentTime, now)) {
        isAvailable = false
      }
      
      if (isAfter(endTime, closeTime)) {
        isAvailable = false
      }
      
      if (isAvailable) {
        for (const booking of bookings) {
          const bookingStart = parse(booking.startTime, 'HH:mm', currentDate)
          const bookingEnd = parse(booking.endTime, 'HH:mm', currentDate)
          
          if (
            (isAfter(currentTime, bookingStart) && isBefore(currentTime, bookingEnd)) ||
            (isAfter(endTime, bookingStart) && isBefore(endTime, bookingEnd)) ||
            (isBefore(currentTime, bookingStart) && isAfter(endTime, bookingEnd)) ||
            (format(currentTime, 'HH:mm') === booking.startTime)
          ) {
            isAvailable = false
            break
          }
        }
      }
      
      // Dynamic pricing based on time
      let price = court.pricePerHour
      const hour = currentTime.getHours()
      if (hour >= 18 && hour < 21) {
        price = Math.round(price * 1.2) // 20% more expensive in evening
      } else if (hour >= 21 || hour < 7) {
        price = Math.round(price * 0.8) // 20% cheaper late night/early morning
      }
      
      slots.push({
        time: timeString,
        available: isAvailable,
        price: Math.round((price * duration) / 60)
      })
      
      currentTime = addMinutes(currentTime, 30) // 30 minute intervals
    }
    
    setTimeSlots(slots)
  }

  const handleTimeSelect = () => {
    if (!selectedTime) return
    const currentDate = dateOptions[selectedDateIndex]?.date || selectedDate
    const dateString = format(currentDate, 'yyyy-MM-dd')
    navigate(`/club/${clubId}/court/${courtId}/game-type?date=${dateString}&time=${selectedTime}&duration=${duration}`)
  }

  const handleDateChange = (index: number) => {
    setSelectedDateIndex(index)
    setSelectedTime(null)
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'var(--white)',
        padding: 'var(--spacing-md) var(--spacing-xl)',
        boxShadow: 'var(--shadow-sm)'
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
            <h1 className="h3" style={{ marginBottom: '4px' }}>Выберите время</h1>
            {court && venue && (
              <p className="caption">{venue.name} • {court.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Date selector */}
      <div style={{ 
        height: '90px',
        padding: 'var(--spacing-md) 0',
        backgroundColor: 'var(--white)',
        borderBottom: '1px solid var(--divider)'
      }}>
        <div style={{
          display: 'flex',
          gap: 'var(--spacing-sm)',
          padding: '0 var(--spacing-xl)',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          {dateOptions.map((dateOption, index) => {
            const isSelected = selectedDateIndex === index
            return (
              <button
                key={index}
                onClick={() => handleDateChange(index)}
                style={{
                  minWidth: '60px',
                  height: '60px',
                  backgroundColor: isSelected ? 'var(--primary)' : 'var(--white)',
                  color: isSelected ? 'white' : 'var(--dark)',
                  border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--extra-light-gray)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <span className="caption-bold">{dateOption.day}</span>
                <span className="body-bold">{dateOption.dayNumber}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Duration selector */}
      <div style={{ padding: 'var(--spacing-xl) var(--spacing-xl) 0' }}>
        <h3 className="body-bold" style={{ marginBottom: 'var(--spacing-md)' }}>
          Длительность игры
        </h3>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          {[60, 90, 120].map((dur) => {
            const isAvailable = availableDurations.includes(dur)
            return (
              <button
                key={dur}
                onClick={() => {
                  if (isAvailable) {
                    setDuration(dur)
                    setSelectedTime(null)
                  }
                }}
                disabled={!isAvailable}
                style={{
                  flex: 1,
                  padding: 'var(--spacing-sm)',
                  backgroundColor: duration === dur ? 'var(--primary)' : isAvailable ? 'var(--white)' : 'var(--extra-light-gray)',
                  color: duration === dur ? 'white' : isAvailable ? 'var(--dark)' : 'var(--gray)',
                  border: `2px solid ${duration === dur ? 'var(--primary)' : 'var(--extra-light-gray)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: isAvailable ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  fontSize: 'var(--text-body)',
                  transition: 'all 0.2s',
                  opacity: isAvailable ? 1 : 0.5
                }}
              >
                {dur === 60 ? '1 час' : dur === 90 ? '1.5 часа' : '2 часа'}
              </button>
            )
          })}
        </div>
      </div>

      {/* Time slots grid */}
      <div style={{ padding: 'var(--spacing-xl)' }}>
        <h3 className="body-bold" style={{ marginBottom: 'var(--spacing-md)' }}>
          Свободное время
        </h3>
        
        {timeSlots.length === 0 ? (
          <div className="flutter-card" style={{ 
            textAlign: 'center', 
            padding: 'var(--spacing-2xl)' 
          }}>
            <p className="body" style={{ color: 'var(--gray)' }}>
              Нет доступных слотов на выбранную дату
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            marginBottom: 'calc(120px + var(--spacing-xl))'
          }}>
            {timeSlots.map((slot) => {
              const isSelected = selectedTime === slot.time
              return (
                <button
                  key={slot.time}
                  onClick={() => slot.available && setSelectedTime(slot.time)}
                  disabled={!slot.available}
                  style={{
                    padding: 'var(--spacing-sm) var(--spacing-xs)',
                    backgroundColor: !slot.available 
                      ? 'var(--busy)' 
                      : isSelected 
                        ? 'var(--primary)' 
                        : 'var(--primary-light)',
                    color: !slot.available 
                      ? 'var(--busy-text)' 
                      : isSelected 
                        ? 'white' 
                        : 'var(--dark)',
                    border: `2px solid ${
                      !slot.available 
                        ? 'var(--busy)' 
                        : isSelected 
                          ? 'var(--primary)' 
                          : 'var(--available)'
                    }`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: slot.available ? 'pointer' : 'not-allowed',
                    opacity: 1,
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    height: '60px',
                    justifyContent: 'center'
                  }}
                >
                  <span className="body-bold">{slot.time}</span>
                  {slot.available ? (
                    <span className="caption" 
                          style={{ 
                            color: isSelected ? 'white' : 'var(--primary-dark)',
                            fontSize: 'var(--text-caption)'
                          }}>
                      {isSelected ? 'Выбрано' : `${slot.price}₽`}
                    </span>
                  ) : (
                    <span className="caption" style={{ color: 'var(--busy-text)' }}>
                      Занято
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ 
        padding: '0 var(--spacing-xl) var(--spacing-xl)',
        display: 'flex',
        gap: 'var(--spacing-lg)',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
          <div style={{
            width: '16px',
            height: '16px',
            backgroundColor: 'var(--white)',
            border: '2px solid var(--extra-light-gray)',
            borderRadius: '4px'
          }}></div>
          <span className="caption">Свободно</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
          <div style={{
            width: '16px',
            height: '16px',
            backgroundColor: 'var(--busy)',
            borderRadius: '4px'
          }}></div>
          <span className="caption">Занято</span>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="sticky-bottom-bar" style={{
        padding: 'var(--spacing-xl)',
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 'var(--spacing-sm)'
        }}>
          <span className="body-small" style={{ color: 'var(--gray)' }}>
            {selectedTime && dateOptions[selectedDateIndex] && 
              `${format(dateOptions[selectedDateIndex].date, 'd MMMM', { locale: ru })}, ${selectedTime}-${format(addMinutes(parse(selectedTime, 'HH:mm', new Date()), duration), 'HH:mm')}`
            }
          </span>
          {selectedTime && timeSlots.find(s => s.time === selectedTime)?.available && (
            <span className="h2">
              {timeSlots.find(s => s.time === selectedTime)?.price} ₽
            </span>
          )}
        </div>
        <button
          className="flutter-button"
          style={{ width: '100%' }}
          onClick={handleTimeSelect}
          disabled={!selectedTime}
        >
          Далее
        </button>
      </div>
    </div>
  )
}