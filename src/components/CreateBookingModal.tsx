import React, { useState, useEffect, useRef } from 'react'
import { Close, Search, PersonAdd, Check } from '@mui/icons-material'
import { addDoc, collection, Timestamp, getDocs, query, where, onSnapshot, getDoc, doc, limit, updateDoc, arrayUnion } from 'firebase/firestore'
import { db, functions } from '../services/firebase'
import { httpsCallable } from 'firebase/functions'
import { calculateCourtPrice, getPriceBreakdown } from '../utils/pricing'
import { useAuth } from '../contexts/AuthContext'
import { 
  dateToString, 
  stringToDate, 
  dateToTimestamp,
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
}

export default function CreateBookingModal({
  isOpen,
  onClose,
  onSuccess,
  venueId,
  preSelectedDate,
  preSelectedTime,
  preSelectedCourtId
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
    courtId: preSelectedCourtId || '',
    date: preSelectedDate ? formatDateToLocal(preSelectedDate) : formatDateToLocal(new Date()),
    startTime: preSelectedTime || '10:00',
    duration: 1,
    paymentMethod: 'online' as 'cash' | 'card_on_site' | 'transfer' | 'online' | 'sberbank_card' | 'tbank_card' | 'vtb_card'
  })
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [existingBookings, setExistingBookings] = useState<any[]>([])
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
  const isSlotOccupied = (startTime: string, duration: number) => {
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const slotStart = startHour + startMinute / 60
    const slotEnd = slotStart + duration

    const occupied = existingBookings.some(booking => {
      const [bookingStartHour, bookingStartMinute] = booking.startTime.split(':').map(Number)
      const [bookingEndHour, bookingEndMinute] = booking.endTime.split(':').map(Number)
      const bookingStart = bookingStartHour + bookingStartMinute / 60
      const bookingEnd = bookingEndHour + bookingEndMinute / 60

      // Проверяем пересечение временных интервалов
      const hasConflict = (slotStart < bookingEnd && slotEnd > bookingStart)
      return hasConflict
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
      fetchCourts()
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
        }
      )
      
      // Обновляем форму при изменении предвыбранных значений
      if (preSelectedDate) {
        setFormData(prev => ({
          ...prev,
          date: formatDateToLocal(preSelectedDate)
        }))
      }
      if (preSelectedTime) {
        setFormData(prev => ({
          ...prev,
          startTime: preSelectedTime
        }))
      }
      // Всегда обновляем courtId при открытии модального окна
      setFormData(prev => ({
        ...prev,
        courtId: preSelectedCourtId || ''
      }))
      // Инициализируем слоты при открытии
      const slots = generateTimeSlots(formData.duration)
      setAvailableSlots(slots)
      
      // Загружаем существующие бронирования при открытии модального окна
      if (preSelectedCourtId && (preSelectedDate || formData.date)) {
        const dateToUse = preSelectedDate ? formatDateToLocal(preSelectedDate) : formData.date
        fetchExistingBookings(preSelectedCourtId, dateToUse)
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
    if (isOpen && formData.courtId && formData.date) {
      fetchExistingBookings(formData.courtId, formData.date)
    }
  }, [formData.date, formData.courtId, isOpen])

  // Загружаем бронирования при изменении корта или даты с real-time обновлениями
  useEffect(() => {
    if (formData.courtId && formData.date && isOpen) {
      // Отписываемся от предыдущей подписки
      if (unsubscribe) {
        unsubscribe()
        setUnsubscribe(null)
      }

      // Загружаем начальные данные
      fetchExistingBookings(formData.courtId, formData.date)

      // Настраиваем real-time подписку
      const bookingsRef = collection(db, 'bookings')
      
      // Используем только Timestamp формат (все даты теперь унифицированы)
      const startOfDay = new Date(formData.date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(formData.date)
      endOfDay.setHours(23, 59, 59, 999)
      
      const q = query(
        bookingsRef,
        where('courtId', '==', formData.courtId),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
      )

      const unsub = onSnapshot(q, (snapshot) => {
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
               paymentStatus === 'paid' || paymentStatus === 'online_payment' ||
               paymentStatus === 'awaiting_payment')) {
            bookings.set(doc.id, { id: doc.id, ...data })
          }
        })
        
        setExistingBookings(Array.from(bookings.values()))
      })

      setUnsubscribe(() => unsub)
    }

    // Cleanup при размонтировании или закрытии модального окна
    return () => {
      if (unsubscribe) {
        unsubscribe()
        setUnsubscribe(null)
      }
    }
  }, [formData.courtId, formData.date, isOpen])

  const fetchCourts = async () => {
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
      
      // Автоматически выбираем первый корт, если есть
      if (courtsData.length > 0 && !formData.courtId) {
        setFormData(prev => ({ ...prev, courtId: courtsData[0].id }))
      }
    } catch (error) {
      console.error('Error fetching courts:', error)
    }
  }

  const fetchExistingBookings = async (courtId?: string, date?: string) => {
    const targetCourtId = courtId || formData.courtId
    const targetDate = date || formData.date
    
    if (!venueId || !targetCourtId || !targetDate) return

    try {
      const bookingsRef = collection(db, 'bookings')
      
      // Используем только Timestamp формат (все даты теперь унифицированы)
      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)
      
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
                  paymentStatus === 'paid' || paymentStatus === 'online_payment' ||
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
    
    // Валидация данных
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
    
    if (!formData.courtId) {
      alert('Пожалуйста, выберите корт')
      return
    }
    
    // Проверка что выбранный слот не занят
    if (isSlotOccupied(formData.startTime, formData.duration)) {
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
      const startOfDay = new Date(bookingDateObj)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(bookingDateObj)
      endOfDay.setHours(23, 59, 59, 999)
      
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
              paymentStatus === 'paid' || paymentStatus === 'online_payment' ||
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
      
      // Используем функцию calculatePrice для расчета цены
      const totalPrice = calculatePrice(formData.startTime, formData.duration)
      const pricePerHour = formData.duration > 0 ? totalPrice / formData.duration : 0
      
      // Преобразуем строку даты в Date объект
      const bookingDate = stringToDate(formData.date)
      
      const bookingData = {
        venueId: venueId,
        courtId: formData.courtId,
        courtName: court.name,
        venueName: venueName,
        customerName: sanitizeString(formData.clientName),
        customerPhone: normalizePhone(formData.clientPhone),
        date: dateToTimestamp(bookingDate), // Сохраняем как Timestamp
        startTime: formData.startTime,
        duration: durationMinutes, // Сохраняем в минутах
        // endTime вычисляется при необходимости
        gameType: 'single',
        status: bookingStatus,
        amount: totalPrice,
        price: pricePerHour,
        paymentMethod: formData.paymentMethod,
        paymentStatus: paymentStatus,
        source: 'admin',
        
        // Для обратной совместимости (постепенно удалить)
        time: formData.startTime,
        endTime: calculateEndTime(formData.startTime, durationMinutes),
        clientName: sanitizeString(formData.clientName),
        clientPhone: normalizePhone(formData.clientPhone),
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

      // Если выбрана онлайн оплата, инициализируем платеж
      if (formData.paymentMethod === 'online') {
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
            returnUrl: `${baseUrl}/payment-result?bookingId=${bookingRef.id}`,
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
      onClose()
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
            {/* Блок выбора/создания клиента */}
            <div style={{ marginBottom: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
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
            </div>
            
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
                  <option value="">Выберите время</option>
                  {availableSlots.map(time => {
                    const occupied = isSlotOccupied(time, formData.duration)
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
            
            <div className="form-group" style={{ marginTop: '20px' }}>
              <label className="form-label">Способ оплаты</label>
              <select 
                className="form-select"
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleInputChange}
                disabled={loading}
              >
                {enabledPaymentMethods.cash && <option value="cash">Оплата в клубе наличными</option>}
                {enabledPaymentMethods.card_on_site && <option value="card_on_site">Оплата в клубе картой</option>}
                {enabledPaymentMethods.transfer && <option value="transfer">Перевод на р.счет клуба (юр.лицо)</option>}
                {enabledPaymentMethods.sberbank_card && <option value="sberbank_card">На карту Сбербанка</option>}
                {enabledPaymentMethods.tbank_card && <option value="tbank_card">На карту Т-Банка</option>}
                {enabledPaymentMethods.vtb_card && <option value="vtb_card">На карту ВТБ</option>}
                <option value="online">Онлайн оплата (Автоматическое подтверждение оплаты, ссылка на оплату в смс и в МП)</option>
              </select>
              
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
                      {formData.duration > 1 && priceBreakdown.length > 0 ? (
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
                      )}
                      
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--extra-light-gray)',
                        marginTop: '4px'
                      }}>
                        <span style={{ fontWeight: '600', fontSize: '18px' }}>Итого:</span>
                        <span style={{ fontWeight: '700', fontSize: '20px', color: 'var(--primary)' }}>
                          {totalPrice.toLocaleString('ru-RU')} ₽
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