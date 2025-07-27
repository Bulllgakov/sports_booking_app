// Email валидация
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Телефон валидация (российский формат)
export function isValidPhone(phone: string): boolean {
  // Удаляем все нецифровые символы
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Проверяем российский формат (11 цифр, начинается с 7 или 8)
  return cleanPhone.length === 11 && (cleanPhone.startsWith('7') || cleanPhone.startsWith('8'))
}

// Нормализация телефона к формату +7XXXXXXXXXX
export function normalizePhone(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '')
  
  if (cleanPhone.length === 11) {
    if (cleanPhone.startsWith('8')) {
      return '+7' + cleanPhone.substring(1)
    }
    if (cleanPhone.startsWith('7')) {
      return '+' + cleanPhone
    }
  }
  
  if (cleanPhone.length === 10) {
    return '+7' + cleanPhone
  }
  
  return phone
}

// Валидация пароля
export function isValidPassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Пароль должен содержать минимум 8 символов')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Пароль должен содержать хотя бы одну заглавную букву')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Пароль должен содержать хотя бы одну строчную букву')
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Пароль должен содержать хотя бы одну цифру')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Валидация имени
export function isValidName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 100
}

// Валидация названия клуба
export function isValidClubName(name: string): boolean {
  return name.trim().length >= 3 && name.trim().length <= 200
}

// Валидация адреса
export function isValidAddress(address: string): boolean {
  return address.trim().length >= 10 && address.trim().length <= 500
}

// Валидация цены
export function isValidPrice(price: number): boolean {
  return price >= 0 && price <= 1000000
}

// Валидация времени работы
export function isValidWorkingHours(openTime: string, closeTime: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  
  if (!timeRegex.test(openTime) || !timeRegex.test(closeTime)) {
    return false
  }
  
  const [openHour, openMinute] = openTime.split(':').map(Number)
  const [closeHour, closeMinute] = closeTime.split(':').map(Number)
  
  const openMinutes = openHour * 60 + openMinute
  const closeMinutes = closeHour * 60 + closeMinute
  
  return openMinutes < closeMinutes
}

// Валидация ИНН
export function isValidINN(inn: string): boolean {
  const cleanINN = inn.replace(/\D/g, '')
  
  // Проверка длины (10 для юр.лиц, 12 для ИП)
  if (cleanINN.length !== 10 && cleanINN.length !== 12) {
    return false
  }
  
  // Простая проверка контрольной суммы для 10-значного ИНН
  if (cleanINN.length === 10) {
    const checkDigit = Number(cleanINN[9])
    const coefficients = [2, 4, 10, 3, 5, 9, 4, 6, 8]
    
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += Number(cleanINN[i]) * coefficients[i]
    }
    
    const calculatedCheck = (sum % 11) % 10
    return checkDigit === calculatedCheck
  }
  
  return true // Для 12-значного ИНН упрощенная проверка
}

// Валидация координат
export function isValidCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

// Валидация URL
export function isValidURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Валидация даты бронирования (не в прошлом)
export function isValidBookingDate(date: Date): boolean {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const bookingDate = new Date(date)
  bookingDate.setHours(0, 0, 0, 0)
  
  return bookingDate >= now
}

// Валидация времени бронирования
export function isValidBookingTime(startTime: string, endTime: string, duration: number = 60): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return false
  }
  
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)
  
  const startMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute
  
  // Проверка что время окончания больше времени начала
  if (endMinutes <= startMinutes) {
    return false
  }
  
  // Проверка минимальной продолжительности
  return (endMinutes - startMinutes) >= duration
}

// Санитизация строк (удаление опасных символов)
export function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, '') // Удаляем HTML теги
    .replace(/javascript:/gi, '') // Удаляем javascript: протокол
    .trim()
}

// Валидация формы создания клуба
export interface ClubFormData {
  name: string
  email: string
  phone: string
  address: string
  openTime: string
  closeTime: string
  inn?: string
  adminName: string
  adminEmail: string
  password: string
}

export function validateClubForm(data: ClubFormData): {
  isValid: boolean
  errors: Record<string, string>
} {
  const errors: Record<string, string> = {}
  
  // Валидация клуба
  if (!isValidClubName(data.name)) {
    errors.name = 'Название должно быть от 3 до 200 символов'
  }
  
  if (!isValidEmail(data.email)) {
    errors.email = 'Некорректный email'
  }
  
  if (!isValidPhone(data.phone)) {
    errors.phone = 'Некорректный номер телефона'
  }
  
  if (!isValidAddress(data.address)) {
    errors.address = 'Адрес должен быть от 10 до 500 символов'
  }
  
  if (!isValidWorkingHours(data.openTime, data.closeTime)) {
    errors.workingHours = 'Некорректное время работы'
  }
  
  if (data.inn && !isValidINN(data.inn)) {
    errors.inn = 'Некорректный ИНН'
  }
  
  // Валидация администратора
  if (!isValidName(data.adminName)) {
    errors.adminName = 'Имя должно быть от 2 до 100 символов'
  }
  
  if (!isValidEmail(data.adminEmail)) {
    errors.adminEmail = 'Некорректный email администратора'
  }
  
  const passwordValidation = isValidPassword(data.password)
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.errors.join('. ')
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}