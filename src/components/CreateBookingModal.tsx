import React, { useState, useEffect } from 'react'
import { Close } from '@mui/icons-material'
import { addDoc, collection, Timestamp, getDocs, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuth } from '../contexts/AuthContext'
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
}

interface CreateBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  venueId: string
  preSelectedDate?: Date
  preSelectedTime?: string
}

export default function CreateBookingModal({
  isOpen,
  onClose,
  onSuccess,
  venueId,
  preSelectedDate,
  preSelectedTime
}: CreateBookingModalProps) {
  const { admin } = useAuth()
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(false)
  const [venueName, setVenueName] = useState('')
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    courtId: '',
    date: preSelectedDate ? preSelectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    startTime: preSelectedTime || '10:00',
    duration: 1,
    paymentMethod: 'cash' as 'cash' | 'card_on_site' | 'transfer' | 'online'
  })
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [existingBookings, setExistingBookings] = useState<any[]>([])
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null)

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

  // Генерация временных слотов с учетом длительности
  const generateTimeSlots = (duration: number) => {
    const slots: string[] = []
    const startHour = 7 // Начало работы с 7:00
    const endHour = 23 // Конец работы в 23:00
    const maxStartTime = endHour - duration // Последнее время, когда можно начать бронирование
    
    // Всегда генерируем слоты с интервалом 30 минут
    const interval = 0.5
    
    for (let hour = startHour; hour <= maxStartTime; hour += interval) {
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

  useEffect(() => {
    if (isOpen) {
      fetchCourts()
      // Обновляем форму при изменении предвыбранных значений
      if (preSelectedDate) {
        setFormData(prev => ({
          ...prev,
          date: preSelectedDate.toISOString().split('T')[0]
        }))
      }
      if (preSelectedTime) {
        setFormData(prev => ({
          ...prev,
          startTime: preSelectedTime
        }))
      }
      // Инициализируем слоты при открытии
      const slots = generateTimeSlots(formData.duration)
      setAvailableSlots(slots)
    }
  }, [isOpen, preSelectedDate, preSelectedTime])

  // Обновляем доступные слоты при изменении длительности
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
  }, [formData.duration])

  // Загружаем бронирования при изменении корта или даты с real-time обновлениями
  useEffect(() => {
    if (formData.courtId && formData.date && isOpen) {
      // Отписываемся от предыдущей подписки
      if (unsubscribe) {
        unsubscribe()
        setUnsubscribe(null)
      }

      // Загружаем начальные данные
      fetchExistingBookings()

      // Настраиваем real-time подписку
      const bookingsRef = collection(db, 'bookings')
      
      // Подписка на строковый формат даты
      const q1 = query(
        bookingsRef,
        where('courtId', '==', formData.courtId),
        where('date', '==', formData.date),
        where('status', 'in', ['confirmed', 'pending'])
      )
      
      // Подписка на Timestamp формат
      const startOfDay = new Date(formData.date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(formData.date)
      endOfDay.setHours(23, 59, 59, 999)
      
      const q2 = query(
        bookingsRef,
        where('courtId', '==', formData.courtId),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay)),
        where('status', 'in', ['confirmed', 'pending'])
      )

      // Объединяем результаты обеих подписок
      const bookingsMap = new Map()
      
      const unsub1 = onSnapshot(q1, (snapshot) => {
        snapshot.docs.forEach(doc => {
          bookingsMap.set(doc.id, { id: doc.id, ...doc.data() })
        })
        setExistingBookings(Array.from(bookingsMap.values()))
      })
      
      const unsub2 = onSnapshot(q2, (snapshot) => {
        snapshot.docs.forEach(doc => {
          bookingsMap.set(doc.id, { id: doc.id, ...doc.data() })
        })
        setExistingBookings(Array.from(bookingsMap.values()))
      })

      const combinedUnsub = () => {
        unsub1()
        unsub2()
      }
      
      setUnsubscribe(() => combinedUnsub)
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
        setVenueName(venueDoc.data().name || '')
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

  const fetchExistingBookings = async () => {
    if (!venueId || !formData.courtId || !formData.date) return

    try {
      const bookingsRef = collection(db, 'bookings')
      
      // Сначала пробуем запрос со строковым форматом даты
      let q = query(
        bookingsRef,
        where('courtId', '==', formData.courtId),
        where('date', '==', formData.date),
        where('status', 'in', ['confirmed', 'pending'])
      )
      
      let snapshot = await getDocs(q)
      
      // Если нет результатов, пробуем с Timestamp (для обратной совместимости)
      if (snapshot.empty) {
        const startOfDay = new Date(formData.date)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(formData.date)
        endOfDay.setHours(23, 59, 59, 999)
        
        q = query(
          bookingsRef,
          where('courtId', '==', formData.courtId),
          where('date', '>=', Timestamp.fromDate(startOfDay)),
          where('date', '<=', Timestamp.fromDate(endOfDay)),
          where('status', 'in', ['confirmed', 'pending'])
        )
        
        snapshot = await getDocs(q)
      }
      
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
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' ? parseFloat(value) : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!venueId || !admin) return
    
    // Валидация данных
    if (!isValidName(formData.clientName)) {
      alert('Имя должно быть от 2 до 100 символов')
      return
    }
    
    if (!isValidPhone(formData.clientPhone)) {
      alert('Некорректный номер телефона')
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
    const endMinutes = startHours * 60 + startMinutes + formData.duration
    const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`
    
    if (!isValidBookingTime(formData.startTime, endTime, formData.duration)) {
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

      const paymentStatus = formData.paymentMethod === 'online' ? 'online_payment' : 'awaiting_payment'
      
      // Определяем цену в зависимости от дня недели
      const bookingDate = new Date(formData.date)
      const isWeekend = bookingDate.getDay() === 0 || bookingDate.getDay() === 6
      const pricePerHour = court.pricePerHour || (isWeekend ? court.priceWeekend : court.priceWeekday) || 1900
      
      const bookingData = {
        venueId: venueId,
        courtId: formData.courtId,
        courtName: court.name,
        venueName: venueName, // Добавляем название venue
        clientName: sanitizeString(formData.clientName),
        clientPhone: normalizePhone(formData.clientPhone),
        customerName: sanitizeString(formData.clientName), // Для совместимости
        customerPhone: normalizePhone(formData.clientPhone), // Для совместимости
        date: formData.date, // Сохраняем как строку для совместимости
        time: formData.startTime,
        startTime: formData.startTime,
        endTime: endTime,
        duration: formData.duration * 60, // Конвертируем часы в минуты для совместимости
        gameType: 'single',
        status: 'confirmed',
        amount: formData.duration * pricePerHour,
        price: pricePerHour,
        paymentMethod: formData.paymentMethod,
        paymentStatus: paymentStatus,
        source: 'admin', // Добавляем источник
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
      
      await addDoc(collection(db, 'bookings'), bookingData)

      // Сбрасываем форму
      setFormData({
        clientName: '',
        clientPhone: '',
        courtId: courts.length > 0 ? courts[0].id : '',
        date: new Date().toISOString().split('T')[0],
        startTime: '10:00',
        duration: 1,
        paymentMethod: 'cash'
      })

      onSuccess()
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
    <div className="modal active">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Создать бронирование</h2>
          <button className="modal-close" onClick={onClose}>
            <Close />
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
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
                  {courts.map(court => {
                    const bookingDate = new Date(formData.date)
                    const isWeekend = bookingDate.getDay() === 0 || bookingDate.getDay() === 6
                    const price = court.pricePerHour || (isWeekend ? court.priceWeekend : court.priceWeekday) || 0
                    return (
                      <option key={court.id} value={court.id}>
                        {court.name} - {price} ₽/час
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
                <label className="form-label">Время начала</label>
                <select 
                  className="form-select"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
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
                    
                    return (
                      <option key={time} value={time} disabled={occupied}>
                        {time} - {endTime} {occupied ? '(Занято)' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>
            
            <div className="form-group" style={{ marginTop: '20px' }}>
              <label className="form-label">Способ оплаты</label>
              <select 
                className="form-select"
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleInputChange}
              >
                <option value="cash">Оплата в клубе наличными</option>
                <option value="card_on_site">Оплата в клубе картой</option>
                <option value="transfer">Перевод на счет клуба</option>
                <option value="online">Онлайн оплата</option>
              </select>
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
                  
                  const bookingDate = new Date(formData.date)
                  const isWeekend = bookingDate.getDay() === 0 || bookingDate.getDay() === 6
                  const pricePerHour = court.pricePerHour || (isWeekend ? court.priceWeekend : court.priceWeekday) || 0
                  const totalPrice = pricePerHour * formData.duration
                  
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--gray)' }}>Стоимость за час:</span>
                        <span style={{ fontWeight: '500' }}>{pricePerHour.toLocaleString('ru-RU')} ₽</span>
                      </div>
                      
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
                      
                      <div style={{ fontSize: '14px', color: 'var(--gray)', marginTop: '8px' }}>
                        Способ оплаты: {
                          formData.paymentMethod === 'cash' ? 'Оплата в клубе наличными' :
                          formData.paymentMethod === 'card_on_site' ? 'Оплата в клубе картой' :
                          formData.paymentMethod === 'transfer' ? 'Перевод на счет клуба' :
                          'Онлайн оплата'
                        }
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            <div className="modal-footer" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--extra-light-gray)' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
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