#!/usr/bin/env node

/**
 * Скрипт для тестирования Мультирасчетов Т-Банка
 * Запуск: node test-multiaccounts.js
 */

const axios = require('axios');
const crypto = require('crypto');

// Тестовая конфигурация
const TEST_CONFIG = {
  terminalKey: '1755339010178',
  terminalKeyE2C: '1755339010178E2C',
  password: 'D7SfdvJY5zq7fm=W',  // Тестовый пароль из документации
  apiUrl: 'https://rest-api-test.tinkoff.ru/v2/'
};

// Функция для генерации токена
function generateToken(params, password) {
  const paramsWithPassword = { ...params, Password: password };
  const sortedKeys = Object.keys(paramsWithPassword).sort();
  const concatenated = sortedKeys
    .map(key => paramsWithPassword[key])
    .join('');
  
  return crypto
    .createHash('sha256')
    .update(concatenated)
    .digest('hex');
}

// Функция для форматирования суммы в копейки
function toKopecks(rubles) {
  return Math.round(rubles * 100);
}

async function testMultiaccounts() {
  console.log('🧪 Начинаем тестирование Мультирасчетов Т-Банка...\n');
  console.log('📍 Тестовое окружение:', TEST_CONFIG.apiUrl);
  console.log('🔑 Terminal Key E2C:', TEST_CONFIG.terminalKeyE2C);
  console.log('');

  try {
    // 1. Тест инициализации платежа
    console.log('1️⃣ Тестируем инициализацию платежа с распределением средств...');
    
    const orderId = `test_order_${Date.now()}`;
    const amount = 1000; // 1000 рублей
    const platformCommission = 10; // 10 рублей (1%)
    const clubAmount = amount - platformCommission; // 990 рублей
    
    const initData = {
      TerminalKey: TEST_CONFIG.terminalKeyE2C,
      Amount: toKopecks(amount),
      OrderId: orderId,
      Description: 'Тестовое бронирование корта',
      CustomerKey: 'test@example.com',
      SuccessURL: 'https://allcourt.ru/success',
      FailURL: 'https://allcourt.ru/fail',
      NotificationURL: 'https://allcourt.ru/api/webhooks/tbank-multiaccounts',
      
      // Распределение средств (для Мультирасчетов)
      Shops: [
        {
          ShopCode: 'test_club_001',
          Amount: toKopecks(clubAmount),
          Name: 'Тестовый клуб',
          Fee: toKopecks(platformCommission)
        }
      ],
      
      DATA: {
        Email: 'test@example.com',
        Phone: '+79991234567'
      }
    };
    
    // Генерируем токен
    const token = generateToken({
      TerminalKey: initData.TerminalKey,
      Amount: initData.Amount,
      OrderId: initData.OrderId
    }, TEST_CONFIG.password);
    
    console.log('📤 Отправляем запрос на инициализацию...');
    console.log(`   Сумма: ${amount} руб`);
    console.log(`   Клубу: ${clubAmount} руб`);
    console.log(`   Комиссия платформы: ${platformCommission} руб`);
    
    const response = await axios.post(
      `${TEST_CONFIG.apiUrl}Init`,
      { ...initData, Token: token },
      {
        headers: {
          'Content-Type': 'application/json'
        }
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
      console.log('');
      console.log('💳 Используйте тестовую карту:');
      console.log('   Номер: 4300 0000 0000 0777');
      console.log('   CVV: 123');
      console.log('   Срок: 12/25');
      
      return response.data.PaymentId;
    } else {
      console.error('❌ Ошибка инициализации:', response.data);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:');
    if (error.response) {
      console.error('   Статус:', error.response.status);
      console.error('   Данные:', error.response.data);
      
      // Расшифровка ошибок Т-Банка
      if (error.response.data?.ErrorCode) {
        console.error('');
        console.error('📋 Код ошибки:', error.response.data.ErrorCode);
        console.error('📝 Сообщение:', error.response.data.Message || error.response.data.Details);
        
        // Подсказки по частым ошибкам
        switch(error.response.data.ErrorCode) {
          case '7':
            console.error('💡 Подсказка: Неверный Terminal Key или он не активирован для Мультирасчетов');
            break;
          case '8':
            console.error('💡 Подсказка: Неверная подпись токена. Проверьте пароль и алгоритм генерации');
            break;
          case '9':
            console.error('💡 Подсказка: Неверный формат данных. Проверьте обязательные поля');
            break;
          case '99':
            console.error('💡 Подсказка: Магазин (ShopCode) не зарегистрирован в системе');
            break;
        }
      }
    } else {
      console.error('   Сообщение:', error.message);
    }
  }
}

// 2. Тест регистрации магазина (клуба)
async function testRegisterShop() {
  console.log('\n2️⃣ Тестируем регистрацию клуба как магазина...');
  
  const shopData = {
    TerminalKey: TEST_CONFIG.terminalKeyE2C,
    ShopCode: `test_club_${Date.now()}`,
    Name: 'Тестовый теннисный клуб',
    Inn: '7707083893', // Тестовый ИНН (Сбербанк)
    Email: 'test@allcourt.ru',
    Phone: '+79991234567',
    Account: '40702810138000000000', // Тестовый расчетный счет
    BankBik: '044525225', // БИК Сбербанка
    LegalAddress: 'г. Москва, ул. Тестовая, д. 1',
    CEO: 'Иванов Иван Иванович'
  };
  
  const token = generateToken({
    TerminalKey: shopData.TerminalKey,
    ShopCode: shopData.ShopCode,
    Inn: shopData.Inn
  }, TEST_CONFIG.password);
  
  try {
    console.log('📤 Отправляем запрос на регистрацию магазина...');
    console.log(`   Shop Code: ${shopData.ShopCode}`);
    console.log(`   Название: ${shopData.Name}`);
    
    const response = await axios.post(
      `${TEST_CONFIG.apiUrl}AddShop`,
      { ...shopData, Token: token },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.Success) {
      console.log('✅ Магазин успешно зарегистрирован!');
      console.log(`   Shop Code: ${response.data.ShopCode}`);
      return response.data.ShopCode;
    } else {
      console.error('❌ Ошибка регистрации:', response.data);
      return null;
    }
    
  } catch (error) {
    if (error.response?.data?.ErrorCode === '10') {
      console.log('ℹ️  Магазин уже существует (это нормально для тестов)');
    } else {
      console.error('❌ Ошибка:', error.response?.data || error.message);
    }
  }
}

// 3. Тест проверки статуса платежа
async function testGetPaymentStatus(paymentId) {
  if (!paymentId) return;
  
  console.log('\n3️⃣ Проверяем статус платежа...');
  
  const statusData = {
    TerminalKey: TEST_CONFIG.terminalKeyE2C,
    PaymentId: paymentId
  };
  
  const token = generateToken(statusData, TEST_CONFIG.password);
  
  try {
    const response = await axios.post(
      `${TEST_CONFIG.apiUrl}GetState`,
      { ...statusData, Token: token },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.Success) {
      console.log('✅ Статус получен:');
      console.log(`   Payment ID: ${response.data.PaymentId}`);
      console.log(`   Status: ${response.data.Status}`);
      console.log(`   Amount: ${response.data.Amount / 100} руб`);
      
      // Расшифровка статусов
      const statusDescriptions = {
        'NEW': 'Платеж создан',
        'FORM_SHOWED': 'Покупателю отображена платежная форма',
        'AUTHORIZING': 'Платеж обрабатывается',
        'AUTHORIZED': 'Средства заблокированы',
        'CONFIRMED': '✅ Платеж подтвержден',
        'REJECTED': '❌ Платеж отклонен',
        'REVERSED': '↩️ Платеж отменен',
        'REFUNDED': '💰 Возврат выполнен'
      };
      
      console.log(`   Описание: ${statusDescriptions[response.data.Status] || 'Неизвестный статус'}`);
    } else {
      console.error('❌ Ошибка получения статуса:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
  }
}

// Главная функция
async function main() {
  console.log('═'.repeat(60));
  console.log('     ТЕСТИРОВАНИЕ МУЛЬТИРАСЧЕТОВ Т-БАНКА');
  console.log('═'.repeat(60));
  console.log('');
  
  // Запускаем тесты
  const paymentId = await testMultiaccounts();
  await testRegisterShop();
  
  if (paymentId) {
    // Ждем 3 секунды и проверяем статус
    console.log('\n⏳ Ждем 3 секунды перед проверкой статуса...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    await testGetPaymentStatus(paymentId);
  }
  
  console.log('\n═'.repeat(60));
  console.log('✅ Тестирование завершено!');
  console.log('');
  console.log('📝 Следующие шаги:');
  console.log('1. Откройте ссылку для оплаты и проведите тестовый платеж');
  console.log('2. Проверьте webhook уведомления в Firebase Functions');
  console.log('3. Убедитесь, что платеж корректно распределен между клубом и платформой');
  console.log('═'.repeat(60));
}

// Запуск
main().catch(console.error);