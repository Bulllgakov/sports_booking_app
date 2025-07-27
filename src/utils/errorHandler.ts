import { FirebaseError } from 'firebase/app'

// Типы ошибок
export enum ErrorType {
  AUTH = 'AUTH',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  PERMISSION = 'PERMISSION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

// Интерфейс для структурированной ошибки
export interface AppError {
  type: ErrorType
  message: string
  originalError?: any
  code?: string
  details?: Record<string, any>
}

// Маппинг кодов ошибок Firebase на понятные сообщения
const firebaseErrorMessages: Record<string, string> = {
  // Auth errors
  'auth/email-already-in-use': 'Этот email уже используется',
  'auth/invalid-email': 'Некорректный email адрес',
  'auth/weak-password': 'Пароль слишком слабый. Минимум 6 символов',
  'auth/user-not-found': 'Пользователь не найден',
  'auth/wrong-password': 'Неверный пароль',
  'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже',
  'auth/user-disabled': 'Аккаунт заблокирован',
  'auth/expired-action-code': 'Ссылка устарела',
  'auth/invalid-action-code': 'Недействительная ссылка',
  'auth/network-request-failed': 'Ошибка сети. Проверьте интернет-соединение',
  
  // Firestore errors
  'permission-denied': 'У вас нет прав для выполнения этого действия',
  'not-found': 'Запрашиваемые данные не найдены',
  'already-exists': 'Такая запись уже существует',
  'resource-exhausted': 'Превышен лимит запросов',
  'failed-precondition': 'Операция не может быть выполнена в текущем состоянии',
  'aborted': 'Операция была прервана',
  'out-of-range': 'Значение вне допустимого диапазона',
  'unimplemented': 'Функция не реализована',
  'internal': 'Внутренняя ошибка сервера',
  'unavailable': 'Сервис временно недоступен',
  'data-loss': 'Данные повреждены или утеряны',
  'unauthenticated': 'Требуется авторизация',
  
  // Custom errors
  'booking/slot-occupied': 'Это время уже занято',
  'booking/invalid-date': 'Некорректная дата бронирования',
  'booking/past-date': 'Нельзя забронировать на прошедшую дату',
  'payment/card-declined': 'Карта отклонена банком',
  'payment/insufficient-funds': 'Недостаточно средств на карте',
  'payment/processing-error': 'Ошибка обработки платежа',
}

/**
 * Обработчик ошибок - преобразует любую ошибку в структурированный формат
 */
export function handleError(error: any): AppError {
  console.error('Error caught:', error)
  
  // Firebase Auth Error
  if (error.code && error.code.startsWith('auth/')) {
    return {
      type: ErrorType.AUTH,
      code: error.code,
      message: firebaseErrorMessages[error.code] || error.message || 'Ошибка авторизации',
      originalError: error
    }
  }
  
  // Firestore Error
  if (error instanceof FirebaseError || error.code) {
    const message = firebaseErrorMessages[error.code] || error.message || 'Ошибка базы данных'
    
    let type = ErrorType.SERVER
    if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
      type = ErrorType.PERMISSION
    } else if (error.code === 'not-found') {
      type = ErrorType.NOT_FOUND
    } else if (error.code === 'unavailable' || error.code?.includes('network')) {
      type = ErrorType.NETWORK
    }
    
    return {
      type,
      code: error.code,
      message,
      originalError: error
    }
  }
  
  // Network Error
  if (error.message?.toLowerCase().includes('network') || 
      error.message?.toLowerCase().includes('fetch')) {
    return {
      type: ErrorType.NETWORK,
      message: 'Ошибка сети. Проверьте интернет-соединение',
      originalError: error
    }
  }
  
  // Validation Error
  if (error.type === 'validation' || error.validationErrors) {
    return {
      type: ErrorType.VALIDATION,
      message: error.message || 'Ошибка валидации данных',
      details: error.validationErrors,
      originalError: error
    }
  }
  
  // Default error
  return {
    type: ErrorType.UNKNOWN,
    message: error.message || 'Произошла неизвестная ошибка',
    originalError: error
  }
}

/**
 * Хук для отображения ошибки пользователю
 */
export function getErrorMessage(error: AppError | any): string {
  if (typeof error === 'string') {
    return error
  }
  
  if (error.message) {
    return error.message
  }
  
  return 'Произошла ошибка. Попробуйте еще раз'
}

/**
 * Логирование ошибки для отладки
 */
export function logError(error: AppError | any, context?: Record<string, any>): void {
  const timestamp = new Date().toISOString()
  
  console.group(`🚨 Error at ${timestamp}`)
  
  if (error.type) {
    console.error('Type:', error.type)
  }
  
  if (error.code) {
    console.error('Code:', error.code)
  }
  
  console.error('Message:', error.message || 'Unknown error')
  
  if (context) {
    console.error('Context:', context)
  }
  
  if (error.originalError) {
    console.error('Original error:', error.originalError)
  }
  
  if (error.details) {
    console.error('Details:', error.details)
  }
  
  console.trace('Stack trace')
  console.groupEnd()
}

/**
 * Проверка, является ли ошибка критической
 */
export function isCriticalError(error: AppError): boolean {
  return [
    ErrorType.SERVER,
    ErrorType.PERMISSION,
    ErrorType.AUTH
  ].includes(error.type)
}

/**
 * Создание кастомной ошибки
 */
export function createError(
  type: ErrorType, 
  message: string, 
  code?: string,
  details?: Record<string, any>
): AppError {
  return {
    type,
    message,
    code,
    details
  }
}

/**
 * Безопасное выполнение асинхронной функции с обработкой ошибок
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<{ data?: T; error?: AppError }> {
  try {
    const data = await fn()
    return { data }
  } catch (error) {
    const appError = handleError(error)
    logError(appError, context)
    return { error: appError }
  }
}

/**
 * HOC для компонентов с обработкой ошибок
 */
export function withErrorHandler<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: AppError }>
): React.ComponentType<P> {
  return class WithErrorHandler extends React.Component<P, { error?: AppError }> {
    constructor(props: P) {
      super(props)
      this.state = { error: undefined }
    }
    
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      const appError = handleError(error)
      logError(appError, { errorInfo })
      this.setState({ error: appError })
    }
    
    render() {
      if (this.state.error && fallback) {
        const FallbackComponent = fallback
        return <FallbackComponent error={this.state.error} />
      }
      
      return <Component {...this.props} />
    }
  }
}