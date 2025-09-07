#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки интеграции с Т-Банк Мультирасчеты
 * Запуск: node test-tbank-multiaccounts.js
 */

const axios = require('axios');
const crypto = require('crypto');

// Конфигурация для тестовой среды
const config = {
  terminalKey: '1755339010178',
  terminalKeyE2C: '1755339010178E2C',
  password: 'D7SfdvJY5zq7fm=W',
  tokenPassword: 'V*F&Snl4*Kud%kGR',
  apiUrl: 'https://rest-api-test.tinkoff.ru/v2/',
  username: 'All_Court_booking'
};

// Генерация токена для подписи запроса
function generateToken(params, password) {
  const paramsWithPassword = { ...params, Password: password };
  const sortedKeys = Object.keys(paramsWithPassword).sort();
  const concatenated = sortedKeys.map(key => paramsWithPassword[key]).join('');
  return crypto.createHash('sha256').update(concatenated).digest('hex');
}

// Форматирование суммы в копейки
function formatAmountForTBank(amount) {
  return Math.round(amount * 100);
}

// 1. Проверка доступности API
async function checkAPIConnection() {
  console.log('\n📡 Проверка доступности API Т-Банка...\n');
  
  try {
    const response = await axios.get(config.apiUrl, {
      timeout: 10000,
      validateStatus: () => true // Принимаем любой статус
    });
    
    console.log('✅ API доступен');
    console.log(`   URL: ${config.apiUrl}`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Headers:`, response.headers['content-type']);
    return true;
  } catch (error) {
    console.error('❌ API недоступен');
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

// 2. Тест регистрации клуба
async function testRegisterShop() {
  console.log('\n🏪 Тестирование регистрации клуба в мультирасчетах...\n');
  
  const shopData = {
    ShopCode: `test_club_${Date.now()}`,
    Name: 'Тестовый Клуб AllCourt',
    Inn: '7710140679', // Тестовый ИНН
    Email: 'test@allcourt.ru',
    Phones: '+79999999999',
    Account: '40702810400000000001', // Тестовый расчетный счет
    BankBik: '044525225', // БИК Сбербанка
    LegalAddress: 'г. Москва, ул. Тестовая, д. 1',
    DirectorName: 'Иванов Иван Иванович'
  };

  try {
    const requestData = {
      TerminalKey: config.terminalKeyE2C,
      ...shopData
    };
    
    const token = generateToken(requestData, config.tokenPassword);
    
    console.log('📤 Отправка запроса на регистрацию клуба:');
    console.log(`   ShopCode: ${shopData.ShopCode}`);
    console.log(`   Name: ${shopData.Name}`);
    console.log(`   Terminal: ${config.terminalKeyE2C}`);
    
    const response = await axios.post(
      `${config.apiUrl}AddShop`,
      { ...requestData, Token: token },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      }
    );
    
    console.log('\n📥 Ответ сервера:');
    console.log('   Status:', response.status);
    console.log('   Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.Success) {
      console.log('\n✅ Клуб успешно зарегистрирован!');
      return shopData.ShopCode;
    } else {
      console.log('\n⚠️ Регистрация не удалась:');
      console.log('   ErrorCode:', response.data.ErrorCode);
      console.log('   Message:', response.data.Message);
      console.log('   Details:', response.data.Details);
      
      // Если клуб уже существует, это не критичная ошибка для теста
      if (response.data.ErrorCode === '8' || response.data.Message?.includes('already exists')) {
        console.log('\n💡 Клуб уже зарегистрирован, используем существующий');
        return shopData.ShopCode;
      }
      return null;
    }
  } catch (error) {
    console.error('\n❌ Ошибка при регистрации клуба:');
    console.error('   ', error.response?.data || error.message);
    return null;
  }
}

// 3. Тест инициализации платежа
async function testInitPayment(shopCode) {
  console.log('\n💳 Тестирование инициализации платежа...\n');
  
  const paymentData = {
    Amount: formatAmountForTBank(1000), // 1000 рублей
    OrderId: `test_order_${Date.now()}`,
    Description: 'Тестовое бронирование корта',
    CustomerKey: 'test_customer@allcourt.ru',
    SuccessURL: 'https://allcourt.ru/payment-result?status=success',
    FailURL: 'https://allcourt.ru/payment-result?status=fail',
    NotificationURL: 'https://allcourt.ru/api/webhooks/tbank-multiaccounts'
  };

  try {
    // Рассчитываем комиссии
    const totalAmount = 1000;
    const platformCommission = 1.0; // 1%
    const acquiringCommission = 2.6; // 2.6%
    const totalCommission = platformCommission + acquiringCommission; // 3.6%
    const commissionAmount = totalAmount * (totalCommission / 100);
    const clubAmount = totalAmount - commissionAmount;
    
    console.log('💰 Расчет комиссий:');
    console.log(`   Сумма платежа: ${totalAmount}₽`);
    console.log(`   Комиссия платформы: ${platformCommission}%`);
    console.log(`   Комиссия эквайринга: ${acquiringCommission}%`);
    console.log(`   Общая комиссия: ${totalCommission}% (${commissionAmount}₽)`);
    console.log(`   Сумма для клуба: ${clubAmount}₽`);
    
    const requestData = {
      TerminalKey: config.terminalKeyE2C,
      ...paymentData,
      Shops: shopCode ? [{
        ShopCode: shopCode,
        Amount: formatAmountForTBank(clubAmount),
        Name: 'Тестовый Клуб AllCourt'
      }] : undefined
    };
    
    const token = generateToken({
      TerminalKey: requestData.TerminalKey,
      Amount: requestData.Amount,
      OrderId: requestData.OrderId
    }, config.tokenPassword);
    
    console.log('\n📤 Отправка запроса на создание платежа:');
    console.log(`   OrderId: ${paymentData.OrderId}`);
    console.log(`   Amount: ${totalAmount}₽`);
    if (shopCode) {
      console.log(`   ShopCode: ${shopCode}`);
      console.log(`   Shop Amount: ${clubAmount}₽`);
    }
    
    const response = await axios.post(
      `${config.apiUrl}Init`,
      { ...requestData, Token: token },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      }
    );
    
    console.log('\n📥 Ответ сервера:');
    console.log('   Status:', response.status);
    console.log('   Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.Success) {
      console.log('\n✅ Платеж успешно инициализирован!');
      console.log('   PaymentId:', response.data.PaymentId);
      console.log('   PaymentURL:', response.data.PaymentURL);
      return response.data.PaymentId;
    } else {
      console.log('\n❌ Инициализация платежа не удалась:');
      console.log('   ErrorCode:', response.data.ErrorCode);
      console.log('   Message:', response.data.Message);
      console.log('   Details:', response.data.Details);
      return null;
    }
  } catch (error) {
    console.error('\n❌ Ошибка при инициализации платежа:');
    console.error('   ', error.response?.data || error.message);
    return null;
  }
}

// 4. Проверка статуса платежа
async function checkPaymentStatus(paymentId) {
  console.log('\n🔍 Проверка статуса платежа...\n');
  
  try {
    const requestData = {
      TerminalKey: config.terminalKeyE2C,
      PaymentId: paymentId
    };
    
    const token = generateToken(requestData, config.tokenPassword);
    
    const response = await axios.post(
      `${config.apiUrl}GetState`,
      { ...requestData, Token: token },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      }
    );
    
    if (response.data.Success) {
      console.log('✅ Статус платежа получен:');
      console.log('   PaymentId:', response.data.PaymentId);
      console.log('   Status:', response.data.Status);
      console.log('   Amount:', response.data.Amount / 100, '₽');
      return true;
    } else {
      console.log('❌ Не удалось получить статус:');
      console.log('   ErrorCode:', response.data.ErrorCode);
      console.log('   Message:', response.data.Message);
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка при проверке статуса:');
    console.error('   ', error.response?.data || error.message);
    return false;
  }
}

// 5. Тест webhook (симуляция)
async function testWebhook() {
  console.log('\n🔔 Тестирование webhook уведомлений...\n');
  
  console.log('📍 Webhook URL: https://allcourt.ru/api/webhooks/tbank-multiaccounts');
  console.log('📍 Статический IP: 34.14.97.72 (должен быть в белом списке)');
  
  // Здесь мы не можем реально протестировать webhook, 
  // так как он должен быть вызван от Т-Банка
  console.log('\n💡 Для полного тестирования webhook:');
  console.log('   1. Завершите тестовый платеж в браузере');
  console.log('   2. Проверьте логи Cloud Functions');
  console.log('   3. Убедитесь, что уведомление пришло');
  
  return true;
}

// Главная функция тестирования
async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 ТЕСТИРОВАНИЕ Т-БАНК МУЛЬТИРАСЧЕТЫ');
  console.log('='.repeat(60));
  console.log('\n📋 Конфигурация:');
  console.log(`   Среда: ТЕСТОВАЯ`);
  console.log(`   API URL: ${config.apiUrl}`);
  console.log(`   Terminal E2C: ${config.terminalKeyE2C}`);
  console.log(`   Static IP: 34.14.97.72`);
  
  // 1. Проверка доступности API
  const apiAvailable = await checkAPIConnection();
  if (!apiAvailable) {
    console.log('\n⛔ Тестирование прервано: API недоступен');
    return;
  }
  
  // 2. Регистрация клуба
  const shopCode = await testRegisterShop();
  
  // 3. Инициализация платежа
  const paymentId = await testInitPayment(shopCode);
  
  // 4. Проверка статуса платежа
  if (paymentId) {
    await checkPaymentStatus(paymentId);
  }
  
  // 5. Информация о webhook
  await testWebhook();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
  console.log('='.repeat(60));
  
  console.log('\n📝 Следующие шаги:');
  console.log('   1. Проверьте, что NotificationUrl настроен в личном кабинете Т-Банка');
  console.log('   2. Убедитесь, что IP 34.14.97.72 добавлен в белый список');
  console.log('   3. Завершите тестовый платеж по ссылке из инициализации');
  console.log('   4. Проверьте логи Cloud Functions для webhook');
}

// Запуск тестов
runTests().catch(console.error);