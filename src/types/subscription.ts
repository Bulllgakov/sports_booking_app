export type SubscriptionPlan = 'start' | 'standard' | 'pro'

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

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan | 'premium', {
  name: string
  price: number
  pricePerCourt?: number
  limits: SubscriptionLimits
  features: string[]
}> = {
  start: {
    name: 'СТАРТ',
    price: 0,
    pricePerCourt: 0,
    limits: {
      maxCourts: 2,
      maxBookingsPerMonth: -1, // unlimited
      smsEmailNotifications: -1, // unlimited email, SMS paid separately
      customDesign: false,
      apiAccess: false,
      multiVenue: false,
      searchPriority: 0,
      abTesting: false,
      trainersModule: true, // включены тренеры
      personalManager: false
    },
    features: [
      'До 2 кортов бесплатно',
      'Неограниченные бронирования',
      'Email-уведомления без ограничений',
      'SMS-уведомления от 6₽ за сообщение',
      'Управление расписанием',
      'Онлайн-оплата (свой эквайринг)',
      'Белый лейбл (логотип клуба)',
      'Push-уведомления в приложении',
      'Мобильное приложение для клиентов',
      'Финансовая отчетность',
      'QR-коды для бронирований',
      'Аккаунты для тренеров с расписанием',
      'Персональный менеджер на 3 месяца'
    ]
  },
  standard: {
    name: 'СТАНДАРТ',
    price: 990,
    pricePerCourt: 990,
    limits: {
      maxCourts: -1, // unlimited
      maxBookingsPerMonth: -1, // unlimited
      smsEmailNotifications: 500, // total per club
      customDesign: false,
      apiAccess: false,
      multiVenue: false,
      searchPriority: 10,
      abTesting: false,
      trainersModule: true,
      personalManager: false
    },
    features: [
      '990₽ за корт в месяц',
      'От 1 корта (без ограничений)',
      '🎁 Первые 3 месяца бесплатно',
      'Неограниченные бронирования',
      'SMS/Email уведомления (500 шт/месяц на клуб)',
      'Расширенная аналитика и отчеты',
      'Управление ценами и скидками',
      'Маркетинг - промокоды, акции и рассылки',
      'CRM система для работы с клиентской базой',
      'Экспорт данных в Excel и PDF',
      'Приоритет в поиске (+10%)'
    ]
  },
  pro: {
    name: 'ПРОФИ',
    price: 1990,
    pricePerCourt: 1990,
    limits: {
      maxCourts: -1, // unlimited
      maxBookingsPerMonth: -1,
      smsEmailNotifications: -1, // unlimited for club
      customDesign: true,
      apiAccess: true,
      multiVenue: true,
      searchPriority: 30,
      abTesting: false, // убрали A/B тестирование
      trainersModule: true,
      personalManager: true
    },
    features: [
      '1,990₽ за корт в месяц',
      'От 1 корта (без ограничений)',
      'SMS/Email уведомления без ограничений',
      'Белый лейбл PRO (кастомизация дизайна приложения)',
      'API доступ для интеграций',
      'Мультиплощадки (управление сетью)',
      'Приоритет в поиске (+30%)',
      'Модуль абонементов и пакетов',
      'Модуль тренеров и расписания',
      'Персональный менеджер навсегда'
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

// Тарификация SMS
export const SMS_PRICE = 6 // рублей за SMS

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