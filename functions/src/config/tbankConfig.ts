/**
 * Конфигурация для работы с API Т-Банка
 * ВАЖНО: В продакшене использовать Firebase Functions Config
 */

interface TBankConfig {
  terminalKey: string;
  terminalKeyE2C: string;
  password: string;
  username: string;
  apiUrl: string;
  isTestMode: boolean;
}

/**
 * Получение конфигурации Т-Банка в зависимости от окружения
 */
export function getTBankConfig(): TBankConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Боевые ключи
    return {
      terminalKey: '1755339010178',
      terminalKeyE2C: '1755339010178E2C',
      password: 'an9yLfvtTPSMOJe2',
      username: 'All_Court_booking',
      apiUrl: 'https://securepay.tinkoff.ru/v2/',
      isTestMode: false
    };
  } else {
    // Тестовые ключи
    return {
      terminalKey: '1755339010178',
      terminalKeyE2C: '1755339010178E2C', 
      password: 'D7SfdvJY5zq7fm=W',
      username: 'All_Court_booking',
      apiUrl: 'https://rest-api-test.tinkoff.ru/v2/',
      isTestMode: true
    };
  }
}

/**
 * Генерация токена для подписи запросов
 * Т-Банк использует SHA-256 для подписи
 */
export function generateTBankToken(params: Record<string, any>, password: string): string {
  const crypto = require('crypto');
  
  // Добавляем Password к параметрам
  const paramsWithPassword: Record<string, any> = { ...params, Password: password };
  
  // Сортируем ключи в алфавитном порядке
  const sortedKeys = Object.keys(paramsWithPassword).sort();
  
  // Конкатенируем значения
  const concatenated = sortedKeys
    .map(key => paramsWithPassword[key])
    .join('');
  
  // Генерируем SHA-256 хеш
  const hash = crypto
    .createHash('sha256')
    .update(concatenated)
    .digest('hex');
  
  return hash;
}

/**
 * Форматирование суммы для API Т-Банка (в копейках)
 */
export function formatAmountForTBank(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Форматирование суммы из API Т-Банка (из копеек в рубли)
 */
export function formatAmountFromTBank(amount: number): number {
  return amount / 100;
}

/**
 * Маппинг статусов платежей Т-Банка
 */
export const TBANK_PAYMENT_STATUS = {
  NEW: 'NEW',                           // Платеж создан
  FORM_SHOWED: 'FORM_SHOWED',          // Покупателю отображена платежная форма
  AUTHORIZING: 'AUTHORIZING',          // Начата авторизация платежа
  AUTHORIZED: 'AUTHORIZED',            // Средства заблокированы, но не списаны
  AUTH_FAIL: 'AUTH_FAIL',              // Авторизация отклонена
  REJECTED: 'REJECTED',                // Платеж отклонен
  CONFIRMED: 'CONFIRMED',              // Платеж подтвержден
  REVERSING: 'REVERSING',              // Начата отмена платежа
  REVERSED: 'REVERSED',                // Платеж отменен
  REFUNDING: 'REFUNDING',              // Начат возврат
  PARTIAL_REFUNDED: 'PARTIAL_REFUNDED', // Произведен частичный возврат
  REFUNDED: 'REFUNDED'                 // Произведен полный возврат
};

/**
 * Проверка успешности платежа
 */
export function isPaymentSuccessful(status: string): boolean {
  return status === TBANK_PAYMENT_STATUS.CONFIRMED || 
         status === TBANK_PAYMENT_STATUS.AUTHORIZED;
}

/**
 * Проверка финальности статуса платежа
 */
export function isPaymentFinal(status: string): boolean {
  return [
    TBANK_PAYMENT_STATUS.CONFIRMED,
    TBANK_PAYMENT_STATUS.AUTH_FAIL,
    TBANK_PAYMENT_STATUS.REJECTED,
    TBANK_PAYMENT_STATUS.REVERSED,
    TBANK_PAYMENT_STATUS.REFUNDED
  ].includes(status);
}