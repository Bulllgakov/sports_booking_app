#!/usr/bin/env node

/**
 * Скрипт для проверки базового подключения к API Т-Банка
 * Запуск: node test-simple-payment.js
 */

const axios = require('axios');
const crypto = require('crypto');

// Тестовая конфигурация
const TEST_CONFIG = {
  terminalKey: '1755339010178',  // Обычный терминал
  password: 'D7SfdvJY5zq7fm=W',  // Тестовый пароль
  apiUrl: 'https://rest-api-test.tinkoff.ru/v2/'
};

// Функция для генерации токена
function generateToken(params, password) {
  const paramsWithPassword = { ...params, Password: password };
  const sortedKeys = Object.keys(paramsWithPassword).sort();
  const concatenated = sortedKeys
    .filter(key => paramsWithPassword[key] !== undefined && paramsWithPassword[key] !== null)
    .map(key => String(paramsWithPassword[key]))
    .join('');
  
  return crypto
    .createHash('sha256')
    .update(concatenated)
    .digest('hex');
}

async function testSimplePayment() {
  console.log('🧪 Тестируем базовое подключение к API Т-Банка...\n');
  console.log('📍 Тестовое окружение:', TEST_CONFIG.apiUrl);
  console.log('🔑 Terminal Key:', TEST_CONFIG.terminalKey);
  console.log('');

  try {
    // Простая инициализация платежа без Мультирасчетов
    console.log('1️⃣ Тестируем обычную инициализацию платежа...');
    
    const orderId = `test_${Date.now()}`;
    const amount = 100; // 100 рублей
    
    const initData = {
      TerminalKey: TEST_CONFIG.terminalKey,
      Amount: amount * 100, // в копейках
      OrderId: orderId,
      Description: 'Тестовый платеж'
    };
    
    // Генерируем токен
    const token = generateToken(initData, TEST_CONFIG.password);
    
    console.log('📤 Отправляем запрос на инициализацию...');
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Сумма: ${amount} руб`);
    console.log(`   Token: ${token.substring(0, 10)}...`);
    
    const response = await axios.post(
      `${TEST_CONFIG.apiUrl}Init`,
      { ...initData, Token: token },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    if (response.data.Success) {
      console.log('✅ Платеж успешно инициализирован!');
      console.log(`   Payment ID: ${response.data.PaymentId}`);
      console.log(`   Status: ${response.data.Status}`);
      console.log(`   Payment URL: ${response.data.PaymentURL}`);
      console.log('');
      console.log('🌐 Откройте эту ссылку для тестирования оплаты:');
      console.log(`   ${response.data.PaymentURL}`);
      
      return response.data.PaymentId;
    } else {
      console.error('❌ Ошибка инициализации:', response.data);
      console.error('   ErrorCode:', response.data.ErrorCode);
      console.error('   Message:', response.data.Message || response.data.Details);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:');
    if (error.response) {
      console.error('   Статус:', error.response.status);
      console.error('   Данные:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 403) {
        console.error('');
        console.error('⚠️ Ошибка 403: Доступ запрещен');
        console.error('Возможные причины:');
        console.error('1. Терминал не активирован в тестовом окружении');
        console.error('2. Неверные учетные данные');
        console.error('3. IP-адрес не в whitelist');
        console.error('');
        console.error('Обратитесь в поддержку Т-Банка для активации терминала.');
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   Не удалось подключиться к серверу');
    } else {
      console.error('   Сообщение:', error.message);
    }
  }
}

// Запуск
testSimplePayment().catch(console.error);