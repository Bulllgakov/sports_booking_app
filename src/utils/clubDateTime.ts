import { Timestamp } from 'firebase/firestore'

/**
 * Утилиты для работы с датами в контексте часового пояса клуба
 * Решает проблему смещения дат при разных часовых поясах компьютера
 */

/**
 * Преобразует строку даты в Date объект с учетом часового пояса клуба
 * Дата всегда интерпретируется как полночь в часовом поясе клуба
 * 
 * @param dateString - дата в формате 'yyyy-MM-dd'  
 * @param clubTimezone - часовой пояс клуба (например, 'Europe/Moscow')
 * @returns Date объект
 */
export function stringToDateInClubTZ(dateString: string, clubTimezone?: string): Date {
  // Если часовой пояс не указан, используем UTC для консистентности
  if (!clubTimezone) {
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  }
  
  // Создаем дату в указанном часовом поясе
  // Используем Intl.DateTimeFormat для получения компонентов даты в нужном часовом поясе
  const tempDate = new Date(dateString + 'T00:00:00')
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: clubTimezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  })
  
  const parts = formatter.formatToParts(tempDate)
  const dateComponents: any = {}
  parts.forEach(part => {
    if (part.type !== 'literal') {
      dateComponents[part.type] = parseInt(part.value)
    }
  })
  
  // Создаем UTC дату с компонентами из часового пояса клуба
  return new Date(Date.UTC(
    dateComponents.year,
    dateComponents.month - 1,
    dateComponents.day,
    0, 0, 0
  ))
}

/**
 * Безопасное преобразование различных форматов даты в Date с учетом часового пояса клуба
 * @param dateValue - может быть Timestamp, Date, string или number
 * @param clubTimezone - часовой пояс клуба
 * @returns Date объект
 */
export function normalizeDateInClubTZ(dateValue: any, clubTimezone?: string): Date {
  if (!dateValue) {
    return new Date()
  }
  
  // Firestore Timestamp с методом toDate
  if (dateValue?.toDate && typeof dateValue.toDate === 'function') {
    const utcDate = dateValue.toDate()
    
    // Для старых бронирований, которые были созданы с локальным временем,
    // нам нужно корректно интерпретировать дату
    // Проверяем час в UTC - если это близко к полуночи, значит дата правильная
    const utcHours = utcDate.getUTCHours()
    
    // Если время в UTC между 19:00 и 23:59, это означает что бронирование было создано
    // в часовом поясе восточнее UTC (например, в России) и дата должна быть следующей
    if (utcHours >= 19 && utcHours <= 23) {
      // Добавляем день к UTC дате, так как это было полночь следующего дня в локальном времени
      const adjustedDate = new Date(utcDate)
      adjustedDate.setUTCDate(adjustedDate.getUTCDate() + 1)
      
      const year = adjustedDate.getUTCFullYear()
      const month = String(adjustedDate.getUTCMonth() + 1).padStart(2, '0')
      const day = String(adjustedDate.getUTCDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${day}`
      
      return stringToDateInClubTZ(dateString, clubTimezone)
    }
    
    // Для остальных случаев используем дату как есть
    const year = utcDate.getUTCFullYear()
    const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0')
    const day = String(utcDate.getUTCDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    
    return stringToDateInClubTZ(dateString, clubTimezone)
  }
  
  // Firestore Timestamp объект с полем seconds
  if (dateValue?.seconds && typeof dateValue.seconds === 'number') {
    const utcDate = new Date(dateValue.seconds * 1000)
    const utcHours = utcDate.getUTCHours()
    
    // Аналогичная логика для Timestamp объектов
    if (utcHours >= 19 && utcHours <= 23) {
      const adjustedDate = new Date(utcDate)
      adjustedDate.setUTCDate(adjustedDate.getUTCDate() + 1)
      
      const year = adjustedDate.getUTCFullYear()
      const month = String(adjustedDate.getUTCMonth() + 1).padStart(2, '0')
      const day = String(adjustedDate.getUTCDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${day}`
      
      return stringToDateInClubTZ(dateString, clubTimezone)
    }
    
    const year = utcDate.getUTCFullYear()
    const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0')
    const day = String(utcDate.getUTCDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    
    return stringToDateInClubTZ(dateString, clubTimezone)
  }
  
  // Уже Date объект
  if (dateValue instanceof Date) {
    return dateValue
  }
  
  // Строка даты
  if (typeof dateValue === 'string') {
    // Если формат 'yyyy-MM-dd' - используем безопасное преобразование
    if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return stringToDateInClubTZ(dateValue, clubTimezone)
    }
    // Для других форматов пробуем обычный парсинг
    return new Date(dateValue)
  }
  
  // Числовой timestamp
  if (typeof dateValue === 'number') {
    return new Date(dateValue)
  }
  
  // По умолчанию
  return new Date()
}

/**
 * Преобразует Date в строку формата 'yyyy-MM-dd' с учетом часового пояса клуба
 * @param date - объект Date
 * @param clubTimezone - часовой пояс клуба
 * @returns строка даты
 */
export function dateToStringInClubTZ(date: Date, clubTimezone?: string): string {
  if (!clubTimezone) {
    // Используем UTC для консистентности
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // Форматируем дату в часовом поясе клуба
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: clubTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  
  return formatter.format(date)
}

/**
 * Проверяет, является ли дата сегодняшней в часовом поясе клуба
 * @param date - проверяемая дата
 * @param clubTimezone - часовой пояс клуба
 * @returns true если дата - сегодня в часовом поясе клуба
 */
export function isTodayInClubTZ(date: Date, clubTimezone?: string): boolean {
  const today = new Date()
  const todayStr = dateToStringInClubTZ(today, clubTimezone)
  const dateStr = dateToStringInClubTZ(date, clubTimezone)
  return todayStr === dateStr
}

/**
 * Создает Date для начала недели с учетом часового пояса клуба
 * @param date - дата в неделе
 * @param clubTimezone - часовой пояс клуба
 * @returns Date объект начала недели (понедельник 00:00)
 */
export function getWeekStartInClubTZ(date: Date, clubTimezone?: string): Date {
  const dateStr = dateToStringInClubTZ(date, clubTimezone)
  const weekDate = stringToDateInClubTZ(dateStr, clubTimezone)
  
  // Получаем день недели (0 = воскресенье, 1 = понедельник, ...)
  let dayOfWeek = weekDate.getUTCDay()
  // Преобразуем в понедельник = 0, воскресенье = 6
  dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  
  // Вычитаем дни чтобы получить понедельник
  weekDate.setUTCDate(weekDate.getUTCDate() - dayOfWeek)
  
  return weekDate
}

/**
 * Создает Date для конца недели с учетом часового пояса клуба
 * @param date - дата в неделе
 * @param clubTimezone - часовой пояс клуба
 * @returns Date объект конца недели (воскресенье 23:59:59)
 */
export function getWeekEndInClubTZ(date: Date, clubTimezone?: string): Date {
  const weekStart = getWeekStartInClubTZ(date, clubTimezone)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
  weekEnd.setUTCHours(23, 59, 59, 999)
  return weekEnd
}