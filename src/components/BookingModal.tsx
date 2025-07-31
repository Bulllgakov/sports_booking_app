import React, { useState, useEffect } from 'react'
import { format, addDays, startOfToday, parse, isBefore, isAfter, setHours, setMinutes } from 'date-fns'
import { ru } from 'date-fns/locale'
import { collection, query, where, getDocs, Timestamp, addDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase'
import '../styles/flutter-theme.css'
import { 
  isValidEmail, 
  isValidPhone, 
  isValidName,
  normalizePhone,
  sanitizeString,
  isValidBookingDate,
  isValidBookingTime
} from '../utils/validation'

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  court: {
    id: string
    name: string
    type: 'padel' | 'tennis' | 'badminton'
    pricePerHour?: number
    priceWeekday?: number
    priceWeekend?: number
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
  venue: {
    id: string
    name: string
    workingHours?: {
      [key: string]: string | { open: string; close: string }
    }
    bookingDurations?: {
      [key: number]: boolean
    }
    bookingSlotInterval?: 30 | 60 // Интервал слотов: 30 минут (по умолчанию) или 60 минут (только с 00)
  }
}

interface TimeSlot {
  time: string
  available: boolean
  price: number
}

export default function BookingModal({ isOpen, onClose, court, venue }: BookingModalProps) {
  const [step, setStep] = useState<'datetime' | 'gameType' | 'payment'>('datetime')
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday())
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [selectedDuration, setSelectedDuration] = useState<number>(60)
  const [selectedGameType, setSelectedGameType] = useState<'private' | 'open'>('private')
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    // При открытии модального окна устанавливаем первую доступную длительность
    if (isOpen) {
      console.log('Modal opened, venue:', venue, 'bookingDurations:', venue.bookingDurations)
      
      // Используем длительности из настроек клуба или все по умолчанию
      const bookingDurations = venue.bookingDurations || { 60: true, 90: true, 120: true }
      const availableDurations = [60, 90, 120].filter(d => bookingDurations[d] !== false)
      console.log('Available durations:', availableDurations)
      
      if (availableDurations.length > 0 && !availableDurations.includes(selectedDuration)) {
        setSelectedDuration(availableDurations[0])
      }
      
      // Сбрасываем состояние при открытии
      setStep('datetime')
      setSelectedTime('')
      setTimeSlots([])
      
      // Загружаем слоты времени при открытии
      if (court && venue) {
        loadTimeSlots()
      }
    } else {
      // Отписываемся от подписки при закрытии
      if (unsubscribe) {
        unsubscribe()
        setUnsubscribe(null)
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (step === 'datetime' && selectedDate && court && venue) {
      loadTimeSlots()
      
      // Настраиваем real-time подписку на изменения бронирований
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)

      // For real-time updates, we need to listen to both formats
      const dateString = format(selectedDate, 'yyyy-MM-dd')
      
      // Create two queries for different date formats
      const stringDateQuery = query(
        collection(db, 'bookings'),
        where('courtId', '==', court.id),
        where('date', '==', dateString),
        where('status', 'in', ['confirmed', 'pending'])
      )
      
      const timestampDateQuery = query(
        collection(db, 'bookings'),
        where('courtId', '==', court.id),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay)),
        where('status', 'in', ['confirmed', 'pending'])
      )

      // Subscribe to both queries
      const unsub1 = onSnapshot(stringDateQuery, (snapshot) => {
        console.log('Real-time update: bookings changed (string date)', snapshot.docs.length, 'bookings')
        snapshot.docs.forEach(doc => {
          console.log('Booking:', doc.id, doc.data())
        })
        loadTimeSlots() // Перезагружаем слоты при изменениях
      })
      
      const unsub2 = onSnapshot(timestampDateQuery, (snapshot) => {
        console.log('Real-time update: bookings changed (timestamp date)', snapshot.docs.length, 'bookings')
        snapshot.docs.forEach(doc => {
          console.log('Booking:', doc.id, doc.data())
        })
        loadTimeSlots() // Перезагружаем слоты при изменениях
      })
      
      // Return combined unsubscribe function
      const unsub = () => {
        unsub1()
        unsub2()
      }

      setUnsubscribe(() => unsub)
    }
    
    // Отписываемся от подписки при изменении шага или закрытии
    return () => {
      if (unsubscribe) {
        unsubscribe()
        setUnsubscribe(null)
      }
    }
  }, [step, selectedDate, selectedDuration, court.id, venue.id])

  const loadTimeSlots = async (durationOverride?: number, dateOverride?: Date) => {
    const currentDuration = durationOverride || selectedDuration
    const currentDate = dateOverride || selectedDate
    console.log('Loading time slots for:', {
      date: currentDate,
      courtId: court.id,
      courtName: court.name,
      venue: venue.name,
      duration: currentDuration,
      workingHours: venue.workingHours
    })
    setLoading(true)
    try {
      // Get existing bookings for the selected date
      const startOfDay = new Date(currentDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(currentDate)
      endOfDay.setHours(23, 59, 59, 999)

      // First try to query with string date format (used by public pages)
      const dateString = format(currentDate, 'yyyy-MM-dd')
      let bookingsQuery = query(
        collection(db, 'bookings'),
        where('courtId', '==', court.id),
        where('date', '==', dateString),
        where('status', 'in', ['confirmed', 'pending'])
      )

      let bookingsSnapshot = await getDocs(bookingsQuery)
      
      // If no results, try with Timestamp format (used by admin pages)
      if (bookingsSnapshot.empty) {
        bookingsQuery = query(
          collection(db, 'bookings'),
          where('courtId', '==', court.id),
          where('date', '>=', Timestamp.fromDate(startOfDay)),
          where('date', '<=', Timestamp.fromDate(endOfDay)),
          where('status', 'in', ['confirmed', 'pending'])
        )
        bookingsSnapshot = await getDocs(bookingsQuery)
      }
      
      const bookings = bookingsSnapshot.docs.map(doc => {
        const data = doc.data()
        // Поддержка обоих форматов времени и длительности
        let duration = data.duration || 60
        
        // Логируем для отладки
        console.log('Processing booking:', doc.id, {
          duration: data.duration,
          amount: data.amount,
          price: data.price,
          startTime: data.startTime,
          endTime: data.endTime
        })
        
        return {
          time: data.time || data.startTime,
          startTime: data.startTime || data.time,
          endTime: data.endTime,
          duration: duration
        }
      })
      
      console.log('Found bookings:', bookings.length, bookings)

      // Generate time slots based on working hours
      const dayOfWeek = currentDate.getDay() // 0 = Sunday, 1 = Monday, etc.
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayName = days[dayOfWeek]
      
      console.log('Day of week:', dayOfWeek, 'Day name:', dayName, 'Is weekend:', isWeekend, 'Working hours:', venue.workingHours)
      
      const slots: TimeSlot[] = []
      
      // Парсим время работы - поддерживаем оба формата
      let openTime = '07:00'
      let closeTime = '23:00'
      
      // Проверяем формат с днями недели (monday, tuesday, etc.)
      if (venue.workingHours?.[dayName]) {
        const dayHours = venue.workingHours[dayName]
        console.log('Found day-specific hours:', dayName, dayHours)
        if (typeof dayHours === 'object' && dayHours.open && dayHours.close) {
          openTime = dayHours.open
          closeTime = dayHours.close
        } else if (typeof dayHours === 'string' && dayHours.includes('-')) {
          const [open, close] = dayHours.split('-').map(t => t.trim())
          if (open && close) {
            openTime = open
            closeTime = close
          }
        }
      } 
      // Проверяем формат weekday/weekend
      else if (venue.workingHours) {
        const workingHoursStr = venue.workingHours[isWeekend ? 'weekend' : 'weekday']
        console.log('Using weekday/weekend format:', isWeekend ? 'weekend' : 'weekday', workingHoursStr)
        if (typeof workingHoursStr === 'string' && workingHoursStr.includes('-')) {
          const [open, close] = workingHoursStr.split('-').map(t => t.trim())
          if (open && close) {
            openTime = open
            closeTime = close
          }
        } else if (typeof workingHoursStr === 'object' && workingHoursStr.open && workingHoursStr.close) {
          openTime = workingHoursStr.open
          closeTime = workingHoursStr.close
        }
      } else {
        console.log('No working hours found, using defaults')
      }
      
      console.log('Working hours parsed:', { openTime, closeTime })
      
      const [openHour, openMinute] = openTime.split(':').map(Number)
      const [closeHour, closeMinute] = closeTime.split(':').map(Number)
      
      const now = new Date()
      const isToday = format(currentDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')

      // Генерируем слоты с интервалом равным выбранной длительности
      let currentTime = openHour * 60 + openMinute // в минутах
      const endTimeMinutes = closeHour * 60 + closeMinute
      
      // Определяем интервал слотов (по умолчанию 30 минут)
      const slotInterval = venue.bookingSlotInterval || 30
      
      // Если интервал 60 минут, начинаем с ближайшего целого часа
      if (slotInterval === 60 && currentTime % 60 !== 0) {
        currentTime = Math.ceil(currentTime / 60) * 60
      }
      
      while (currentTime < endTimeMinutes) {
        const hour = Math.floor(currentTime / 60)
        const minute = currentTime % 60
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const slotTime = setMinutes(setHours(new Date(currentDate), hour), minute)
        
        // Skip past times for today
        if (isToday && isBefore(slotTime, now)) {
          currentTime += slotInterval
          continue
        }
        
        // Проверяем, что слот + длительность не выходит за время закрытия
        if (currentTime + currentDuration > endTimeMinutes) {
          break
        }

        // Проверяем доступность слота с учетом пересечений
        let isAvailable = true
        
        // Проверяем пересечение с существующими бронированиями
        for (const booking of bookings) {
          // Парсим время бронирования
          const bookingTimeParts = booking.startTime.split(':')
          if (bookingTimeParts.length !== 2) continue
          
          const bookingHour = parseInt(bookingTimeParts[0])
          const bookingMinute = parseInt(bookingTimeParts[1])
          const bookingStartMinutes = bookingHour * 60 + bookingMinute
          const bookingEndMinutes = bookingStartMinutes + booking.duration
          
          // Проверяем пересечение времени
          const slotEndMinutes = currentTime + currentDuration
          if ((currentTime < bookingEndMinutes && slotEndMinutes > bookingStartMinutes)) {
            isAvailable = false
            break
          }
        }

        // Определяем цену в зависимости от дня недели, времени и длительности
        const dayIndex = currentDate.getDay()
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        const dayName = days[dayIndex]
        
        let hourlyPrice = 0
        
        // Проверяем новую систему цен
        if (court.pricing && court.pricing[dayName]) {
          const dayPricing = court.pricing[dayName]
          hourlyPrice = dayPricing.basePrice
          
          // Проверяем интервалы с особыми ценами
          if (dayPricing.intervals && dayPricing.intervals.length > 0) {
            const currentHour = hour
            for (const interval of dayPricing.intervals) {
              const [fromHour] = interval.from.split(':').map(Number)
              const [toHour] = interval.to.split(':').map(Number)
              if (currentHour >= fromHour && currentHour < toHour) {
                hourlyPrice = interval.price
                break
              }
            }
          }
        } else {
          // Fallback на старую систему
          const isWeekendDay = dayIndex === 0 || dayIndex === 6
          hourlyPrice = court.pricePerHour || (isWeekendDay ? court.priceWeekend : court.priceWeekday) || 0
        }
        
        const totalPrice = Math.round(hourlyPrice * currentDuration / 60)

        slots.push({
          time: timeString,
          available: isAvailable,
          price: totalPrice
        })
        
        // Переходим к следующему слоту с заданным интервалом
        currentTime += slotInterval
      }

      setTimeSlots(slots)
      console.log('Loaded time slots:', slots.length, slots)
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
    // Загружаем слоты времени сразу при выборе даты
    loadTimeSlots(selectedDuration, date)
  }

  const handleTimeSelect = async (time: string) => {
    // Проверяем доступность перед переходом к следующему шагу
    setLoading(true)
    try {
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)

      // First try string date format
      const dateString = format(selectedDate, 'yyyy-MM-dd')
      let bookingsQuery = query(
        collection(db, 'bookings'),
        where('courtId', '==', court.id),
        where('date', '==', dateString),
        where('status', 'in', ['confirmed', 'pending'])
      )

      let bookingsSnapshot = await getDocs(bookingsQuery)
      
      // If no results, try Timestamp format
      if (bookingsSnapshot.empty) {
        bookingsQuery = query(
          collection(db, 'bookings'),
          where('courtId', '==', court.id),
          where('date', '>=', Timestamp.fromDate(startOfDay)),
          where('date', '<=', Timestamp.fromDate(endOfDay)),
          where('status', 'in', ['confirmed', 'pending'])
        )
        bookingsSnapshot = await getDocs(bookingsQuery)
      }
      
      const bookings = bookingsSnapshot.docs.map(doc => {
        const data = doc.data()
        // Поддержка обоих форматов времени и длительности
        let duration = data.duration || 60
        
        // Логируем для отладки
        console.log('Processing booking:', doc.id, {
          duration: data.duration,
          amount: data.amount,
          price: data.price,
          startTime: data.startTime,
          endTime: data.endTime
        })
        
        return {
          time: data.time || data.startTime,
          startTime: data.startTime || data.time,
          endTime: data.endTime,
          duration: duration
        }
      })

      // Проверяем выбранный слот
      const [slotHour, slotMinute] = time.split(':').map(Number)
      const slotStartMinutes = slotHour * 60 + slotMinute
      const slotEndMinutes = slotStartMinutes + selectedDuration

      let isStillAvailable = true
      for (const booking of bookings) {
        const bookingTimeParts = booking.startTime.split(':')
        if (bookingTimeParts.length !== 2) continue
        
        const bookingHour = parseInt(bookingTimeParts[0])
        const bookingMinute = parseInt(bookingTimeParts[1])
        const bookingStartMinutes = bookingHour * 60 + bookingMinute
        const bookingEndMinutes = bookingStartMinutes + booking.duration
        
        if ((slotStartMinutes < bookingEndMinutes && slotEndMinutes > bookingStartMinutes)) {
          isStillAvailable = false
          break
        }
      }

      if (!isStillAvailable) {
        alert('К сожалению, это время было только что забронировано. Пожалуйста, выберите другое время.')
        await loadTimeSlots() // Обновляем слоты
        return
      }

      setSelectedTime(time)
      setStep('gameType')
    } catch (error) {
      console.error('Error checking availability:', error)
      alert('Ошибка проверки доступности. Попробуйте еще раз.')
    } finally {
      setLoading(false)
    }
  }

  const handleGameTypeSelect = (type: 'private' | 'open') => {
    setSelectedGameType(type)
  }

  const handleConfirmBooking = async () => {
    // Базовая проверка заполненности
    if (!customerName || !customerPhone || !customerEmail || !cardNumber || !cardExpiry || !cardCvc) {
      alert('Пожалуйста, заполните все поля')
      return
    }
    
    // Валидация данных клиента
    if (!isValidName(customerName)) {
      alert('Имя должно быть от 2 до 100 символов')
      return
    }
    
    if (!isValidPhone(customerPhone)) {
      alert('Некорректный номер телефона')
      return
    }
    
    if (!isValidEmail(customerEmail)) {
      alert('Некорректный email')
      return
    }
    
    // Проверка даты бронирования
    if (!isValidBookingDate(selectedDate)) {
      alert('Нельзя забронировать на прошедшую дату')
      return
    }

    setLoading(true)
    try {
      // Рассчитываем время окончания
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const startTime = new Date(selectedDate)
      startTime.setHours(hours, minutes, 0, 0)
      const endTime = new Date(startTime.getTime() + selectedDuration * 60 * 1000)
      
      // Находим выбранный слот для получения цены
      const selectedSlot = timeSlots.find(slot => slot.time === selectedTime)
      
      const bookingData = {
        courtId: court.id,
        courtName: court.name,
        venueId: venue.id,
        venueName: venue.name,
        date: format(selectedDate, 'yyyy-MM-dd'), // Используем строковый формат для совместимости
        time: selectedTime, // Для обратной совместимости
        startTime: selectedTime,
        endTime: `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`,
        duration: selectedDuration,
        gameType: selectedGameType,
        customerName: sanitizeString(customerName),
        customerPhone: normalizePhone(customerPhone),
        customerEmail: customerEmail.toLowerCase().trim(),
        clientName: sanitizeString(customerName), // Для совместимости с веб-версией
        clientPhone: normalizePhone(customerPhone),
        price: selectedSlot ? selectedSlot.price : 0,
        amount: selectedSlot ? selectedSlot.price : 0,
        status: 'confirmed', // После оплаты статус confirmed
        paymentStatus: 'online_payment', // Онлайн оплата для клиентов
        paymentMethod: 'online',
        paymentHistory: [{
          timestamp: Timestamp.now(),
          action: 'created',
          userId: 'web-client',
          userName: customerName
        }],
        createdBy: {
          userId: 'web-client',
          userName: customerName,
          userRole: 'client'
        },
        createdAt: new Date(), // Используем обычную дату вместо Timestamp
        source: 'web' // Добавляем источник для совместимости
      }

      // В реальном приложении здесь бы была интеграция с платежной системой
      // await processPayment(cardNumber, cardExpiry, cardCvc, bookingData.price)
      
      const docRef = await addDoc(collection(db, 'bookings'), bookingData)
      alert(`Бронирование успешно оплачено и создано! ID: ${docRef.id}`)
      onClose()
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Ошибка при создании бронирования')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const renderDateTimeStep = () => {
    const dates = []
    const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
    const daysOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    
    for (let i = 0; i < 14; i++) {
      dates.push(addDays(startOfToday(), i))
    }

    return (
      <>
        <h3 className="h3" style={{ marginBottom: 'var(--spacing-lg)' }}>
          Выберите дату и время
        </h3>

        <div style={{
          display: isMobile ? 'block' : 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '300px 1fr',
          gap: 'var(--spacing-xl)'
        }}>
          {/* Левая колонка - Дата и длительность */}
          <div>
            {/* Выбор даты */}
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
              <h4 className="body-bold" style={{ marginBottom: 'var(--spacing-md)' }}>
                Дата бронирования
              </h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 'var(--spacing-xs)'
              }}>
                {dates.map((date, index) => {
                  const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                  const isToday = index === 0
                  const dayOfWeek = daysOfWeek[date.getDay()]
                  const showMonth = index === 0 || date.getDate() === 1
                  
                  return (
                    <div key={date.toISOString()} style={{ textAlign: 'center' }}>
                      {showMonth && (
                        <div className="caption" style={{ 
                          marginBottom: 'var(--spacing-xs)', 
                          color: 'var(--gray)',
                          height: '16px',
                          fontSize: '11px'
                        }}>
                          {months[date.getMonth()]}
                        </div>
                      )}
                      {!showMonth && <div style={{ height: '16px', marginBottom: 'var(--spacing-xs)' }}></div>}
                      <button
                        onClick={() => handleDateSelect(date)}
                        style={{
                          width: '100%',
                          aspectRatio: '1',
                          padding: '4px',
                          border: `2px solid ${isSelected ? 'var(--primary)' : isToday ? 'var(--primary)' : 'var(--extra-light-gray)'}`,
                          borderRadius: 'var(--radius-sm)',
                          background: isSelected ? 'var(--primary)' : 'var(--white)',
                          color: isSelected ? 'white' : 'var(--dark)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px'
                        }}
                      >
                        <div className="caption" style={{ 
                          fontWeight: 600,
                          color: isSelected ? 'white' : 'var(--gray)'
                        }}>{dayOfWeek}</div>
                        <div className="body-bold" style={{
                          fontSize: '16px',
                          color: isSelected ? 'white' : 'var(--dark)'
                        }}>{date.getDate()}</div>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Выбор длительности */}
            <div>
              <h4 className="body-bold" style={{ marginBottom: 'var(--spacing-md)' }}>
                Длительность игры
              </h4>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                {[60, 90, 120].map((duration) => {
                  const bookingDurations = venue.bookingDurations || { 60: true, 90: true, 120: true }
                  const isAvailable = bookingDurations[duration] !== false
                  
                  // Не показываем недоступные длительности
                  if (!isAvailable) return null
                  
                  const dayIndex = selectedDate.getDay()
                  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
                  const dayName = days[dayIndex]
                  
                  let hourlyPrice = 0
                  if (court.pricing && court.pricing[dayName]) {
                    hourlyPrice = court.pricing[dayName].basePrice
                  } else {
                    const isWeekend = dayIndex === 0 || dayIndex === 6
                    hourlyPrice = court.pricePerHour || (isWeekend ? court.priceWeekend : court.priceWeekday) || 0
                  }
                  const price = Math.round(hourlyPrice * duration / 60)
                  
                  return (
                    <button
                      key={duration}
                      onClick={() => {
                        if (duration !== selectedDuration) {
                          setSelectedDuration(duration)
                          setSelectedTime('')
                          loadTimeSlots(duration)
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: isMobile ? 'var(--spacing-sm) var(--spacing-xs)' : 'var(--spacing-md)',
                        border: `2px solid ${selectedDuration === duration ? 'var(--primary)' : 'var(--extra-light-gray)'}`,
                        borderRadius: 'var(--radius-md)',
                        background: selectedDuration === duration ? 'var(--primary)' : 'var(--white)',
                        color: selectedDuration === duration ? 'white' : 'var(--dark)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span className="body-bold" style={{ fontSize: isMobile ? '14px' : '16px' }}>
                        {duration === 60 ? '1 час' : duration === 90 ? '1.5 часа' : '2 часа'}
                      </span>
                      <span className="caption" style={{
                        color: selectedDuration === duration ? 'white' : 'var(--primary)',
                        fontWeight: 600
                      }}>
                        {price}₽
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Правая колонка - Выбор времени */}
          <div>
            <h4 className="body-bold" style={{ marginBottom: 'var(--spacing-md)' }}>
              Свободное время на {format(selectedDate, 'd MMMM', { locale: ru })}
            </h4>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-3xl)' }}>
                <div className="spinner"></div>
              </div>
            ) : timeSlots.length > 0 ? (
              <>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
                  gap: 'var(--spacing-sm)',
                  maxHeight: isMobile ? '400px' : '500px',
                  overflowY: 'auto',
                  paddingRight: 'var(--spacing-sm)',
                  marginBottom: 'var(--spacing-md)'
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
                          border: `2px solid ${
                            !slot.available 
                              ? 'var(--extra-light-gray)' 
                              : isSelected 
                                ? 'var(--primary)' 
                                : 'var(--light-gray)'
                          }`,
                          borderRadius: 'var(--radius-sm)',
                          background: !slot.available 
                            ? 'var(--extra-light-gray)' 
                            : isSelected 
                              ? 'var(--primary)' 
                              : 'var(--white)',
                          color: !slot.available 
                            ? 'var(--gray)' 
                            : isSelected 
                              ? 'white' 
                              : 'var(--dark)',
                          cursor: slot.available ? 'pointer' : 'not-allowed',
                          transition: 'all 0.2s',
                          opacity: slot.available ? 1 : 0.5,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          minHeight: '65px',
                          justifyContent: 'center'
                        }}
                      >
                        <span className="body-bold" style={{ fontSize: '14px' }}>
                          {slot.time}-{(() => {
                            const [hours, minutes] = slot.time.split(':').map(Number)
                            const endTime = new Date()
                            endTime.setHours(hours, minutes, 0, 0)
                            endTime.setTime(endTime.getTime() + selectedDuration * 60 * 1000)
                            return `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`
                          })()}
                        </span>
                        {slot.available ? (
                          isSelected && (
                            <span className="caption" style={{ 
                              color: 'white',
                              fontWeight: 600
                            }}>
                              Выбрано
                            </span>
                          )
                        ) : (
                          <span className="caption">Занято</span>
                        )}
                      </button>
                    )
                  })}
                </div>
                
                {/* Легенда */}
                <div style={{ 
                  display: 'flex',
                  gap: 'var(--spacing-lg)',
                  flexWrap: 'wrap',
                  marginTop: 'var(--spacing-md)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: 'var(--white)',
                      border: '2px solid var(--light-gray)',
                      borderRadius: '4px'
                    }}></div>
                    <span className="caption">Свободно</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: 'var(--extra-light-gray)',
                      borderRadius: '4px'
                    }}></div>
                    <span className="caption">Занято</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: 'var(--primary)',
                      borderRadius: '4px'
                    }}></div>
                    <span className="caption">Выбрано</span>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: 'var(--spacing-xl)',
                color: 'var(--gray)'
              }}>
                <p className="body">Нет доступных слотов на выбранную дату</p>
              </div>
            )}
          </div>
        </div>

        {/* Итоговая информация и кнопка продолжить */}
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: isMobile ? 'fixed' : 'static',
          bottom: isMobile ? '0' : 'auto',
          left: isMobile ? '0' : 'auto',
          right: isMobile ? '0' : 'auto',
          padding: isMobile ? 'var(--spacing-lg)' : '0',
          marginTop: isMobile ? 'var(--spacing-xl)' : 'var(--spacing-lg)',
          background: isMobile ? 'var(--white)' : 'transparent',
          borderTop: isMobile ? '1px solid var(--extra-light-gray)' : 'none',
          zIndex: 10
        }}>
          <div style={{ flex: 1 }}>
            {selectedTime && (
              <>
                <div className="caption" style={{ color: 'var(--gray)', marginBottom: '4px' }}>
                  {format(selectedDate, 'd MMMM', { locale: ru })}, {selectedTime}-{(() => {
                    const [hours, minutes] = selectedTime.split(':').map(Number)
                    const endTime = new Date()
                    endTime.setHours(hours, minutes, 0, 0)
                    endTime.setTime(endTime.getTime() + selectedDuration * 60 * 1000)
                    return `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`
                  })()}
                </div>
                <div className="h3" style={{ color: 'var(--primary)' }}>
                  {timeSlots.find(s => s.time === selectedTime)?.price || 0} ₽
                </div>
              </>
            )}
          </div>
          <button
            className="flutter-button"
            onClick={() => handleTimeSelect(selectedTime)}
            disabled={!selectedDate || !selectedTime}
            style={{ 
              width: isMobile ? '50%' : 'auto',
              minWidth: '200px'
            }}
          >
            Продолжить
          </button>
        </div>
      </>
    )
  }

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
          gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(80px, 1fr))' : 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: 'var(--spacing-sm)',
          maxHeight: isMobile ? 'calc(100vh - 250px)' : '400px',
          overflowY: 'auto',
          paddingBottom: isMobile ? '80px' : '0'
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
        
      </>
    )
  }

  const renderTimeStep = () => (
    <>
      <h3 className="h3" style={{ marginBottom: 'var(--spacing-lg)' }}>
        Выберите время на {format(selectedDate, 'd MMMM', { locale: ru })}
      </h3>
      
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h4 className="body-bold" style={{ marginBottom: 'var(--spacing-md)' }}>
          Длительность бронирования
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-sm)' }}>
          {[60, 90, 120].map((duration) => {
            const bookingDurations = venue.bookingDurations || { 60: true, 90: true, 120: true }
            const isAvailable = bookingDurations[duration] !== false
            return (
              <button
                key={duration}
                onClick={() => {
                  if (isAvailable && duration !== selectedDuration) {
                    setSelectedDuration(duration)
                    // Перезагружаем слоты при изменении длительности
                    loadTimeSlots(duration)
                  }
                }}
                disabled={!isAvailable}
                style={{
                  padding: 'var(--spacing-md)',
                  border: `2px solid ${selectedDuration === duration ? 'var(--primary)' : 'var(--extra-light-gray)'}`,
                  borderRadius: 'var(--radius-md)',
                  background: selectedDuration === duration ? 'var(--primary-light)' : isAvailable ? 'var(--white)' : 'var(--extra-light-gray)',
                  cursor: isAvailable ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  opacity: isAvailable ? 1 : 0.5
                }}
              >
                <div className="body-bold">
                  {duration === 60 ? '1 час' : duration === 90 ? '1.5 часа' : '2 часа'}
                </div>
                {isAvailable && (
                  <div className="caption">
                    {(() => {
                      const dayIndex = selectedDate.getDay()
                      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
                      const dayName = days[dayIndex]
                      
                      let hourlyPrice = 0
                      if (court.pricing && court.pricing[dayName]) {
                        hourlyPrice = court.pricing[dayName].basePrice
                      } else {
                        const isWeekend = dayIndex === 0 || dayIndex === 6
                        hourlyPrice = court.pricePerHour || (isWeekend ? court.priceWeekend : court.priceWeekday) || 0
                      }
                      return Math.round(hourlyPrice * duration / 60)
                    })()}₽
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--spacing-3xl)' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: 'var(--spacing-sm)',
          maxHeight: isMobile ? 'calc(100vh - 300px)' : '300px',
          overflowY: 'auto',
          paddingBottom: isMobile ? '80px' : '0'
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
      <div style={{ 
        marginTop: 'var(--spacing-xl)', 
        display: 'flex', 
        justifyContent: 'space-between',
        gap: 'var(--spacing-md)',
        position: isMobile ? 'fixed' : 'static',
        bottom: isMobile ? '0' : 'auto',
        left: isMobile ? '0' : 'auto',
        right: isMobile ? '0' : 'auto',
        padding: isMobile ? 'var(--spacing-lg)' : '0',
        background: isMobile ? 'var(--white)' : 'transparent',
        borderTop: isMobile ? '1px solid var(--extra-light-gray)' : 'none',
        zIndex: 10
      }}>
        <button
          className="flutter-button-outlined"
          onClick={() => setStep('datetime')}
          style={{ 
            flex: 1,
            background: 'var(--white)', 
            color: 'var(--primary)', 
            border: '2px solid var(--primary)' 
          }}
        >
          Назад
        </button>
        <button
          className="flutter-button"
          onClick={() => setStep('gameType')}
          disabled={!selectedTime}
          style={{ flex: 1 }}
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
          onClick={() => handleGameTypeSelect('private')}
          style={{
            padding: 'var(--spacing-lg)',
            border: `2px solid ${selectedGameType === 'private' ? 'var(--primary)' : 'var(--extra-light-gray)'}`,
            borderRadius: 'var(--radius-md)',
            background: selectedGameType === 'private' ? 'var(--primary-light)' : 'var(--white)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            textAlign: 'left'
          }}
        >
          <div className="body-bold">Приватная игра</div>
          <div className="caption" style={{ color: 'var(--gray)' }}>Для вас и ваших друзей</div>
        </button>
        <button
          style={{
            padding: 'var(--spacing-lg)',
            border: '2px solid var(--extra-light-gray)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--extra-light-gray)',
            cursor: 'not-allowed',
            transition: 'all 0.2s',
            textAlign: 'left',
            opacity: 0.6
          }}
          disabled
        >
          <div className="body-bold" style={{ color: 'var(--gray)' }}>Открытая игра</div>
          <div className="caption" style={{ color: 'var(--gray)' }}>Присоединиться к игре (доступно в приложении)</div>
        </button>
      </div>
      <div style={{ 
        marginTop: 'var(--spacing-xl)', 
        display: 'flex', 
        justifyContent: 'space-between',
        gap: 'var(--spacing-md)',
        position: isMobile ? 'fixed' : 'static',
        bottom: isMobile ? '0' : 'auto',
        left: isMobile ? '0' : 'auto',
        right: isMobile ? '0' : 'auto',
        padding: isMobile ? 'var(--spacing-lg)' : '0',
        background: isMobile ? 'var(--white)' : 'transparent',
        borderTop: isMobile ? '1px solid var(--extra-light-gray)' : 'none',
        zIndex: 10
      }}>
        <button
          className="flutter-button-outlined"
          onClick={() => setStep('datetime')}
          style={{ 
            flex: 1,
            background: 'var(--white)', 
            color: 'var(--primary)', 
            border: '2px solid var(--primary)' 
          }}
        >
          Назад
        </button>
        <button
          className="flutter-button"
          onClick={() => setStep('payment')}
          style={{ flex: 1 }}
        >
          Далее
        </button>
      </div>
    </>
  )

  const renderPaymentStep = () => {
    const totalPrice = (() => {
      const slot = timeSlots.find(s => s.time === selectedTime)
      return slot?.price || 0
    })()

    return (
      <>
        <h3 className="h3" style={{ marginBottom: 'var(--spacing-lg)' }}>Оплата бронирования</h3>
        
        {/* Booking summary */}
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
              <span className="body-bold">
                {selectedTime} - {(() => {
                  const [hours, minutes] = selectedTime.split(':').map(Number)
                  const endTime = new Date()
                  endTime.setHours(hours, minutes, 0, 0)
                  endTime.setTime(endTime.getTime() + selectedDuration * 60 * 1000)
                  return `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`
                })()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="body">Тип игры:</span>
              <span className="body-bold">Приватная</span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              paddingTop: 'var(--spacing-sm)', 
              borderTop: '1px solid var(--extra-light-gray)'
            }}>
              <span className="body-bold">Итого:</span>
              <span className="h3" style={{ color: 'var(--primary)' }}>{totalPrice}₽</span>
            </div>
          </div>
        </div>

        {/* Payment form */}
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <div className="form-group">
            <label className="form-label">Имя</label>
            <input
              type="text"
              className="form-input"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Иван Иванов"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Телефон</label>
            <input
              type="tel"
              className="form-input"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+7 (900) 123-45-67"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Номер карты</label>
            <input
              type="text"
              className="form-input"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
            <div className="form-group">
              <label className="form-label">Срок действия</label>
              <input
                type="text"
                className="form-input"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(e.target.value)}
                placeholder="MM/YY"
                maxLength={5}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">CVC</label>
              <input
                type="text"
                className="form-input"
                value={cardCvc}
                onChange={(e) => setCardCvc(e.target.value)}
                placeholder="123"
                maxLength={3}
                required
              />
            </div>
          </div>
        </div>

        <div style={{ 
          marginTop: 'var(--spacing-xl)', 
          display: 'flex', 
          justifyContent: 'space-between',
          gap: 'var(--spacing-md)',
          position: isMobile ? 'fixed' : 'static',
          bottom: isMobile ? '0' : 'auto',
          left: isMobile ? '0' : 'auto',
          right: isMobile ? '0' : 'auto',
          padding: isMobile ? 'var(--spacing-lg)' : '0',
          background: isMobile ? 'var(--white)' : 'transparent',
          borderTop: isMobile ? '1px solid var(--extra-light-gray)' : 'none',
          zIndex: 10
        }}>
          <button
            className="flutter-button-outlined"
            onClick={() => setStep('gameType')}
            style={{ 
              flex: 1,
              background: 'var(--white)', 
              color: 'var(--primary)', 
              border: '2px solid var(--primary)' 
            }}
          >
            Назад
          </button>
          <button
            className="flutter-button"
            onClick={handleConfirmBooking}
            disabled={loading || !customerName || !customerPhone || !customerEmail || !cardNumber || !cardExpiry || !cardCvc}
            style={{ flex: 1 }}
          >
            {loading ? <div className="spinner" /> : `Оплатить ${totalPrice}₽`}
          </button>
        </div>
      </>
    )
  }


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
          top: isMobile ? '0' : '50%',
          left: isMobile ? '0' : '50%',
          transform: isMobile ? 'none' : 'translate(-50%, -50%)',
          background: 'var(--white)',
          borderRadius: isMobile ? '0' : 'var(--radius-xl)',
          padding: isMobile ? 'var(--spacing-lg)' : 'var(--spacing-2xl)',
          maxWidth: isMobile ? '100%' : '1000px',
          width: isMobile ? '100%' : '90%',
          height: isMobile ? '100vh' : 'auto',
          maxHeight: isMobile ? '100vh' : '85vh',
          overflowY: 'auto',
          zIndex: 1001,
          display: isOpen ? 'block' : 'none',
          boxShadow: isMobile ? 'none' : 'var(--shadow-xl)',
          animation: isMobile ? 'slideUp 0.3s ease' : 'slideIn 0.3s ease'
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

        {step === 'datetime' && renderDateTimeStep()}
        {step === 'gameType' && renderGameTypeStep()}
        {step === 'payment' && renderPaymentStep()}
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
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(100%);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
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
        
        @media (max-width: 768px) {
          .modal-content {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            transform: none !important;
            width: 100% !important;
            height: 100vh !important;
            max-width: 100% !important;
            max-height: 100vh !important;
            border-radius: 0 !important;
            padding: var(--spacing-lg) !important;
          }
        }
      `}</style>
    </>
  )
}