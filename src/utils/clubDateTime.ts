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
    // Firestore Timestamp уже хранит точную дату в UTC
    // Просто возвращаем его как есть
    return dateValue.toDate()
  }
  
  // Firestore Timestamp объект с полем seconds
  if (dateValue?.seconds && typeof dateValue.seconds === 'number') {
    // Создаем Date из seconds (это уже UTC timestamp)
    return new Date(dateValue.seconds * 1000)
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
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
 * @returns Date объект начала недели (понедельник 00:00 UTC)
 */
export function getWeekStartInClubTZ(date: Date, clubTimezone?: string): Date {
  const tz = clubTimezone || 'Europe/Moscow'
  
  // Форматируем дату в часовом поясе клуба
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
  
  // Парсим компоненты даты
  const [year, month, day] = dateStr.split('-').map(Number)
  
  // Создаем дату в UTC
  const tempDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  
  // Получаем день недели (0 = воскресенье, 1 = понедельник, ...)
  let dayOfWeek = tempDate.getUTCDay()
  // Преобразуем в понедельник = 0, воскресенье = 6
  dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  
  // Создаем дату понедельника
  const monday = new Date(Date.UTC(year, month - 1, day - dayOfWeek, 0, 0, 0))
  
  return monday
}

/**
 * Создает Date для конца недели с учетом часового пояса клуба
 * @param date - дата в неделе
 * @param clubTimezone - часовой пояс клуба
 * @returns Date объект конца недели (воскресенье 23:59:59 UTC)
 */
export function getWeekEndInClubTZ(date: Date, clubTimezone?: string): Date {
  const weekStart = getWeekStartInClubTZ(date, clubTimezone)
  
  // Создаем воскресенье 23:59:59 UTC
  const sunday = new Date(Date.UTC(
    weekStart.getUTCFullYear(),
    weekStart.getUTCMonth(),
    weekStart.getUTCDate() + 6,
    23, 59, 59, 999
  ))
  
  return sunday
}