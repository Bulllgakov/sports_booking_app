// Script to check payment settings for a specific club
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBJJVmdmKrPiKgNmLF8KqQRdVdFQCg5mbo",
  authDomain: "sports-booking-app-1d7e5.firebaseapp.com",
  projectId: "sports-booking-app-1d7e5",
  storageBucket: "sports-booking-app-1d7e5.appspot.com",
  messagingSenderId: "892940842081",
  appId: "1:892940842081:web:9e4f9e58e3e7a9f0a69d2d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkClubSettings(clubId) {
  console.log(`\nПроверка настроек клуба: ${clubId}\n`);
  console.log('='.repeat(50));
  
  try {
    const venueRef = doc(db, 'venues', clubId);
    const venueDoc = await getDoc(venueRef);
    
    if (!venueDoc.exists()) {
      console.log('❌ Клуб не найден!');
      return;
    }
    
    const data = venueDoc.data();
    
    console.log('📋 ОСНОВНАЯ ИНФОРМАЦИЯ:');
    console.log(`   Название: ${data.name || 'Не указано'}`);
    console.log(`   ID: ${clubId}`);
    console.log('');
    
    console.log('💳 НАСТРОЙКИ ПЛАТЕЖЕЙ:');
    console.log(`   Тип приема платежей: ${data.paymentType || 'НЕ УСТАНОВЛЕН'}`);
    console.log(`   Комиссия платформы: ${data.platformCommission !== undefined ? data.platformCommission + '%' : 'Не установлена'}`);
    console.log('');
    
    console.log('🏦 ЭКВАЙРИНГ:');
    console.log(`   Провайдер: ${data.paymentProvider || 'Не настроен'}`);
    console.log(`   Статус: ${data.paymentEnabled ? '✅ Активен' : '❌ Не активен'}`);
    console.log(`   Тестовый режим: ${data.paymentTestMode ? 'Да' : 'Нет'}`);
    console.log('');
    
    if (data.multiaccountsConfig) {
      console.log('📊 МУЛЬТИРАСЧЕТЫ:');
      console.log(`   Статус: ${data.multiaccountsConfig.status || 'Не настроен'}`);
      console.log(`   Примечание: ${data.multiaccountsConfig.note || '-'}`);
      if (data.multiaccountsConfig.registeredAt) {
        console.log(`   Дата регистрации: ${new Date(data.multiaccountsConfig.registeredAt.seconds * 1000).toLocaleString('ru-RU')}`);
      }
    } else {
      console.log('📊 МУЛЬТИРАСЧЕТЫ: Не настроены');
    }
    
    console.log('');
    console.log('🔍 ДОПОЛНИТЕЛЬНЫЕ ПОЛЯ:');
    console.log(`   Email для финансов: ${data.financeEmail || 'Не указан'}`);
    console.log(`   Телефон для финансов: ${data.financePhone || 'Не указан'}`);
    console.log(`   ОКПО: ${data.okpo || 'Не указан'}`);
    console.log(`   ОКВЭД: ${data.okved || 'Не указан'}`);
    
    console.log('');
    console.log('='.repeat(50));
    console.log('✅ Проверка завершена');
    
  } catch (error) {
    console.error('❌ Ошибка при получении данных:', error);
  }
  
  process.exit(0);
}

// ID клуба Олимпия
const OLYMPIA_ID = 'BeYptYH0ODrq0R3U0imj';

// Запуск проверки
checkClubSettings(OLYMPIA_ID);