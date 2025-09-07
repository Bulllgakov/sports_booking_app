export interface Trainer {
  id: string
  clubId: string
  firstName: string
  lastName: string
  phone: string
  email: string
  photo?: string
  
  // Профессиональные данные
  specialization: SportType[]
  experience: number // лет опыта
  bio?: string
  
  // Финансы
  pricePerHour: number
  groupPrice?: number
  commissionType: 'percent' | 'fixed'
  commissionValue: number
  
  // Расписание
  schedule: WeekSchedule
  worksOnHolidays: boolean
  
  // Ограничения
  maxDailyHours: number
  advanceBookingDays: number
  availableCourts: string[]
  
  // Визуализация
  color: string // Цвет для календаря
  
  // Статус и доступ
  status: 'active' | 'vacation' | 'inactive'
  hasAccount?: boolean // Имеет ли аккаунт для входа в систему
  accountCreatedAt?: any // Когда был создан аккаунт
  
  // Метаданные
  createdAt: any // Timestamp
  updatedAt: any // Timestamp
  
  // Отпуска и блокированные даты
  vacations?: VacationPeriod[]
  blockedDates?: string[] // Массив дат в формате YYYY-MM-DD
  holidays?: string[] // Праздничные дни в формате YYYY-MM-DD
}

export type SportType = 'tennis' | 'padel' | 'badminton'

export interface VacationPeriod {
  id?: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  reason?: string
}

export interface WeekSchedule {
  [key: string]: DaySchedule // monday, tuesday, etc.
}

export interface DaySchedule {
  enabled: boolean
  start?: string // "09:00"
  end?: string // "18:00"
  breaks?: TimeSlot[]
}

export interface TimeSlot {
  start: string
  end: string
}

export interface TrainerBooking {
  trainerId: string
  trainerName: string
  trainerPrice: number
}