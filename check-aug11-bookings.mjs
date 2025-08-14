import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs
} from 'firebase/firestore';

// Firebase конфигурация
const firebaseConfig = {
  apiKey: "AIzaSyCPNy9b3FYNz5i_aiJcJ9BkvZKoQfQu-sA",
  authDomain: "sports-booking-app-1d7e5.firebaseapp.com",
  projectId: "sports-booking-app-1d7e5",
  storageBucket: "sports-booking-app-1d7e5.appspot.com",
  messagingSenderId: "648540980109",
  appId: "1:648540980109:web:f61c8fd716e0f76c3de0ea"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkAug11Bookings() {
  console.log('🔍 Проверка бронирований на 11 августа 2025...\n');

  try {
    // Получаем все бронирования
    const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
    
    const aug11Bookings = [];
    const targetDate = '2025-08-11';
    
    bookingsSnapshot.forEach(doc => {
      const booking = doc.data();
      
      // Получаем дату в строковом формате
      let dateStr = '';
      if (typeof booking.date === 'string') {
        dateStr = booking.date;
      } else if (booking.date?.toDate) {
        dateStr = booking.date.toDate().toISOString().split('T')[0];
      } else if (booking.date?.seconds) {
        dateStr = new Date(booking.date.seconds * 1000).toISOString().split('T')[0];
      }
      
      if (dateStr === targetDate) {
        aug11Bookings.push({
          id: doc.id,
          ...booking,
          dateStr
        });
      }
    });
    
    console.log(`Найдено бронирований на 11 августа: ${aug11Bookings.length}\n`);
    
    // Группируем по кортам
    const courtBookings = {};
    
    aug11Bookings.forEach(booking => {
      const courtName = booking.courtName || 'Без названия';
      if (!courtBookings[courtName]) {
        courtBookings[courtName] = [];
      }
      courtBookings[courtName].push(booking);
    });
    
    // Выводим по кортам
    Object.keys(courtBookings).sort().forEach(courtName => {
      const bookings = courtBookings[courtName];
      console.log(`\n📍 ${courtName}: ${bookings.length} бронирований`);
      console.log('=' .repeat(60));
      
      // Сортируем по времени
      bookings.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      
      bookings.forEach(booking => {
        const status = booking.status || 'нет';
        const paymentStatus = booking.paymentStatus || 'нет';
        
        // Проверяем, занимает ли слот по логике из ТЗ
        const occupiesSlot = 
          status !== 'cancelled' && 
          paymentStatus !== 'cancelled' && 
          paymentStatus !== 'refunded' &&
          paymentStatus !== 'error' &&
          (status === 'confirmed' || status === 'pending' ||
           paymentStatus === 'paid' || paymentStatus === 'online_payment' ||
           paymentStatus === 'awaiting_payment');
        
        const occupyIcon = occupiesSlot ? '🔴' : '🟢';
        
        console.log(`${occupyIcon} ${booking.startTime || booking.time}-${booking.endTime || '??:??'}`);
        console.log(`   ID: ${booking.id}`);
        console.log(`   Клиент: ${booking.customerName || 'Не указан'}`);
        console.log(`   Status: ${status}`);
        console.log(`   PaymentStatus: ${paymentStatus}`);
        console.log(`   Занимает слот: ${occupiesSlot ? 'ДА' : 'НЕТ'}`);
        if (booking.gameType) {
          console.log(`   Тип игры: ${booking.gameType}`);
        }
        console.log('');
      });
    });
    
    // Итоговая статистика
    console.log('\n📊 ИТОГО:');
    console.log('=' .repeat(60));
    
    let occupyingCount = 0;
    let freeCount = 0;
    
    aug11Bookings.forEach(booking => {
      const status = booking.status || 'pending';
      const paymentStatus = booking.paymentStatus || 'awaiting_payment';
      
      const occupiesSlot = 
        status !== 'cancelled' && 
        paymentStatus !== 'cancelled' && 
        paymentStatus !== 'refunded' &&
        paymentStatus !== 'error' &&
        (status === 'confirmed' || status === 'pending' ||
         paymentStatus === 'paid' || paymentStatus === 'online_payment' ||
         paymentStatus === 'awaiting_payment');
      
      if (occupiesSlot) {
        occupyingCount++;
      } else {
        freeCount++;
      }
    });
    
    console.log(`Всего бронирований: ${aug11Bookings.length}`);
    console.log(`Занимают слоты: ${occupyingCount}`);
    console.log(`НЕ занимают слоты: ${freeCount}`);
    
    // Проверим уникальные комбинации статусов
    console.log('\n📋 Уникальные комбинации статусов:');
    const statusCombos = new Map();
    
    aug11Bookings.forEach(booking => {
      const combo = `${booking.status || 'null'} + ${booking.paymentStatus || 'null'}`;
      const count = statusCombos.get(combo) || 0;
      statusCombos.set(combo, count + 1);
    });
    
    statusCombos.forEach((count, combo) => {
      console.log(`  ${combo}: ${count} шт.`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
  
  process.exit(0);
}

checkAug11Bookings();