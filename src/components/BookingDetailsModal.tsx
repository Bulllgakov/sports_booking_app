import React, { useState, useEffect, useRef } from 'react'
import { Close, Edit, Save, Cancel, PersonAdd } from '@mui/icons-material'
import { doc, getDoc, onSnapshot, updateDoc, collection, query, where, getDocs, Timestamp, addDoc, deleteDoc, limit } from 'firebase/firestore'
import { db } from '../services/firebase'
import PaymentStatusManager from './PaymentStatusManager'
import PaymentHistory from './PaymentHistory'
import RefundModal from './RefundModal'
import PaymentTimeLimit from './PaymentTimeLimit'
import { normalizeDate, calculateEndTime, formatDuration } from '../utils/dateTime'
import { normalizeDateInClubTZ } from '../utils/clubDateTime'
import type { BookingData, firestoreToBooking } from '../types/bookingTypes'
import { getPaymentMethodName } from '../utils/paymentMethods'
import { useAuth } from '../contexts/AuthContext'
import { format, parse, addMinutes, isAfter, isBefore, startOfDay } from 'date-fns'

interface PaymentHistory {
  timestamp: any
  action: 'created' | 'paid' | 'cancelled'
  userId: string
  userName?: string
  note?: string
}

// Используем стандартизованный тип из bookingTypes, расширяя его необходимыми полями
interface Booking extends Omit<BookingData, 'paymentHistory'> {
  clientName: string  // Для обратной совместимости
  clientPhone: string // Для обратной совместимости
  time?: string       // Для обратной совместимости
  endTime: string     // Вычисляется из startTime + duration
  paymentHistory?: PaymentHistory[]
  paymentSmsInfo?: {
    sentAt: any
    sentTo: string
    paymentUrl: string
  }
  // Поля для тренера
  trainerId?: string
  trainerName?: string
  trainerPrice?: number
  trainerCommission?: number
  totalAmount?: number
  // Поля для групповых тренировок
  bookingType?: 'individual' | 'group'
  maxParticipants?: number
  currentParticipants?: number
  visibility?: 'public' | 'private'
  groupRegistrationUrl?: string
}

interface BookingDetailsModalProps {
  booking: Booking | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
  clubTimezone?: string
}

export default function BookingDetailsModal({ 
  booking, 
  isOpen, 
  onClose,
  onUpdate,
  clubTimezone = 'Europe/Moscow' 
}: BookingDetailsModalProps) {
  const { club, admin } = useAuth()
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(booking)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedData, setEditedData] = useState({
    courtId: '',
    courtName: '',
    date: '',
    startTime: '',
    duration: 60
  })
  const [availableCourts, setAvailableCourts] = useState<any[]>([])
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [existingBookings, setExistingBookings] = useState<any[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [saving, setSaving] = useState(false)
  const [groupParticipants, setGroupParticipants] = useState<any[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  
  // Состояния для поиска участников при редактировании
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  
  // Проверяем, является ли пользователь тренером
  const isTrainer = admin?.role === 'trainer'

  useEffect(() => {
    if (booking && isOpen) {
      // При открытии модалки всегда загружаем свежие данные
      loadFreshBooking(booking.id)
      
      // Загружаем список кортов
      loadAvailableCourts()
      
      // Загружаем участников групповой тренировки
      if (booking.bookingType === 'group') {
        loadGroupParticipants(booking.id)
      }
      
      // Сбрасываем режим редактирования при открытии
      setIsEditMode(false)
      
      // Подписываемся на изменения документа
      const unsubscribe = onSnapshot(doc(db, 'bookings', booking.id), (doc) => {
        if (doc.exists()) {
          const data = doc.data()
          // Используем утилиту для безопасного преобразования даты с учетом часового пояса клуба
          const bookingDate = normalizeDateInClubTZ(data.date, clubTimezone)
          
          // Для createdAt НЕ используем normalizeDateInClubTZ, так как это точное время, а не дата!
          let createdAt: Date
          if (data.createdAt?.toDate && typeof data.createdAt.toDate === 'function') {
            createdAt = data.createdAt.toDate()
          } else if (data.createdAt?.seconds && typeof data.createdAt.seconds === 'number') {
            createdAt = new Date(data.createdAt.seconds * 1000)
          } else if (data.createdAt instanceof Date) {
            createdAt = data.createdAt
          } else if (data.createdAt) {
            createdAt = new Date(data.createdAt)
          } else {
            createdAt = new Date()
          }
          
          // Вычисляем endTime из startTime и duration
          const endTime = data.duration ? 
            calculateEndTime(data.startTime || data.time || '00:00', data.duration) : 
            data.endTime || ''
          
          const updatedBooking = {
            id: doc.id,
            ...data,
            date: bookingDate,
            createdAt: createdAt,
            startTime: data.startTime || data.time || '00:00',
            endTime: endTime,
            // Для обратной совместимости
            clientName: data.customerName || data.clientName,
            clientPhone: data.customerPhone || data.clientPhone,
            customerName: data.customerName || data.clientName,
            customerPhone: data.customerPhone || data.clientPhone,
            paymentStatus: data.paymentStatus || 'awaiting_payment',
            paymentHistory: data.paymentHistory || []
          } as Booking
          
          setCurrentBooking(updatedBooking)
        }
      })
      
      return () => unsubscribe()
    }
  }, [booking?.id, isOpen])

  const loadFreshBooking = async (bookingId: string) => {
    console.log('Loading fresh booking data:', bookingId)
    try {
      const bookingDoc = await getDoc(doc(db, 'bookings', bookingId))
      if (bookingDoc.exists()) {
        const data = bookingDoc.data()
        // Используем утилиту для безопасного преобразования даты с учетом часового пояса клуба
        const bookingDate = normalizeDateInClubTZ(data.date, clubTimezone)
        
        // Для createdAt НЕ используем normalizeDateInClubTZ, так как это точное время, а не дата!
        let createdAt: Date
        if (data.createdAt?.toDate && typeof data.createdAt.toDate === 'function') {
          createdAt = data.createdAt.toDate()
        } else if (data.createdAt?.seconds && typeof data.createdAt.seconds === 'number') {
          createdAt = new Date(data.createdAt.seconds * 1000)
        } else if (data.createdAt instanceof Date) {
          createdAt = data.createdAt
        } else if (data.createdAt) {
          createdAt = new Date(data.createdAt)
        } else {
          createdAt = new Date()
        }
        
        // Вычисляем endTime из startTime и duration
        const endTime = data.duration ? 
          calculateEndTime(data.startTime || data.time || '00:00', data.duration) : 
          data.endTime || ''
        
        const freshBooking = {
          id: bookingDoc.id,
          ...data,
          date: bookingDate,
          createdAt: createdAt,
          startTime: data.startTime || data.time || '00:00',
          endTime: endTime,
          duration: data.duration || 60,
          // Для обратной совместимости
          clientName: data.customerName || data.clientName,
          clientPhone: data.customerPhone || data.clientPhone,
          customerName: data.customerName || data.clientName,
          customerPhone: data.customerPhone || data.clientPhone,
          paymentStatus: data.paymentStatus || 'awaiting_payment',
          paymentHistory: data.paymentHistory || []
        } as Booking
        
        console.log('Fresh booking loaded with payment status:', freshBooking.paymentStatus)
        setCurrentBooking(freshBooking)
        
        // Инициализируем данные для редактирования
        setEditedData({
          courtId: data.courtId || '',
          courtName: data.courtName || '',
          date: format(bookingDate, 'yyyy-MM-dd'),
          startTime: data.startTime || data.time || '00:00',
          duration: data.duration || 60
        })
      }
    } catch (error) {
      console.error('Error loading fresh booking:', error)
    }
  }

  const loadGroupParticipants = async (bookingId: string) => {
    setLoadingParticipants(true)
    try {
      const participantsSnapshot = await getDocs(
        query(
          collection(db, 'groupParticipants'),
          where('groupTrainingId', '==', bookingId)
        )
      )
      
      const participants = participantsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      setGroupParticipants(participants)
    } catch (error) {
      console.error('Error loading group participants:', error)
    } finally {
      setLoadingParticipants(false)
    }
  }

  // Функция поиска клиентов (точная копия из CreateBookingModal)
  const searchCustomers = async (searchText: string) => {
    if (!searchText || searchText.length < 2) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    try {
      // Ищем по всем бронированиям в этом venue (включая отмененные)
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('venueId', '==', currentBooking?.venueId || ''),
        limit(2000)
      )
      
      const snapshot = await getDocs(bookingsQuery)
      const customerMap = new Map<string, any>()
      
      snapshot.docs.forEach(doc => {
        const booking = doc.data()
        
        const customerPhone = booking.customerPhone || booking.clientPhone
        const customerName = booking.customerName || booking.clientName
        
        if (!customerPhone || !customerName) return
        
        const existing = customerMap.get(customerPhone)
        const bookingDate = booking.date?.toDate ? booking.date.toDate() : new Date(booking.date)
        
        if (!existing || bookingDate > existing.lastVisit) {
          customerMap.set(customerPhone, {
            id: customerPhone,
            name: customerName,
            phone: customerPhone,
            bookingsCount: (existing?.bookingsCount || 0) + 1,
            lastVisit: bookingDate
          })
        } else if (existing) {
          existing.bookingsCount++
        }
      })
      
      const searchLower = searchText.toLowerCase()
      const customers = Array.from(customerMap.values())
        .filter(customer => {
          const nameLower = customer.name.toLowerCase()
          const phone = customer.phone
          return nameLower.includes(searchLower) || phone.includes(searchText)
        })
        .sort((a, b) => {
          if (b.bookingsCount !== a.bookingsCount) {
            return b.bookingsCount - a.bookingsCount
          }
          return b.lastVisit - a.lastVisit
        })
        .slice(0, 10)
      
      setSearchResults(customers)
    } catch (error) {
      console.error('Error searching customers:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  // Эффект для поиска клиентов при вводе
  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomers(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Обработчик клика вне dropdown
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

  const loadAvailableCourts = async () => {
    if (!currentBooking?.venueId) return
    
    try {
      const courtsSnapshot = await getDocs(
        collection(db, 'venues', currentBooking.venueId, 'courts')
      )
      const courts = courtsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setAvailableCourts(courts)
    } catch (error) {
      console.error('Error loading courts:', error)
    }
  }

  const generateTimeSlots = (duration: number, date: string) => {
    const slots: string[] = []
    // Используем slotInterval из настроек клуба, по умолчанию 30 минут
    const interval = club?.slotInterval || 30
    
    // Получаем день недели
    const selectedDate = new Date(date)
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = dayNames[selectedDate.getDay()]
    
    // Получаем режим работы (по умолчанию 08:00 - 22:00)
    const workingHours = club?.workingHours || {}
    const dayHours = workingHours[dayName]
    
    let openTimeStr = '08:00'
    let closeTimeStr = '22:00'
    
    if (dayHours) {
      if (typeof dayHours === 'string' && dayHours.includes('-')) {
        const [open, close] = dayHours.split('-').map(t => t.trim())
        openTimeStr = open
        closeTimeStr = close
      } else if (typeof dayHours === 'object' && dayHours.open && dayHours.close) {
        openTimeStr = dayHours.open
        closeTimeStr = dayHours.close
      }
    }
    
    const [openHour, openMinute] = openTimeStr.split(':').map(Number)
    const [closeHour, closeMinute] = closeTimeStr.split(':').map(Number)
    
    const openTime = openHour * 60 + openMinute
    const closeTime = closeHour * 60 + closeMinute
    
    for (let time = openTime; time <= closeTime - duration; time += interval) {
      const hours = Math.floor(time / 60)
      const minutes = time % 60
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      slots.push(timeStr)
    }
    
    return slots
  }

  const checkSlotAvailability = async (courtId: string, date: string, startTime: string, duration: number) => {
    try {
      const queryDate = new Date(date + 'T00:00:00')
      const startOfDay = new Date(Date.UTC(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 0, 0, 0))
      const endOfDay = new Date(Date.UTC(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 23, 59, 59))
      
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('courtId', '==', courtId),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
      )
      
      const bookingsSnapshot = await getDocs(bookingsQuery)
      const existingBookings = bookingsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(b => {
          // Исключаем текущее бронирование
          if (b.id === currentBooking?.id) return false
          
          const status = b.status || 'pending'
          const paymentStatus = b.paymentStatus || 'awaiting_payment'
          
          return (
            status !== 'cancelled' && 
            paymentStatus !== 'cancelled' && 
            paymentStatus !== 'refunded' &&
            paymentStatus !== 'error'
          )
        })
      
      // Проверяем пересечение времени
      const requestedStart = parse(startTime, 'HH:mm', new Date())
      const requestedEnd = addMinutes(requestedStart, duration)
      
      for (const booking of existingBookings) {
        const bookingStart = parse(booking.startTime || booking.time, 'HH:mm', new Date())
        const bookingEnd = parse(booking.endTime || calculateEndTime(booking.startTime || booking.time, booking.duration || 60), 'HH:mm', new Date())
        
        if (
          (isAfter(requestedStart, bookingStart) && isBefore(requestedStart, bookingEnd)) ||
          (isAfter(requestedEnd, bookingStart) && isBefore(requestedEnd, bookingEnd)) ||
          (isBefore(requestedStart, bookingStart) && isAfter(requestedEnd, bookingEnd)) ||
          (format(requestedStart, 'HH:mm') === (booking.startTime || booking.time))
        ) {
          return false // Слот занят
        }
      }
      
      return true // Слот свободен
    } catch (error) {
      console.error('Error checking slot availability:', error)
      return false
    }
  }

  const handleEditClick = async () => {
    // Проверяем, не в прошлом ли бронирование
    const bookingDate = new Date(editedData.date)
    const today = startOfDay(new Date())
    
    if (bookingDate < today) {
      alert('Нельзя редактировать бронирования в прошлом')
      return
    }
    
    setIsEditMode(true)
    // Генерируем слоты для текущей даты
    const slots = generateTimeSlots(editedData.duration, editedData.date)
    setAvailableSlots(slots)
    
    // Загружаем существующие бронирования для проверки доступности
    await loadExistingBookings(editedData.courtId, editedData.date)
  }

  const loadExistingBookings = async (courtId: string, date: string) => {
    if (!courtId || !date) return
    
    setLoadingSlots(true)
    try {
      const queryDate = new Date(date + 'T00:00:00')
      const startOfDay = new Date(Date.UTC(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 0, 0, 0))
      const endOfDay = new Date(Date.UTC(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 23, 59, 59))
      
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('courtId', '==', courtId),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
      )
      
      const bookingsSnapshot = await getDocs(bookingsQuery)
      const bookings = bookingsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(b => {
          // Исключаем текущее бронирование
          if (b.id === currentBooking?.id) return false
          
          const status = b.status || 'pending'
          const paymentStatus = b.paymentStatus || 'awaiting_payment'
          
          return (
            status !== 'cancelled' && 
            paymentStatus !== 'cancelled' && 
            paymentStatus !== 'refunded' &&
            paymentStatus !== 'error'
          )
        })
      
      setExistingBookings(bookings)
    } catch (error) {
      console.error('Error loading existing bookings:', error)
    } finally {
      setLoadingSlots(false)
    }
  }

  const isSlotOccupied = (time: string) => {
    if (!existingBookings.length) return false
    
    const slotStart = parse(time, 'HH:mm', new Date())
    const slotEnd = addMinutes(slotStart, editedData.duration)
    
    for (const booking of existingBookings) {
      const bookingStart = parse(booking.startTime || booking.time, 'HH:mm', new Date())
      const bookingEnd = parse(booking.endTime || calculateEndTime(booking.startTime || booking.time, booking.duration || 60), 'HH:mm', new Date())
      
      // Проверяем пересечение временных интервалов
      if (
        (isAfter(slotStart, bookingStart) && isBefore(slotStart, bookingEnd)) ||
        (isAfter(slotEnd, bookingStart) && isBefore(slotEnd, bookingEnd)) ||
        (isBefore(slotStart, bookingStart) && isAfter(slotEnd, bookingEnd)) ||
        (format(slotStart, 'HH:mm') === (booking.startTime || booking.time))
      ) {
        return true
      }
    }
    
    return false
  }

  const handleSaveChanges = async () => {
    if (!currentBooking) return
    
    // Проверяем доступность перед сохранением
    if (isSlotOccupied(editedData.startTime)) {
      alert('Выбранное время уже занято. Пожалуйста, выберите другое время.')
      return
    }
    
    setSaving(true)
    
    try {
      // Дополнительная проверка доступности нового слота
      const isAvailable = await checkSlotAvailability(
        editedData.courtId,
        editedData.date,
        editedData.startTime,
        editedData.duration
      )
      
      if (!isAvailable) {
        alert('Выбранное время уже занято. Пожалуйста, выберите другое время.')
        setSaving(false)
        return
      }
      
      // Находим выбранный корт
      const selectedCourt = availableCourts.find(c => c.id === editedData.courtId)
      
      // Создаем дату корректно для часового пояса UTC (как в календаре)
      // Используем тот же подход что и при создании новых бронирований
      const [year, month, day] = editedData.date.split('-').map(Number)
      const dateForSaving = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
      
      // Подготавливаем данные для обновления
      const updateData: any = {
        courtId: editedData.courtId,
        courtName: selectedCourt?.name || editedData.courtName,
        date: Timestamp.fromDate(dateForSaving),
        startTime: editedData.startTime,
        endTime: calculateEndTime(editedData.startTime, editedData.duration),
        duration: editedData.duration,
        updatedAt: Timestamp.now()
      }
      
      // Добавляем запись в историю изменений
      const historyEntry = {
        timestamp: Timestamp.now(),
        action: 'edited',
        userId: admin?.id || '',
        userName: admin?.name || 'Администратор',
        changes: {
          court: currentBooking.courtName !== updateData.courtName ? 
            { from: currentBooking.courtName, to: updateData.courtName } : null,
          date: format(currentBooking.date, 'yyyy-MM-dd') !== editedData.date ?
            { from: format(currentBooking.date, 'yyyy-MM-dd'), to: editedData.date } : null,
          duration: currentBooking.duration !== editedData.duration ?
            { from: `${currentBooking.duration} мин`, to: `${editedData.duration} мин` } : null,
          time: currentBooking.startTime !== editedData.startTime ?
            { from: `${currentBooking.startTime}-${currentBooking.endTime}`, 
              to: `${editedData.startTime}-${calculateEndTime(editedData.startTime, editedData.duration)}` } : null
        }
      }
      
      // Фильтруем только реальные изменения
      const actualChanges = Object.entries(historyEntry.changes)
        .filter(([_, value]) => value !== null)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
      
      if (Object.keys(actualChanges).length > 0) {
        historyEntry.changes = actualChanges
        updateData.paymentHistory = [...(currentBooking.paymentHistory || []), historyEntry]
      }
      
      // Обновляем документ в Firestore
      await updateDoc(doc(db, 'bookings', currentBooking.id), updateData)
      
      // Выходим из режима редактирования
      setIsEditMode(false)
      
      // Обновляем список бронирований
      if (onUpdate) {
        await onUpdate()
      }
      
      // Перезагружаем данные бронирования
      await loadFreshBooking(currentBooking.id)
      
    } catch (error) {
      console.error('Error updating booking:', error)
      alert('Ошибка при сохранении изменений')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    // Очищаем поиск при закрытии модалки
    setSearchQuery('')
    setSearchResults([])
    setShowDropdown(false)
    setIsEditMode(false)
    onClose()
  }

  const handleCancelEdit = () => {
    // Восстанавливаем исходные данные
    if (currentBooking) {
      setEditedData({
        courtId: currentBooking.courtId || '',
        courtName: currentBooking.courtName || '',
        date: format(currentBooking.date, 'yyyy-MM-dd'),
        startTime: currentBooking.startTime,
        duration: currentBooking.duration || 60
      })
    }
    // Очищаем поиск при отмене редактирования
    setSearchQuery('')
    setSearchResults([])
    setShowDropdown(false)
    setIsEditMode(false)
  }

  // Функция добавления участника из поиска
  const handleAddParticipantFromSearch = async (customer: any) => {
    if (!currentBooking) return
    
    try {
      // Рассчитываем стоимость с человека
      const courtPrice = currentBooking.amount || 0
      const courtPricePerPerson = Math.round(courtPrice / (currentBooking.maxParticipants || 1))
      const trainerPricePerPerson = currentBooking.trainerPrice ? 
        Math.round(currentBooking.trainerPrice / (currentBooking.maxParticipants || 1)) : 0
      const totalPricePerPerson = courtPricePerPerson + trainerPricePerPerson
      
      // Создаем документ участника
      const participantData = {
        groupTrainingId: currentBooking.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        registrationType: 'admin',
        registeredBy: admin?.uid || '',
        paymentStatus: 'pending',
        paymentMethod: currentBooking.paymentMethod || 'cash',
        paymentAmount: totalPricePerPerson,
        priceBreakdown: {
          courtPrice: courtPricePerPerson,
          trainerPrice: trainerPricePerPerson,
          total: totalPricePerPerson
        },
        registeredAt: Timestamp.now(),
        paymentHistory: [{
          timestamp: Timestamp.now(),
          action: 'created',
          status: 'pending',
          userId: admin?.uid || '',
          userName: admin?.email || 'Система',
          note: 'Участник добавлен администратором'
        }]
      }
      
      await addDoc(collection(db, 'groupParticipants'), participantData)
      
      // Обновляем счетчик участников на основе реального количества оплаченных участников
      const paidParticipantsQuery = query(
        collection(db, 'groupParticipants'),
        where('groupTrainingId', '==', currentBooking.id),
        where('paymentStatus', '==', 'paid')
      )
      const paidParticipantsSnapshot = await getDocs(paidParticipantsQuery)
      
      await updateDoc(doc(db, 'bookings', currentBooking.id), {
        currentParticipants: paidParticipantsSnapshot.size,
        updatedAt: Timestamp.now()
      })
      
      // Перезагружаем список участников
      await loadGroupParticipants(currentBooking.id)
      await loadFreshBooking(currentBooking.id)
    } catch (error) {
      console.error('Error adding participant:', error)
      alert('Ошибка при добавлении участника')
    }
  }

  // Функция добавления нового участника
  const handleAddNewParticipant = async (name: string, phone: string) => {
    if (!currentBooking) return
    
    try {
      // Сначала создаем нового клиента
      const customerData = {
        name,
        phone,
        venueId: currentBooking.venueId,
        bookingsCount: 0,
        createdAt: Timestamp.now()
      }
      
      const customerRef = await addDoc(collection(db, 'customers'), customerData)
      
      // Добавляем как участника
      await handleAddParticipantFromSearch({
        id: customerRef.id,
        name,
        phone,
        email: ''
      })
    } catch (error) {
      console.error('Error adding new participant:', error)
      alert('Ошибка при добавлении нового участника')
    }
  }

  // Функция удаления участника (если ее еще нет)
  const handleRemoveParticipant = async (participantId: string) => {
    if (!currentBooking || !confirm('Удалить участника?')) return
    
    try {
      await deleteDoc(doc(db, 'groupParticipants', participantId))
      
      // Обновляем счетчик участников на основе реального количества оплаченных участников
      const paidParticipantsQuery = query(
        collection(db, 'groupParticipants'),
        where('groupTrainingId', '==', currentBooking.id),
        where('paymentStatus', '==', 'paid')
      )
      const paidParticipantsSnapshot = await getDocs(paidParticipantsQuery)
      
      await updateDoc(doc(db, 'bookings', currentBooking.id), {
        currentParticipants: paidParticipantsSnapshot.size,
        updatedAt: Timestamp.now()
      })
      
      // Перезагружаем список участников
      await loadGroupParticipants(currentBooking.id)
      await loadFreshBooking(currentBooking.id)
    } catch (error) {
      console.error('Error removing participant:', error)
      alert('Ошибка при удалении участника')
    }
  }

  // Функция обновления статуса оплаты участника
  const handleUpdateParticipantPaymentStatus = async (participantId: string, newStatus: string) => {
    if (!currentBooking) return
    
    try {
      // Обновляем статус участника
      await updateDoc(doc(db, 'groupParticipants', participantId), {
        paymentStatus: newStatus,
        updatedAt: Timestamp.now()
      })
      
      // Обновляем счетчик участников на основе реального количества оплаченных участников
      const paidParticipantsQuery = query(
        collection(db, 'groupParticipants'),
        where('groupTrainingId', '==', currentBooking.id),
        where('paymentStatus', '==', 'paid')
      )
      const paidParticipantsSnapshot = await getDocs(paidParticipantsQuery)
      
      await updateDoc(doc(db, 'bookings', currentBooking.id), {
        currentParticipants: paidParticipantsSnapshot.size,
        updatedAt: Timestamp.now()
      })
      
      // Перезагружаем список участников
      await loadGroupParticipants(currentBooking.id)
      await loadFreshBooking(currentBooking.id)
    } catch (error) {
      console.error('Error updating participant payment status:', error)
      alert('Ошибка при обновлении статуса оплаты')
    }
  }

  // Обновляем слоты и проверяем доступность при изменении параметров в режиме редактирования
  useEffect(() => {
    if (isEditMode && editedData.date) {
      const slots = generateTimeSlots(editedData.duration, editedData.date)
      setAvailableSlots(slots)
    }
  }, [editedData.duration, editedData.date, isEditMode])
  
  // Загружаем бронирования при изменении корта или даты в режиме редактирования
  useEffect(() => {
    if (isEditMode && editedData.courtId && editedData.date) {
      loadExistingBookings(editedData.courtId, editedData.date)
    }
  }, [editedData.courtId, editedData.date, isEditMode])


  // Сбрасываем режим редактирования при закрытии
  useEffect(() => {
    if (!isOpen) {
      setIsEditMode(false)
    }
  }, [isOpen])

  if (!isOpen || !currentBooking) return null

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date)
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(amount)
  }


  const statusLabels = {
    confirmed: 'Подтверждено',
    pending: 'Ожидает',
    cancelled: 'Отменено'
  }

  const statusColors = {
    confirmed: '#10B981',
    pending: '#F59E0B',
    cancelled: '#EF4444'
  }

  return (
    <>
    <div 
      className="modal active"
      onClick={(e) => {
        // Закрываем при клике на оверлей (фон)
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="modal-content" style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Детали бронирования</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!isTrainer && !isEditMode && (
              <button 
                className="btn btn-primary btn-icon"
                onClick={handleEditClick}
                title="Редактировать"
                style={{ marginRight: '8px' }}
              >
                <Edit style={{ fontSize: '18px' }} />
              </button>
            )}
            <button className="modal-close" onClick={handleClose}>
              <Close />
            </button>
          </div>
        </div>

        <div className="modal-body">
          <div style={{ display: 'grid', gap: '24px' }}>
            {/* Основная информация */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                Информация о бронировании
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--gray)' }}>Корт:</span>
                  {isEditMode ? (
                    <select
                      value={editedData.courtId}
                      onChange={(e) => setEditedData({ ...editedData, courtId: e.target.value })}
                      className="form-select"
                      style={{ width: '200px' }}
                    >
                      {availableCourts.map(court => (
                        <option key={court.id} value={court.id}>
                          {court.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ fontWeight: '600' }}>{currentBooking.courtName}</span>
                  )}
                </div>
                {currentBooking.trainerName && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--gray)' }}>Тренер:</span>
                    <span style={{ fontWeight: '600', color: 'var(--primary)' }}>
                      {currentBooking.trainerName}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--gray)' }}>Дата:</span>
                  {isEditMode ? (
                    <input
                      type="date"
                      value={editedData.date}
                      onChange={(e) => setEditedData({ ...editedData, date: e.target.value })}
                      className="form-input"
                      style={{ width: '200px' }}
                      min={format(new Date(), 'yyyy-MM-dd')}
                    />
                  ) : (
                    <span style={{ fontWeight: '600' }}>{formatDate(currentBooking.date)}</span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--gray)' }}>Длительность:</span>
                  {isEditMode ? (
                    <select
                      value={editedData.duration}
                      onChange={(e) => setEditedData({ ...editedData, duration: Number(e.target.value) })}
                      className="form-select"
                      style={{ width: '200px' }}
                    >
                      <option value={30}>30 минут</option>
                      <option value={60}>1 час</option>
                      <option value={90}>1.5 часа</option>
                      <option value={120}>2 часа</option>
                      <option value={150}>2.5 часа</option>
                      <option value={180}>3 часа</option>
                    </select>
                  ) : (
                    <span style={{ fontWeight: '600' }}>
                      {currentBooking.duration === 30 ? '30 минут' :
                       currentBooking.duration === 60 ? '1 час' :
                       currentBooking.duration === 90 ? '1.5 часа' :
                       currentBooking.duration === 120 ? '2 часа' :
                       currentBooking.duration === 150 ? '2.5 часа' :
                       currentBooking.duration === 180 ? '3 часа' :
                       `${currentBooking.duration} мин`}
                    </span>
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--gray)' }}>Доступные интервалы:</span>
                    {isEditMode ? (
                      <select
                        value={editedData.startTime}
                        onChange={(e) => setEditedData({ ...editedData, startTime: e.target.value })}
                        className="form-select"
                        style={{ 
                          width: '250px',
                          backgroundColor: isSlotOccupied(editedData.startTime) ? '#FEE2E2' : 'white'
                        }}
                      >
                        <option value="">
                          {loadingSlots ? 'Загрузка...' : 'Выберите время'}
                        </option>
                        {!loadingSlots && availableSlots.map(time => {
                          const occupied = isSlotOccupied(time)
                          const endTime = calculateEndTime(time, editedData.duration)
                          
                          return (
                            <option 
                              key={time} 
                              value={time}
                              disabled={occupied}
                              style={occupied ? { color: '#9CA3AF', backgroundColor: '#F3F4F6' } : {}}
                            >
                              {time} - {endTime} {occupied ? '❌ ЗАНЯТО' : ''}
                            </option>
                          )
                        })}
                      </select>
                    ) : (
                      <span style={{ fontWeight: '600' }}>
                        {currentBooking.startTime} - {currentBooking.endTime}
                      </span>
                    )}
                  </div>
                  {isEditMode && !loadingSlots && isSlotOccupied(editedData.startTime) && (
                    <div style={{ 
                      marginTop: '6px',
                      padding: '8px',
                      backgroundColor: '#FEE2E2',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#991B1B',
                      fontWeight: '500'
                    }}>
                      ⚠️ Выбранное время занято. Пожалуйста, выберите другой интервал.
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray)' }}>Статус:</span>
                  <span style={{ 
                    fontWeight: '600',
                    color: statusColors[currentBooking.status]
                  }}>
                    {statusLabels[currentBooking.status]}
                  </span>
                </div>
              </div>
            </div>

            {/* Информация о клиенте */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                Информация о клиенте
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray)' }}>Имя:</span>
                  <span style={{ fontWeight: '600' }}>
                    {currentBooking.clientName || currentBooking.customerName}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray)' }}>Телефон:</span>
                  <span style={{ fontWeight: '600' }}>
                    {currentBooking.clientPhone || currentBooking.customerPhone}
                  </span>
                </div>
              </div>
            </div>

            {/* Информация о групповой тренировке */}
            {currentBooking.bookingType === 'group' && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                  Групповая тренировка
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--gray)' }}>Тип тренировки:</span>
                    <span style={{ 
                      fontWeight: '600',
                      padding: '4px 8px',
                      background: currentBooking.visibility === 'public' ? '#10b981' : '#6366f1',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {currentBooking.visibility === 'public' ? 'Открытая' : 'Закрытая'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--gray)' }}>Участники:</span>
                    <span style={{ 
                      fontWeight: '600',
                      padding: '4px 8px',
                      background: groupParticipants.length === currentBooking.maxParticipants 
                        ? '#ef4444' 
                        : '#f3f4f6',
                      color: groupParticipants.length === currentBooking.maxParticipants 
                        ? 'white' 
                        : '#111827',
                      borderRadius: '4px'
                    }}>
                      {groupParticipants.length} / {currentBooking.maxParticipants || 0}
                    </span>
                  </div>
                  
                  {/* Сводка по оплатам участников */}
                  {groupParticipants.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--gray)' }}>Статус оплат:</span>
                      <div style={{ 
                        display: 'flex', 
                        gap: '8px',
                        fontSize: '12px'
                      }}>
                        <span style={{
                          padding: '2px 8px',
                          background: '#10b981',
                          color: 'white',
                          borderRadius: '4px'
                        }}>
                          Оплачено: {groupParticipants.filter(p => p.paymentStatus === 'paid').length}
                        </span>
                        {groupParticipants.filter(p => p.paymentStatus === 'pending').length > 0 && (
                          <span style={{
                            padding: '2px 8px',
                            background: '#f59e0b',
                            color: 'white',
                            borderRadius: '4px'
                          }}>
                            Ожидает: {groupParticipants.filter(p => p.paymentStatus === 'pending').length}
                          </span>
                        )}
                        {groupParticipants.filter(p => p.paymentStatus === 'cancelled').length > 0 && (
                          <span style={{
                            padding: '2px 8px',
                            background: '#ef4444',
                            color: 'white',
                            borderRadius: '4px'
                          }}>
                            Отменено: {groupParticipants.filter(p => p.paymentStatus === 'cancelled').length}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {currentBooking.groupRegistrationUrl && (
                    <div>
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ color: 'var(--gray)' }}>Ссылка для записи:</span>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        gap: '8px',
                        padding: '8px',
                        background: '#f3f4f6',
                        borderRadius: '4px',
                        alignItems: 'center'
                      }}>
                        <input
                          type="text"
                          value={currentBooking.groupRegistrationUrl}
                          readOnly
                          style={{
                            flex: 1,
                            padding: '4px 8px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '4px',
                            fontSize: '12px',
                            background: 'white'
                          }}
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(currentBooking.groupRegistrationUrl || '')
                            alert('Ссылка скопирована!')
                          }}
                          style={{
                            padding: '4px 12px',
                            background: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          Копировать
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Поиск клиента для групповых тренировок (точная копия из CreateBookingModal) */}
                  {currentBooking.visibility === 'private' && !isTrainer && isEditMode && (
                    <div style={{ marginTop: '16px' }}>
                      <div className="form-group" style={{ position: 'relative', marginBottom: '16px' }} ref={searchRef}>
                        <label className="form-label">Поиск участника</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Введите имя или телефон..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value)
                            if (e.target.value) {
                              setShowDropdown(true)
                            }
                          }}
                          disabled={groupParticipants.length >= (currentBooking.maxParticipants || 0)}
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
                                  onClick={async () => {
                                    if (groupParticipants.length < (currentBooking.maxParticipants || 0)) {
                                      // Проверяем, не добавлен ли уже этот участник
                                      const alreadyAdded = groupParticipants.some(p => p.phone === customer.phone)
                                      if (!alreadyAdded) {
                                        await handleAddParticipantFromSearch(customer)
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
                                if (groupParticipants.length < (currentBooking.maxParticipants || 0)) {
                                  const cleanedQuery = searchQuery.trim()
                                  const isPhone = /^[+]?[78]?[\d\s\-\(\)]+$/.test(cleanedQuery) && /\d/.test(cleanedQuery) && cleanedQuery.replace(/\D/g, '').length >= 6
                                  
                                  if (isPhone) {
                                    const name = prompt('Имя участника:')
                                    if (name) {
                                      handleAddNewParticipant(name, cleanedQuery)
                                      setSearchQuery('')
                                      setShowDropdown(false)
                                    }
                                  } else {
                                    const phone = prompt('Телефон участника:')
                                    if (phone) {
                                      handleAddNewParticipant(cleanedQuery, phone)
                                      setSearchQuery('')
                                      setShowDropdown(false)
                                    }
                                  }
                                }
                              }}
                              style={{ width: '100%' }}
                            >
                              <PersonAdd fontSize="small" style={{ marginRight: '8px' }} />
                              Добавить нового участника
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Список участников */}
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <span style={{ color: 'var(--gray)', fontWeight: '600' }}>
                        Список участников:
                      </span>
                      <button
                        onClick={() => loadGroupParticipants(currentBooking.id)}
                        style={{
                          padding: '4px 8px',
                          background: 'transparent',
                          border: '1px solid #e5e7eb',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: 'var(--gray)'
                        }}
                      >
                        Обновить
                      </button>
                    </div>
                    {loadingParticipants ? (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '16px',
                        color: 'var(--gray)'
                      }}>
                        Загрузка участников...
                      </div>
                    ) : groupParticipants.length > 0 ? (
                      <div style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}>
                        {groupParticipants.map((participant, index) => (
                          <div
                            key={participant.id}
                            style={{
                              padding: '12px',
                              borderBottom: index < groupParticipants.length - 1 ? '1px solid #f3f4f6' : 'none',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: index % 2 === 0 ? 'white' : '#fafafa'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                                {participant.name}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--gray)' }}>
                                {participant.phone}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {/* Селектор статуса оплаты для администратора */}
                              {!isTrainer ? (
                                <select
                                  value={participant.paymentStatus}
                                  onChange={(e) => handleUpdateParticipantPaymentStatus(participant.id, e.target.value)}
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: '500',
                                    background: participant.paymentStatus === 'paid' 
                                      ? '#10b981' 
                                      : participant.paymentStatus === 'pending'
                                      ? '#f59e0b'
                                      : '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    outline: 'none'
                                  }}
                                >
                                  <option value="pending">Ожидает</option>
                                  <option value="paid">Оплачено</option>
                                  <option value="cancelled">Отменено</option>
                                </select>
                              ) : (
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '500',
                                  background: participant.paymentStatus === 'paid' 
                                    ? '#10b981' 
                                    : participant.paymentStatus === 'pending'
                                    ? '#f59e0b'
                                    : '#ef4444',
                                  color: 'white'
                                }}>
                                  {participant.paymentStatus === 'paid' 
                                    ? 'Оплачено' 
                                    : participant.paymentStatus === 'pending'
                                    ? 'Ожидает'
                                    : 'Отменено'}
                                </span>
                              )}
                              {/* Кнопка удаления участника только для закрытых групп */}
                              {currentBooking.visibility === 'private' && !isTrainer && (
                                <button
                                  onClick={() => handleRemoveParticipant(participant.id)}
                                  style={{
                                    padding: '2px 6px',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '11px'
                                  }}
                                >
                                  Удалить
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        padding: '16px',
                        textAlign: 'center',
                        color: 'var(--gray)',
                        background: '#f3f4f6',
                        borderRadius: '8px'
                      }}>
                        <div>Нет записавшихся участников</div>
                        {currentBooking.visibility === 'private' && !isTrainer && (
                          <div style={{ 
                            marginTop: '8px', 
                            fontSize: '12px',
                            fontStyle: 'italic' 
                          }}>
                            Для добавления участников перейдите в режим редактирования
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Информация о создании бронирования */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                Информация о создании
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray)' }}>Создано:</span>
                  <span style={{ fontWeight: '600' }}>
                    {currentBooking.createdBy?.userName || 'Система'}
                  </span>
                </div>
                {currentBooking.createdBy?.userRole && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--gray)' }}>Роль:</span>
                    <span style={{ fontWeight: '600' }}>
                      {currentBooking.createdBy.userRole === 'superadmin' ? 'Суперадминистратор' : 'Администратор'}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray)' }}>Дата создания:</span>
                  <span style={{ fontWeight: '600' }}>
                    {new Intl.DateTimeFormat('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }).format(currentBooking.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Информация об оплате */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                Информация об оплате
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                {/* Если есть тренер, показываем детализацию */}
                {currentBooking.trainerPrice ? (
                  <>
                    {(() => {
                      // Для групповых тренировок проверяем формат хранения цены
                      const isGroupBooking = currentBooking.bookingType === 'group' && currentBooking.maxParticipants
                      
                      let trainerTotalPrice, courtPrice, totalAmount
                      
                      if (isGroupBooking) {
                        // Для групповых тренировок:
                        // - trainerPrice уже содержит общую стоимость тренера (groupPrice * maxParticipants)
                        // - amount содержит только цену корта
                        trainerTotalPrice = currentBooking.trainerPrice
                        courtPrice = currentBooking.amount
                        totalAmount = courtPrice + trainerTotalPrice
                      } else {
                        // Для индивидуальных тренировок amount = общая сумма
                        trainerTotalPrice = currentBooking.trainerPrice
                        courtPrice = currentBooking.amount - currentBooking.trainerPrice
                        totalAmount = currentBooking.amount
                      }
                      
                      return (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--gray)' }}>Корт:</span>
                            <span style={{ fontWeight: '600' }}>
                              {formatAmount(courtPrice)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--gray)' }}>
                              Тренер{isGroupBooking ? ` (${Math.round(trainerTotalPrice / currentBooking.maxParticipants)} ₽ × ${currentBooking.maxParticipants} чел.)` : ''}:
                            </span>
                            <span style={{ fontWeight: '600' }}>
                              {formatAmount(trainerTotalPrice)}
                            </span>
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            paddingTop: '12px',
                            borderTop: '1px solid var(--divider)'
                          }}>
                            <span style={{ color: 'var(--gray)', fontWeight: '600' }}>Итого:</span>
                            <span style={{ fontWeight: '600', fontSize: '18px' }}>
                              {formatAmount(totalAmount)}
                            </span>
                          </div>
                          {/* Для групповых тренировок показываем цену с человека */}
                          {isGroupBooking && (
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              paddingTop: '8px',
                              fontSize: '14px',
                              color: 'var(--gray)'
                            }}>
                              <span>Цена с человека:</span>
                              <span style={{ fontWeight: '600' }}>
                                {formatAmount(Math.round(totalAmount / currentBooking.maxParticipants))}
                              </span>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </>
                ) : (
                  /* Если тренера нет, показываем только сумму */
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--gray)' }}>Сумма:</span>
                    <span style={{ fontWeight: '600', fontSize: '18px' }}>
                      {formatAmount(currentBooking.amount)}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray)' }}>Способ оплаты:</span>
                  <span style={{ fontWeight: '600' }}>
                    {getPaymentMethodName(currentBooking.paymentMethod)}
                  </span>
                </div>
                {/* Статус оплаты не показываем для групповых тренировок */}
                {currentBooking.bookingType !== 'group' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--gray)' }}>Статус оплаты:</span>
                    {/* Тренеры видят только статус, без возможности управления */}
                    {isTrainer ? (
                    <span style={{ 
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontWeight: '500',
                      background: currentBooking.paymentStatus === 'paid' ? '#10B981' : 
                                 currentBooking.paymentStatus === 'cancelled' ? '#EF4444' : '#F59E0B',
                      color: 'white'
                    }}>
                      {currentBooking.paymentStatus === 'paid' ? 'Оплачено' :
                       currentBooking.paymentStatus === 'cancelled' ? 'Отменено' :
                       currentBooking.paymentStatus === 'refunded' ? 'Возвращено' :
                       'Ожидает оплаты'}
                    </span>
                  ) : (
                    <PaymentStatusManager
                      key={`${currentBooking.id}-${currentBooking.paymentStatus}`}
                      bookingId={currentBooking.id}
                      currentStatus={currentBooking.paymentStatus || 'awaiting_payment'}
                      paymentMethod={currentBooking.paymentMethod}
                      onStatusUpdate={async () => {
                        // Обновляем только список в родительском компоненте
                        if (onUpdate) {
                          await onUpdate()
                        }
                      }}
                      onRefund={() => {
                        setShowRefundModal(true)
                      }}
                    />
                    )}
                  </div>
                )}
                {/* Таймер до автоматической отмены */}
                {currentBooking.bookingType !== 'group' && currentBooking.paymentStatus === 'awaiting_payment' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--gray)' }}>До отмены:</span>
                    <PaymentTimeLimit
                      createdAt={currentBooking.createdAt}
                      paymentMethod={currentBooking.paymentMethod}
                      paymentStatus={currentBooking.paymentStatus}
                    />
                  </div>
                )}
                {/* Ссылка на оплату */}
                {currentBooking.bookingType !== 'group' &&
                 currentBooking.paymentMethod === 'online' && 
                 currentBooking.paymentStatus === 'awaiting_payment' && 
                 (currentBooking.paymentUrl || currentBooking.paymentSmsInfo?.paymentUrl) && (
                  <div style={{ 
                    marginTop: '12px',
                    padding: '12px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(245, 158, 11, 0.3)'
                  }}>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      color: 'var(--warning)',
                      marginBottom: '8px'
                    }}>
                      Ссылка на оплату
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: 'var(--gray)',
                      marginBottom: '8px'
                    }}>
                      {currentBooking.paymentSmsInfo ? 
                        `SMS отправлено на ${currentBooking.paymentSmsInfo.sentTo}` : 
                        'Клиент может оплатить по этой ссылке'}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      background: 'white',
                      borderRadius: '6px',
                      border: '1px solid var(--extra-light-gray)'
                    }}>
                      <input
                        type="text"
                        value={currentBooking.paymentUrl || currentBooking.paymentSmsInfo?.paymentUrl || ''}
                        readOnly
                        style={{
                          flex: 1,
                          border: 'none',
                          outline: 'none',
                          fontSize: '12px',
                          background: 'transparent'
                        }}
                      />
                      <button
                        onClick={() => {
                          const url = currentBooking.paymentUrl || currentBooking.paymentSmsInfo?.paymentUrl || ''
                          navigator.clipboard.writeText(url)
                          alert('Ссылка скопирована!')
                        }}
                        style={{
                          padding: '4px 12px',
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Копировать
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* История изменений - скрываем для тренеров */}
            {!isTrainer && currentBooking.paymentHistory && currentBooking.paymentHistory.length > 0 && (
              <PaymentHistory history={currentBooking.paymentHistory} />
            )}
          </div>
        </div>

        <div className="modal-footer">
          {isEditMode ? (
            <>
              <button 
                className="btn btn-secondary" 
                onClick={handleCancelEdit}
                disabled={saving}
              >
                <Cancel style={{ fontSize: '18px', marginRight: '6px' }} />
                Отмена
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveChanges}
                disabled={saving}
              >
                <Save style={{ fontSize: '18px', marginRight: '6px' }} />
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </>
          ) : (
            <button className="btn btn-secondary" onClick={handleClose}>
              Закрыть
            </button>
          )}
        </div>
      </div>
    </div>
    
    {/* Модальное окно возврата */}
    <RefundModal
      isOpen={showRefundModal}
      onClose={() => {
        setShowRefundModal(false)
      }}
      booking={currentBooking}
      onSuccess={() => {
        setShowRefundModal(false)
        if (onUpdate) {
          onUpdate()
        }
      }}
      clubTimezone={clubTimezone}
    />
  </>
  )
}