import React, { useState, useEffect, useRef } from 'react'
import { Close, Search, PersonAdd, Check } from '@mui/icons-material'
import { addDoc, collection, Timestamp, getDocs, query, where, onSnapshot, getDoc, doc, limit, updateDoc, arrayUnion } from 'firebase/firestore'
import { db, functions } from '../services/firebase'
import { httpsCallable } from 'firebase/functions'
import { calculateCourtPrice, getPriceBreakdown } from '../utils/pricing'
import { useAuth } from '../contexts/AuthContext'
import { 
  dateToString, 
  calculateEndTime,
  hoursToMinutes,
  minutesToHours,
  formatDuration
} from '../utils/dateTime'
import { BookingFormData, bookingToFirestore } from '../types/bookingTypes'
import { 
  isValidPhone, 
  isValidName,
  normalizePhone,
  sanitizeString,
  isValidBookingDate,
  isValidBookingTime
} from '../utils/validation'

interface Court {
  id: string
  name: string
  type: string
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

interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  bookingsCount: number
  lastVisit?: Date
}

interface CreateBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (bookingData?: any) => void
  venueId: string
  preSelectedDate?: Date
  preSelectedTime?: string
  preSelectedCourtId?: string
  preSelectedTrainerId?: string
}

export default function CreateBookingModal({
  isOpen,
  onClose,
  onSuccess,
  venueId,
  preSelectedDate,
  preSelectedTime,
  preSelectedCourtId,
  preSelectedTrainerId
}: CreateBookingModalProps) {
  const { admin } = useAuth()
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(false)
  const [venueName, setVenueName] = useState('')
  const [venueSlotInterval, setVenueSlotInterval] = useState<30 | 60>(30)
  const [venueWorkingHours, setVenueWorkingHours] = useState<any>({
    monday: { open: '07:00', close: '23:00' },
    tuesday: { open: '07:00', close: '23:00' },
    wednesday: { open: '07:00', close: '23:00' },
    thursday: { open: '07:00', close: '23:00' },
    friday: { open: '07:00', close: '23:00' },
    saturday: { open: '08:00', close: '22:00' },
    sunday: { open: '08:00', close: '22:00' }
  })
  
  const formatDateToLocal = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '+7',
    courtId: '',
    date: formatDateToLocal(new Date()),
    startTime: '10:00',
    duration: 1,
    paymentMethod: 'online' as 'cash' | 'card_on_site' | 'transfer' | 'online' | 'sberbank_card' | 'tbank_card' | 'vtb_card'
  })
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [existingBookings, setExistingBookings] = useState<any[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null)
  const [enabledPaymentMethods, setEnabledPaymentMethods] = useState<Record<string, boolean>>({
    cash: true,
    card_on_site: true,
    transfer: true,
    sberbank_card: true,
    tbank_card: true,
    vtb_card: true
  })
  
  // Состояния для поиска клиентов
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  
  // Состояния для тренеров
  const [trainers, setTrainers] = useState<any[]>([])
  const [includeTrainer, setIncludeTrainer] = useState(!!preSelectedTrainerId)
  const [selectedTrainerId, setSelectedTrainerId] = useState(preSelectedTrainerId || '')
  const [trainerBookings, setTrainerBookings] = useState<any[]>([])
  
  // Состояния для групповых тренировок
  const [bookingType, setBookingType] = useState<'individual' | 'group'>('individual')
  const [maxParticipants, setMaxParticipants] = useState(10)
  const [isPublicGroup, setIsPublicGroup] = useState(true)
  const [groupParticipants, setGroupParticipants] = useState<Array<{
    name: string
    phone: string
    email?: string
  }>>([])

  // Функция поиска клиентов
  const searchCustomers = async (searchText: string) => {
    if (!searchText || searchText.length < 2) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    try {
      // Ищем по всем бронированиям в этом venue (включая отмененные)
      // Убираем orderBy чтобы избежать необходимости создания индекса
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('venueId', '==', venueId),
        limit(2000) // Увеличиваем лимит для поиска во всех существующих бронированиях
      )
      
      const snapshot = await getDocs(bookingsQuery)
      const customerMap = new Map<string, Customer>()
      
      // console.log(`Found ${snapshot.docs.length} bookings for venue ${venueId}`)
      
      snapshot.docs.forEach(doc => {
        const booking = doc.data()
        
        // Не пропускаем отмененные - ищем во всех бронированиях
        // if (booking.status === 'cancelled') return - УБРАНО
        
        const customerPhone = booking.customerPhone || booking.clientPhone
        const customerName = booking.customerName || booking.clientName
        
        if (!customerPhone || !customerName) return
        
        // Проверяем соответствие поисковому запросу
        const searchLower = searchText.toLowerCase().trim()
        const nameLower = customerName.toLowerCase()
        const phoneDigits = searchText.replace(/\D/g, '') // Только цифры из поискового запроса
        const customerPhoneDigits = customerPhone.replace(/\D/g, '') // Только цифры из телефона клиента
        
        // Проверяем совпадение по имени или телефону
        const nameMatch = searchLower.length > 0 && nameLower.includes(searchLower)
        const phoneMatch = phoneDigits.length >= 3 && customerPhoneDigits.includes(phoneDigits)
        
        if (!nameMatch && !phoneMatch) return
        
        // console.log(`Search: "${searchText}" -> Customer: "${customerName}" (${customerPhone})`)
        // console.log(`  nameMatch: ${nameMatch} (searchLower: "${searchLower}", nameLower: "${nameLower}")`)
        // console.log(`  phoneMatch: ${phoneMatch} (phoneDigits: "${phoneDigits}", customerPhoneDigits: "${customerPhoneDigits}")`)
        
        const customerId = customerPhone
        
        if (customerMap.has(customerId)) {
          const existing = customerMap.get(customerId)!
          existing.bookingsCount++
          const bookingDate = booking.date?.toDate ? booking.date.toDate() : new Date(booking.date)
          if (!existing.lastVisit || bookingDate > existing.lastVisit) {
            existing.lastVisit = bookingDate
          }
        } else {
          const bookingDate = booking.date?.toDate ? booking.date.toDate() : new Date(booking.date)
          customerMap.set(customerId, {
            id: customerId,
            name: customerName,
            phone: customerPhone,
            email: booking.customerEmail || booking.clientEmail,
            bookingsCount: 1,
            lastVisit: bookingDate
          })
        }
      })
      
      // Преобразуем в массив и сортируем по релевантности
      const results = Array.from(customerMap.values())
        .sort((a, b) => {
          // Сначала по количеству бронирований
          if (b.bookingsCount !== a.bookingsCount) {
            return b.bookingsCount - a.bookingsCount
          }
          // Затем по дате последнего визита
          if (a.lastVisit && b.lastVisit) {
            return b.lastVisit.getTime() - a.lastVisit.getTime()
          }
          return 0
        })
        .slice(0, 10) // Показываем максимум 10 результатов
      
      // console.log(`Search for "${searchText}" found ${results.length} customers`)
      setSearchResults(results)
    } catch (error) {
      console.error('Error searching customers:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  // Обработчик выбора клиента
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormData(prev => ({
      ...prev,
      clientName: customer.name,
      clientPhone: customer.phone
    }))
    setSearchQuery('')
    setSearchResults([])
    setShowDropdown(false)
  }

  // Сброс выбранного клиента
  const handleResetCustomer = () => {
    setSelectedCustomer(null)
    setFormData(prev => ({
      ...prev,
      clientName: '',
      clientPhone: '+7'
    }))
    setShowNewCustomerForm(false)
    setSearchQuery('')
  }

  // Функция для расчета цены с учетом интервалов и праздничных дней
  const calculatePrice = (time: string, duration: number): number => {
    const court = courts.find(c => c.id === formData.courtId)
    if (!court) return 0

    const bookingDate = new Date(formData.date)
    
    // Используем новую функцию расчета цены с поддержкой праздничных дней
    // duration передаем в минутах, как ожидает функция
    return calculateCourtPrice(
      bookingDate,
      time,
      duration * 60, // конвертируем часы в минуты
      court.pricing,
      court.holidayPricing,
      court.priceWeekday,
      court.priceWeekend
    )
  }

  // Проверка, занят ли временной слот
  const isSlotOccupied = (startTime: string, duration: number, courtId?: string, trainerId?: string) => {
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const slotStart = startHour + startMinute / 60
    const slotEnd = slotStart + duration


    // Для проверки занятости тренера нужно смотреть ВСЕ его бронирования, а не только на этом корте
    const relevantBookings = trainerId
      ? existingBookings // Если есть тренер, проверяем все бронирования
      : courtId 
        ? existingBookings.filter(booking => booking.courtId === courtId) // Иначе только по корту
        : existingBookings

    const occupied = relevantBookings.some(booking => {
      const [bookingStartHour, bookingStartMinute] = booking.startTime.split(':').map(Number)
      const bookingStart = bookingStartHour + bookingStartMinute / 60
      
      // Вычисляем endTime если его нет
      let bookingEnd: number
      if (booking.endTime) {
        const [bookingEndHour, bookingEndMinute] = booking.endTime.split(':').map(Number)
        bookingEnd = bookingEndHour + bookingEndMinute / 60
      } else {
        // Если нет endTime, используем duration (в минутах)
        const durationInHours = (booking.duration || 60) / 60
        bookingEnd = bookingStart + durationInHours
      }

      // Проверка для тренера
      if (trainerId && booking.trainerId === trainerId) {
        // Стандартная проверка пересечения для занятий тренера
        // Смежные слоты (где конец одного = начало другого) не считаются пересекающимися
        if (slotStart < bookingEnd && slotEnd > bookingStart) {
          return true // Время пересекается с другим занятием тренера
        }
      }
      
      // Проверка занятости корта (только если проверяем конкретный корт и бронирование на том же корте)
      if (courtId && booking.courtId === courtId) {
        const hasConflict = (slotStart < bookingEnd && slotEnd > bookingStart)
        return hasConflict
      }
      
      return false
    })
    
    return occupied
  }

  // Генерация временных слотов с учетом длительности и режима работы
  const generateTimeSlots = (duration: number) => {
    const slots: string[] = []
    
    // Определяем день недели для выбранной даты
    const selectedDate = new Date(formData.date)
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = dayNames[selectedDate.getDay()]
    
    // Получаем режим работы для выбранного дня
    const dayHours = venueWorkingHours[dayName]
    
    let openTimeStr = '08:00'
    let closeTimeStr = '22:00'
    
    if (dayHours) {
      if (typeof dayHours === 'string' && dayHours.includes('-')) {
        // Формат строки: "08:00-22:00"
        const [open, close] = dayHours.split('-').map(t => t.trim())
        openTimeStr = open || '08:00'
        closeTimeStr = close || '22:00'
      } else if (dayHours.open && dayHours.close) {
        // Формат объекта: { open: '08:00', close: '22:00' }
        openTimeStr = dayHours.open
        closeTimeStr = dayHours.close
      }
    }
    
    // Парсим время открытия и закрытия
    const [openHour, openMinute] = openTimeStr.split(':').map(Number)
    const [closeHour, closeMinute] = closeTimeStr.split(':').map(Number)
    
    const startTime = openHour + openMinute / 60
    const endTime = closeHour + closeMinute / 60
    const maxStartTime = endTime - duration // Последнее время, когда можно начать бронирование
    
    // Используем интервал из настроек venue
    const interval = venueSlotInterval === 60 ? 1 : 0.5
    
    for (let hour = startTime; hour <= maxStartTime; hour += interval) {
      const wholeHour = Math.floor(hour)
      const minutes = (hour % 1) * 60
      const timeString = `${String(wholeHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      
      // Проверяем, что бронирование не выйдет за пределы рабочего времени
      if (hour + duration <= endTime) {
        slots.push(timeString)
      }
    }
    
    return slots
  }

  // Debounce для поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery && !showNewCustomerForm) {
        searchCustomers(searchQuery)
        setShowDropdown(true)
      } else {
        setShowDropdown(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, showNewCustomerForm])
  
  // Закрытие dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])
  
  // Автоматически устанавливаем онлайн оплату для открытых групповых тренировок
  useEffect(() => {
    if (bookingType === 'group' && isPublicGroup) {
      setFormData(prev => ({ ...prev, paymentMethod: 'online' }))
    }
  }, [bookingType, isPublicGroup])

  const loadPaymentMethodsSettings = async () => {
    if (!venueId) return
    
    try {
      const venueDoc = await getDoc(doc(db, 'venues', venueId))
      if (venueDoc.exists()) {
        const data = venueDoc.data()
        if (data.enabledPaymentMethods) {
          setEnabledPaymentMethods(data.enabledPaymentMethods)
        }
      }
    } catch (error) {
      console.error('Error loading payment methods settings:', error)
    }
  }

  useEffect(() => {
    if (isOpen && venueId) {
      // Передаем true в fetchCourts если есть preSelectedCourtId,
      // чтобы не выбирать автоматически первый корт
      fetchCourts(!!preSelectedCourtId)
      fetchTrainers()
      loadPaymentMethodsSettings()
      
      // Устанавливаем значение по умолчанию для paymentMethod на "online"
      // если текущий метод отключен
      if (!enabledPaymentMethods[formData.paymentMethod] && formData.paymentMethod !== 'online') {
        setFormData(prev => ({ ...prev, paymentMethod: 'online' }))
      }
      
      // Подписываемся на real-time обновления кортов
      const courtsRef = collection(db, 'venues', venueId, 'courts')
      const unsubscribeCourts = onSnapshot(courtsRef, 
        (snapshot) => {
          const courtsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Court[]
          setCourts(courtsData)
          
          // Если выбранный корт был удален, сбрасываем выбор
          if (formData.courtId && !courtsData.find(c => c.id === formData.courtId)) {
            setFormData(prev => ({ ...prev, courtId: '' }))
          }
        },
        (error) => {
          console.error('Error listening to courts:', error)
          // При ошибке подключения просто логируем, не прерываем работу
          // Пользователь все еще может использовать последние загруженные данные
        }
      )
      
      // Обновляем форму при изменении предвыбранных значений
      // ВАЖНО: preSelectedCourtId имеет приоритет над старым значением
      const actualCourtId = preSelectedCourtId || ''
      
      const newFormData = {
        ...formData,
        date: preSelectedDate ? formatDateToLocal(preSelectedDate) : formData.date,
        startTime: preSelectedTime || formData.startTime,
        courtId: actualCourtId,
        duration: formData.duration,
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        paymentMethod: formData.paymentMethod
      }
      
      setFormData(newFormData)
      
      // Устанавливаем тренера если он предвыбран
      if (preSelectedTrainerId) {
        setSelectedTrainerId(preSelectedTrainerId)
        setIncludeTrainer(true)
      } else {
        // Сбрасываем тренера если он не предвыбран
        setSelectedTrainerId('')
        setIncludeTrainer(false)
      }
      
      // Очищаем старые бронирования при открытии
      setExistingBookings([])
      
      // Инициализируем слоты при открытии с новыми данными
      const slots = generateTimeSlots(newFormData.duration)
      setAvailableSlots(slots)
      
      // Загружаем существующие бронирования при открытии модального окна
      if (newFormData.date) {
        const dateToUse = newFormData.date
        
        if (preSelectedTrainerId) {
          // Если открыто из календаря тренера, загружаем все бронирования
          fetchAllCourtsBookings(dateToUse)
        } else if (actualCourtId) {
          // Если открыто из календаря кортов, загружаем для конкретного корта
          fetchExistingBookings(actualCourtId, dateToUse)
        }
      }
      
      return () => {
        unsubscribeCourts()
      }
    } else if (!isOpen) {
      // Сбрасываем состояние поиска при закрытии
      setSearchQuery('')
      setSearchResults([])
      setSelectedCustomer(null)
      setSearchLoading(false)
      setShowNewCustomerForm(false)
      setShowDropdown(false)
      // Очищаем бронирования при закрытии
      setExistingBookings([])
      setBookingsLoading(false)
      // Отписываемся от подписки
      if (unsubscribe) {
        unsubscribe()
        setUnsubscribe(null)
      }
      // Сбрасываем форму к начальным значениям
      setFormData({
        clientName: '',
        clientPhone: '+7',
        courtId: '',
        date: formatDateToLocal(new Date()),
        startTime: '10:00',
        duration: 1,
        paymentMethod: 'online' as 'cash' | 'card_on_site' | 'transfer' | 'online' | 'sberbank_card' | 'tbank_card' | 'vtb_card'
      })
      setAvailableSlots([])
      // Сбрасываем выбранного тренера
      setSelectedTrainerId('')
      setIncludeTrainer(false)
      // Сбрасываем тип бронирования и связанные состояния групповой тренировки
      setBookingType('individual')
      setIsPublicGroup(false)
      setMaxParticipants(8)
      setCurrentParticipants(0)
      setGroupDescription('')
      setParticipants([])
    }
  }, [isOpen, venueId, preSelectedDate, preSelectedTime, preSelectedCourtId, venueSlotInterval])

  // Обновляем доступные слоты при изменении длительности или даты
  useEffect(() => {
    const slots = generateTimeSlots(formData.duration)
    setAvailableSlots(slots)
    
    // Если текущее время больше не доступно, выбираем первое доступное
    if (!slots.includes(formData.startTime) && slots.length > 0) {
      setFormData(prev => ({
        ...prev,
        startTime: slots[0]
      }))
    }
  }, [formData.duration, formData.date, venueSlotInterval, venueWorkingHours])
  
  // Перезагружаем существующие бронирования при изменении даты или корта
  useEffect(() => {
    if (isOpen && formData.date) {
      if (preSelectedTrainerId) {
        // Если открыто из календаря тренера, загружаем бронирования всех кортов
        fetchAllCourtsBookings(formData.date)
      } else if (formData.courtId) {
        // Иначе загружаем только для выбранного корта
        fetchExistingBookings(formData.courtId, formData.date)
      }
    }
  }, [formData.date, formData.courtId, isOpen, preSelectedTrainerId])

  // Загружаем бронирования тренеров при изменении даты
  useEffect(() => {
    if (isOpen && formData.date) {
      fetchTrainerBookings(formData.date)
    }
  }, [formData.date, isOpen])

  // Загружаем бронирования при изменении корта или даты с real-time обновлениями
  useEffect(() => {
    // Устанавливаем флаг для отмены если компонент размонтируется
    let cancelled = false
    
    if (formData.date && isOpen && venueId) {
      // Отписываемся от предыдущей подписки
      if (unsubscribe) {
        unsubscribe()
        setUnsubscribe(null)
      }

      // Очищаем существующие бронирования перед загрузкой новых
      setExistingBookings([])
      setBookingsLoading(true)

      // Если открыто из календаря тренера
      if (preSelectedTrainerId) {
        if (!formData.courtId) {
          // Если корт не выбран, загружаем все бронирования
          fetchAllCourtsBookings(formData.date).finally(() => setBookingsLoading(false))

          // Настраиваем real-time подписку для всех кортов
          const bookingsRef = collection(db, 'bookings')
          
          const parsedDate = new Date(formData.date)
          const startOfDay = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 0, 0, 0))
          const endOfDay = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 23, 59, 59))
          
          const q = query(
            bookingsRef,
            where('venueId', '==', venueId),
            where('date', '>=', Timestamp.fromDate(startOfDay)),
            where('date', '<=', Timestamp.fromDate(endOfDay))
          )

          const unsub = onSnapshot(q, 
            (snapshot) => {
              const allBookings = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }))
              
              // Фильтруем бронирования согласно ТЗ
              const bookings = allBookings.filter(booking => {
                const status = booking.status || 'pending'
                const paymentStatus = booking.paymentStatus || 'awaiting_payment'
                
                if (status === 'cancelled') return false
                if (['cancelled', 'refunded', 'error'].includes(paymentStatus)) return false
                if (status === 'confirmed' || status === 'pending') return true
                if (paymentStatus === 'paid' || paymentStatus === 'awaiting_payment') return true
                
                return false
              })
              
              setExistingBookings(bookings)
            },
            (error) => {
              console.error('Error listening to bookings:', error)
              setBookingsLoading(false)
            }
          )

          if (!cancelled) {
            setUnsubscribe(() => unsub)
          }
          return
        } else {
          // Если корт выбран при бронировании с тренером, загружаем для конкретного корта
          fetchExistingBookings(formData.courtId, formData.date).finally(() => setBookingsLoading(false))
          
          // Настраиваем real-time подписку для конкретного корта
          const bookingsRef = collection(db, 'bookings')
          
          const parsedDate = new Date(formData.date)
          const startOfDay = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 0, 0, 0))
          const endOfDay = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 23, 59, 59))
          
          const q = query(
            bookingsRef,
            where('courtId', '==', formData.courtId),
            where('date', '>=', Timestamp.fromDate(startOfDay)),
            where('date', '<=', Timestamp.fromDate(endOfDay))
          )
          
          const unsub = onSnapshot(q, 
            (snapshot) => {
              const bookings = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              })).filter(booking => {
                const status = booking.status || 'pending'
                const paymentStatus = booking.paymentStatus || 'awaiting_payment'
                
                if (status === 'cancelled') return false
                if (['cancelled', 'refunded', 'error'].includes(paymentStatus)) return false
                if (status === 'confirmed' || status === 'pending') return true
                if (paymentStatus === 'paid' || paymentStatus === 'awaiting_payment') return true
                
                return false
              })
              
              setExistingBookings(bookings)
            },
            (error) => {
              console.error('Error listening to court bookings:', error)
              setBookingsLoading(false)
            }
          )
          
          if (!cancelled) {
            setUnsubscribe(() => unsub)
          }
          return
        }
      }

      // Для обычного режима (календарь кортов)
      if (formData.courtId) {
        // Загружаем начальные данные
        fetchExistingBookings(formData.courtId, formData.date).finally(() => setBookingsLoading(false))

        // Настраиваем real-time подписку
        const bookingsRef = collection(db, 'bookings')
      
      // Используем только Timestamp формат (все даты теперь унифицированы)
      const parsedDate = new Date(formData.date)
      const startOfDay = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 0, 0, 0))
      const endOfDay = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 23, 59, 59))
      
      const q = query(
        bookingsRef,
        where('courtId', '==', formData.courtId),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
      )

      const unsub = onSnapshot(q, 
        (snapshot) => {
          const bookings = new Map()
          
          snapshot.docs.forEach(doc => {
            const data = doc.data()
            // Фильтруем согласно ТЗ:
            // Корт считается занятым если:
            // - status НЕ равен 'cancelled' И
            // - paymentStatus НЕ равен 'cancelled', 'refunded', 'error' И
            // - (status = 'confirmed' ИЛИ 'pending' ИЛИ paymentStatus = 'paid' ИЛИ 'awaiting_payment')
            const status = data.status || 'pending'
            const paymentStatus = data.paymentStatus || 'awaiting_payment'
            
            if (status !== 'cancelled' && 
                paymentStatus !== 'cancelled' && 
                paymentStatus !== 'refunded' &&
                paymentStatus !== 'error' &&
                (status === 'confirmed' || status === 'pending' ||
                 paymentStatus === 'paid' ||
                 paymentStatus === 'awaiting_payment')) {
              bookings.set(doc.id, { id: doc.id, ...data })
            }
          })
          
          setExistingBookings(Array.from(bookings.values()))
        },
        (error) => {
          console.error('Error listening to selected court bookings:', error)
          setBookingsLoading(false)
        }
      )

      if (!cancelled) {
        setUnsubscribe(() => unsub)
      }
      }
    }

    // Cleanup при размонтировании или закрытии модального окна
    return () => {
      cancelled = true
      setUnsubscribe((currentUnsubscribe) => {
        if (currentUnsubscribe) {
          currentUnsubscribe()
        }
        return null
      })
    }
  }, [formData.courtId, formData.date, isOpen, venueId, preSelectedTrainerId])

  const fetchCourts = async (skipAutoSelect?: boolean) => {
    if (!venueId) return

    try {
      // Получаем информацию о venue
      const venueDoc = await getDoc(doc(db, 'venues', venueId))
      if (venueDoc.exists()) {
        const venueData = venueDoc.data()
        setVenueName(venueData.name || '')
        setVenueSlotInterval(venueData.bookingSlotInterval || 60)
        
        // Загружаем режим работы клуба
        if (venueData.workingHours) {
          setVenueWorkingHours(venueData.workingHours)
        }
      }

      const courtsRef = collection(db, 'venues', venueId, 'courts')
      const snapshot = await getDocs(courtsRef)
      
      const courtsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Court[]
      
      setCourts(courtsData)
      
      // Автоматически выбираем первый корт, только если нет предвыбранного
      // skipAutoSelect = true когда у нас есть preSelectedCourtId
      // Также проверяем текущее значение formData.courtId еще раз
      setFormData(prev => {
        // Если уже есть выбранный корт или skipAutoSelect, не меняем
        if (prev.courtId || skipAutoSelect) {
          return prev
        }
        // Если кортов нет, не меняем
        if (courtsData.length === 0) {
          return prev
        }
        // Выбираем первый корт только если действительно нужно
        return { ...prev, courtId: courtsData[0].id }
      })
    } catch (error) {
      console.error('Error fetching courts:', error)
    }
  }

  const fetchTrainers = async () => {
    if (!venueId) return

    try {
      const trainersQuery = query(
        collection(db, 'trainers'),
        where('clubId', '==', venueId)
      )
      const snapshot = await getDocs(trainersQuery)
      
      const trainersData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((trainer: any) => trainer.status === 'active') // Фильтруем на клиенте
      
      // Сортируем на клиенте
      trainersData.sort((a: any, b: any) => 
        (a.firstName || '').localeCompare(b.firstName || '')
      )
      
      setTrainers(trainersData)
    } catch (error) {
      console.error('Error fetching trainers:', error)
    }
  }

  const fetchTrainerBookings = async (date: string) => {
    if (!venueId || !date) return

    try {
      // Создаем даты для начала и конца дня в UTC
      const parsedDate = new Date(date)
      const startOfDay = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 0, 0, 0))
      const endOfDay = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 23, 59, 59))

      // Загружаем все бронирования с тренерами на выбранную дату
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('venueId', '==', venueId),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
      )
      const snapshot = await getDocs(bookingsQuery)
      
      const bookingsWithTrainers = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((booking: any) => {
          // Фильтруем только активные бронирования с тренерами
          const status = booking.status || 'pending'
          const paymentStatus = booking.paymentStatus || 'awaiting_payment'
          
          return booking.trainerId && 
                 status !== 'cancelled' && 
                 paymentStatus !== 'cancelled' && 
                 paymentStatus !== 'refunded' &&
                 paymentStatus !== 'error'
        })
      
      setTrainerBookings(bookingsWithTrainers)
    } catch (error) {
      console.error('Error fetching trainer bookings:', error)
    }
  }

  const fetchAllCourtsBookings = async (date: string) => {
    if (!venueId || !date) return

    try {
      const bookingsRef = collection(db, 'bookings')
      
      // Используем только Timestamp формат
      const parsedDate = new Date(date)
      const startOfDay = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 0, 0, 0))
      const endOfDay = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 23, 59, 59))
      
      const q = query(
        bookingsRef,
        where('venueId', '==', venueId),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
      )
      
      const snapshot = await getDocs(q)
      
      // Преобразуем результаты в массив
      const allBookings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Фильтруем бронирования согласно ТЗ
      const bookings = allBookings.filter(booking => {
        const status = booking.status || 'pending'
        const paymentStatus = booking.paymentStatus || 'awaiting_payment'
        
        // Корт считается занятым если:
        // - status НЕ равен 'cancelled' И
        // - paymentStatus НЕ равен 'cancelled', 'refunded', 'error' И
        // - (status = 'confirmed' ИЛИ 'pending' ИЛИ paymentStatus = 'paid' ИЛИ 'awaiting_payment')
        if (status === 'cancelled') return false
        if (['cancelled', 'refunded', 'error'].includes(paymentStatus)) return false
        if (status === 'confirmed' || status === 'pending') return true
        if (paymentStatus === 'paid' || paymentStatus === 'awaiting_payment') return true
        
        return false
      })
      
      setExistingBookings(bookings)
    } catch (error) {
      console.error('Error fetching all courts bookings:', error)
    }
  }

  const fetchExistingBookings = async (courtId?: string, date?: string) => {
    const targetCourtId = courtId || formData.courtId
    const targetDate = date || formData.date
    
    if (!venueId || !targetCourtId || !targetDate) return

    try {
      const bookingsRef = collection(db, 'bookings')
      
      // Используем только Timestamp формат (все даты теперь унифицированы)
      const parsedDate = new Date(targetDate)
      const startOfDay = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 0, 0, 0))
      const endOfDay = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 23, 59, 59))
      
      const q = query(
        bookingsRef,
        where('courtId', '==', targetCourtId),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
      )
      
      const snapshot = await getDocs(q)
      
      // Преобразуем результаты в массив
      const allBookings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Фильтруем бронирования согласно ТЗ
      const bookings = allBookings
        .filter(booking => {
          const status = booking.status || 'pending'
          const paymentStatus = booking.paymentStatus || 'awaiting_payment'
          
          // Корт считается занятым если:
          // - status НЕ равен 'cancelled' И
          // - paymentStatus НЕ равен 'cancelled', 'refunded', 'error' И
          // - (status = 'confirmed' ИЛИ 'pending' ИЛИ paymentStatus = 'paid' ИЛИ 'awaiting_payment')
          return status !== 'cancelled' && 
                 paymentStatus !== 'cancelled' && 
                 paymentStatus !== 'refunded' &&
                 paymentStatus !== 'error' &&
                 (status === 'confirmed' || status === 'pending' ||
                  paymentStatus === 'paid' ||
                  paymentStatus === 'awaiting_payment')
        })
      
      setExistingBookings(bookings)
    } catch (error) {
      console.error('Error fetching bookings:', error)
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
    
    if (!venueId || !admin) return
    
    // Блокируем повторное нажатие
    if (loading) return
    
    // Валидация данных (только для индивидуальных бронирований)
    if (bookingType !== 'group') {
      if (!formData.clientName) {
        alert('Пожалуйста, укажите имя клиента')
        return
      }
      
      if (!formData.clientPhone) {
        alert('Пожалуйста, укажите телефон клиента')
        return
      }
      
      if (!isValidName(formData.clientName)) {
        alert('Имя должно быть от 2 до 100 символов')
        return
      }
      
      if (!isValidPhone(formData.clientPhone)) {
        alert('Некорректный номер телефона')
        return
      }
    }
    
    // Если открыто из календаря тренера, проверяем доступность кортов
    if (preSelectedTrainerId && !formData.courtId) {
      // Проверяем, есть ли хотя бы один свободный корт
      const availableCourt = courts.find(court => {
        // Загружаем бронирования для этого корта
        const courtBookings = existingBookings.filter(b => b.courtId === court.id)
        
        const [startHour, startMinute] = formData.startTime.split(':').map(Number)
        const slotStart = startHour + startMinute / 60
        const slotEnd = slotStart + formData.duration
        
        // Проверяем, свободен ли корт в это время
        const isCourtOccupied = courtBookings.some(booking => {
          const [bookingStartHour, bookingStartMinute] = booking.startTime.split(':').map(Number)
          const [bookingEndHour, bookingEndMinute] = booking.endTime.split(':').map(Number)
          const bookingStart = bookingStartHour + bookingStartMinute / 60
          const bookingEnd = bookingEndHour + bookingEndMinute / 60
          
          return (slotStart < bookingEnd && slotEnd > bookingStart)
        })
        
        return !isCourtOccupied
      })
      
      if (!availableCourt) {
        alert('Все корты заняты в выбранное время. Пожалуйста, выберите другое время.')
        return
      }
      
      // Автоматически выбираем первый свободный корт
      setFormData(prev => ({ ...prev, courtId: availableCourt.id }))
    }
    
    if (!formData.courtId) {
      alert('Пожалуйста, выберите корт')
      return
    }
    
    // Проверка что выбранный слот не занят
    if (isSlotOccupied(formData.startTime, formData.duration, formData.courtId, selectedTrainerId)) {
      alert('Выбранное время уже занято. Пожалуйста, выберите другое время.')
      return
    }
    
    // Проверка даты бронирования
    const bookingDate = new Date()
    bookingDate.setFullYear(
      parseInt(formData.date.split('-')[0]),
      parseInt(formData.date.split('-')[1]) - 1,
      parseInt(formData.date.split('-')[2])
    )
    
    if (!isValidBookingDate(bookingDate)) {
      alert('Нельзя забронировать на прошедшую дату')
      return
    }
    
    // Расчет времени окончания
    const [startHours, startMinutes] = formData.startTime.split(':').map(Number)
    const endMinutes = startHours * 60 + startMinutes + formData.duration * 60
    const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`
    
    if (!isValidBookingTime(formData.startTime, endTime, formData.duration * 60)) {
      alert('Некорректное время бронирования')
      return
    }

    setLoading(true)
    try {
      const court = courts.find(c => c.id === formData.courtId)
      if (!court) return

      const [hours, minutes] = formData.startTime.split(':').map(Number)
      const endHours = hours + Math.floor(formData.duration)
      const endMinutes = minutes + (formData.duration % 1) * 60
      const endTime = `${String(endHours + Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`

      // Проверяем доступность слота непосредственно перед созданием
      // Конвертируем дату в правильный формат для запроса
      const bookingDateObj = new Date(formData.date + 'T00:00:00')
      const startOfDay = new Date(Date.UTC(bookingDateObj.getFullYear(), bookingDateObj.getMonth(), bookingDateObj.getDate(), 0, 0, 0))
      const endOfDay = new Date(Date.UTC(bookingDateObj.getFullYear(), bookingDateObj.getMonth(), bookingDateObj.getDate(), 23, 59, 59))
      
      // Запрашиваем все бронирования на эту дату для этого корта
      const checkQuery = query(
        collection(db, 'bookings'),
        where('courtId', '==', formData.courtId),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
      )
      
      const checkSnapshot = await getDocs(checkQuery)
      
      const conflictingBookings = checkSnapshot.docs.filter(doc => {
        const booking = doc.data()
        
        // Фильтруем бронирования согласно ТЗ
        const status = booking.status || 'pending'
        const paymentStatus = booking.paymentStatus || 'awaiting_payment'
        
        // Пропускаем если отменено или ошибка/возврат в оплате
        if (status === 'cancelled' || 
            paymentStatus === 'cancelled' || 
            paymentStatus === 'refunded' ||
            paymentStatus === 'error') {
          return false
        }
        
        // Пропускаем если нет ни одного из подтверждающих статусов
        if (!(status === 'confirmed' || status === 'pending' ||
              paymentStatus === 'paid' ||
              paymentStatus === 'awaiting_payment')) {
          return false
        }
        
        // Проверяем, что это бронирование для нужного venue
        if (booking.venueId !== venueId) return false
        
        const bookingStart = booking.startTime || booking.time
        const bookingEnd = booking.endTime
        
        // Проверяем пересечение времени
        const newStartMinutes = hours * 60 + minutes
        const newEndMinutes = newStartMinutes + formData.duration * 60
        
        const [bookingStartHour, bookingStartMin] = bookingStart.split(':').map(Number)
        const [bookingEndHour, bookingEndMin] = bookingEnd.split(':').map(Number)
        const bookingStartMinutes = bookingStartHour * 60 + bookingStartMin
        const bookingEndMinutes = bookingEndHour * 60 + bookingEndMin
        
        // Проверяем пересечение интервалов
        const hasConflict = (newStartMinutes < bookingEndMinutes && newEndMinutes > bookingStartMinutes)
        return hasConflict
      })
      
      if (conflictingBookings.length > 0) {
        alert('К сожалению, выбранное время уже занято. Пожалуйста, выберите другое время.')
        setLoading(false)
        return
      }

      // Все бронирования создаются со статусом pending до подтверждения оплаты
      const paymentStatus = 'awaiting_payment'
      const bookingStatus = 'pending' // Всегда pending до оплаты
      
      // Преобразуем часы в минуты для хранения
      const durationMinutes = hoursToMinutes(formData.duration)
      
      // Рассчитываем стоимость с учетом тренера
      const courtPrice = calculatePrice(formData.startTime, formData.duration)
      let totalPrice = courtPrice
      let trainerData: any = {}
      
      // Если выбран тренер, добавляем его данные и стоимость
      if (includeTrainer && selectedTrainerId) {
        const selectedTrainer = trainers.find((t: any) => t.id === selectedTrainerId)
        if (selectedTrainer) {
          // Для групповых тренировок используем groupPrice * количество участников, для индивидуальных - pricePerHour
          const trainerCost = bookingType === 'group' 
            ? (selectedTrainer.groupPrice || 0) * maxParticipants // Для групповых - цена с человека * количество участников
            : Math.round(selectedTrainer.pricePerHour * formData.duration) // Для индивидуальных - почасовая
          
          const commission = selectedTrainer.commissionType === 'percent'
            ? Math.round(trainerCost * (selectedTrainer.commissionValue / 100))
            : selectedTrainer.commissionValue
          
          trainerData = {
            trainerId: selectedTrainerId,
            trainerName: `${selectedTrainer.firstName} ${selectedTrainer.lastName}`,
            trainerPrice: trainerCost,
            trainerCommission: commission,
            courtPrice: courtPrice
          }
          
          // Для групповых тренировок общая цена = цена корта (покрывается клубом)
          // Участники будут платить отдельно через страницу записи
          totalPrice = bookingType === 'group' ? courtPrice : courtPrice + trainerCost
        }
      }
      
      const pricePerHour = formData.duration > 0 ? courtPrice / formData.duration : 0
      
      // Создаем Timestamp напрямую из компонентов даты
      // Это гарантирует, что дата останется точно такой, какую выбрали
      const [year, month, day] = formData.date.split('-').map(Number)
      // Создаем дату в UTC чтобы она не зависела от локального времени
      const bookingDate = Timestamp.fromDate(new Date(Date.UTC(year, month - 1, day, 0, 0, 0)))
      
      const bookingData = {
        venueId: venueId,
        courtId: formData.courtId,
        courtName: court.name,
        venueName: venueName,
        customerName: bookingType === 'group' ? 'Групповая тренировка' : sanitizeString(formData.clientName),
        customerPhone: bookingType === 'group' ? admin?.phone || '' : normalizePhone(formData.clientPhone),
        date: bookingDate, // Уже Timestamp
        startTime: formData.startTime,
        duration: durationMinutes, // Сохраняем в минутах
        // endTime вычисляется при необходимости
        gameType: 'single',
        status: bookingStatus,
        amount: totalPrice, // Общая стоимость
        price: pricePerHour,
        paymentMethod: formData.paymentMethod,
        paymentStatus: paymentStatus,
        source: 'admin',
        ...trainerData, // Добавляем данные тренера если есть
        
        // Поля для групповых тренировок
        ...(bookingType === 'group' && {
          bookingType: 'group',
          maxParticipants: maxParticipants,
          currentParticipants: 0,
          visibility: isPublicGroup ? 'public' : 'private',
          groupRegistrationUrl: '' // Будет сгенерирован после создания
        }),
        
        // Для обратной совместимости (постепенно удалить)
        time: formData.startTime,
        endTime: calculateEndTime(formData.startTime, durationMinutes),
        clientName: bookingType === 'group' ? 'Групповая тренировка' : sanitizeString(formData.clientName),
        clientPhone: bookingType === 'group' ? admin?.phone || '' : normalizePhone(formData.clientPhone),
        paymentHistory: [{
          timestamp: Timestamp.now(),
          action: 'created',
          userId: admin.uid || '',
          userName: admin.displayName || admin.email || 'Администратор'
        }],
        createdBy: {
          userId: admin.uid || '',
          userName: admin.displayName || admin.email || 'Администратор',
          userRole: admin.role || 'admin'
        },
        createdAt: Timestamp.now()
      }
      
      const bookingRef = await addDoc(collection(db, 'bookings'), bookingData)
      
      // Для групповых тренировок генерируем и обновляем URL для записи
      if (bookingType === 'group') {
        const groupUrl = `https://allcourt.ru/club/${venueId}/group/${bookingRef.id}`
        await updateDoc(bookingRef, {
          groupRegistrationUrl: groupUrl
        })
        
        // Для закрытых групп с участниками - добавляем их в базу
        if (!isPublicGroup && groupParticipants.length > 0) {
          // Рассчитываем полную стоимость с человека для групповой тренировки
          // Включаем: стоимость корта / количество участников + стоимость тренера
          let pricePerPerson = 0
          
          // Стоимость корта делится на максимальное количество участников
          const courtPricePerPerson = Math.round(courtPrice / maxParticipants)
          pricePerPerson += courtPricePerPerson
          
          // Добавляем стоимость тренера с человека
          if (includeTrainer && selectedTrainerId) {
            const trainer = trainers.find((t: any) => t.id === selectedTrainerId)
            const trainerPricePerPerson = trainer?.groupPrice || 0
            pricePerPerson += trainerPricePerPerson
          }
          
          for (const participant of groupParticipants) {
            await addDoc(collection(db, 'groupParticipants'), {
              groupTrainingId: bookingRef.id,
              name: participant.name,
              phone: participant.phone,
              email: participant.email || '',
              registrationType: 'admin',
              registeredBy: admin.uid || '',
              // Для всех способов оплаты изначально ставим статус "ожидает"
              // Статус "оплачен" может быть установлен только:
              // 1. Автоматически после успешной онлайн оплаты
              // 2. Вручную администратором (с записью в историю)
              paymentStatus: 'pending',
              paymentMethod: formData.paymentMethod,
              paymentAmount: pricePerPerson,
              // Детализация стоимости
              priceBreakdown: {
                courtPrice: courtPricePerPerson,
                trainerPrice: includeTrainer && selectedTrainerId ? (pricePerPerson - courtPricePerPerson) : 0,
                total: pricePerPerson
              },
              registeredAt: Timestamp.now(),
              // История изменений статуса платежа
              paymentHistory: [{
                timestamp: Timestamp.now(),
                action: 'created',
                status: 'pending',
                userId: admin.uid || '',
                userName: admin.email || 'Система',
                note: 'Участник добавлен администратором'
              }]
            })
          }
          
          // Обновляем счетчик участников
          await updateDoc(bookingRef, { 
            currentParticipants: groupParticipants.length 
          })
        }
        
        // Показываем ссылку пользователю
        alert(`Групповая тренировка создана!\n\nСсылка для записи участников:\n${groupUrl}\n\nСкопируйте и отправьте эту ссылку участникам.`)
      }

      // Если выбрана онлайн оплата и это НЕ групповая тренировка, инициализируем платеж
      // Для групповых тренировок платежи идут через участников
      if (formData.paymentMethod === 'online' && bookingType !== 'group') {
        console.log('Инициализация онлайн платежа для бронирования:', bookingRef.id)
        try {
          // Сначала проверяем настройки платежей для venue
          const venueDoc = await getDoc(doc(db, 'venues', venueId))
          const venueData = venueDoc.data()
          
          console.log('Настройки платежей venue:', {
            paymentEnabled: venueData?.paymentEnabled,
            paymentProvider: venueData?.paymentProvider,
            hasCredentials: !!venueData?.paymentCredentials
          })
          
          if (!venueData?.paymentEnabled) {
            throw new Error('Платежи не включены для этой площадки')
          }
          
          if (!venueData?.paymentProvider || !venueData?.paymentCredentials) {
            throw new Error('Платежный провайдер не настроен для этой площадки')
          }
          
          // Генерируем URL для страницы оплаты
          const baseUrl = window.location.origin
          const paymentPageUrl = `${baseUrl}/club/${venueId}/booking-payment/${bookingRef.id}`
          
          console.log('Вызов функции initBookingPayment с параметрами:', {
            bookingId: bookingRef.id,
            amount: totalPrice,
            venueId: venueId
          })
          
          // Инициализируем платеж
          const initBookingPayment = httpsCallable(functions, 'initBookingPayment')
          const paymentResult = await initBookingPayment({
            bookingId: bookingRef.id,
            amount: totalPrice,
            description: `Оплата бронирования корта ${court.name} на ${formData.date} ${formData.startTime}`,
            returnUrl: `${baseUrl}/club/${venueId}/booking-confirmation/${bookingRef.id}`,
            userId: admin.uid || '',
            customerPhone: normalizePhone(formData.clientPhone),
            customerEmail: ''
          })

          console.log('Результат инициализации платежа:', paymentResult.data)
          const payment = paymentResult.data as { success: boolean; paymentUrl?: string; error?: string; paymentId?: string }
          
          if (payment.success && payment.paymentUrl) {
            console.log('Платеж успешно инициализирован, обновляем бронирование')
            // Обновляем статус платежа на "awaiting_payment" если платеж успешно создан
            await updateDoc(doc(db, 'bookings', bookingRef.id), {
              paymentStatus: 'awaiting_payment',
              paymentId: payment.paymentId,
              paymentUrl: payment.paymentUrl,
              paymentHistory: arrayUnion({
                timestamp: Timestamp.now(),
                action: 'payment_initialized',
                userId: admin.uid || '',
                userName: admin.displayName || admin.email || 'Администратор',
                note: 'Платеж инициализирован'
              })
            })
            
            // Отправляем SMS с ссылкой на оплату
            try {
              console.log('Отправка SMS с ссылкой на оплату')
              const smsParams = {
                bookingId: bookingRef.id,
                phone: normalizePhone(formData.clientPhone),
                customerName: sanitizeString(formData.clientName),
                venueId: venueId,
                venueName: venueName || '',
                courtName: court.name || '',
                date: formData.date,
                time: formData.startTime,
                paymentUrl: payment.paymentUrl
              }
              console.log('SMS параметры:', smsParams)
              
              const sendBookingPaymentSMS = httpsCallable(functions, 'sendBookingPaymentSMS')
              await sendBookingPaymentSMS(smsParams)
              console.log('SMS со ссылкой на оплату отправлено успешно')
              alert(`Бронирование создано! SMS со ссылкой на оплату отправлено на номер ${formData.clientPhone}`)
            } catch (smsError: any) {
              console.error('Ошибка отправки SMS:', smsError)
              console.error('Детали ошибки:', {
                code: smsError?.code,
                message: smsError?.message,
                details: smsError?.details
              })
              alert(`Бронирование создано, но не удалось отправить SMS: ${smsError?.message || 'Неизвестная ошибка'}`)
            }
          } else {
            // Если не удалось создать платеж, обновляем статус
            console.error('Payment initialization failed:', payment.error)
            await updateDoc(doc(db, 'bookings', bookingRef.id), {
              paymentStatus: 'error',
              paymentError: payment.error || 'Не удалось инициализировать платеж',
              paymentHistory: arrayUnion({
                timestamp: Timestamp.now(),
                action: 'payment_error',
                userId: admin.uid || '',
                userName: admin.displayName || admin.email || 'Администратор',
                note: `Ошибка инициализации платежа: ${payment.error || 'Unknown error'}`
              })
            })
          }
        } catch (error) {
          console.error('Error initializing payment:', error)
          // Обновляем статус платежа на error
          await updateDoc(doc(db, 'bookings', bookingRef.id), {
            paymentStatus: 'error',
            paymentError: error instanceof Error ? error.message : 'Ошибка при инициализации платежа',
            paymentHistory: arrayUnion({
              timestamp: Timestamp.now(),
              action: 'payment_error',
              userId: admin.uid || '',
              userName: admin.displayName || admin.email || 'Администратор',
              note: `Ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`
            })
          })
        }
      }

      // Сбрасываем форму
      setFormData({
        clientName: '',
        clientPhone: '+7',
        courtId: courts.length > 0 ? courts[0].id : '',
        date: formatDateToLocal(new Date()),
        startTime: '10:00',
        duration: 1,
        paymentMethod: 'online'
      })
      
      // Сбрасываем состояние поиска
      setSearchQuery('')
      setSearchResults([])
      setSelectedCustomer(null)
      setShowNewCustomerForm(false)

      // Очищаем подписки перед закрытием
      if (unsubscribe) {
        unsubscribe()
        setUnsubscribe(null)
      }
      
      // Передаем данные созданного бронирования
      // Преобразуем обратно для отображения
      const createdBooking = {
        id: bookingRef.id,
        ...bookingData,
        date: bookingDate, // Передаем Date объект
        courtName: court.name,
        venueName: venueName,
        // Для отображения вычисляем endTime
        endTime: calculateEndTime(formData.startTime, durationMinutes)
      }
      
      onSuccess(createdBooking)
      // Не вызываем onClose здесь, так как он будет вызван в onSuccess
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Ошибка при создании бронирования: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="modal active"
      onClick={(e) => {
        // Закрываем при клике на оверлей (фон)
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Создать бронирование</h2>
          <button className="modal-close" onClick={onClose}>
            <Close />
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
              <div className="form-group">
                <label className="form-label">Корт</label>
                <select 
                  className="form-select"
                  name="courtId"
                  value={formData.courtId}
                  onChange={handleInputChange}
                  disabled={loading}
                  required
                >
                  <option value="">Выберите корт</option>
                  {courts.map(court => {
                    return (
                      <option key={court.id} value={court.id}>
                        {court.name}
                      </option>
                    )
                  })}
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
                  disabled={loading}
                  required
                />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
              <div className="form-group">
                <label className="form-label">Длительность</label>
                <select 
                  className="form-select"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  disabled={loading}
                >
                  <option value="0.5">30 минут</option>
                  <option value="1">1 час</option>
                  <option value="1.5">1.5 часа</option>
                  <option value="2">2 часа</option>
                  <option value="2.5">2.5 часа</option>
                  <option value="3">3 часа</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Доступные интервалы</label>
                <select 
                  className="form-select"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  disabled={loading}
                  required
                >
                  <option value="">
                    {bookingsLoading ? 'Загрузка...' : 'Выберите время'}
                  </option>
                  {!bookingsLoading && availableSlots.map(time => {
                    const occupied = isSlotOccupied(time, formData.duration, formData.courtId, selectedTrainerId)
                    // Вычисляем время окончания
                    const [startHour, startMinute] = time.split(':').map(Number)
                    const endHour = startHour + Math.floor(formData.duration)
                    const endMinute = startMinute + (formData.duration % 1) * 60
                    const finalEndHour = endHour + Math.floor(endMinute / 60)
                    const finalEndMinute = endMinute % 60
                    const endTime = `${String(finalEndHour).padStart(2, '0')}:${String(finalEndMinute).padStart(2, '0')}`
                    
                    // Вычисляем цену для этого интервала
                    const price = calculatePrice(time, formData.duration)
                    
                    return (
                      <option 
                        key={time} 
                        value={time} 
                        disabled={occupied}
                        style={occupied ? { color: '#9CA3AF', backgroundColor: '#F3F4F6' } : {}}
                      >
                        {time} - {endTime} {occupied ? '❌ ЗАНЯТО' : ` - ${price.toLocaleString('ru-RU')}₽`}
                      </option>
                    )
                  })}
                </select>
                {/* Краткое предупреждение о часовом поясе */}
                <div style={{ 
                  marginTop: '6px',
                  fontSize: '12px',
                  color: '#6B7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <svg 
                    width="14" 
                    height="14" 
                    viewBox="0 0 20 20" 
                    fill="none"
                  >
                    <path 
                      fillRule="evenodd" 
                      clipRule="evenodd" 
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" 
                      fill="#9CA3AF"
                    />
                  </svg>
                  Местное время клуба
                </div>
              </div>
            </div>
            
            {/* Выбор тренера */}
            {formData.courtId && trainers.length > 0 && (
              <div className="form-group" style={{ marginTop: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <input 
                    type="checkbox" 
                    checked={includeTrainer}
                    onChange={(e) => {
                      setIncludeTrainer(e.target.checked)
                      if (!e.target.checked) {
                        setSelectedTrainerId('')
                      }
                    }}
                    style={{ marginRight: '8px' }}
                    disabled={!!preSelectedTrainerId}
                  />
                  <span className="form-label" style={{ marginBottom: 0 }}>
                    Добавить тренера
                  </span>
                </label>
                
                {includeTrainer && (
                  <>
                    <select
                      className="form-select"
                      value={selectedTrainerId}
                      onChange={(e) => setSelectedTrainerId(e.target.value)}
                      disabled={!!preSelectedTrainerId || loading}
                      required={includeTrainer}
                    >
                      <option value="">Выберите тренера</option>
                      {trainers
                        .filter((trainer: any) => {
                          // Фильтруем тренеров по типу корта
                          const court = courts.find(c => c.id === formData.courtId)
                          if (!court) return false
                          
                          // Мапинг типов кортов на специализации тренеров
                          const courtTypeToSport: Record<string, string[]> = {
                          'tennis': ['tennis'],
                          'padel': ['padel'],
                          'badminton': ['badminton'],
                          'universal': ['tennis', 'padel', 'badminton']
                        }
                        
                        const allowedSports = courtTypeToSport[court.type] || []
                        return trainer.specialization?.some((sport: string) => 
                          allowedSports.includes(sport)
                        )
                      })
                      .map((trainer: any) => {
                        // Проверяем доступность тренера
                        let isAvailable = true
                        let unavailableReason = ''
                        let slotTimeMinutes = 0 // Определяем переменную в начале блока
                        
                        if (formData.date && formData.startTime) {
                          const bookingDate = new Date(formData.date)
                          const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][bookingDate.getDay()]
                          const daySchedule = trainer.schedule?.[dayOfWeek]
                          
                          // Вычисляем время слота в минутах
                          const [slotHour, slotMinute] = formData.startTime.split(':').map(Number)
                          slotTimeMinutes = slotHour * 60 + slotMinute
                          
                          // Проверка выходного дня
                          if (!daySchedule?.enabled) {
                            isAvailable = false
                            unavailableReason = 'Выходной'
                          }
                          // Проверка рабочего времени
                          else if (daySchedule.start && daySchedule.end) {
                            const [startHour, startMinute] = daySchedule.start.split(':').map(Number)
                            const [endHour, endMinute] = daySchedule.end.split(':').map(Number)
                            
                            const startTimeMinutes = startHour * 60 + startMinute
                            const endTimeMinutes = endHour * 60 + endMinute
                            const bookingEndMinutes = slotTimeMinutes + (formData.duration * 60)
                            
                            if (slotTimeMinutes < startTimeMinutes || bookingEndMinutes > endTimeMinutes) {
                              isAvailable = false
                              unavailableReason = 'Нерабочее время'
                            }
                          }
                          
                          // Проверка статуса тренера
                          if (trainer.status === 'vacation') {
                            isAvailable = false
                            unavailableReason = 'В отпуске'
                          } else if (trainer.status === 'inactive') {
                            isAvailable = false
                            unavailableReason = 'Неактивен'
                          }
                          
                          // Проверка отпусков
                          if (isAvailable && trainer.vacations && trainer.vacations.length > 0) {
                            const bookingDateStr = formData.date
                            for (const vacation of trainer.vacations) {
                              if (vacation.startDate && vacation.endDate && 
                                  bookingDateStr >= vacation.startDate && 
                                  bookingDateStr <= vacation.endDate) {
                                isAvailable = false
                                unavailableReason = vacation.reason || 'Отпуск'
                                break
                              }
                            }
                          }
                          
                          // Проверка заблокированных дат
                          if (isAvailable && trainer.blockedDates && trainer.blockedDates.includes(formData.date)) {
                            isAvailable = false
                            unavailableReason = 'Недоступен'
                          }
                          
                          // Проверка конфликтов с существующими бронированиями тренера
                          if (isAvailable && trainerBookings.length > 0) {
                            const trainerBookingsForThisTrainer = trainerBookings.filter(
                              (booking: any) => booking.trainerId === trainer.id
                            )
                            
                            for (const booking of trainerBookingsForThisTrainer) {
                              const bookingTime = booking.startTime || booking.time || ''
                              // duration уже в минутах в базе данных
                              const bookingDurationMinutes = parseFloat(booking.duration) || 60
                              
                              const [bookingHour, bookingMinute] = bookingTime.split(':').map(Number)
                              const bookingStartMinutes = bookingHour * 60 + bookingMinute
                              const bookingEndMinutes = bookingStartMinutes + bookingDurationMinutes
                              
                              const slotStartMinutes = slotTimeMinutes
                              const slotEndMinutes = slotTimeMinutes + (formData.duration * 60)
                              
                              // Проверяем пересечение времени
                              // Смежные слоты (где конец одного = начало другого) не считаются пересекающимися
                              if (slotStartMinutes < bookingEndMinutes && slotEndMinutes > bookingStartMinutes) {
                                isAvailable = false
                                unavailableReason = 'Занят'
                                break
                              }
                            }
                          }
                        }
                        
                        return (
                          <option 
                            key={trainer.id} 
                            value={trainer.id}
                            disabled={!isAvailable}
                            style={!isAvailable ? { color: '#9CA3AF', backgroundColor: '#F3F4F6' } : {}}
                          >
                            {trainer.firstName} {trainer.lastName} - {trainer.pricePerHour}₽/час
                            {!isAvailable && ` (${unavailableReason})`}
                          </option>
                        )
                      })
                    }
                  </select>
                  
                  {/* UI для групповых тренировок */}
                  {selectedTrainerId && (
                    <div style={{ marginTop: '16px' }}>
                      {/* Переключатель типа тренировки */}
                      <div style={{ 
                        display: 'flex', 
                        gap: '16px', 
                        marginBottom: '16px',
                        padding: '12px',
                        background: '#f3f4f6',
                        borderRadius: '8px'
                      }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="bookingType"
                            value="individual"
                            checked={bookingType === 'individual'}
                            onChange={() => setBookingType('individual')}
                            style={{ marginRight: '8px' }}
                          />
                          <span>Индивидуальная</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="bookingType"
                            value="group"
                            checked={bookingType === 'group'}
                            onChange={() => setBookingType('group')}
                            style={{ marginRight: '8px' }}
                          />
                          <span>Групповая</span>
                        </label>
                      </div>
                      
                      {/* Поля для групповой тренировки */}
                      {bookingType === 'group' && (
                        <div style={{ 
                          padding: '16px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          background: '#fafafa'
                        }}>
                          <div className="form-group">
                            <label className="form-label">Максимум участников</label>
                            <input
                              type="number"
                              className="form-input"
                              value={maxParticipants}
                              onChange={(e) => setMaxParticipants(Math.max(2, parseInt(e.target.value) || 2))}
                              min="2"
                              max="30"
                              disabled={loading}
                            />
                          </div>
                          
                          <div className="form-group" style={{ marginTop: '12px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={isPublicGroup}
                                onChange={(e) => setIsPublicGroup(e.target.checked)}
                                style={{ marginRight: '8px' }}
                                disabled={loading}
                              />
                              <span className="form-label" style={{ marginBottom: 0 }}>
                                Открытая тренировка
                              </span>
                            </label>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#6B7280', 
                              marginTop: '4px',
                              marginLeft: '24px'
                            }}>
                              {isPublicGroup 
                                ? 'Тренировка будет видна всем на странице клуба' 
                                : 'Запись только по прямой ссылке'}
                            </div>
                          </div>
                          
                          {/* Показываем цену за участника */}
                          {(() => {
                            const selectedTrainer = trainers.find((t: any) => t.id === selectedTrainerId)
                            if (selectedTrainer?.groupPrice) {
                              return (
                                <div style={{ 
                                  marginTop: '12px',
                                  padding: '12px',
                                  background: '#e0f2fe',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  color: '#0369a1'
                                }}>
                                  Стоимость участия: <strong>{selectedTrainer.groupPrice} ₽</strong> с человека
                                </div>
                              )
                            }
                            return null
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </>
                )}
              </div>
            )}
            
            {/* Блок выбора/создания клиента - теперь работает для всех типов бронирований */}
            <div style={{ marginBottom: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
              {bookingType === 'group' ? (
                // Для групповых тренировок - управление участниками
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                    {isPublicGroup ? 'Участники будут записываться самостоятельно' : 'Выбрать участников тренировки'}
                  </h3>
                  {isPublicGroup ? (
                    <p style={{ fontSize: '14px', color: '#6B7280' }}>
                      После создания тренировки вы получите ссылку для записи участников.
                      Участники смогут самостоятельно записаться и оплатить участие.
                    </p>
                  ) : (
                    <>
                      <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>
                        Вы можете добавить участников сейчас или они смогут записаться по ссылке
                      </p>
                      
                      {/* Поиск клиента для групповых тренировок */}
                      <div className="form-group" style={{ position: 'relative', marginBottom: '16px' }} ref={searchRef}>
                        <label className="form-label">Поиск участника</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Введите имя или телефон..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          disabled={loading || groupParticipants.length >= maxParticipants}
                          onFocus={() => searchQuery && setShowDropdown(true)}
                        />
                        
                        {/* Dropdown с результатами поиска */}
                        {(searchLoading || searchResults.length > 0) && searchQuery && showDropdown && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            zIndex: 1000,
                            marginTop: '4px',
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            maxHeight: '240px',
                            overflowY: 'auto'
                          }}>
                            {searchLoading ? (
                              <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>
                                Поиск...
                              </div>
                            ) : (
                              searchResults.map(customer => (
                                <div
                                  key={customer.id}
                                  style={{
                                    padding: '12px',
                                    borderBottom: '1px solid #f3f4f6',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f9fafb'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'white'
                                  }}
                                  onClick={() => {
                                    if (groupParticipants.length < maxParticipants) {
                                      // Проверяем, не добавлен ли уже этот участник
                                      const alreadyAdded = groupParticipants.some(p => p.phone === customer.phone)
                                      if (!alreadyAdded) {
                                        setGroupParticipants(prev => [...prev, { name: customer.name, phone: customer.phone }])
                                        setSearchQuery('')
                                        setShowDropdown(false)
                                      } else {
                                        alert('Этот участник уже добавлен')
                                      }
                                    }
                                  }}
                                >
                                  <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: '#e5e7eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    flexShrink: 0
                                  }}>
                                    {customer.name.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div>
                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{customer.name}</div>
                                        <div style={{ fontSize: '13px', color: '#6b7280' }}>{customer.phone}</div>
                                      </div>
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                          {customer.bookingsCount} брон.
                                        </div>
                                        {customer.lastVisit && (
                                          <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                                            {new Date(customer.lastVisit).toLocaleDateString('ru-RU')}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                        
                        {/* Кнопка "Новый участник" */}
                        {searchQuery && searchResults.length === 0 && !searchLoading && showDropdown && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            zIndex: 1000,
                            marginTop: '4px',
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            padding: '16px',
                            textAlign: 'center'
                          }}>
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => {
                                if (groupParticipants.length < maxParticipants) {
                                  const cleanedQuery = searchQuery.trim()
                                  const isPhone = /^[+]?[78]?[\d\s\-\(\)]+$/.test(cleanedQuery) && /\d/.test(cleanedQuery) && cleanedQuery.replace(/\D/g, '').length >= 6
                                  
                                  if (isPhone) {
                                    const name = prompt('Имя участника:')
                                    if (name) {
                                      setGroupParticipants(prev => [...prev, { name, phone: cleanedQuery }])
                                      setSearchQuery('')
                                      setShowDropdown(false)
                                    }
                                  } else {
                                    const phone = prompt('Телефон участника:')
                                    if (phone) {
                                      setGroupParticipants(prev => [...prev, { name: cleanedQuery, phone }])
                                      setSearchQuery('')
                                      setShowDropdown(false)
                                    }
                                  }
                                }
                              }}
                              style={{ width: '100%' }}
                            >
                              <PersonAdd fontSize="small" />
                              Добавить нового участника
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '12px'
                      }}>
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>
                          Добавлено: {groupParticipants.length} из {maxParticipants}
                        </span>
                      </div>
                      
                      {groupParticipants.length > 0 && (
                        <div style={{ 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '8px'
                        }}>
                          {groupParticipants.map((participant, idx) => (
                            <div 
                              key={idx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px',
                                borderBottom: idx < groupParticipants.length - 1 ? '1px solid #f3f4f6' : 'none'
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: '500', fontSize: '14px' }}>{participant.name}</div>
                                <div style={{ color: '#6B7280', fontSize: '13px' }}>{participant.phone}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setGroupParticipants(prev => prev.filter((_, i) => i !== idx))
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontSize: '18px'
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                // Для индивидуальных тренировок - старая логика выбора клиента
                <>
                  {selectedCustomer ? (
                    // Выбран клиент
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'var(--primary)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '600'
                        }}>
                          {selectedCustomer.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '600' }}>{selectedCustomer.name}</span>
                            <Check style={{ fontSize: '16px', color: 'var(--success)' }} />
                          </div>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>{selectedCustomer.phone}</div>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                            {selectedCustomer.bookingsCount} бронирований
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleResetCustomer}
                      >
                        Изменить
                      </button>
                    </div>
                  ) : showNewCustomerForm ? (
                    // Форма создания нового клиента
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Новый клиент</h3>
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon"
                          onClick={() => {
                            setShowNewCustomerForm(false)
                            // Очищаем данные формы при отмене
                            setFormData(prev => ({ ...prev, clientName: '', clientPhone: '+7' }))
                            setSearchQuery('')
                          }}
                          style={{ padding: '4px 8px', fontSize: '14px' }}
                        >
                          Отмена
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group">
                          <label className="form-label">Имя клиента</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            name="clientName"
                            value={formData.clientName}
                            onChange={handleInputChange}
                            disabled={loading}
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
                            disabled={loading}
                            placeholder="+7 (___) ___-__-__"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Режим поиска
                    <div>
                      <div className="form-group" style={{ marginBottom: 0, position: 'relative' }} ref={searchRef}>
                        <label className="form-label">Поиск клиента</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Введите имя или телефон..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          disabled={loading}
                          onFocus={() => searchQuery && setShowDropdown(true)}
                        />
                        
                        {/* Dropdown с результатами поиска */}
                        {(searchLoading || searchResults.length > 0) && searchQuery && showDropdown && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            zIndex: 1000,
                            marginTop: '4px',
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            maxHeight: '240px',
                            overflowY: 'auto'
                          }}>
                            {searchLoading ? (
                              <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>
                                Поиск...
                              </div>
                            ) : (
                              searchResults.map(customer => (
                                <div
                                  key={customer.id}
                                  style={{
                                    padding: '12px',
                                    borderBottom: '1px solid #f3f4f6',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f9fafb'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'white'
                                  }}
                                  onClick={() => handleSelectCustomer(customer)}
                                >
                                  <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: '#e5e7eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    flexShrink: 0
                                  }}>
                                    {customer.name.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div>
                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{customer.name}</div>
                                        <div style={{ fontSize: '13px', color: '#6b7280' }}>{customer.phone}</div>
                                      </div>
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                          {customer.bookingsCount} брон.
                                        </div>
                                        {customer.lastVisit && (
                                          <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                                            {new Date(customer.lastVisit).toLocaleDateString('ru-RU')}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                        
                        {/* Кнопка "Новый клиент" внутри dropdown */}
                        {searchQuery && searchResults.length === 0 && !searchLoading && showDropdown && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            zIndex: 1000,
                            marginTop: '4px',
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            padding: '16px',
                            textAlign: 'center'
                          }}>
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => {
                                setShowNewCustomerForm(true)
                                setShowDropdown(false)
                                // Определяем, что ввел пользователь - телефон или имя
                                const cleanedQuery = searchQuery.trim()
                                // Проверяем, является ли это телефоном (начинается с +7, 8, 7 или содержит только цифры и телефонные символы)
                                const isPhone = /^[+]?[78]?[\d\s\-\(\)]+$/.test(cleanedQuery) && /\d/.test(cleanedQuery) && cleanedQuery.replace(/\D/g, '').length >= 6
                                
                                if (isPhone) {
                                  setFormData(prev => ({ ...prev, clientPhone: cleanedQuery }))
                                } else {
                                  setFormData(prev => ({ ...prev, clientName: cleanedQuery }))
                                }
                              }}
                              style={{ width: '100%' }}
                            >
                              <PersonAdd fontSize="small" />
                              Создать нового клиента
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="form-group" style={{ marginTop: '20px' }}>
              <label className="form-label">Способ оплаты</label>
              <select 
                className="form-select"
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleInputChange}
                disabled={loading || (bookingType === 'group' && isPublicGroup)}
              >
                {enabledPaymentMethods.cash && <option value="cash">Оплата в клубе наличными</option>}
                {enabledPaymentMethods.card_on_site && <option value="card_on_site">Оплата в клубе картой</option>}
                {enabledPaymentMethods.transfer && <option value="transfer">Перевод на р.счет клуба (юр.лицо)</option>}
                {enabledPaymentMethods.sberbank_card && <option value="sberbank_card">На карту Сбербанка</option>}
                {enabledPaymentMethods.tbank_card && <option value="tbank_card">На карту Т-Банка</option>}
                {enabledPaymentMethods.vtb_card && <option value="vtb_card">На карту ВТБ</option>}
                <option value="online">Онлайн оплата (Автоматическое подтверждение оплаты, ссылка на оплату в смс и в МП)</option>
              </select>
              
              {/* Информация для открытых групповых тренировок */}
              {bookingType === 'group' && isPublicGroup && (
                <div style={{ 
                  marginTop: '8px',
                  padding: '8px 12px',
                  background: '#fef3c7',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#92400e'
                }}>
                  Для открытых групповых тренировок доступна только онлайн оплата
                </div>
              )}
              
              {/* Информация об ограничениях по времени */}
              {formData.paymentMethod && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  backgroundColor: formData.paymentMethod === 'online' ? 'rgba(239, 68, 68, 0.1)' : 
                                   (formData.paymentMethod === 'transfer' || formData.paymentMethod === 'cash' || formData.paymentMethod === 'card_on_site') ? 'rgba(16, 185, 129, 0.1)' :
                                   'rgba(245, 158, 11, 0.1)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: formData.paymentMethod === 'online' ? 'var(--danger)' :
                         (formData.paymentMethod === 'transfer' || formData.paymentMethod === 'cash' || formData.paymentMethod === 'card_on_site') ? 'var(--success)' :
                         'var(--warning)'
                }}>
                  {formData.paymentMethod === 'online' ? 
                    '⏱️ На оплату дается 15 минут. Статус меняется автоматически после оплаты.' :
                   formData.paymentMethod === 'transfer' || formData.paymentMethod === 'cash' || formData.paymentMethod === 'card_on_site' ? 
                    '✓ Без ограничения по времени. Бронирование может ожидать оплату любое время.' :
                   formData.paymentMethod === 'sberbank_card' || formData.paymentMethod === 'tbank_card' || formData.paymentMethod === 'vtb_card' ?
                    '⏱️ На оплату дается 30 минут. Администратор должен подтвердить оплату.' :
                    ''
                  }
                </div>
              )}
            </div>

            {/* Расчет стоимости */}
            {formData.courtId && formData.duration && formData.startTime && (
              <div style={{
                background: 'var(--background)',
                padding: '20px',
                borderRadius: '8px',
                marginTop: '24px'
              }}>
                {(() => {
                  const court = courts.find(c => c.id === formData.courtId)
                  if (!court) return null
                  
                  // Используем функцию calculatePrice для правильного расчета с учетом интервалов
                  const totalPrice = calculatePrice(formData.startTime, formData.duration)
                  
                  // Определяем, применен ли особый интервал
                  const startHour = parseInt(formData.startTime.split(':')[0])
                  const bookingDate = new Date(formData.date)
                  const isWeekend = bookingDate.getDay() === 0 || bookingDate.getDay() === 6
                  const dayOfWeek = bookingDate.getDay()
                  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
                  const dayKey = dayKeys[dayOfWeek] as string
                  
                  // Получаем детализацию цены для длительности > 1 часа
                  const priceBreakdown = formData.duration > 1 ? getPriceBreakdown(
                    bookingDate,
                    formData.startTime,
                    formData.duration * 60, // конвертируем в минуты
                    court.pricing,
                    court.holidayPricing,
                    court.priceWeekday,
                    court.priceWeekend
                  ) : []
                  
                  let specialInterval = null
                  let pricePerHour = 0
                  let isHoliday = false
                  
                  // Проверяем праздничные дни
                  if (court.holidayPricing && court.holidayPricing.length > 0) {
                    const month = String(bookingDate.getMonth() + 1).padStart(2, '0')
                    const day = String(bookingDate.getDate()).padStart(2, '0')
                    const dateStr = `${month}-${day}`
                    const holiday = court.holidayPricing.find(h => h.date === dateStr)
                    if (holiday) {
                      isHoliday = true
                      pricePerHour = holiday.price
                      specialInterval = { isHoliday: true }
                    }
                  }
                  
                  // Если не праздник, проверяем новую систему ценообразования
                  if (!isHoliday && court.pricing && court.pricing[dayKey]) {
                    const dayPricing = court.pricing[dayKey]
                    pricePerHour = dayPricing.basePrice
                    
                    if (dayPricing.intervals) {
                      specialInterval = dayPricing.intervals.find(interval => {
                        const intervalStart = parseInt(interval.from.split(':')[0])
                        const intervalEnd = parseInt(interval.to.split(':')[0])
                        return startHour >= intervalStart && startHour < intervalEnd
                      })
                      if (specialInterval) {
                        pricePerHour = specialInterval.price
                      }
                    }
                  } else if (!isHoliday) {
                    // Используем legacy систему
                    pricePerHour = court.pricePerHour || (isWeekend ? court.priceWeekend : court.priceWeekday) || 0
                  }
                  
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Не показываем блок с ценой корта для групповых тренировок с тренером */}
                      {!(bookingType === 'group' && includeTrainer && selectedTrainerId) && (
                        formData.duration > 1 && priceBreakdown.length > 0 ? (
                          // Показываем детализацию по часам для длительности > 1 часа
                          <>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--gray)' }}>
                              Детализация по часам:
                            </div>
                            {priceBreakdown.map((item, index) => (
                              <div key={index} style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                fontSize: '14px'
                              }}>
                                <span style={{ color: 'var(--gray)' }}>{item.time}</span>
                                <span style={{ fontWeight: '500' }}>{item.price.toLocaleString('ru-RU')} ₽</span>
                              </div>
                            ))}
                          </>
                        ) : (
                          // Показываем простую цену за час для длительности = 1 час
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--gray)' }}>
                              {specialInterval ? (
                                specialInterval.isHoliday ? (
                                  <>Праздничный день:</>
                                ) : (
                                  <>Особый тариф ({specialInterval.from} - {specialInterval.to}):</>
                                )
                              ) : (
                                <>Стоимость за час:</>
                              )}
                            </span>
                            <span style={{ fontWeight: '500' }}>{pricePerHour.toLocaleString('ru-RU')} ₽</span>
                          </div>
                        )
                      )}
                      
                      {/* Добавляем информацию о тренере если выбран */}
                      {includeTrainer && selectedTrainerId && (() => {
                        const selectedTrainer = trainers.find((t: any) => t.id === selectedTrainerId)
                        if (!selectedTrainer) return null
                        
                        // Для групповых тренировок показываем другую логику
                        if (bookingType === 'group') {
                          const trainerPricePerPerson = selectedTrainer.groupPrice || 0
                          const courtPricePerPerson = Math.round(totalPrice / maxParticipants)
                          const totalPricePerPerson = courtPricePerPerson + trainerPricePerPerson
                          const totalGroupRevenue = totalPricePerPerson * maxParticipants
                          
                          return (
                            <>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: '12px',
                                fontSize: '14px'
                              }}>
                                <span style={{ color: 'var(--gray)' }}>
                                  Корт ({maxParticipants} чел × {courtPricePerPerson} ₽):
                                </span>
                                <span style={{ fontWeight: '500' }}>
                                  {totalPrice.toLocaleString('ru-RU')} ₽
                                </span>
                              </div>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '14px'
                              }}>
                                <span style={{ color: 'var(--gray)' }}>
                                  Тренер ({maxParticipants} чел × {trainerPricePerPerson} ₽):
                                </span>
                                <span style={{ fontWeight: '500' }}>
                                  {(trainerPricePerPerson * maxParticipants).toLocaleString('ru-RU')} ₽
                                </span>
                              </div>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '14px',
                                marginTop: '8px',
                                paddingTop: '8px',
                                borderTop: '1px solid #e5e7eb'
                              }}>
                                <span style={{ color: 'var(--gray)', fontWeight: '600' }}>
                                  С каждого участника:
                                </span>
                                <span style={{ fontWeight: '600', color: 'var(--primary)' }}>
                                  {totalPricePerPerson.toLocaleString('ru-RU')} ₽
                                </span>
                              </div>
                            </>
                          )
                        } else {
                          // Для индивидуальных тренировок - старая логика
                          const trainerCost = Math.round(selectedTrainer.pricePerHour * formData.duration)
                          
                          return (
                            <>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: '12px',
                                fontSize: '14px'
                              }}>
                                <span style={{ color: 'var(--gray)' }}>
                                  Тренер ({selectedTrainer.firstName} {selectedTrainer.lastName}, {formData.duration}ч):
                                </span>
                                <span style={{ fontWeight: '500' }}>{trainerCost.toLocaleString('ru-RU')} ₽</span>
                              </div>
                            </>
                          )
                        }
                      })()}
                      
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--extra-light-gray)',
                        marginTop: '4px'
                      }}>
                        <span style={{ fontWeight: '600', fontSize: '18px' }}>
                          {bookingType === 'group' ? 'Итого (при полной группе):' : 'Итого:'}
                        </span>
                        <span style={{ fontWeight: '700', fontSize: '20px', color: 'var(--primary)' }}>
                          {(() => {
                            const courtPrice = totalPrice
                            const selectedTrainer = includeTrainer && selectedTrainerId ? 
                              trainers.find((t: any) => t.id === selectedTrainerId) : null
                            
                            if (bookingType === 'group') {
                              // Для групповых: корт + (цена с человека × количество участников)
                              const groupPrice = selectedTrainer?.groupPrice || 0
                              const totalGroupRevenue = groupPrice * maxParticipants
                              const finalTotal = courtPrice + totalGroupRevenue
                              return finalTotal.toLocaleString('ru-RU')
                            } else {
                              // Для индивидуальных: корт + тренер почасовой
                              const trainerCost = selectedTrainer ? 
                                Math.round(selectedTrainer.pricePerHour * formData.duration) : 0
                              const finalTotal = courtPrice + trainerCost
                              return finalTotal.toLocaleString('ru-RU')
                            }
                          })()} ₽
                        </span>
                      </div>
                      
                    </div>
                  )
                })()}
              </div>
            )}

            <div className="modal-footer" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--extra-light-gray)' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Отмена
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Создание...' : 'Создать бронирование'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}