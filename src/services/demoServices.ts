// Демо-сервисы для работы с тестовыми данными
import { DEMO_COURTS, DEMO_BOOKINGS, DEMO_CLUB, DEMO_STATS } from '../data/demoData'

// Имитация задержки сети
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const demoCourtService = {
  async getCourts() {
    await delay(300)
    return DEMO_COURTS
  },

  async updateCourt(courtId: string, data: any) {
    await delay(500)
    const court = DEMO_COURTS.find(c => c.id === courtId)
    if (court) {
      Object.assign(court, data)
    }
    return court
  },

  async createCourt(data: any) {
    await delay(500)
    const newCourt = {
      id: `court-${Date.now()}`,
      venueId: 'demo-venue',
      ...data
    }
    DEMO_COURTS.push(newCourt)
    return newCourt
  }
}

export const demoBookingService = {
  async getBookings(filters?: any) {
    await delay(300)
    let bookings = [...DEMO_BOOKINGS]
    
    if (filters?.date) {
      bookings = bookings.filter(b => b.date === filters.date)
    }
    
    if (filters?.courtId) {
      bookings = bookings.filter(b => b.courtId === filters.courtId)
    }
    
    if (filters?.status) {
      bookings = bookings.filter(b => b.status === filters.status)
    }
    
    return bookings
  },

  async createBooking(data: any) {
    await delay(500)
    const newBooking = {
      id: `booking-${Date.now()}`,
      venueId: 'demo-venue',
      createdAt: new Date(),
      status: 'confirmed',
      paymentStatus: 'pending',
      ...data
    }
    DEMO_BOOKINGS.push(newBooking)
    return newBooking
  },

  async updateBooking(bookingId: string, data: any) {
    await delay(500)
    const booking = DEMO_BOOKINGS.find(b => b.id === bookingId)
    if (booking) {
      Object.assign(booking, data)
    }
    return booking
  },

  async cancelBooking(bookingId: string) {
    await delay(500)
    const booking = DEMO_BOOKINGS.find(b => b.id === bookingId)
    if (booking) {
      booking.status = 'cancelled'
    }
    return booking
  }
}

export const demoAnalyticsService = {
  async getStats() {
    await delay(300)
    return DEMO_STATS
  },

  async getRevenueData(period: string) {
    await delay(300)
    // Генерируем данные о доходах
    const data = []
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90
    const today = new Date()
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      
      const dayBookings = DEMO_BOOKINGS.filter(b => 
        b.date === date.toISOString().split('T')[0] && 
        b.status === 'confirmed'
      )
      
      data.push({
        date: date.toISOString().split('T')[0],
        revenue: dayBookings.reduce((sum, b) => sum + b.price, 0),
        bookings: dayBookings.length
      })
    }
    
    return data
  },

  async getPopularTimes() {
    await delay(300)
    // Анализ популярных времен
    const timeSlots = {}
    
    DEMO_BOOKINGS.forEach(booking => {
      const hour = booking.startTime.getHours()
      if (!timeSlots[hour]) {
        timeSlots[hour] = 0
      }
      timeSlots[hour]++
    })
    
    return Object.entries(timeSlots).map(([hour, count]) => ({
      hour: parseInt(hour),
      count: count as number,
      percentage: ((count as number) / DEMO_BOOKINGS.length) * 100
    }))
  }
}

export const demoCustomerService = {
  async getCustomers() {
    await delay(300)
    // Извлекаем уникальных клиентов из бронирований
    const customersMap = new Map()
    
    DEMO_BOOKINGS.forEach(booking => {
      if (!customersMap.has(booking.customerId)) {
        customersMap.set(booking.customerId, {
          id: booking.customerId,
          name: booking.customerName,
          phone: booking.customerPhone,
          email: booking.customerEmail,
          totalBookings: 0,
          totalSpent: 0,
          lastVisit: null,
          firstVisit: booking.createdAt
        })
      }
      
      const customer = customersMap.get(booking.customerId)
      customer.totalBookings++
      if (booking.status === 'confirmed') {
        customer.totalSpent += booking.price
      }
      if (!customer.lastVisit || booking.startTime > customer.lastVisit) {
        customer.lastVisit = booking.startTime
      }
      if (booking.createdAt < customer.firstVisit) {
        customer.firstVisit = booking.createdAt
      }
    })
    
    return Array.from(customersMap.values())
  },

  async getCustomer(customerId: string) {
    await delay(300)
    const customers = await this.getCustomers()
    return customers.find(c => c.id === customerId)
  }
}

export const demoVenueService = {
  async getVenue() {
    await delay(300)
    return DEMO_CLUB
  },

  async updateVenue(data: any) {
    await delay(500)
    Object.assign(DEMO_CLUB, data)
    return DEMO_CLUB
  }
}

// Демо-уведомления
let notificationId = 1
export const demoNotificationService = {
  success(message: string) {
    console.log('Demo notification:', message)
    return notificationId++
  },

  error(message: string) {
    console.error('Demo error:', message)
    return notificationId++
  },

  info(message: string) {
    console.info('Demo info:', message)
    return notificationId++
  }
}