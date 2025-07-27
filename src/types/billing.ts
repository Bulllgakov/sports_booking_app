export interface PaymentMethod {
  id: string
  venueId: string
  type: 'card'
  last4: string
  brand: string
  expiryMonth: number
  expiryYear: number
  rebillId: string // ID для рекуррентных платежей в Т-Банк
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Invoice {
  id: string
  venueId: string
  subscriptionId: string
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded'
  description: string
  period: {
    start: Date
    end: Date
  }
  paymentMethodId?: string
  paymentId?: string // ID платежа в Т-Банк
  paidAt?: Date
  failedAt?: Date
  failureReason?: string
  attempts: number
  nextAttemptAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface BillingSettings {
  tbank: {
    terminalKey: string
    password: string
    notificationUrl: string
    testMode: boolean
  }
  autoRenewal: boolean
  gracePeriodDays: number
  retryAttempts: number
  retryIntervalHours: number
  createdAt: Date
  updatedAt: Date
}

export interface PaymentWebhook {
  id: string
  source: 'tbank'
  type: string
  status: 'pending' | 'processed' | 'failed'
  payload: any
  processedAt?: Date
  error?: string
  createdAt: Date
}

// Типы для API Т-Банк
export interface TBankInitRequest {
  Amount: number
  OrderId: string
  Description?: string
  CustomerKey?: string
  Recurrent?: 'Y' | 'N'
  PayType?: 'O' | 'T'
  SuccessURL?: string
  FailURL?: string
  NotificationURL?: string
  DATA?: Record<string, string>
}

export interface TBankInitResponse {
  Success: boolean
  ErrorCode: string
  TerminalKey?: string
  Status?: string
  PaymentId?: string
  OrderId?: string
  Amount?: number
  PaymentURL?: string
  Message?: string
  Details?: string
}

export interface TBankChargeRequest {
  PaymentId: string
  RebillId: string
  Amount?: number
  OrderId?: string
  Description?: string
  DATA?: Record<string, string>
}

export interface TBankChargeResponse {
  Success: boolean
  ErrorCode: string
  TerminalKey?: string
  Status?: string
  PaymentId?: string
  OrderId?: string
  Amount?: number
  Message?: string
  Details?: string
}

export interface TBankNotification {
  TerminalKey: string
  OrderId: string
  Success: boolean
  Status: string
  PaymentId: number
  ErrorCode: string
  Amount: number
  RebillId?: string
  CardId?: string
  Pan?: string
  ExpDate?: string
  Token: string
}