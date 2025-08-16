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
  arrayUnion,
  onSnapshot
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { ChevronLeft, ChevronRight } from '@mui/icons-material'
import { Alert } from '@mui/material'
import BookingsList from '../../components/BookingsList'
import BookingDetailsModal from '../../components/BookingDetailsModal'
import CreateBookingModal from '../../components/CreateBookingModal'
import { normalizeDate } from '../../utils/dateTime'
import { normalizeDateInClubTZ, getWeekStartInClubTZ, getWeekEndInClubTZ } from '../../utils/clubDateTime'

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
  paymentMethod: 'cash' | 'card_on_site' | 'transfer' | 'online' | 'sberbank_card' | 'tbank_card' | 'vtb_card'
  paymentStatus?: 'awaiting_payment' | 'paid' | 'online_payment' | 'cancelled'
  paymentHistory?: PaymentHistory[]
  createdBy?: {
    userId: string
    userName: string
    userRole?: string
  }
  venueId: string
  createdAt: Date
  
  // Поля для тренера
  trainerId?: string
  trainerName?: string
  trainerPrice?: number
  trainerCommission?: number
  totalAmount?: number
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
  const { admin, club } = useAuth()
  const { isSuperAdmin, canManageBookings, hasPermission } = usePermission()
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [bookings, setBookings] = useState<Booking[]>([]) // Для календаря - только занимающие корт
  const [allBookings, setAllBookings] = useState<Booking[]>([]) // Для списка - все бронирования
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  
  // Для тренеров автоматически устанавливаем режим календаря по тренеру
  const isTrainer = admin?.role === 'trainer'
  const [calendarMode, setCalendarMode] = useState<'courts' | 'trainer'>(isTrainer ? 'trainer' : 'courts')
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>(isTrainer && admin?.trainerId ? admin.trainerId : '')
  
  const [trainers, setTrainers] = useState<any[]>([])
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
  const [hoveredSlot, setHoveredSlot] = useState<{date: Date, time: string, courtId?: string} | null>(null)
  const [bookingsUnsubscribe, setBookingsUnsubscribe] = useState<(() => void) | null>(null)

  useEffect(() => {
    
    if (isSuperAdmin) {
      // Загружаем список клубов для суперадмина
      fetchVenues()
      const venueId = localStorage.getItem('selectedVenueId')
      if (venueId) {
        setSelectedVenueId(venueId)
        fetchCourts(venueId)
        fetchTrainers(venueId)
        fetchBookings(venueId)
      } else {
        setLoading(false)
      }
    } else if (admin?.venueId) {
      // Загружаем данные клуба для обычного админа и тренера
      fetchVenueData(admin.venueId)
      fetchCourts(admin.venueId)
      fetchTrainers(admin.venueId)
      fetchBookings(admin.venueId)
      
      // Для тренера автоматически устанавливаем фильтр по его ID
      if (isTrainer && admin.trainerId) {
        setCalendarMode('trainer')
        setSelectedTrainerId(admin.trainerId)
      }
    } else {
      setLoading(false)
    }
    
    // Cleanup функция для отписки от listener при размонтировании
    return () => {
      if (bookingsUnsubscribe) {
        bookingsUnsubscribe()
      }
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
    fetchTrainers(venueId)
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

  const fetchTrainers = async (venueId: string) => {
    if (!venueId) {
      console.log('No venueId provided for fetching trainers')
      return
    }

    console.log('Fetching trainers for venue:', venueId)
    try {
      const trainersQuery = query(
        collection(db, 'trainers'),
        where('clubId', '==', venueId)
      )
      const snapshot = await getDocs(trainersQuery)
      
      console.log('Found trainers documents:', snapshot.size)
      
      const allTrainers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      console.log('All trainers:', allTrainers)
      
      const trainersData = allTrainers.filter((trainer: any) => trainer.status === 'active') // Фильтруем на клиенте
      
      // Сортируем на клиенте
      trainersData.sort((a: any, b: any) => 
        (a.firstName || '').localeCompare(b.firstName || '')
      )
      
      setTrainers(trainersData)
      console.log('Active trainers:', trainersData)
    } catch (error) {
      console.error('Error fetching trainers:', error)
    }
  }

  const fetchBookings = async (venueId: string) => {
    if (!venueId) return

    // Отписываемся от предыдущего listener, если есть
    if (bookingsUnsubscribe) {
      bookingsUnsubscribe()
    }

    try {
      setLoading(true)
      
      // Получаем информацию о площадке для часового пояса
      let clubTimezone = club?.timezone || 'Europe/Moscow'
      if (isSuperAdmin && venueId) {
        const venueDoc = await getDoc(doc(db, 'venues', venueId))
        if (venueDoc.exists()) {
          const venueData = venueDoc.data()
          clubTimezone = venueData.timezone || 'Europe/Moscow'
        }
      }
      
      // Используем часовой пояс клуба для определения границ недели
      const startOfWeek = getWeekStartInClubTZ(selectedDate, clubTimezone)
      const endOfWeek = getWeekEndInClubTZ(selectedDate, clubTimezone)

      // console.log('Setting up real-time listener for venue:', venueId)
      // console.log('Date range:', startOfWeek, 'to', endOfWeek)
      
      // Создаем real-time listener
      const q = query(
        collection(db, 'bookings'),
        where('venueId', '==', venueId)
      )
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        try {
          // console.log('Real-time update: Found bookings:', snapshot.size)
        
        const bookingsData = snapshot.docs.map(doc => {
          const data = doc.data()
          
          // Используем утилиту для безопасного преобразования даты с учетом часового пояса клуба
          const bookingDate = normalizeDateInClubTZ(data.date, clubTimezone)
          
          // Для createdAt НЕ используем normalizeDateInClubTZ, так как это точное время, а не дата!
          let createdAt: Date
          if (data.createdAt) {
            // Правильно конвертируем Firestore Timestamp в Date без изменения времени
            if (data.createdAt?.toDate && typeof data.createdAt.toDate === 'function') {
              createdAt = data.createdAt.toDate()
            } else if (data.createdAt?.seconds && typeof data.createdAt.seconds === 'number') {
              createdAt = new Date(data.createdAt.seconds * 1000)
            } else if (data.createdAt instanceof Date) {
              createdAt = data.createdAt
            } else {
              createdAt = new Date(data.createdAt)
            }
          } else {
            // Fallback на текущее время, если нет createdAt
            console.log('Booking without createdAt:', doc.id, 'using current time as fallback')
            createdAt = new Date()
          }
          

          // Важно: сначала spread, потом наши корректные значения, чтобы они имели приоритет
          return {
            ...data,
            id: doc.id,
            // Обеспечиваем наличие обязательных полей
            status: data.status || 'pending',
            paymentStatus: data.paymentStatus || 'awaiting_payment',
            venueId: data.venueId || '',
            courtId: data.courtId || '',
            startTime: data.startTime || '',
            endTime: data.endTime || '',
            customerName: data.customerName || '',
            customerPhone: data.customerPhone || '',
            amount: data.amount || data.totalPrice || 0,
            // ВАЖНО: эти поля должны быть последними, чтобы перезаписать любые неправильные значения из data
            date: bookingDate,
            createdAt: createdAt
          }
        }) as Booking[]
        
        // console.log('All bookings data:', bookingsData)
        
        // Фильтруем бронирования для недели
        const weekBookings = bookingsData.filter(booking => {
          // Дополнительная проверка на валидность данных
          if (!booking || !booking.date || !booking.venueId) {
            console.warn('Invalid booking data:', booking)
            return false
          }
          
          try {
            const bookingDate = new Date(booking.date)
            if (isNaN(bookingDate.getTime())) {
              console.warn('Invalid booking date:', booking.date)
              return false
            }
            
            const inRange = bookingDate >= startOfWeek && bookingDate <= endOfWeek
            return inRange && booking.venueId === venueId
          } catch (err) {
            console.error('Error filtering booking:', booking.id, err)
            return false
          }
        })
        
        // Для календаря - только те, что занимают корт
        const calendarBookings = weekBookings.filter(booking => {
          // Дополнительная проверка на валидность данных
          if (!booking || !booking.id) {
            console.warn('Invalid booking for calendar:', booking)
            return false
          }
          
          try {
            // Проверяем, что бронирование действительно занимает корт
            const status = booking.status || 'pending'
            const paymentStatus = booking.paymentStatus || 'awaiting_payment'
            
            const occupiesCourt = 
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
            
            // console.log('Booking:', booking.id, 'Status:', status, 'PaymentStatus:', paymentStatus, 'Occupies court:', occupiesCourt)
            
            return occupiesCourt
          } catch (err) {
            console.error('Error processing booking for calendar:', booking.id, err)
            return false
          }
        })
        
        // Сортируем по дате с защитой от ошибок
        const sortedCalendarBookings = calendarBookings.sort((a, b) => {
          try {
            const dateA = new Date(a.date || new Date())
            const dateB = new Date(b.date || new Date())
            return dateB.getTime() - dateA.getTime()
          } catch (err) {
            console.error('Error sorting calendar bookings:', err)
            return 0
          }
        })
        
        // Сортируем все бронирования по дате создания (новые первыми)
        const sortedAllBookings = [...bookingsData].sort((a, b) => {
          // Нормализуем даты создания
          let dateA: Date
          let dateB: Date
          
          // Для a
          if (a.createdAt instanceof Date) {
            dateA = a.createdAt
          } else if (a.createdAt?.toDate) {
            dateA = a.createdAt.toDate()
          } else if (a.createdAt?.seconds) {
            dateA = new Date(a.createdAt.seconds * 1000)
          } else if (typeof a.createdAt === 'string') {
            dateA = new Date(a.createdAt)
          } else {
            // Fallback на дату бронирования
            if (a.date instanceof Date) {
              dateA = a.date
            } else if (a.date?.toDate) {
              dateA = a.date.toDate()
            } else if (a.date?.seconds) {
              dateA = new Date(a.date.seconds * 1000)
            } else {
              dateA = new Date(0) // Очень старая дата
            }
          }
          
          // Для b
          if (b.createdAt instanceof Date) {
            dateB = b.createdAt
          } else if (b.createdAt?.toDate) {
            dateB = b.createdAt.toDate()
          } else if (b.createdAt?.seconds) {
            dateB = new Date(b.createdAt.seconds * 1000)
          } else if (typeof b.createdAt === 'string') {
            dateB = new Date(b.createdAt)
          } else {
            // Fallback на дату бронирования
            if (b.date instanceof Date) {
              dateB = b.date
            } else if (b.date?.toDate) {
              dateB = b.date.toDate()
            } else if (b.date?.seconds) {
              dateB = new Date(b.date.seconds * 1000)
            } else {
              dateB = new Date(0) // Очень старая дата
            }
          }
          
          // Сортируем по убыванию (новые первыми)
          return dateB.getTime() - dateA.getTime()
        })
        
        // console.log('Calendar bookings (occupying courts):', sortedCalendarBookings.length)
        // console.log('All bookings for list:', sortedAllBookings.length)
        
          setBookings(sortedCalendarBookings) // Для календаря
          setAllBookings(sortedAllBookings) // Для списка
          setLoading(false)
        } catch (callbackError) {
          console.error('Error processing bookings snapshot:', callbackError)
          setLoading(false)
          // Устанавливаем пустые массивы в случае ошибки
          setBookings([])
          setAllBookings([])
        }
      }, (error) => {
        console.error('Error in bookings listener:', error)
        setLoading(false)
      })
      
      // Сохраняем функцию отписки
      setBookingsUnsubscribe(() => unsubscribe)
      
    } catch (error) {
      console.error('Error setting up bookings listener:', error)
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
    if (!selectedDate) return []
    
    // Получаем часовой пояс клуба
    const clubTimezone = club?.timezone || 'Europe/Moscow'
    
    const dates = []
    const startOfWeek = getWeekStartInClubTZ(selectedDate, clubTimezone)
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setUTCDate(startOfWeek.getUTCDate() + i)
      dates.push(date)
    }
    return dates
  }

  const getBookingsForSlot = (date: Date, time: string, courtId: string) => {
    if (!date || !time || !courtId) return []
    
    try {
      return bookings.filter(booking => {
        if (!booking || !booking.date) return false
        
        const bookingDate = booking.date instanceof Date 
          ? booking.date 
          : (booking.date?.toDate ? booking.date.toDate() : new Date(booking.date))
          
        // Проверяем, что бронирование на нужную дату и корт
        if (!bookingDate || !date || 
            bookingDate.toDateString() !== date.toDateString() ||
            booking.courtId !== courtId) {
          return false
        }
        
        // Проверяем, попадает ли текущий слот времени в диапазон бронирования
        const bookingStartTime = booking.startTime || booking.time
        const bookingEndTime = booking.endTime
        
        if (!bookingStartTime) return false
        
        // Конвертируем время в минуты для удобства сравнения
        const [slotHour, slotMinute] = time.split(':').map(Number)
        const slotTimeMinutes = slotHour * 60 + slotMinute
        
        const [startHour, startMinute] = bookingStartTime.split(':').map(Number)
        const startTimeMinutes = startHour * 60 + startMinute
        
        // Если есть endTime, используем его
        if (bookingEndTime) {
          const [endHour, endMinute] = bookingEndTime.split(':').map(Number)
          const endTimeMinutes = endHour * 60 + endMinute
          
          // Проверяем, попадает ли слот в диапазон [startTime, endTime)
          return slotTimeMinutes >= startTimeMinutes && slotTimeMinutes < endTimeMinutes
        } else if (booking.duration) {
          // Если нет endTime, но есть duration, вычисляем endTime
          const endTimeMinutes = startTimeMinutes + (booking.duration * 60)
          
          // Проверяем, попадает ли слот в диапазон
          return slotTimeMinutes >= startTimeMinutes && slotTimeMinutes < endTimeMinutes
        } else {
          // Если нет ни endTime, ни duration, проверяем только точное совпадение
          return bookingStartTime === time
        }
      })
    } catch (error) {
      console.error('Error in getBookingsForSlot:', error, { date, time, courtId })
      return []
    }
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

  // Получаем режим работы для конкретного дня
  const getWorkingHoursForDate = (date: Date, venue: any) => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = dayNames[date.getDay()]
    
    // Убираем дефолтные значения - если режим работы не задан, возвращаем null
    let startHour: number | null = null
    let endHour: number | null = null
    
    if (venue?.workingHours) {
      const dayHours = venue.workingHours[dayName]
      
      if (dayHours) {
        if (typeof dayHours === 'string' && dayHours.includes('-')) {
          // Формат строки: "08:00-22:00"
          const [openTime, closeTime] = dayHours.split('-').map(t => t.trim())
          if (openTime && closeTime) {
            startHour = parseInt(openTime.split(':')[0])
            endHour = parseInt(closeTime.split(':')[0])
          }
        } else if (dayHours.open && dayHours.close) {
          // Формат объекта: { open: '08:00', close: '22:00' }
          const [openHour] = dayHours.open.split(':').map(Number)
          const [closeHour] = dayHours.close.split(':').map(Number)
          startHour = openHour
          endHour = closeHour
        }
      } else {
        // Fallback на старый формат weekend/weekday
        const isWeekend = date.getDay() === 0 || date.getDay() === 6
        const workingHoursStr = venue.workingHours[isWeekend ? 'weekend' : 'weekday']
        
        if (workingHoursStr && typeof workingHoursStr === 'string' && workingHoursStr.includes('-')) {
          const [openTime, closeTime] = workingHoursStr.split('-').map(t => t.trim())
          if (openTime && closeTime) {
            startHour = parseInt(openTime.split(':')[0])
            endHour = parseInt(closeTime.split(':')[0])
          }
        }
      }
    }
    
    // Если режим работы определен, возвращаем его, иначе используем дефолтные значения для совместимости
    if (startHour !== null && endHour !== null) {
      return { startHour, endHour }
    } else {
      // Дефолтные значения только если режим работы вообще не настроен
      return { startHour: 8, endHour: 22 }
    }
  }
  
  // Динамически создаем слоты времени на основе режима работы клуба
  const generateTimeSlots = () => {
    const slots = []
    
    // Получаем текущий клуб
    const currentVenue = venues.find(v => v.id === (selectedVenueId || admin?.venueId))
    
    // Находим самое раннее время открытия и самое позднее время закрытия за всю неделю
    // НО отображаем полный диапазон для визуализации с блокировкой нерабочих часов
    let minStartHour = 24
    let maxEndHour = 0
    
    const weekDates = getWeekDates()
    weekDates.forEach(date => {
      const { startHour, endHour } = getWorkingHoursForDate(date, currentVenue)
      minStartHour = Math.min(minStartHour, startHour)
      maxEndHour = Math.max(maxEndHour, endHour)
    })
    
    // Генерируем слоты от самого раннего до самого позднего времени
    for (let hour = minStartHour; hour < maxEndHour; hour++) {
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

  // Тренеры могут просматривать свой календарь
  if (!isTrainer && !hasPermission(['manage_bookings', 'manage_all_bookings', 'view_bookings'])) {
    return (
      <Alert severity="error">
        <strong>Доступ запрещен</strong><br />
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

  // Тренеры не могут создавать бронирования
  const canCreateBooking = !isTrainer && hasPermission(['manage_bookings', 'manage_all_bookings', 'create_bookings'])

  return (
    <PermissionGate permission={['manage_bookings', 'manage_all_bookings', 'view_bookings']} allowTrainer={true}>
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

        {/* Переключатель режима календаря - скрываем для тренеров */}
        {!isTrainer && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            marginBottom: '16px',
            padding: '12px',
            background: '#f9fafb',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  setCalendarMode('courts')
                  setSelectedTrainerId('')
                }}
                style={{
                  padding: '8px 16px',
                  border: '1px solid',
                  borderColor: calendarMode === 'courts' ? 'var(--primary)' : 'var(--extra-light-gray)',
                  background: calendarMode === 'courts' ? 'var(--primary)' : 'white',
                  color: calendarMode === 'courts' ? 'white' : 'var(--text-secondary)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: calendarMode === 'courts' ? '600' : '400'
                }}
              >
                По кортам
              </button>
              <button
                onClick={() => setCalendarMode('trainer')}
                style={{
                  padding: '8px 16px',
                  border: '1px solid',
                  borderColor: calendarMode === 'trainer' ? 'var(--primary)' : 'var(--extra-light-gray)',
                  background: calendarMode === 'trainer' ? 'var(--primary)' : 'white',
                  color: calendarMode === 'trainer' ? 'white' : 'var(--text-secondary)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: calendarMode === 'trainer' ? '600' : '400'
                }}
              >
                По тренеру
              </button>
            </div>

            {/* Выбор тренера */}
            {calendarMode === 'trainer' && (
              <>
                <div style={{ 
                  width: '1px', 
                  height: '24px', 
                  background: 'var(--extra-light-gray)' 
                }} />
                <select
                  value={selectedTrainerId}
                  onChange={(e) => setSelectedTrainerId(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--extra-light-gray)',
                    borderRadius: '6px',
                    background: 'white',
                    fontSize: '14px',
                    minWidth: '200px'
                  }}
                >
                  <option value="">Выберите тренера</option>
                  {trainers.map((trainer: any) => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.firstName} {trainer.lastName}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        )}
        
        {/* Для тренеров показываем информацию о текущем фильтре */}
        {isTrainer && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            background: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #86efac'
          }}>
            <span style={{ fontSize: '14px', color: '#166534' }}>
              Показан календарь ваших бронирований
            </span>
          </div>
        )}
        
        {/* Легенда кортов */}
        {calendarMode === 'courts' && courts.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '16px',
            marginTop: '16px',
            marginBottom: '8px',
            flexWrap: 'wrap'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--gray)', fontWeight: '600' }}>
              Корты:
            </div>
            {courts.map((court, index) => (
              <div key={court.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '3px',
                  backgroundColor: court.color || '#00A86B',
                  border: '1px solid rgba(0, 0, 0, 0.1)'
                }} />
                <span>{court.name}</span>
                {index < courts.length - 1 && (
                  <span style={{ color: 'var(--extra-light-gray)', marginLeft: '4px' }}>|</span>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Календарь по кортам */}
        {calendarMode === 'courts' && (
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
            {(weekDates || []).map((date, index) => (
            <div key={index} className="day-header" style={{ 
              fontWeight: '600', 
              textAlign: 'center',
              background: 'var(--background)',
              padding: '12px'
            }}>
              {dayNames[index]} {date ? date.getDate() : ''}
            </div>
          ))}
          
          {(timeSlots || []).map(time => (
            <React.Fragment key={time}>
              <div className="time-slot" style={{ 
                fontSize: '12px',
                color: 'var(--gray)',
                textAlign: 'center',
                padding: '8px',
                background: 'var(--white)'
              }}>
                {time || ''}
              </div>
              {(weekDates || []).map((date, dateIndex) => {
                return (
                  <div 
                    key={`${time || 'unknown'}-${dateIndex}`}
                    className="booking-slot-container"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: `${Math.max(60, courts.length * 40)}px`,
                      background: 'var(--white)',
                      border: '1px solid var(--extra-light-gray)',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Разделяем ячейку на корты */}
                    {(courts || []).map((court, courtIndex) => {
                      const bookingForCourt = date && time && court?.id 
                        ? getBookingsForSlot(date, time, court.id)[0]
                        : null
                      
                      // Debug log for awaiting_payment bookings - commented out
                      // if (bookingForCourt?.paymentStatus === 'awaiting_payment') {
                      //   console.log('Rendering awaiting_payment booking:', {
                      //     id: bookingForCourt.id,
                      //     courtId: court?.id,
                      //     courtName: court?.name,
                      //     paymentStatus: bookingForCourt.paymentStatus,
                      //     clientName: bookingForCourt.clientName,
                      //     hasAllRequiredFields: !!(bookingForCourt && court && date && time)
                      //   })
                      // }
                      
                      const isSelected = selectedSlotDate && selectedSlotTime && date &&
                        date.toDateString() === selectedSlotDate.toDateString() && 
                        time === selectedSlotTime && 
                        formData.courtId === court.id
                      
                      const isHovered = hoveredSlot && date &&
                        date.toDateString() === hoveredSlot.date.toDateString() && 
                        time === hoveredSlot.time &&
                        hoveredSlot.courtId === court.id
                      
                      // Проверяем, находится ли слот в рабочих часах
                      const currentVenue = venues.find(v => v.id === (selectedVenueId || admin?.venueId))
                      const { startHour, endHour } = getWorkingHoursForDate(date, currentVenue)
                      const slotHour = parseInt(time.split(':')[0])
                      const isOutsideWorkingHours = slotHour < startHour || slotHour >= endHour
                      
                      return (
                        <div
                          key={court.id}
                          className="court-slot"
                          style={{
                            flex: 1,
                            position: 'relative',
                            cursor: isOutsideWorkingHours && !bookingForCourt ? 'not-allowed' : 'pointer',
                            minHeight: '40px',
                            background: isOutsideWorkingHours && !bookingForCourt
                              ? 'repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 10px, #e5e7eb 10px, #e5e7eb 20px)'
                              : bookingForCourt
                              ? (() => {
                                  // Определяем цвет по статусу оплаты
                                  const paymentStatus = bookingForCourt.paymentStatus || 'awaiting_payment'
                                  let statusColor = '#9CA3AF' // светло-серый для неизвестных статусов
                                  
                                  if (paymentStatus === 'awaiting_payment') {
                                    statusColor = '#F59E0B' // оранжевый
                                  } else if (paymentStatus === 'paid') {
                                    statusColor = '#10B981' // зеленый
                                  } else if (paymentStatus === 'cancelled' || paymentStatus === 'refunded') {
                                    statusColor = '#EF4444' // красный
                                  } else if (paymentStatus === 'error') {
                                    statusColor = '#DC2626' // темно-красный
                                  } else if (paymentStatus === 'not_required') {
                                    statusColor = '#6B7280' // серый
                                  } else if (paymentStatus === 'expired') {
                                    statusColor = '#374151' // темно-серый
                                  }
                                  
                                  const r = parseInt(statusColor.slice(1, 3), 16)
                                  const g = parseInt(statusColor.slice(3, 5), 16)
                                  const b = parseInt(statusColor.slice(5, 7), 16)
                                  return `rgba(${r}, ${g}, ${b}, 0.15)`
                                })()
                              : isSelected
                                ? 'rgba(0, 168, 107, 0.2)'
                                : isHovered
                                  ? 'rgba(0, 168, 107, 0.05)'
                                  : 'transparent',
                            padding: '4px 8px',
                            borderTop: courtIndex > 0 ? '1px solid var(--extra-light-gray)' : 'none',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={() => {
                            if (!bookingForCourt && !isOutsideWorkingHours) {
                              setHoveredSlot({date, time, courtId: court.id})
                            }
                          }}
                          onMouseLeave={() => {
                            setHoveredSlot(null)
                          }}
                          onClick={() => {
                            if (bookingForCourt) {
                              // Если есть бронирование, показываем детали
                              setSelectedBooking(bookingForCourt)
                              setShowDetailsModal(true)
                            } else {
                              // Проверяем, что время находится в рабочих часах для этого дня
                              const currentVenue = venues.find(v => v.id === (selectedVenueId || admin?.venueId))
                              const { startHour, endHour } = getWorkingHoursForDate(date, currentVenue)
                              const slotHour = parseInt(time.split(':')[0])
                              
                              if (slotHour < startHour || slotHour >= endHour) {
                                // Время вне рабочих часов
                                alert(`Клуб не работает в это время. Режим работы: ${startHour}:00 - ${endHour}:00`)
                                return
                              }
                              
                              // Если слот пустой и в рабочее время, открываем форму создания с предвыбранным кортом
                              setSelectedSlotDate(date)
                              setSelectedSlotTime(time)
                              setFormData(prev => ({ ...prev, courtId: court.id }))
                              setShowCreateModal(true)
                            }
                          }}
                        >
                          {/* Показываем контент для каждого корта */}
                          {!bookingForCourt && (isHovered || isSelected) && (
                            <div style={{
                              fontSize: '11px',
                              color: court.color || 'var(--primary)',
                              fontWeight: '600',
                              textAlign: 'center',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              justifyContent: 'center'
                            }}>
                              {court.color && (
                                <div style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '2px',
                                  backgroundColor: court.color,
                                  flexShrink: 0
                                }} />
                              )}
                              {court.name}
                            </div>
                          )}
                          
                          {bookingForCourt && (
                            <div style={{
                              fontSize: '10px',
                              width: '100%',
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
                                {court?.color && (
                                  <div style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '2px',
                                    backgroundColor: court.color,
                                    flexShrink: 0
                                  }} />
                                )}
                                {bookingForCourt?.clientName || bookingForCourt?.customerName || 'Клиент'}
                              </div>
                              {(bookingForCourt?.clientPhone || bookingForCourt?.customerPhone) && (
                                <div style={{ 
                                  color: 'var(--gray)', 
                                  fontSize: '9px',
                                  marginTop: '1px'
                                }}>
                                  {bookingForCourt.clientPhone || bookingForCourt.customerPhone}
                                </div>
                              )}
                              {bookingForCourt?.trainerName && (
                                <div style={{ 
                                  color: (() => {
                                    // Находим тренера по ID, чтобы получить его цвет
                                    const trainer = trainers.find(t => t.id === bookingForCourt.trainerId)
                                    return trainer?.color || 'var(--primary)'
                                  })(), 
                                  fontSize: '9px',
                                  marginTop: '1px',
                                  fontWeight: '500'
                                }}>
                                  Тренер: {bookingForCourt.trainerName}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </React.Fragment>
          ))}
          </div>
        )}

        {/* Календарь по тренеру */}
        {calendarMode === 'trainer' && selectedTrainerId && (
          <div>
            {(() => {
              const trainer = trainers.find((t: any) => t.id === selectedTrainerId)
              if (!trainer) return <div>Тренер не найден</div>
              
              return (
                <>
                  {/* Информация о тренере */}
                  <div style={{
                    padding: '16px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: trainer.color || '#00A86B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '18px'
                    }}>
                      {trainer.firstName[0]}{trainer.lastName[0]}
                    </div>
                    <div>
                      <h3 style={{ margin: 0 }}>{trainer.firstName} {trainer.lastName}</h3>
                      <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>
                        {trainer.specialization?.join(', ')} • {trainer.pricePerHour}₽/час
                      </p>
                    </div>
                  </div>

                  {/* Календарь тренера */}
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
                    {(weekDates || []).map((date, index) => (
                      <div key={index} className="day-header" style={{ 
                        fontWeight: '600', 
                        textAlign: 'center',
                        background: 'var(--background)',
                        padding: '12px'
                      }}>
                        {dayNames[index]} {date ? date.getDate() : ''}
                      </div>
                    ))}
                    
                    {(timeSlots || []).map(time => (
                      <React.Fragment key={time}>
                        <div className="time-slot" style={{ 
                          fontSize: '12px',
                          color: 'var(--gray)',
                          textAlign: 'center',
                          padding: '8px',
                          background: 'var(--white)'
                        }}>
                          {time || ''}
                        </div>
                        {(weekDates || []).map((date, dateIndex) => {
                          // Проверяем доступность слота для тренера
                          const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()]
                          const daySchedule = trainer.schedule?.[dayOfWeek]
                          
                          // Проверка выходного дня
                          const isNotWorkingDay = !daySchedule?.enabled
                          
                          // Проверка рабочего времени
                          let isOutsideWorkingHours = false
                          if (daySchedule?.enabled && daySchedule.start && daySchedule.end) {
                            const [slotHour] = time.split(':').map(Number)
                            const [startHour] = daySchedule.start.split(':').map(Number)
                            const [endHour] = daySchedule.end.split(':').map(Number)
                            isOutsideWorkingHours = slotHour < startHour || slotHour >= endHour
                          }
                          
                          // Проверка занятости тренера
                          const trainerBooking = bookings.find(b => 
                            b.trainerId === trainer.id &&
                            b.date instanceof Date && 
                            date instanceof Date &&
                            b.date.toDateString() === date.toDateString() &&
                            b.startTime <= time &&
                            b.endTime > time &&
                            b.status !== 'cancelled'
                          )
                          
                          // Проверка занятости всех кортов
                          const allCourtsOccupied = courts.length > 0 && courts.every(court => {
                            return bookings.some(b => 
                              b.courtId === court.id &&
                              b.date instanceof Date && 
                              date instanceof Date &&
                              b.date.toDateString() === date.toDateString() &&
                              b.startTime <= time &&
                              b.endTime > time &&
                              b.status !== 'cancelled'
                            )
                          })
                          
                          const isUnavailable = isNotWorkingDay || isOutsideWorkingHours || trainer.status === 'vacation'
                          const isBooked = !!trainerBooking
                          
                          return (
                            <div 
                              key={`${time}-${dateIndex}`}
                              onClick={() => {
                                // Тренеры могут только просматривать детали бронирования
                                if (isTrainer && isBooked && trainerBooking) {
                                  setSelectedBooking(trainerBooking)
                                  setShowDetailsModal(true)
                                } else if (!isUnavailable && !isBooked && !allCourtsOccupied && canCreateBooking) {
                                  setSelectedSlotDate(date)
                                  setSelectedSlotTime(time)
                                  setShowCreateModal(true)
                                }
                              }}
                              style={{
                                background: isUnavailable 
                                  ? '#E5E7EB'
                                  : isBooked 
                                    ? '#10B981'
                                    : allCourtsOccupied
                                      ? '#9CA3AF'
                                      : 'white',
                                color: isBooked ? 'white' : (isUnavailable || allCourtsOccupied) ? '#6B7280' : '#374151',
                                padding: '8px',
                                minHeight: '60px',
                                cursor: isTrainer && isBooked ? 'pointer' : (isUnavailable || isBooked || allCourtsOccupied) ? 'not-allowed' : 'pointer',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                transition: 'all 0.2s',
                                ...((!isUnavailable && !isBooked && !allCourtsOccupied) ? {
                                  ':hover': {
                                    background: '#F3F4F6',
                                    border: '1px solid #10B981'
                                  }
                                } : {})
                              }}
                              onMouseEnter={(e) => {
                                if (!isUnavailable && !isBooked && !allCourtsOccupied) {
                                  e.currentTarget.style.background = '#F3F4F6'
                                  e.currentTarget.style.border = '1px solid #10B981'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isUnavailable && !isBooked && !allCourtsOccupied) {
                                  e.currentTarget.style.background = 'white'
                                  e.currentTarget.style.border = 'none'
                                }
                              }}
                            >
                              {isUnavailable ? (
                                <span style={{ fontSize: '11px' }}>
                                  {isNotWorkingDay ? 'Выходной' : isOutsideWorkingHours ? 'Нерабочее время' : 'Недоступно'}
                                </span>
                              ) : isBooked ? (
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '12px', fontWeight: '600' }}>
                                    {trainerBooking.clientName}
                                  </div>
                                  <div style={{ fontSize: '10px', marginTop: '2px' }}>
                                    {trainerBooking.courtName}
                                  </div>
                                </div>
                              ) : allCourtsOccupied ? (
                                <span style={{ fontSize: '11px', color: 'white' }}>
                                  Корты заняты
                                </span>
                              ) : (
                                <span style={{ fontSize: '11px', color: '#10B981' }}>
                                  Свободно
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </>
              )
            })()}
          </div>
        )}

        {/* Сообщение если не выбран тренер */}
        {calendarMode === 'trainer' && !selectedTrainerId && (
          <div style={{
            padding: '48px',
            textAlign: 'center',
            background: '#f9fafb',
            borderRadius: '8px'
          }}>
            <p style={{ fontSize: '18px', color: '#6B7280' }}>
              Выберите тренера для просмотра его расписания
            </p>
          </div>
        )}
      </div>
      
      {/* Список бронирований - скрываем для тренеров */}
      {!isTrainer && (
        <BookingsList 
          venueId={selectedVenueId || admin?.venueId || ''} 
          bookings={allBookings}
          onRefresh={() => fetchBookings(selectedVenueId || admin?.venueId || '')}
        />
      )}
      
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
          setFormData(prev => ({ ...prev, courtId: '' }))
        }}
        onSuccess={(createdBooking) => {
          fetchBookings(selectedVenueId || admin?.venueId || '')
          // Открываем попап деталей созданного бронирования
          if (createdBooking) {
            setSelectedBooking(createdBooking)
            setShowDetailsModal(true)
          }
        }}
        venueId={selectedVenueId || admin?.venueId || ''}
        preSelectedDate={selectedSlotDate || undefined}
        preSelectedTime={selectedSlotTime || undefined}
        preSelectedCourtId={formData.courtId || undefined}
        preSelectedTrainerId={calendarMode === 'trainer' ? selectedTrainerId : undefined}
      />
    </div>
    </PermissionGate>
  )
}