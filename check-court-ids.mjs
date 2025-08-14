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

async function checkCourtIds() {
  console.log('🔍 Проверка ID кортов и форматов дат в бронированиях на 11 августа...\n');

  try {
    // Сначала получаем все корты
    const courtsSnapshot = await getDocs(collection(db, 'courts'));
    const courts = {};
    
    courtsSnapshot.forEach(doc => {
      const court = doc.data();
      courts[doc.id] = court.name || 'Без названия';
      console.log(`Корт: ${court.name} -> ID: ${doc.id}`);
    });
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Получаем все бронирования
    const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
    
    const aug11Bookings = [];
    const targetDate = '2025-08-11';
    
    bookingsSnapshot.forEach(doc => {
      const booking = doc.data();
      
      // Получаем дату в строковом формате
      let dateStr = '';
      let dateFormat = 'unknown';
      
      if (typeof booking.date === 'string') {
        dateStr = booking.date;
        dateFormat = 'string';
      } else if (booking.date?.toDate) {
        dateStr = booking.date.toDate().toISOString().split('T')[0];
        dateFormat = 'timestamp';
      } else if (booking.date?.seconds) {
        dateStr = new Date(booking.date.seconds * 1000).toISOString().split('T')[0];
        dateFormat = 'seconds';
      }
      
      if (dateStr === targetDate) {
        aug11Bookings.push({
          id: doc.id,
          courtId: booking.courtId,
          courtName: booking.courtName,
          customerName: booking.customerName,
          startTime: booking.startTime || booking.time,
          endTime: booking.endTime,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          date: booking.date,
          dateFormat: dateFormat,
          dateStr: dateStr
        });
      }
    });
    
    console.log(`Найдено бронирований на 11 августа: ${aug11Bookings.length}\n`);
    
    // Группируем по courtId
    const byCourtId = {};
    const noCourtId = [];
    
    aug11Bookings.forEach(booking => {
      if (booking.courtId) {
        if (!byCourtId[booking.courtId]) {
          byCourtId[booking.courtId] = [];
        }
        byCourtId[booking.courtId].push(booking);
      } else {
        noCourtId.push(booking);
      }
    });
    
    // Выводим бронирования по courtId
    Object.keys(byCourtId).forEach(courtId => {
      const bookings = byCourtId[courtId];
      const courtName = courts[courtId] || 'Неизвестный корт';
      
      console.log(`\n📍 CourtId: ${courtId}`);
      console.log(`   Название: ${courtName}`);
      console.log(`   Бронирований: ${bookings.length}`);
      console.log('   ' + '-'.repeat(40));
      
      bookings.forEach(b => {
        const status = b.status || 'нет';
        const paymentStatus = b.paymentStatus || 'нет';
        
        // Проверяем, занимает ли слот
        const occupiesSlot = 
          status !== 'cancelled' && 
          paymentStatus !== 'cancelled' && 
          paymentStatus !== 'refunded' &&
          paymentStatus !== 'error' &&
          (status === 'confirmed' || status === 'pending' ||
           paymentStatus === 'paid' || paymentStatus === 'online_payment' ||
           paymentStatus === 'awaiting_payment');
        
        const icon = occupiesSlot ? '🔴' : '🟢';
        
        console.log(`   ${icon} ${b.startTime}-${b.endTime} | ${b.customerName}`);
        console.log(`      Court Name в записи: "${b.courtName}"`);
        console.log(`      Формат даты: ${b.dateFormat}`);
        console.log(`      Status: ${status} | Payment: ${paymentStatus}`);
      });
    });
    
    // Выводим бронирования без courtId
    if (noCourtId.length > 0) {
      console.log(`\n⚠️  Бронирования БЕЗ courtId: ${noCourtId.length}`);
      console.log('   ' + '-'.repeat(40));
      
      noCourtId.forEach(b => {
        const status = b.status || 'нет';
        const paymentStatus = b.paymentStatus || 'нет';
        
        const occupiesSlot = 
          status !== 'cancelled' && 
          paymentStatus !== 'cancelled' && 
          paymentStatus !== 'refunded' &&
          paymentStatus !== 'error' &&
          (status === 'confirmed' || status === 'pending' ||
           paymentStatus === 'paid' || paymentStatus === 'online_payment' ||
           paymentStatus === 'awaiting_payment');
        
        const icon = occupiesSlot ? '🔴' : '🟢';
        
        console.log(`   ${icon} ${b.startTime}-${b.endTime} | ${b.customerName}`);
        console.log(`      Court Name: "${b.courtName}"`);
        console.log(`      Формат даты: ${b.dateFormat}`);
        console.log(`      Status: ${status} | Payment: ${paymentStatus}`);
      });
    }
    
    // Анализ форматов дат
    const dateFormats = {};
    aug11Bookings.forEach(b => {
      dateFormats[b.dateFormat] = (dateFormats[b.dateFormat] || 0) + 1;
    });
    
    console.log('\n📊 Статистика форматов дат:');
    Object.entries(dateFormats).forEach(([format, count]) => {
      console.log(`   ${format}: ${count} бронирований`);
    });
    
    // Проверяем уникальные значения date
    console.log('\n📋 Примеры значений поля date:');
    const uniqueDates = new Set();
    aug11Bookings.slice(0, 5).forEach(b => {
      const dateStr = JSON.stringify(b.date);
      if (!uniqueDates.has(dateStr)) {
        uniqueDates.add(dateStr);
        console.log(`   ${b.dateFormat}: ${dateStr}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
  
  process.exit(0);
}

checkCourtIds();