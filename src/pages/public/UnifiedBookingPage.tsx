import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parse, addMinutes, isAfter, isBefore, startOfToday, isToday, addDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { calculateCourtPrice } from '../../utils/pricing'
import '../../styles/flutter-theme.css'

interface Court {
  id: string
  name: string
  type: 'padel' | 'tennis' | 'badminton'
  pricePerHour: number
  priceWeekday?: number
  priceWeekend?: number
  pricing?: any
  holidayPricing?: any[]
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
  bookingSlotInterval?: number // 30 или 60 минут
}

interface Booking {
  id: string
  courtId: string
  date: string
  startTime: string
  endTime: string
  status: 'confirmed' | 'pending' | 'cancelled'
  paymentStatus?: 'awaiting_payment' | 'paid' | 'online_payment' | 'cancelled' | 'refunded' | 'error' | 'expired' | 'not_required'
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
  month?: string
}

export default function UnifiedBookingPage() {
  const { clubId, courtId } = useParams<{ clubId: string; courtId: string }>()
  const navigate = useNavigate()
  
  // Получаем trainer ID из query параметров
  const searchParams = new URLSearchParams(window.location.search)
  const trainerId = searchParams.get('trainer')
  
  const [court, setCourt] = useState<Court | null>(null)
  const [venue, setVenue] = useState<Venue | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [duration, setDuration] = useState<number>(60)
  const [availableDurations, setAvailableDurations] = useState<number[]>([60, 90, 120])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [dateOptions, setDateOptions] = useState<DateOption[]>([])
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [selectedTrainer, setSelectedTrainer] = useState<any>(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    generateDateOptions()
  }, [])

  useEffect(() => {
    loadData()
  }, [clubId, courtId])

  useEffect(() => {
    if (trainerId && clubId) {
      loadTrainerData(trainerId)
    }
  }, [trainerId, clubId])

  useEffect(() => {
    if (venue && court) {
      loadBookingsAndGenerateTimeSlots()
    }
  }, [venue, court, selectedDate, duration])

  const generateDateOptions = () => {
    const options: DateOption[] = []
    const daysOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
    
    for (let i = 0; i < 14; i++) {
      const date = addDays(startOfToday(), i)
      options.push({
        date,
        day: daysOfWeek[date.getDay()],
        dayNumber: format(date, 'd'),
        month: i === 0 || date.getDate() === 1 ? months[date.getMonth()] : undefined
      })
    }
    
    setDateOptions(options)
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
        
        // Update available durations
        if (venueData.bookingDurations) {
          const durations = [60, 90, 120].filter(d => venueData.bookingDurations![d] !== false)
          setAvailableDurations(durations)
          if (!durations.includes(duration)) {
            setDuration(durations[0] || 60)
          }
        }
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Ошибка при загрузке данных')
      setLoading(false)
    }
  }

  const loadTrainerData = async (trainerId: string) => {
    try {
      const trainerDoc = await getDoc(doc(db, 'trainers', trainerId))
      if (trainerDoc.exists()) {
        const trainerData = { id: trainerDoc.id, ...trainerDoc.data() }
        setSelectedTrainer(trainerData)
        
        // Если тренер найден, можно показать информацию о нем
        console.log('Загружен тренер:', trainerData)
      }
    } catch (err) {
      console.error('Error loading trainer:', err)
    }
  }

  const loadBookingsAndGenerateTimeSlots = async () => {
    if (!venue?.workingHours || !court) return

    try {
      // Load bookings for selected date
      const dateString = format(selectedDate, 'yyyy-MM-dd')
      
      // Используем Timestamp для запроса (все даты теперь в формате Timestamp)
      const startOfDay = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0))
      const endOfDay = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59))
      
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('courtId', '==', courtId),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
      )
      const bookingsSnapshot = await getDocs(bookingsQuery)
      
      // Фильтруем бронирования согласно логике из админки
      const bookingsData = bookingsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Booking[]
      
      // Применяем ту же логику, что и в админке для определения занятости корта
      const occupiedBookings = bookingsData.filter(booking => {
        const status = booking.status || 'pending'
        const paymentStatus = booking.paymentStatus || 'awaiting_payment'
        
        return (
          status !== 'cancelled' && 
          paymentStatus !== 'cancelled' && 
          paymentStatus !== 'refunded' &&
          paymentStatus !== 'error' &&
          (
            status === 'confirmed' || 
            status === 'pending' ||
            paymentStatus === 'paid' || 
            paymentStatus === 'awaiting_payment'
          )
        )
      })
      
      setBookings(occupiedBookings)
      generateTimeSlots(occupiedBookings)
    } catch (err) {
      console.error('Error loading bookings:', err)
    }
  }

  const generateTimeSlots = (bookingsData: Booking[]) => {
    if (!venue?.workingHours || !court) return

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayOfWeek = days[selectedDate.getDay()]
    const hours = venue.workingHours[dayOfWeek]
    
    if (!hours) return

    const slots: TimeSlot[] = []
    const openTime = parse(hours.open, 'HH:mm', selectedDate)
    const closeTime = parse(hours.close, 'HH:mm', selectedDate)
    
    // Используем интервал слотов из настроек venue (по умолчанию 60 минут)
    const slotInterval = venue.bookingSlotInterval || 60
    
    let currentTime = openTime
    const now = new Date()
    
    // Если интервал 60 минут, начинаем с ближайшего целого часа
    if (slotInterval === 60 && currentTime.getMinutes() !== 0) {
      const minutes = currentTime.getMinutes()
      if (minutes < 30) {
        currentTime = new Date(currentTime.setMinutes(0))
      } else {
        currentTime = addMinutes(new Date(currentTime.setMinutes(0)), 60)
      }
    }

    while (isBefore(currentTime, closeTime)) {
      const timeString = format(currentTime, 'HH:mm')
      const endTime = addMinutes(currentTime, duration)
      
      let isAvailable = true
      if (isToday(selectedDate) && isBefore(currentTime, now)) {
        isAvailable = false
      }
      
      if (isAfter(endTime, closeTime)) {
        isAvailable = false
      }
      
      if (isAvailable) {
        for (const booking of bookingsData) {
          const bookingStart = parse(booking.startTime, 'HH:mm', selectedDate)
          const bookingEnd = parse(booking.endTime, 'HH:mm', selectedDate)
          
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
      
      // Calculate price using the pricing utility
      const bookingDate = selectedDate
      const price = calculateCourtPrice(
        bookingDate,
        timeString,
        duration, // duration already in minutes
        court.pricing,
        court.holidayPricing,
        court.priceWeekday,
        court.priceWeekend || court.pricePerHour
      )
      
      slots.push({
        time: timeString,
        available: isAvailable,
        price: Math.round(price)
      })
      
      currentTime = addMinutes(currentTime, slotInterval) // Используем интервал из настроек
    }
    
    setTimeSlots(slots)
  }

  const handleContinue = () => {
    if (!selectedTime) return
    const dateString = format(selectedDate, 'yyyy-MM-dd')
    let url = `/club/${clubId}/court/${courtId}/game-type?date=${dateString}&time=${selectedTime}&duration=${duration}`
    
    // Добавляем параметр тренера, если он был передан
    if (trainerId) {
      url += `&trainer=${trainerId}`
    }
    
    navigate(url)
  }

  const shouldDisableDate = (date: Date) => {
    const today = startOfToday()
    if (date < today) return true
    
    const maxDate = addDays(today, 30)
    if (date > maxDate) return true
    
    if (venue?.workingHours) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayOfWeek = days[date.getDay()]
      const hours = venue.workingHours[dayOfWeek]
      
      if (!hours || (!hours.open && !hours.close)) {
        return true
      }
    }
    
    return false
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
        boxShadow: 'var(--shadow-sm)',
        position: 'sticky',
        top: 0,
        zIndex: 10
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
              <p className="caption">
                {venue.name} • {court.name}
                {selectedTrainer && ` • Тренер: ${selectedTrainer.firstName} ${selectedTrainer.lastName}`}
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={{ 
        padding: isMobile ? 'var(--spacing-md)' : 'var(--spacing-xl)',
        paddingBottom: isMobile ? 'calc(140px + var(--spacing-xl))' : 'var(--spacing-xl)',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Desktop layout with grid */}
        <div style={{
          display: isMobile ? 'block' : 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr',
          gap: 'var(--spacing-xl)'
        }}>
          {/* Left column - Date and Duration */}
          <div>
            {/* Date selector */}
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
              <h3 className="body-bold" style={{ marginBottom: 'var(--spacing-md)' }}>
                Выберите дату
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 'var(--spacing-sm)'
              }}>
                {dateOptions.map((dateOption, index) => {
                  const isSelected = format(selectedDate, 'yyyy-MM-dd') === format(dateOption.date, 'yyyy-MM-dd')
                  const isDisabled = shouldDisableDate(dateOption.date)
                  const isToday = index === 0
                  
                  return (
                    <div key={index} style={{ textAlign: 'center' }}>
                      {dateOption.month && (
                        <div className="caption" style={{ 
                          marginBottom: 'var(--spacing-xs)', 
                          color: 'var(--gray)',
                          height: '16px'
                        }}>
                          {dateOption.month}
                        </div>
                      )}
                      {!dateOption.month && <div style={{ height: '16px', marginBottom: 'var(--spacing-xs)' }}></div>}
                      <button
                        onClick={() => !isDisabled && setSelectedDate(dateOption.date)}
                        disabled={isDisabled}
                        style={{
                          width: '100%',
                          aspectRatio: '1',
                          backgroundColor: isSelected ? 'var(--primary)' : isDisabled ? 'var(--extra-light-gray)' : 'var(--white)',
                          color: isSelected ? 'white' : isDisabled ? 'var(--gray)' : 'var(--dark)',
                          border: `2px solid ${isSelected ? 'var(--primary)' : isToday && !isDisabled ? 'var(--primary)' : 'var(--extra-light-gray)'}`,
                          borderRadius: 'var(--radius-md)',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                          opacity: isDisabled ? 0.5 : 1,
                          fontSize: 'var(--text-caption)'
                        }}
                      >
                        <span className="caption-bold">{dateOption.day}</span>
                        <span className="body-bold">{dateOption.dayNumber}</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Duration selector */}
            <div>
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
                        padding: 'var(--spacing-md)',
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
          </div>

          {/* Right column - Time slots */}
          <div>
            <h3 className="body-bold" style={{ marginBottom: 'var(--spacing-md)' }}>
              Свободное время на {format(selectedDate, 'd MMMM', { locale: ru })}
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
                gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
                gap: 'var(--spacing-sm)'
              }}>
                {timeSlots.map((slot) => {
                  const isSelected = selectedTime === slot.time
                  return (
                    <button
                      key={slot.time}
                      onClick={() => slot.available && setSelectedTime(slot.time)}
                      disabled={!slot.available}
                      style={{
                        padding: 'var(--spacing-md) var(--spacing-xs)',
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
                        gap: '4px',
                        minHeight: isMobile ? '60px' : '70px',
                        justifyContent: 'center'
                      }}
                    >
                      <span className="body-bold" style={{ fontSize: '14px' }}>
                        {slot.time}-{(() => {
                          const [hours, minutes] = slot.time.split(':').map(Number)
                          const endTime = addMinutes(parse(slot.time, 'HH:mm', new Date()), duration)
                          return format(endTime, 'HH:mm')
                        })()}
                      </span>
                      {slot.available ? (
                        isSelected && (
                          <span className="caption" 
                                style={{ 
                                  color: 'white',
                                  fontSize: 'var(--text-caption)'
                                }}>
                            Выбрано
                          </span>
                        )
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

            {/* Legend */}
            <div style={{ 
              marginTop: 'var(--spacing-lg)',
              display: 'flex',
              gap: 'var(--spacing-lg)',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  backgroundColor: 'var(--primary-light)',
                  border: '2px solid var(--available)',
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
          </div>
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
            {selectedTime && 
              `${format(selectedDate, 'd MMMM', { locale: ru })}, ${selectedTime}-${format(addMinutes(parse(selectedTime, 'HH:mm', new Date()), duration), 'HH:mm')}`
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
          onClick={handleContinue}
          disabled={!selectedTime}
        >
          Далее
        </button>
      </div>
    </div>
  )
}