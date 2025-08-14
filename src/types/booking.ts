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
  paymentStatus: 'awaiting_payment' | 'paid' | 'online_payment' | 'cancelled'
  paymentMethod?: 'cash' | 'card_on_site' | 'transfer' | 'online' | 'sberbank_card' | 'tbank_card' | 'vtb_card'
  paymentHistory?: PaymentHistory[]
  createdBy?: {
    userId: string
    userName: string
    userRole?: string
  }
  createdAt: Date
}