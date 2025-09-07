import * as functions from 'firebase-functions';
import axios from 'axios';
import { getTBankConfig, generateTBankToken } from '../config/tbankConfig';

/**
 * Тестовая функция для проверки подключения к API Т-Банка
 * через статический IP адрес (34.14.97.72)
 */
export const testTbankConnection = functions
  .region('europe-west1')
  .runWith({
    vpcConnector: 'firebase-connector',
    vpcConnectorEgressSettings: 'ALL_TRAFFIC'
  })
  .https.onCall(async (data, context) => {
    const config = getTBankConfig();
    const results: any = {
      timestamp: new Date().toISOString(),
      staticIP: '34.14.97.72',
      environment: process.env.FUNCTIONS_EMULATOR ? 'EMULATOR' : 'PRODUCTION',
      apiUrl: config.apiUrl
    };
    
    try {
      // 1. Проверяем доступность API
      console.log('Проверка доступности API Т-Банка...');
      const healthCheck = await axios.get(config.apiUrl, {
        timeout: 10000,
        validateStatus: () => true
      });
      
      results.apiHealthCheck = {
        status: healthCheck.status,
        statusText: healthCheck.statusText,
        headers: healthCheck.headers
      };
      
      // 2. Пробуем инициализировать платеж
      console.log('Попытка инициализации тестового платежа...');
      const paymentData = {
        TerminalKey: config.terminalKeyE2C,
        Amount: 100, // 1 рубль в копейках
        OrderId: `test_${Date.now()}`,
        Description: 'Тестовый платеж для проверки IP'
      };
      
      const token = generateTBankToken({
        TerminalKey: paymentData.TerminalKey,
        Amount: paymentData.Amount,
        OrderId: paymentData.OrderId
      }, config.password);
      
      const initResponse = await axios.post(
        `${config.apiUrl}Init`,
        { ...paymentData, Token: token },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
          validateStatus: () => true
        }
      );
      
      results.initPayment = {
        status: initResponse.status,
        statusText: initResponse.statusText,
        data: initResponse.data
      };
      
      // 3. Проверяем наш внешний IP
      console.log('Проверка внешнего IP адреса...');
      const ipCheck = await axios.get('https://api.ipify.org?format=json', {
        timeout: 5000
      });
      
      results.externalIP = ipCheck.data.ip;
      results.expectedIP = '34.14.97.72';
      results.ipMatch = ipCheck.data.ip === '34.14.97.72';
      
    } catch (error: any) {
      results.error = {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      };
    }
    
    // Анализ результатов
    if (results.apiHealthCheck?.status === 403) {
      results.analysis = {
        problem: 'API возвращает 403 Forbidden',
        possibleCause: 'IP адрес не добавлен в белый список Т-Банка',
        solution: 'Убедитесь, что IP 34.14.97.72 добавлен в белый список в личном кабинете Т-Банка'
      };
    } else if (results.initPayment?.status === 200 && results.initPayment?.data?.Success) {
      results.analysis = {
        status: 'SUCCESS',
        message: 'Подключение к API Т-Банка работает корректно'
      };
    } else if (results.initPayment?.data?.ErrorCode) {
      results.analysis = {
        problem: 'API доступен, но возвращает ошибку',
        errorCode: results.initPayment.data.ErrorCode,
        message: results.initPayment.data.Message,
        possibleCause: 'Проблема с учетными данными или настройками терминала'
      };
    }
    
    return results;
  });