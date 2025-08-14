// Утилиты для расчета цен с учетом праздничных дней

interface HolidayPricing {
  date: string // дата в формате MM-DD (например: "03-08" для 8 марта)
  price: number
  name?: string // название праздника для удобства
}

interface PriceInterval {
  from: string // время начала HH:00
  to: string   // время окончания HH:00
  price: number
}

interface DayPricing {
  basePrice: number
  intervals?: PriceInterval[]
}

interface CourtPricing {
  monday?: DayPricing
  tuesday?: DayPricing
  wednesday?: DayPricing
  thursday?: DayPricing
  friday?: DayPricing
  saturday?: DayPricing
  sunday?: DayPricing
}

/**
 * Проверяет, является ли дата праздничным днем
 * @param date - дата бронирования
 * @param holidayPricing - массив праздничных дней
 * @returns объект HolidayPricing если дата является праздником, иначе null
 */
export function getHolidayPricing(date: Date, holidayPricing?: HolidayPricing[]): HolidayPricing | null {
  if (!holidayPricing || holidayPricing.length === 0) {
    return null
  }

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateStr = `${month}-${day}`

  return holidayPricing.find(holiday => holiday.date === dateStr) || null
}

/**
 * Рассчитывает цену корта с учетом праздничных дней
 * @param date - дата бронирования
 * @param time - время начала в формате HH:MM
 * @param duration - продолжительность в минутах
 * @param pricing - ценовая политика корта
 * @param holidayPricing - праздничные дни
 * @param legacyPriceWeekday - цена за час в будни (для обратной совместимости)
 * @param legacyPriceWeekend - цена за час в выходные (для обратной совместимости)
 * @returns цена за указанное время
 */
export function calculateCourtPrice(
  date: Date,
  time: string,
  duration: number,
  pricing?: CourtPricing,
  holidayPricing?: HolidayPricing[],
  legacyPriceWeekday?: number,
  legacyPriceWeekend?: number
): number {
  // Разбиваем бронирование на часовые слоты и суммируем их цены
  const [startHour, startMinute] = time.split(':').map(Number)
  let totalPrice = 0
  let currentHour = startHour
  let currentMinute = startMinute
  let remainingMinutes = duration

  while (remainingMinutes > 0) {
    // Определяем продолжительность текущего слота (не более часа и не более оставшихся минут)
    const slotDuration = Math.min(60 - currentMinute, remainingMinutes)
    const slotHours = slotDuration / 60

    // Проверяем праздничные дни - они имеют наивысший приоритет
    const holiday = getHolidayPricing(date, holidayPricing)
    if (holiday) {
      totalPrice += holiday.price * slotHours
    } else if (pricing) {
      // Если есть новая система ценообразования
      const dayOfWeek = date.getDay()
      const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayKey = dayKeys[dayOfWeek] as keyof CourtPricing
      const dayPricing = pricing[dayKey]

      if (dayPricing) {
        let slotPrice = dayPricing.basePrice
        
        // Проверяем специальные интервалы для текущего часа
        if (dayPricing.intervals) {
          for (const interval of dayPricing.intervals) {
            const intervalStart = parseInt(interval.from.split(':')[0])
            const intervalEnd = parseInt(interval.to.split(':')[0])
            
            if (currentHour >= intervalStart && currentHour < intervalEnd) {
              slotPrice = interval.price
              break
            }
          }
        }
        
        totalPrice += slotPrice * slotHours
      } else {
        // Если нет настроек для этого дня, используем legacy систему
        const isWeekend = date.getDay() === 0 || date.getDay() === 6
        const basePrice = isWeekend 
          ? (legacyPriceWeekend || 2400) 
          : (legacyPriceWeekday || 1900)
        totalPrice += basePrice * slotHours
      }
    } else {
      // Fallback на legacy систему
      const isWeekend = date.getDay() === 0 || date.getDay() === 6
      const basePrice = isWeekend 
        ? (legacyPriceWeekend || 2400) 
        : (legacyPriceWeekday || 1900)
      totalPrice += basePrice * slotHours
    }

    // Переходим к следующему слоту
    remainingMinutes -= slotDuration
    currentMinute += slotDuration
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60)
      currentMinute = currentMinute % 60
    }
  }

  return Math.round(totalPrice) // Округляем до целого числа
}

/**
 * Получает цену за час для отображения
 * @param date - дата бронирования  
 * @param time - время начала в формате HH:MM
 * @param pricing - ценовая политика корта
 * @param holidayPricing - праздничные дни
 * @param legacyPriceWeekday - цена за час в будни (для обратной совместимости)
 * @param legacyPriceWeekend - цена за час в выходные (для обратной совместимости)
 * @returns цена за час
 */
export function getHourlyPrice(
  date: Date,
  time: string,
  pricing?: CourtPricing,
  holidayPricing?: HolidayPricing[],
  legacyPriceWeekday?: number,
  legacyPriceWeekend?: number
): number {
  return calculateCourtPrice(date, time, 60, pricing, holidayPricing, legacyPriceWeekday, legacyPriceWeekend)
}

/**
 * Получает детализацию цены по часам
 * @param date - дата бронирования
 * @param time - время начала в формате HH:MM
 * @param duration - продолжительность в минутах
 * @param pricing - ценовая политика корта
 * @param holidayPricing - праздничные дни
 * @param legacyPriceWeekday - цена за час в будни
 * @param legacyPriceWeekend - цена за час в выходные
 * @returns массив с детализацией по часам
 */
export function getPriceBreakdown(
  date: Date,
  time: string,
  duration: number,
  pricing?: CourtPricing,
  holidayPricing?: HolidayPricing[],
  legacyPriceWeekday?: number,
  legacyPriceWeekend?: number
): Array<{ time: string; price: number }> {
  const breakdown: Array<{ time: string; price: number }> = []
  const [startHour, startMinute] = time.split(':').map(Number)
  let currentHour = startHour
  let currentMinute = startMinute
  let remainingMinutes = duration

  while (remainingMinutes > 0) {
    // Определяем продолжительность текущего слота
    const slotDuration = Math.min(60 - currentMinute, remainingMinutes)
    const slotHours = slotDuration / 60

    // Форматируем время слота
    const slotStartTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`
    const endMinute = currentMinute + slotDuration
    const slotEndHour = currentHour + Math.floor(endMinute / 60)
    const slotEndMinute = endMinute % 60
    const slotEndTime = `${String(slotEndHour).padStart(2, '0')}:${String(slotEndMinute).padStart(2, '0')}`

    // Вычисляем цену для слота
    let slotPrice = 0
    const holiday = getHolidayPricing(date, holidayPricing)
    
    if (holiday) {
      slotPrice = holiday.price * slotHours
    } else if (pricing) {
      const dayOfWeek = date.getDay()
      const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayKey = dayKeys[dayOfWeek] as keyof CourtPricing
      const dayPricing = pricing[dayKey]

      if (dayPricing) {
        let hourlyPrice = dayPricing.basePrice
        
        if (dayPricing.intervals) {
          for (const interval of dayPricing.intervals) {
            const intervalStart = parseInt(interval.from.split(':')[0])
            const intervalEnd = parseInt(interval.to.split(':')[0])
            
            if (currentHour >= intervalStart && currentHour < intervalEnd) {
              hourlyPrice = interval.price
              break
            }
          }
        }
        
        slotPrice = hourlyPrice * slotHours
      } else {
        const isWeekend = date.getDay() === 0 || date.getDay() === 6
        const basePrice = isWeekend 
          ? (legacyPriceWeekend || 2400) 
          : (legacyPriceWeekday || 1900)
        slotPrice = basePrice * slotHours
      }
    } else {
      const isWeekend = date.getDay() === 0 || date.getDay() === 6
      const basePrice = isWeekend 
        ? (legacyPriceWeekend || 2400) 
        : (legacyPriceWeekday || 1900)
      slotPrice = basePrice * slotHours
    }

    // Добавляем в детализацию только если это полный час или последний слот
    if (slotDuration === 60 || remainingMinutes <= 60) {
      breakdown.push({
        time: `${slotStartTime} - ${slotEndTime}`,
        price: Math.round(slotPrice)
      })
    }

    // Переходим к следующему слоту
    remainingMinutes -= slotDuration
    currentMinute += slotDuration
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60)
      currentMinute = currentMinute % 60
    }
  }

  return breakdown
}

/**
 * Получает диапазон цен корта (минимальная и максимальная)
 * @param pricing - ценовая политика корта
 * @param holidayPricing - праздничные дни
 * @param legacyPriceWeekday - цена за час в будни
 * @param legacyPriceWeekend - цена за час в выходные
 * @returns объект с минимальной и максимальной ценой
 */
export function getPriceRange(
  pricing?: CourtPricing,
  holidayPricing?: HolidayPricing[],
  legacyPriceWeekday?: number,
  legacyPriceWeekend?: number
): { min: number; max: number } {
  const prices: number[] = []

  // Добавляем цены праздничных дней
  if (holidayPricing) {
    prices.push(...holidayPricing.map(h => h.price))
  }

  // Добавляем цены из новой системы
  if (pricing) {
    Object.values(pricing).forEach(dayPricing => {
      if (dayPricing) {
        prices.push(dayPricing.basePrice)
        if (dayPricing.intervals) {
          prices.push(...dayPricing.intervals.map(i => i.price))
        }
      }
    })
  }

  // Добавляем legacy цены
  if (legacyPriceWeekday) prices.push(legacyPriceWeekday)
  if (legacyPriceWeekend) prices.push(legacyPriceWeekend)

  // Если нет цен, используем дефолтные
  if (prices.length === 0) {
    prices.push(1900, 2400)
  }

  return {
    min: Math.min(...prices),
    max: Math.max(...prices)
  }
}