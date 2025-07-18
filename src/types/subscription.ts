export type SubscriptionPlan = 'start' | 'standard' | 'pro' | 'premium'

export interface SubscriptionLimits {
  maxCourts: number
  maxBookingsPerMonth: number
  smsEmailNotifications: number
  customDesign: boolean
  apiAccess: boolean
  multiVenue: boolean
  searchPriority: number
  abTesting: boolean
  trainersModule: boolean
  personalManager: boolean
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, {
  name: string
  price: number
  limits: SubscriptionLimits
  features: string[]
}> = {
  start: {
    name: 'СТАРТ',
    price: 0,
    limits: {
      maxCourts: 6,
      maxBookingsPerMonth: 100,
      smsEmailNotifications: 0,
      customDesign: false,
      apiAccess: false,
      multiVenue: false,
      searchPriority: 0,
      abTesting: false,
      trainersModule: false,
      personalManager: false
    },
    features: [
      'До 6 кортов',
      'До 100 бронирований в месяц',
      'Управление расписанием',
      'Онлайн-оплата (свой эквайринг)',
      'Белый лейбл (логотип клуба)',
      'Push-уведомления в приложении',
      'Мобильное приложение для клиентов',
      'Базовая отчетность',
      'QR-коды для бронирований'
    ]
  },
  standard: {
    name: 'СТАНДАРТ',
    price: 2990,
    limits: {
      maxCourts: 20,
      maxBookingsPerMonth: -1, // unlimited
      smsEmailNotifications: 1000,
      customDesign: false,
      apiAccess: false,
      multiVenue: false,
      searchPriority: 10,
      abTesting: false,
      trainersModule: false,
      personalManager: false
    },
    features: [
      'До 20 кортов',
      'Неограниченные бронирования',
      'SMS/Email уведомления (1,000 шт/месяц)',
      'Расширенная аналитика и отчеты',
      'Управление ценами и скидками',
      'Промокоды и акции',
      'Интеграция с календарями',
      'Экспорт данных в Excel',
      'Приоритет в поиске (+10%)'
    ]
  },
  pro: {
    name: 'ПРОФИ',
    price: 5990,
    limits: {
      maxCourts: -1, // unlimited
      maxBookingsPerMonth: -1,
      smsEmailNotifications: -1,
      customDesign: true,
      apiAccess: true,
      multiVenue: true,
      searchPriority: 30,
      abTesting: true,
      trainersModule: true,
      personalManager: true
    },
    features: [
      'Неограниченное количество кортов',
      'SMS/Email без ограничений',
      'Белый лейбл PRO (кастомизация дизайна)',
      'API доступ для интеграций',
      'Мультиплощадки (управление сетью)',
      'Топ в поиске (+30% видимости)',
      'A/B тестирование цен',
      'Модуль абонементов и пакетов',
      'Модуль тренеров и расписания',
      'Персональный менеджер'
    ]
  },
  premium: {
    name: 'ПРЕМИУМ',
    price: -1, // по запросу
    limits: {
      maxCourts: -1,
      maxBookingsPerMonth: -1,
      smsEmailNotifications: -1,
      customDesign: true,
      apiAccess: true,
      multiVenue: true,
      searchPriority: 50,
      abTesting: true,
      trainersModule: true,
      personalManager: true
    },
    features: [
      'Все функции ПРОФИ',
      'Т-Банк Мультирасчеты',
      'Кастомные интеграции',
      'Выделенный сервер',
      'SLA гарантии',
      'Приоритетная разработка функций',
      'Выделенный менеджер 24/7'
    ]
  }
}

export interface ClubSubscription {
  id: string
  venueId: string
  plan: SubscriptionPlan
  status: 'active' | 'inactive' | 'trial' | 'expired'
  startDate: Date
  endDate?: Date
  trialEndDate?: Date
  usage: {
    courtsCount: number
    bookingsThisMonth: number
    smsEmailsSent: number
    lastUpdated: Date
  }
  paymentMethod?: {
    type: 'card' | 'invoice'
    last4?: string
  }
  nextBillingDate?: Date
  cancelledAt?: Date
}