export interface SMSTemplate {
  id: string
  name: string
  description: string
  template: string
  variables: string[]
  enabled: boolean
  maxLength: number
}

export interface SMSTemplatesSettings {
  bookingConfirmation: {
    enabled: boolean
    template: string
  }
  bookingReminder: {
    enabled: boolean
    template: string
    hoursBeforeGame: number
  }
  bookingCancellation: {
    enabled: boolean
    template: string
  }
  bookingModification: {
    enabled: boolean
    template: string
  }
  authCode: {
    enabled: boolean
    template: string
  }
  paymentLink: {
    enabled: boolean
    template: string
  }
}

// Дефолтные шаблоны
export const DEFAULT_SMS_TEMPLATES: SMSTemplatesSettings = {
  bookingConfirmation: {
    enabled: true,
    template: "Бронирование подтверждено! {venue}, {date} в {time}",
  },
  bookingReminder: {
    enabled: true,
    template: "Напоминание: сегодня в {time} игра в {venue}, корт {court}",
    hoursBeforeGame: 2,
  },
  bookingCancellation: {
    enabled: true,
    template: "Игра {date} в {time} в {venue} отменена",
  },
  bookingModification: {
    enabled: true,
    template: "Изменение: игра перенесена на {time}, корт {court}",
  },
  authCode: {
    enabled: true,
    template: "Ваш код для входа в Все Корты: {code}",
  },
  paymentLink: {
    enabled: true,
    template: "Оплатите бронь по ссылке: {link}",
  },
};
