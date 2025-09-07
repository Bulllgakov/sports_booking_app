export interface PaymentHistory {
  timestamp: Date
  action: 'created' | 'paid' | 'cancelled'
  userId: string
  userName?: string
  note?: string
}

export interface Booking {
  id: string
  sport: string
  date: string
  time: string
  duration: string
  customerName: string
  customerPhone: string
  status: 'pending' | 'confirmed' | 'cancelled'
  paymentStatus: 'awaiting_payment' | 'paid' | 'cancelled' | 'refunded' | 'error' | 'expired'
  paymentMethod?: 'cash' | 'card_on_site' | 'transfer' | 'online' | 'sberbank_card' | 'tbank_card' | 'vtb_card'
  paymentHistory?: PaymentHistory[]
  createdBy?: {
    userId: string
    userName: string
    userRole?: string
  }
  createdAt: Date
  
  // Поля для тренера
  trainerId?: string
  trainerName?: string
  trainerPrice?: number
  trainerCommission?: number
  totalAmount?: number // courtPrice + trainerPrice
  
  // Поля для групповых тренировок
  bookingType?: 'individual' | 'group'
  maxParticipants?: number
  currentParticipants?: number
  visibility?: 'public' | 'private'
  groupRegistrationUrl?: string
}

export interface GroupParticipant {
  id: string
  groupTrainingId: string
  name: string
  phone: string
  email?: string
  paymentStatus: 'pending' | 'paid' | 'cancelled' | 'refunded'
  paymentId?: string
  paymentAmount: number
  registeredAt: Date
}