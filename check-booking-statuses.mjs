import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  where
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

async function checkStatuses() {
  console.log('🔍 Проверка статусов бронирований...\n');

  try {
    // Получаем все бронирования
    const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
    console.log(`Всего бронирований: ${bookingsSnapshot.size}\n`);

    const problematic = [];
    
    bookingsSnapshot.forEach(doc => {
      const booking = doc.data();
      
      // Проверяем несоответствия
      if (booking.status === 'confirmed' && booking.paymentStatus === 'awaiting_payment') {
        problematic.push({
          id: doc.id,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          customerName: booking.customerName,
          date: booking.date,
          courtName: booking.courtName
        });
      }
    });
    
    if (problematic.length > 0) {
      console.log(`⚠️  Найдено ${problematic.length} бронирований с несоответствием:\n`);
      console.log('Status = confirmed, но PaymentStatus = awaiting_payment:\n');
      
      problematic.forEach(b => {
        const dateStr = b.date?.toDate ? b.date.toDate().toISOString().split('T')[0] : b.date;
        console.log(`  ID: ${b.id}`);
        console.log(`    Клиент: ${b.customerName}`);
        console.log(`    Дата: ${dateStr}`);
        console.log(`    Корт: ${b.courtName}`);
        console.log(`    Status: ${b.status} | PaymentStatus: ${b.paymentStatus}`);
        console.log('');
      });
    } else {
      console.log('✅ Несоответствий не найдено!');
      console.log('Все бронирования имеют корректные статусы.\n');
    }
    
    // Проверяем занятость слотов на сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    let todayCount = 0;
    let occupyingCount = 0;
    
    bookingsSnapshot.forEach(doc => {
      const booking = doc.data();
      const dateStr = booking.date?.toDate ? 
        booking.date.toDate().toISOString().split('T')[0] : 
        booking.date;
      
      if (dateStr === todayStr) {
        todayCount++;
        
        const status = booking.status || 'pending';
        const paymentStatus = booking.paymentStatus || 'awaiting_payment';
        
        // Проверяем по логике из ТЗ
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
        }
      }
    });
    
    console.log(`\n📅 Бронирования на сегодня (${todayStr}):`);
    console.log(`  Всего: ${todayCount}`);
    console.log(`  Занимают слоты: ${occupyingCount}`);
    console.log(`  Свободные слоты: ${todayCount - occupyingCount}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
  
  process.exit(0);
}

checkStatuses();