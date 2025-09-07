#!/usr/bin/env node

/**
 * Миграционный скрипт для разделения комиссий на две части:
 * - platformCommissionPercent: 1.0% (комиссия платформы)
 * - acquiringCommissionPercent: 2.6% (эквайринг и онлайн-касса)
 * 
 * Запуск: node migrate-commissions.js
 */

const admin = require('firebase-admin');

// Замените на путь к вашему service account ключу
const serviceAccount = require('./sports-booking-app-1d7e5-firebase-adminsdk-z4z5c-d656017c8b.json');

// Инициализация Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://sports-booking-app-1d7e5.firebaseio.com'
});

const db = admin.firestore();

// ID клубов, которые остаются на прямом эквайринге (без комиссий)
const DIRECT_ACQUIRING_CLUBS = [
  'BeYptYH0ODrq0R3U0imj', // Олимпия
  // Добавьте ID других клубов с прямым эквайрингом
];

async function migrateCommissions() {
  console.log('🔄 Начинаем миграцию комиссий...\n');
  
  try {
    // Получаем все клубы
    const venuesSnapshot = await db.collection('venues').get();
    
    let migratedCount = 0;
    let skippedCount = 0;
    let directCount = 0;
    
    for (const doc of venuesSnapshot.docs) {
      const venueId = doc.id;
      const venueData = doc.data();
      const venueName = venueData.name || 'Без названия';
      
      // Проверяем тип платежей
      const paymentType = venueData.paymentType || 'multiaccounts';
      
      if (paymentType === 'direct' || DIRECT_ACQUIRING_CLUBS.includes(venueId)) {
        // Клуб с прямым эквайрингом - устанавливаем нулевые комиссии
        console.log(`⚡ ${venueName} (${venueId}) - прямой эквайринг, комиссии: 0%`);
        
        await db.collection('venues').doc(venueId).update({
          platformCommissionPercent: 0,
          acquiringCommissionPercent: 0,
          paymentType: 'direct',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        directCount++;
      } else {
        // Клуб с Мультирасчетами - разделяем комиссии
        const oldCommission = venueData.platformCommission || venueData.platformCommissionPercent;
        
        if (venueData.platformCommissionPercent !== undefined && 
            venueData.acquiringCommissionPercent !== undefined) {
          // Уже мигрирован
          console.log(`✅ ${venueName} (${venueId}) - уже мигрирован`);
          console.log(`   Платформа: ${venueData.platformCommissionPercent}%`);
          console.log(`   Эквайринг: ${venueData.acquiringCommissionPercent}%`);
          skippedCount++;
        } else {
          // Мигрируем
          const platformCommissionPercent = 1.0;  // Комиссия платформы
          const acquiringCommissionPercent = 2.6; // Эквайринг и касса
          
          console.log(`📦 ${venueName} (${venueId}) - мигрируем комиссии`);
          console.log(`   Старая общая комиссия: ${oldCommission || 'не установлена'}%`);
          console.log(`   Новая комиссия платформы: ${platformCommissionPercent}%`);
          console.log(`   Новая комиссия эквайринга: ${acquiringCommissionPercent}%`);
          console.log(`   Общая комиссия: ${platformCommissionPercent + acquiringCommissionPercent}%`);
          
          const updateData = {
            platformCommissionPercent: platformCommissionPercent,
            acquiringCommissionPercent: acquiringCommissionPercent,
            paymentType: 'multiaccounts',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          // Удаляем старое поле если оно есть
          if (venueData.platformCommission !== undefined) {
            updateData.platformCommission = admin.firestore.FieldValue.delete();
          }
          
          await db.collection('venues').doc(venueId).update(updateData);
          
          migratedCount++;
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Миграция завершена!');
    console.log('='.repeat(60));
    console.log(`📊 Статистика:`);
    console.log(`   • Мигрировано на разделенные комиссии: ${migratedCount}`);
    console.log(`   • Уже были мигрированы: ${skippedCount}`);
    console.log(`   • Прямой эквайринг (без комиссий): ${directCount}`);
    console.log(`   • Всего клубов: ${venuesSnapshot.size}`);
    console.log('='.repeat(60));
    
    // Показываем итоговую статистику по комиссиям
    console.log('\n📈 Итоговая структура комиссий:');
    console.log('   • Мультирасчеты: платформа 1.0% + эквайринг 2.6% = 3.6%');
    console.log('   • Прямой эквайринг: 0% (клуб платит сам)');
    
  } catch (error) {
    console.error('❌ Ошибка при миграции:', error);
  } finally {
    process.exit(0);
  }
}

// Запуск
migrateCommissions();