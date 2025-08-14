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
  minBreakMinutes: number
  advanceBookingDays: number
  cancellationHours: number
  availableCourts: string[]
  
  // Визуализация
  color: string // Цвет для календаря
  
  // Статус и доступ
  status: 'active' | 'vacation' | 'inactive'
  hasAccess: boolean
  canEditProfile: boolean
  canViewClients: boolean
  
  // Метаданные
  createdAt: any // Timestamp
  updatedAt: any // Timestamp
}

export type SportType = 'tennis' | 'padel' | 'badminton'

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