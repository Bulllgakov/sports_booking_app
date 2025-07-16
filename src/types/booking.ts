export interface Booking {
  id: string
  sport: string
  date: string
  time: string
  duration: string
  customerName: string
  customerPhone: string
  status: 'pending' | 'confirmed' | 'cancelled'
  createdAt: Date
}