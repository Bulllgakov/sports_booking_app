// Демо-данные для показа функционала админки

export const DEMO_ADMIN = {
  name: 'Демо Администратор',
  email: 'demo@allcourt.ru',
  role: 'admin' as const,
  venueId: 'demo-venue',
  permissions: ['view_bookings', 'manage_courts', 'manage_prices', 'view_analytics']
}

export const DEMO_CLUB = {
  id: 'demo-venue',
  name: 'SmartPadel Demo Club',
  address: 'ул. Профсоюзная, 69, Москва',
  phone: '+7 (495) 123-45-67',
  email: 'info@smartpadel-demo.ru',
  description: 'Современный клуб падела с 8 кортами. Это демо-версия для ознакомления с функционалом системы.',
  logoUrl: '',
  amenities: ['Парковка', 'Душевые', 'Кафе', 'Прокат инвентаря', 'Магазин'],
  organizationType: 'ООО',
  inn: '7712345678',
  bankAccount: '40702810123450000001',
  subscription: {
    plan: 'STANDARD',
    status: 'active',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    usage: {
      courtsCount: 8,
      bookingsThisMonth: 247,
      smsEmailsSent: 512,
      lastUpdated: new Date()
    }
  }
}

export const DEMO_COURTS = [
  {
    id: 'court-1',
    venueId: 'demo-venue',
    name: 'Корт 1 - Центральный',
    type: 'padel',
    surface: 'Искусственная трава',
    indoor: true,
    lighting: true,
    pricePerHour: {
      default: 2500,
      morning: 2000,
      evening: 3000,
      weekend: 3500
    },
    amenities: ['Освещение', 'Кондиционер', 'Трибуны'],
    description: 'Центральный корт с трибунами на 50 мест',
    isActive: true
  },
  {
    id: 'court-2',
    venueId: 'demo-venue',
    name: 'Корт 2',
    type: 'padel',
    surface: 'Искусственная трава',
    indoor: true,
    lighting: true,
    pricePerHour: {
      default: 2000,
      morning: 1500,
      evening: 2500,
      weekend: 3000
    },
    amenities: ['Освещение', 'Кондиционер'],
    isActive: true
  },
  {
    id: 'court-3',
    venueId: 'demo-venue',
    name: 'Корт 3',
    type: 'padel',
    surface: 'Искусственная трава',
    indoor: true,
    lighting: true,
    pricePerHour: {
      default: 2000,
      morning: 1500,
      evening: 2500,
      weekend: 3000
    },
    amenities: ['Освещение', 'Кондиционер'],
    isActive: true
  },
  {
    id: 'court-4',
    venueId: 'demo-venue',
    name: 'Теннисный корт 1',
    type: 'tennis',
    surface: 'Хард',
    indoor: false,
    lighting: true,
    pricePerHour: {
      default: 1500,
      morning: 1000,
      evening: 2000,
      weekend: 2500
    },
    amenities: ['Освещение'],
    isActive: true
  },
  {
    id: 'court-5',
    venueId: 'demo-venue',
    name: 'Бадминтон Зал 1',
    type: 'badminton',
    surface: 'Спортивный паркет',
    indoor: true,
    lighting: true,
    pricePerHour: {
      default: 800,
      morning: 600,
      evening: 1000,
      weekend: 1200
    },
    amenities: ['Кондиционер', 'Раздевалки'],
    description: 'Зал с 4 бадминтонными кортами',
    isActive: true
  }
]

// Генерация случайных бронирований
const generateBookings = () => {
  const bookings = []
  const customers = [
    { id: 'cust-1', name: 'Иван Петров', phone: '+7 (925) 123-45-67', email: 'ivan@example.com' },
    { id: 'cust-2', name: 'Мария Сидорова', phone: '+7 (926) 234-56-78', email: 'maria@example.com' },
    { id: 'cust-3', name: 'Алексей Иванов', phone: '+7 (927) 345-67-89', email: 'alexey@example.com' },
    { id: 'cust-4', name: 'Елена Козлова', phone: '+7 (928) 456-78-90', email: 'elena@example.com' },
    { id: 'cust-5', name: 'Дмитрий Новиков', phone: '+7 (929) 567-89-01', email: 'dmitry@example.com' }
  ]
  
  const statuses = ['confirmed', 'confirmed', 'confirmed', 'pending', 'cancelled']
  const today = new Date()
  
  // Генерируем бронирования на неделю вперед
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today)
    date.setDate(date.getDate() + dayOffset)
    
    // 10-20 бронирований в день
    const bookingsPerDay = Math.floor(Math.random() * 10) + 10
    
    for (let i = 0; i < bookingsPerDay; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)]
      const court = DEMO_COURTS[Math.floor(Math.random() * DEMO_COURTS.length)]
      const hour = Math.floor(Math.random() * 12) + 8 // 8:00 - 20:00
      const duration = Math.random() > 0.7 ? 2 : 1 // 70% - 1 час, 30% - 2 часа
      
      const startTime = new Date(date)
      startTime.setHours(hour, 0, 0, 0)
      
      const endTime = new Date(startTime)
      endTime.setHours(hour + duration)
      
      // Определяем цену в зависимости от времени
      let price = court.pricePerHour.default
      if (hour < 12) price = court.pricePerHour.morning
      else if (hour >= 18) price = court.pricePerHour.evening
      if (date.getDay() === 0 || date.getDay() === 6) price = court.pricePerHour.weekend
      
      bookings.push({
        id: `booking-${date.toISOString().split('T')[0]}-${i}`,
        venueId: 'demo-venue',
        courtId: court.id,
        courtName: court.name,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        date: date.toISOString().split('T')[0],
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        price: price * duration,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        paymentStatus: Math.random() > 0.2 ? 'paid' : 'pending',
        paymentMethod: Math.random() > 0.5 ? 'online' : 'cash',
        notes: Math.random() > 0.8 ? 'Постоянный клиент' : '',
        createdAt: new Date(date.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Создано в течение недели до игры
      })
    }
  }
  
  return bookings.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
}

export const DEMO_BOOKINGS = generateBookings()

// Статистика для дашборда
export const DEMO_STATS = {
  totalBookings: DEMO_BOOKINGS.filter(b => b.status === 'confirmed').length,
  totalRevenue: DEMO_BOOKINGS.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + b.price, 0),
  totalCustomers: new Set(DEMO_BOOKINGS.map(b => b.customerId)).size,
  averageOccupancy: 68,
  monthlyGrowth: 23,
  popularTimes: {
    morning: 45,
    afternoon: 78,
    evening: 92
  },
  courtUtilization: DEMO_COURTS.map(court => ({
    courtId: court.id,
    courtName: court.name,
    utilization: Math.floor(Math.random() * 30) + 60 // 60-90%
  }))
}

// Демо-уведомление
export const DEMO_NOTIFICATION = {
  show: true,
  message: '🎾 Это демо-версия системы. Все данные являются тестовыми. Для полного доступа зарегистрируйтесь.',
  type: 'info'
}