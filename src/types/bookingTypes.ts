import { Timestamp } from 'firebase/firestore'

/**
 * Единые типы для работы с бронированиями
 * Стандартизованные по всему проекту
 */

// Основной тип бронирования для использования в приложении
export interface BookingData {
  id: string
  venueId: string
  courtId: string
  
  // Дата и время
  date: Date                    // Дата бронирования
  startTime: string             // Время начала в формате 'HH:mm'
  duration: number              // Длительность в МИНУТАХ
  // endTime вычисляется через calculateEndTime(startTime, duration)
  
  // Информация о клиенте
  customerName: string
  customerPhone: string
  customerEmail?: string
  
  // Статусы
  status: 'pending' | 'confirmed' | 'cancelled'
  paymentStatus?: 'awaiting_payment' | 'paid' | 'cancelled' | 'refunded' | 'expired' | 'error'
  paymentMethod: 'cash' | 'card_on_site' | 'transfer' | 'online' | 'sberbank_card' | 'tbank_card' | 'vtb_card'
  
  // Финансы
  amount: number                // Общая сумма
  price?: number                // Цена за час (для обратной совместимости)
  
  // Метаданные
  createdAt: Date
  updatedAt?: Date
  source?: 'admin' | 'web' | 'app'
  gameType?: 'single' | 'split' | 'open'
  
  // Дополнительные поля
  courtName?: string
  venueName?: string
  paymentUrl?: string
  paymentId?: string
  
  // История платежей
  paymentHistory?: PaymentHistoryEntry[]
  
  // Информация о создателе (для админ-панели)
  createdBy?: {
    userId: string
    userName: string
    userRole?: string
  }
}

// Тип для хранения в Firestore
export interface BookingFirestore {
  venueId: string
  courtId: string
  
  // Дата и время - хранятся в специальных форматах Firestore
  date: Timestamp               // Firestore Timestamp
  startTime: string             // Время начала 'HH:mm'
  duration: number              // Длительность в минутах
  
  // Все остальные поля как в BookingData
  customerName: string
  customerPhone: string
  customerEmail?: string
  
  status: 'pending' | 'confirmed' | 'cancelled'
  paymentStatus?: 'awaiting_payment' | 'paid' | 'cancelled' | 'refunded' | 'expired' | 'error'
  paymentMethod: 'cash' | 'card_on_site' | 'transfer' | 'online' | 'sberbank_card' | 'tbank_card' | 'vtb_card'
  
  amount: number
  price?: number
  
  createdAt: Timestamp
  updatedAt?: Timestamp
  source?: 'admin' | 'web' | 'app'
  gameType?: 'single' | 'split' | 'open'
  
  courtName?: string
  venueName?: string
  paymentUrl?: string
  paymentId?: string
  
  paymentHistory?: PaymentHistoryEntry[]
  
  createdBy?: {
    userId: string
    userName: string
    userRole?: string
  }
  
  // Поля для обратной совместимости (постепенно удалить)
  time?: string                 // Старое поле, = startTime
  endTime?: string              // Старое поле, вычисляется из startTime + duration
}

// Тип для истории платежей
export interface PaymentHistoryEntry {
  timestamp: Timestamp
  action: string
  userId: string
  userName: string
  note?: string
}

// Тип для формы создания бронирования
export interface BookingFormData {
  clientName: string
  clientPhone: string
  courtId: string
  date: string                  // В форме используется строка 'yyyy-MM-dd'
  startTime: string             // 'HH:mm'
  duration: number              // В ЧАСАХ для удобства ввода (1.5 часа)
  paymentMethod: 'cash' | 'card_on_site' | 'transfer' | 'online' | 'sberbank_card' | 'tbank_card' | 'vtb_card'
}

// Тип для календарного слота
export interface TimeSlot {
  date: Date
  time: string                  // 'HH:mm'
  courtId: string
  isAvailable: boolean
  booking?: BookingData
}

// Функции преобразования между типами

/**
 * Преобразует данные из Firestore в формат приложения
 */
export function firestoreToBooking(data: BookingFirestore, id: string): BookingData {
  return {
    id,
    ...data,
    date: data.date.toDate(),
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt?.toDate(),
    // Остальные поля остаются как есть
  }
}

/**
 * Преобразует данные приложения для сохранения в Firestore
 */
export function bookingToFirestore(data: Partial<BookingData>): Partial<BookingFirestore> {
  const firestoreData: Partial<BookingFirestore> = {
    ...data,
  }
  
  // Преобразуем даты в Timestamp
  if (data.date) {
    firestoreData.date = Timestamp.fromDate(data.date)
  }
  
  if (data.createdAt) {
    firestoreData.createdAt = Timestamp.fromDate(data.createdAt)
  }
  
  if (data.updatedAt) {
    firestoreData.updatedAt = Timestamp.fromDate(data.updatedAt)
  }
  
  // Удаляем id, так как он хранится отдельно в Firestore
  delete (firestoreData as any).id
  
  // Для обратной совместимости добавляем старые поля
  if (data.startTime) {
    firestoreData.time = data.startTime
  }
  
  if (data.startTime && data.duration) {
    const { calculateEndTime } = require('../utils/dateTime')
    firestoreData.endTime = calculateEndTime(data.startTime, data.duration)
  }
  
  return firestoreData
}