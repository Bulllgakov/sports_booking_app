export type SubscriptionPlan = 'basic' | 'crm' | 'pro'

export interface SubscriptionLimits {
  maxClients: number // Лимит на количество клиентов в базе
  maxBookingsPerMonth: number
  smsEmailNotifications: number
  customDesign: boolean
  apiAccess: boolean
  multiVenue: boolean
  searchPriority: number
  abTesting: boolean
  trainersModule: boolean
  personalManager: boolean
  crmAccess: boolean // Доступ к CRM функционалу
  advancedAnalytics: boolean // Расширенная аналитика
  marketingTools: boolean // Маркетинговые инструменты
  salaryCalculation: boolean // Расчет зарплат и премий
  subscriptionsModule: boolean // Модуль абонементов и пакетов
  financialModule: boolean // Модуль финансового учета
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan | 'premium', {
  name: string
  price: number
  pricePerCourt?: number
  limits: SubscriptionLimits
  features: string[]
  additionalFees?: {
    smsPrice?: number
    acquiringCommission?: number
  }
}> = {
  basic: {
    name: 'БАЗОВЫЙ',
    price: 0,
    pricePerCourt: 0,
    limits: {
      maxClients: 1000, // Лимит 1000 клиентов
      maxBookingsPerMonth: -1, // unlimited
      smsEmailNotifications: 0, // SMS оплачиваются отдельно
      customDesign: false,
      apiAccess: false,
      multiVenue: false,
      searchPriority: 0,
      abTesting: false,
      trainersModule: true, // включены тренеры
      personalManager: false,
      crmAccess: false,
      advancedAnalytics: false,
      marketingTools: false,
      salaryCalculation: false,
      subscriptionsModule: false,
      financialModule: false
    },
    features: [
      'Корты без ограничений',
      'Неограниченные бронирования',
      'До 1000 клиентов в базе',
      'Email-уведомления без ограничений',
      'Управление расписанием',
      'Онлайн-оплата (эквайринг)',
      'Онлайн касса встроенная',
      'Белый лейбл (логотип клуба)',
      'Push-уведомления в приложении',
      'Мобильное приложение для клиентов',
      'Финансовая отчетность',
      'QR-коды для бронирований',
      'Аккаунты для тренеров с расписанием',
      'Персональный менеджер на 3 месяца'
    ],
    additionalFees: {
      smsPrice: 6, // 6 руб за SMS
      acquiringCommission: 3.5 // 3.5% комиссия эквайринга и онлайн кассы
    }
  },
  crm: {
    name: 'CRM',
    price: 990,
    pricePerCourt: 990,
    limits: {
      maxClients: -1, // unlimited
      maxBookingsPerMonth: -1, // unlimited
      smsEmailNotifications: 0, // SMS оплачиваются отдельно
      customDesign: false,
      apiAccess: false,
      multiVenue: false,
      searchPriority: 10,
      abTesting: false,
      trainersModule: true,
      personalManager: false,
      crmAccess: true,
      advancedAnalytics: true,
      marketingTools: true,
      salaryCalculation: true,
      subscriptionsModule: false,
      financialModule: false
    },
    features: [
      '990₽ за корт в месяц',
      'Корты без ограничений',
      'Неограниченные бронирования',
      'Количество клиентов без ограничений',
      'Email-уведомления без ограничений',
      'CRM система для работы с клиентской базой',
      'Расширенная аналитика и отчеты',
      'Управление ценами и скидками',
      'Маркетинг - промокоды, акции и рассылки',
      'Экспорт данных в Excel и PDF',
      'Расчет зарплат и премий',
      'Все функции тарифа БАЗОВЫЙ'
    ],
    additionalFees: {
      smsPrice: 6, // 6 руб за SMS
      acquiringCommission: 3.5 // 3.5% комиссия
    }
  },
  pro: {
    name: 'ПРОФИ',
    price: 1990,
    pricePerCourt: 1990,
    limits: {
      maxClients: -1, // unlimited
      maxBookingsPerMonth: -1,
      smsEmailNotifications: -1, // unlimited SMS включены
      customDesign: true,
      apiAccess: true,
      multiVenue: true,
      searchPriority: 30,
      abTesting: false,
      trainersModule: true,
      personalManager: true,
      crmAccess: true,
      advancedAnalytics: true,
      marketingTools: true,
      salaryCalculation: true,
      subscriptionsModule: true,
      financialModule: true
    },
    features: [
      '1,990₽ за корт в месяц',
      'Корты без ограничений',
      'SMS/Email уведомления без ограничений',
      'Белый лейбл PRO (кастомизация дизайна приложения)',
      'API доступ для интеграций',
      'Мультиплощадки (управление сетью)',
      'Модуль абонементов и пакетов',
      'Модуль тренеров и расписания',
      'Модуль финансового учета',
      'Персональный менеджер навсегда',
      'Все функции тарифа CRM'
    ]
  },
  premium: {
    name: 'ПРЕМИУМ',
    price: -1, // по запросу
    limits: {
      maxClients: -1,
      maxBookingsPerMonth: -1,
      smsEmailNotifications: -1,
      customDesign: true,
      apiAccess: true,
      multiVenue: true,
      searchPriority: 50,
      abTesting: true,
      trainersModule: true,
      personalManager: true,
      crmAccess: true,
      advancedAnalytics: true,
      marketingTools: true,
      salaryCalculation: true,
      subscriptionsModule: true,
      financialModule: true
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

// Маппинг старых названий тарифов на новые
export const PLAN_MAPPING: Record<string, SubscriptionPlan> = {
  'start': 'basic',
  'standard': 'crm',
  'pro': 'pro',
  'basic': 'basic',
  'crm': 'crm'
}

export interface ClubSubscription {
  id: string
  venueId: string
  plan: SubscriptionPlan | 'start' | 'standard' // Поддержка старых названий
  status: 'active' | 'inactive' | 'trial' | 'expired'
  startDate: Date
  endDate?: Date
  trialEndDate?: Date
  usage: {
    courtsCount: number
    bookingsThisMonth: number
    smsEmailsSent: number
    clientsCount?: number // Новое поле для количества клиентов
    lastUpdated: Date
  }
  paymentMethod?: {
    type: 'card' | 'invoice'
    last4?: string
  }
  nextBillingDate?: Date
  cancelledAt?: Date
}