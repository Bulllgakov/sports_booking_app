#!/usr/bin/env node

/**
 * Проверка статуса мультирасчетов для тестового клуба
 */

const admin = require('firebase-admin');

// Инициализация Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    databaseURL: 'https://sports-booking-app-1d7e5.firebaseio.com',
    storageBucket: 'sports-booking-app-1d7e5.firebasestorage.app'
  });
}

const db = admin.firestore();

async function checkMultiaccountsStatus() {
  console.log('='.repeat(60));
  console.log('🔍 ПРОВЕРКА СТАТУСА МУЛЬТИРАСЧЕТОВ');
  console.log('='.repeat(60));
  
  try {
    // Получаем все клубы с мультирасчетами
    const venuesSnapshot = await db.collection('venues')
      .where('paymentType', '==', 'multiaccounts')
      .get();
    
    if (venuesSnapshot.empty) {
      console.log('\n❌ Нет клубов с подключенными мультирасчетами');
      return;
    }
    
    console.log(`\n✅ Найдено клубов с мультирасчетами: ${venuesSnapshot.size}\n`);
    
    for (const doc of venuesSnapshot.docs) {
      const venue = doc.data();
      console.log('-'.repeat(60));
      console.log(`📍 Клуб: ${venue.name}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Тип платежей: ${venue.paymentType}`);
      console.log(`   Комиссия платформы: ${venue.platformCommissionPercent || 'не установлена'}%`);
      console.log(`   Комиссия эквайринга: ${venue.acquiringCommissionPercent || 'не установлена'}%`);
      
      if (venue.multiaccountsConfig) {
        console.log(`   Статус мультирасчетов: ${venue.multiaccountsConfig.status || 'не указан'}`);
        if (venue.multiaccountsConfig.recipientId) {
          console.log(`   ID получателя в Т-Банке: ${venue.multiaccountsConfig.recipientId}`);
        }
        if (venue.multiaccountsConfig.registeredAt) {
          const date = venue.multiaccountsConfig.registeredAt.toDate();
          console.log(`   Дата регистрации: ${date.toLocaleString('ru-RU')}`);
        }
        if (venue.multiaccountsConfig.status === 'rejected' && venue.multiaccountsConfig.rejectionReason) {
          console.log(`   ⚠️  Причина отказа: ${venue.multiaccountsConfig.rejectionReason}`);
        }
      } else {
        console.log(`   ⚠️  Конфигурация мультирасчетов не найдена`);
      }
      
      // Проверяем реквизиты
      const requiredFields = [
        'organizationType', 'legalName', 'inn', 'ogrn',
        'legalAddress', 'bankName', 'bik', 'correspondentAccount',
        'settlementAccount', 'financeEmail', 'financePhone'
      ];
      
      const missingFields = requiredFields.filter(field => !venue[field]);
      
      if (missingFields.length > 0) {
        console.log(`   ⚠️  Не заполнены реквизиты: ${missingFields.join(', ')}`);
      } else {
        console.log(`   ✅ Все необходимые реквизиты заполнены`);
      }
      
      console.log();
    }
    
    console.log('='.repeat(60));
    console.log('📝 РЕКОМЕНДАЦИИ:');
    console.log('='.repeat(60));
    console.log('\n1. Если статус "pending" или "not_configured":');
    console.log('   - Проверьте, что все реквизиты заполнены');
    console.log('   - Попробуйте повторно сохранить настройки оплаты');
    console.log('\n2. Если статус "rejected":');
    console.log('   - Проверьте причину отказа');
    console.log('   - Исправьте реквизиты и подайте заявку повторно');
    console.log('\n3. Если конфигурация не найдена:');
    console.log('   - Зайдите в настройки оплаты и повторно выберите Мультирасчеты');
    
  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
  } finally {
    process.exit(0);
  }
}

// Запуск проверки
checkMultiaccountsStatus();