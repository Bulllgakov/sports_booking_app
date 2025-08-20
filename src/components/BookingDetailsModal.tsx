import React, { useState, useEffect } from 'react'
import { Close, Edit, Save, Cancel } from '@mui/icons-material'
import { doc, getDoc, onSnapshot, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
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
  
  // Проверяем, является ли пользователь тренером
  const isTrainer = admin?.role === 'trainer'

  useEffect(() => {
    if (booking && isOpen) {
      // При открытии модалки всегда загружаем свежие данные
      loadFreshBooking(booking.id)
      
      // Загружаем список кортов
      loadAvailableCourts()
      
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
    setIsEditMode(false)
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
            <button className="modal-close" onClick={onClose}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray)' }}>Сумма:</span>
                  <span style={{ fontWeight: '600', fontSize: '18px' }}>
                    {formatAmount(currentBooking.totalAmount || currentBooking.amount)}
                  </span>
                </div>
                {currentBooking.trainerPrice && (
                  <div style={{ 
                    paddingLeft: '20px',
                    fontSize: '14px',
                    color: 'var(--gray)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• Корт:</span>
                      <span>{formatAmount(currentBooking.amount - (currentBooking.trainerPrice || 0))}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• Тренер:</span>
                      <span>{formatAmount(currentBooking.trainerPrice)}</span>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray)' }}>Способ оплаты:</span>
                  <span style={{ fontWeight: '600' }}>
                    {getPaymentMethodName(currentBooking.paymentMethod)}
                  </span>
                </div>
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
                {/* Таймер до автоматической отмены */}
                {currentBooking.paymentStatus === 'awaiting_payment' && (
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
                {currentBooking.paymentMethod === 'online' && 
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
            <button className="btn btn-secondary" onClick={onClose}>
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