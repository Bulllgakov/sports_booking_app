// Единый источник правды для названий способов оплаты
export const paymentMethodNames = {
  cash: 'Оплата в клубе наличными',
  card_on_site: 'Оплата в клубе картой',
  transfer: 'Перевод на р.счет клуба (юр.лицо)',
  online: 'Онлайн оплата',
  sberbank_card: 'На карту Сбербанка',
  tbank_card: 'На карту Т-Банка',
  vtb_card: 'На карту ВТБ'
} as const

export type PaymentMethod = keyof typeof paymentMethodNames

export function getPaymentMethodName(method: string): string {
  return paymentMethodNames[method as PaymentMethod] || method
}

// Краткие названия для мобильных устройств или узких колонок
export const paymentMethodShortNames = {
  cash: 'Наличные',
  card_on_site: 'Карта на месте',
  transfer: 'Перевод юр.лицо',
  online: 'Онлайн',
  sberbank_card: 'Сбербанк',
  tbank_card: 'Т-Банк',
  vtb_card: 'ВТБ'
} as const

export function getPaymentMethodShortName(method: string): string {
  return paymentMethodShortNames[method as PaymentMethod] || method
}