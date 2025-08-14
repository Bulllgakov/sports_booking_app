import { Timestamp } from 'firebase/firestore'

/**
 * Утилиты для работы с датами и временем
 * Стандартизация форматов по проекту
 */

// ============ РАБОТА С ДАТАМИ ============

/**
 * Преобразует строку даты в объект Date
 * @param dateString - дата в формате 'yyyy-MM-dd'
 * @returns Date объект
 */
export function stringToDate(dateString: string): Date {
  // Добавляем время чтобы избежать проблем с часовыми поясами
  return new Date(dateString + 'T00:00:00')
}

/**
 * Преобразует Date в строку формата 'yyyy-MM-dd'
 * @param date - объект Date
 * @returns строка даты
 */
export function dateToString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Преобразует Firestore Timestamp в Date
 * @param timestamp - Firestore Timestamp
 * @returns Date объект
 */
export function timestampToDate(timestamp: Timestamp): Date {
  return timestamp.toDate()
}

/**
 * Создает Firestore Timestamp из Date
 * @param date - объект Date
 * @returns Firestore Timestamp
 */
export function dateToTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date)
}

/**
 * Безопасное преобразование различных форматов даты в Date
 * @param dateValue - может быть Timestamp, Date, string или number
 * @returns Date объект
 */
export function normalizeDate(dateValue: any): Date {
  if (!dateValue) {
    return new Date()
  }
  
  // Firestore Timestamp с методом toDate
  if (dateValue?.toDate && typeof dateValue.toDate === 'function') {
    return dateValue.toDate()
  }
  
  // Firestore Timestamp объект с полем seconds
  if (dateValue?.seconds && typeof dateValue.seconds === 'number') {
    return new Date(dateValue.seconds * 1000)
  }
  
  // Уже Date объект
  if (dateValue instanceof Date) {
    return dateValue
  }
  
  // Строка даты
  if (typeof dateValue === 'string') {
    // Если формат 'yyyy-MM-dd'
    if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return stringToDate(dateValue)
    }
    // Пробуем обычный парсинг
    return new Date(dateValue)
  }
  
  // Числовой timestamp
  if (typeof dateValue === 'number') {
    return new Date(dateValue)
  }
  
  // По умолчанию
  return new Date()
}

// ============ РАБОТА СО ВРЕМЕНЕМ ============

/**
 * Вычисляет время окончания на основе начала и длительности
 * @param startTime - время начала в формате 'HH:mm'
 * @param durationMinutes - длительность в минутах
 * @returns время окончания в формате 'HH:mm'
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + durationMinutes
  const endHours = Math.floor(totalMinutes / 60) % 24
  const endMinutes = totalMinutes % 60
  
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
}

/**
 * Вычисляет длительность между временем начала и окончания
 * @param startTime - время начала в формате 'HH:mm'
 * @param endTime - время окончания в формате 'HH:mm'
 * @returns длительность в минутах
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)
  
  const startTotalMinutes = startHours * 60 + startMinutes
  let endTotalMinutes = endHours * 60 + endMinutes
  
  // Если время окончания меньше времени начала, считаем что это следующий день
  if (endTotalMinutes < startTotalMinutes) {
    endTotalMinutes += 24 * 60
  }
  
  return endTotalMinutes - startTotalMinutes
}

/**
 * Преобразует часы в минуты
 * @param hours - количество часов (может быть дробным)
 * @returns количество минут
 */
export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60)
}

/**
 * Преобразует минуты в часы
 * @param minutes - количество минут
 * @returns количество часов (дробное)
 */
export function minutesToHours(minutes: number): number {
  return minutes / 60
}

/**
 * Форматирует длительность для отображения
 * @param minutes - длительность в минутах
 * @returns строка вида "1 ч 30 мин" или "45 мин"
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) {
    return `${mins} мин`
  }
  
  if (mins === 0) {
    return `${hours} ч`
  }
  
  return `${hours} ч ${mins} мин`
}

/**
 * Проверяет, находится ли время в допустимом диапазоне
 * @param time - время в формате 'HH:mm'
 * @param minTime - минимальное время (по умолчанию '07:00')
 * @param maxTime - максимальное время (по умолчанию '23:00')
 * @returns true если время валидно
 */
export function isValidTime(time: string, minTime = '07:00', maxTime = '23:00'): boolean {
  const [hours, minutes] = time.split(':').map(Number)
  const [minHours, minMinutes] = minTime.split(':').map(Number)
  const [maxHours, maxMinutes] = maxTime.split(':').map(Number)
  
  const timeInMinutes = hours * 60 + minutes
  const minInMinutes = minHours * 60 + minMinutes
  const maxInMinutes = maxHours * 60 + maxMinutes
  
  return timeInMinutes >= minInMinutes && timeInMinutes <= maxInMinutes
}

// ============ РАБОТА С КОМБИНАЦИЕЙ ДАТЫ И ВРЕМЕНИ ============

/**
 * Создает полный Date объект из даты и времени
 * @param date - дата (Date объект или строка 'yyyy-MM-dd')
 * @param time - время в формате 'HH:mm'
 * @returns полный Date объект
 */
export function combineDateAndTime(date: Date | string, time: string): Date {
  const dateObj = typeof date === 'string' ? stringToDate(date) : date
  const [hours, minutes] = time.split(':').map(Number)
  
  const combined = new Date(dateObj)
  combined.setHours(hours, minutes, 0, 0)
  
  return combined
}

/**
 * Извлекает время из Date объекта
 * @param date - Date объект
 * @returns время в формате 'HH:mm'
 */
export function extractTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Проверяет, является ли дата сегодняшней
 * @param date - проверяемая дата
 * @returns true если дата - сегодня
 */
export function isToday(date: Date): boolean {
  const today = new Date()
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear()
}

/**
 * Проверяет, является ли дата прошедшей
 * @param date - проверяемая дата
 * @returns true если дата в прошлом
 */
export function isPastDate(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const checkDate = new Date(date)
  checkDate.setHours(0, 0, 0, 0)
  return checkDate < today
}

/**
 * Форматирует дату для отображения
 * @param date - дата для форматирования
 * @returns строка вида "15 марта 2024"
 */
export function formatDateDisplay(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date)
}

/**
 * Форматирует дату и время для отображения
 * @param date - дата
 * @param time - время в формате 'HH:mm'
 * @returns строка вида "15 марта 2024, 10:00"
 */
export function formatDateTimeDisplay(date: Date, time: string): string {
  return `${formatDateDisplay(date)}, ${time}`
}