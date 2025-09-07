#!/usr/bin/env node

/**
 * Вызов тестовой Cloud Function для проверки подключения к Т-Банку
 */

const admin = require('firebase-admin');
const serviceAccount = require('./sports-booking-app-1d7e5-firebase-adminsdk-z4z5c-d656017c8b.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://sports-booking-app-1d7e5.firebaseio.com'
});

const functions = admin.functions();

async function callTestFunction() {
  console.log('='.repeat(60));
  console.log('🔍 ВЫЗОВ ТЕСТОВОЙ CLOUD FUNCTION');
  console.log('='.repeat(60));
  console.log('\nФункция выполняется на сервере Google Cloud с IP: 34.14.97.72\n');
  
  try {
    const testTbankConnection = functions.httpsCallable('testTbankConnection');
    
    console.log('📤 Отправка запроса к Cloud Function...\n');
    const result = await testTbankConnection({});
    
    console.log('✅ Ответ получен:\n');
    console.log(JSON.stringify(result.data, null, 2));
    
    // Анализ результатов
    console.log('\n' + '='.repeat(60));
    console.log('📊 АНАЛИЗ РЕЗУЛЬТАТОВ:');
    console.log('='.repeat(60));
    
    if (result.data.externalIP) {
      console.log(`\n✅ Внешний IP: ${result.data.externalIP}`);
      if (result.data.externalIP === '34.14.97.72') {
        console.log('   ✅ IP соответствует ожидаемому статическому IP');
      } else {
        console.log('   ⚠️  IP не соответствует ожидаемому (34.14.97.72)');
      }
    }
    
    if (result.data.analysis) {
      console.log('\n📝 Заключение:');
      if (result.data.analysis.status === 'SUCCESS') {
        console.log('   ✅', result.data.analysis.message);
      } else {
        console.log('   ⚠️ ', result.data.analysis.problem);
        console.log('   💡', result.data.analysis.solution);
      }
    }
    
    if (result.data.initPayment) {
      console.log('\n💳 Результат инициализации платежа:');
      console.log('   Status:', result.data.initPayment.status);
      if (result.data.initPayment.data?.Success) {
        console.log('   ✅ Платеж успешно инициализирован!');
        console.log('   PaymentId:', result.data.initPayment.data.PaymentId);
        console.log('   PaymentURL:', result.data.initPayment.data.PaymentURL);
      } else if (result.data.initPayment.data?.ErrorCode) {
        console.log('   ❌ Ошибка:', result.data.initPayment.data.ErrorCode);
        console.log('   Сообщение:', result.data.initPayment.data.Message);
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка при вызове функции:', error.message);
    if (error.details) {
      console.error('Детали:', error.details);
    }
  }
}

// Запуск теста
callTestFunction().catch(console.error);