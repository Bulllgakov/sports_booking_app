#!/usr/bin/env node

/**
 * Детальная проверка всех полей клуба
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

async function checkVenueFields() {
  console.log('='.repeat(60));
  console.log('🔍 ДЕТАЛЬНАЯ ПРОВЕРКА ПОЛЕЙ КЛУБА SmartPadel');
  console.log('='.repeat(60));
  
  try {
    const venueDoc = await db.collection('venues').doc('sL4XrpuUw988P1Gq89Bt').get();
    
    if (!venueDoc.exists) {
      console.log('❌ Клуб не найден');
      return;
    }
    
    const venue = venueDoc.data();
    
    console.log('\n📋 ОСНОВНАЯ ИНФОРМАЦИЯ:');
    console.log(`   Название: ${venue.name || 'не заполнено'}`);
    console.log(`   Тип: ${venue.type || 'не заполнен'}`);
    console.log(`   Адрес: ${venue.address || 'не заполнен'}`);
    console.log(`   Телефон: ${venue.phone || 'не заполнен'}`);
    
    console.log('\n🏢 ЮРИДИЧЕСКИЕ РЕКВИЗИТЫ:');
    console.log(`   Тип организации: ${venue.organizationType || 'НЕ ЗАПОЛНЕН'}`);
    console.log(`   Юридическое наименование: ${venue.legalName || 'НЕ ЗАПОЛНЕНО'}`);
    console.log(`   ИНН: ${venue.inn || 'НЕ ЗАПОЛНЕН'}`);
    console.log(`   КПП: ${venue.kpp || 'не заполнен (необязательно для ИП)'}`);
    console.log(`   ОГРН/ОГРНИП: ${venue.ogrn || 'НЕ ЗАПОЛНЕН'}`);
    console.log(`   Юридический адрес: ${venue.legalAddress || 'НЕ ЗАПОЛНЕН'}`);
    console.log(`   ФИО руководителя: ${venue.directorName || 'не заполнено'}`);
    console.log(`   Должность руководителя: ${venue.directorPosition || 'не заполнена'}`);
    
    console.log('\n🏦 БАНКОВСКИЕ РЕКВИЗИТЫ:');
    console.log(`   Наименование банка: ${venue.bankName || 'НЕ ЗАПОЛНЕНО'}`);
    console.log(`   БИК банка: ${venue.bik || '❌ НЕ ЗАПОЛНЕН'}`);
    console.log(`   Корр. счет: ${venue.correspondentAccount || '❌ НЕ ЗАПОЛНЕН'}`);
    console.log(`   Расчетный счет: ${venue.settlementAccount || '❌ НЕ ЗАПОЛНЕН'}`);
    
    console.log('\n📧 КОНТАКТЫ ДЛЯ ФИНАНСОВ:');
    console.log(`   Email для уведомлений: ${venue.financeEmail || 'НЕ ЗАПОЛНЕН'}`);
    console.log(`   Телефон для финансов: ${venue.financePhone || 'НЕ ЗАПОЛНЕН'}`);
    console.log(`   ОКПО: ${venue.okpo || 'не заполнен (необязательно)'}`);
    console.log(`   ОКВЭД: ${venue.okved || 'не заполнен (необязательно)'}`);
    
    console.log('\n💳 НАСТРОЙКИ ПЛАТЕЖЕЙ:');
    console.log(`   Тип платежей: ${venue.paymentType || 'не установлен'}`);
    console.log(`   Комиссия платформы: ${venue.platformCommissionPercent}%`);
    console.log(`   Комиссия эквайринга: ${venue.acquiringCommissionPercent}%`);
    
    // Проверка обязательных полей для мультирасчетов
    const requiredFields = [
      'organizationType', 'legalName', 'inn', 'ogrn',
      'legalAddress', 'bankName', 'bik', 'correspondentAccount',
      'settlementAccount', 'financeEmail', 'financePhone'
    ];
    
    const missingFields = requiredFields.filter(field => !venue[field]);
    
    console.log('\n' + '='.repeat(60));
    if (missingFields.length === 0) {
      console.log('✅ ВСЕ ОБЯЗАТЕЛЬНЫЕ РЕКВИЗИТЫ ЗАПОЛНЕНЫ!');
      console.log('\nТеперь можно подать заявку на подключение мультирасчетов.');
    } else {
      console.log('⚠️  НЕ ЗАПОЛНЕНЫ ОБЯЗАТЕЛЬНЫЕ ПОЛЯ:');
      missingFields.forEach(field => {
        const fieldNames = {
          'bik': 'БИК банка',
          'correspondentAccount': 'Корреспондентский счет',
          'settlementAccount': 'Расчетный счет',
          'organizationType': 'Тип организации',
          'legalName': 'Юридическое наименование',
          'inn': 'ИНН',
          'ogrn': 'ОГРН/ОГРНИП',
          'legalAddress': 'Юридический адрес',
          'bankName': 'Наименование банка',
          'financeEmail': 'Email для финансовых уведомлений',
          'financePhone': 'Телефон для финансовых вопросов'
        };
        console.log(`   ❌ ${fieldNames[field] || field}`);
      });
      
      console.log('\n📝 Заполните эти поля в разделе "Управление клубом" → "Реквизиты"');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
  } finally {
    process.exit(0);
  }
}

// Запуск проверки
checkVenueFields();