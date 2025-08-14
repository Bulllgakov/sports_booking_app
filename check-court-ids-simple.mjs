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
  console.log('🔍 Анализ courtId и форматов дат в бронированиях на 11 августа...\n');

  try {
    // Получаем все бронирования
    const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
    
    const aug11Bookings = [];
    const targetDate = '2025-08-11';
    
    bookingsSnapshot.forEach(doc => {
      const booking = doc.data();
      
      // Получаем дату в строковом формате
      let dateStr = '';
      let dateFormat = 'unknown';
      let rawDate = booking.date;
      
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
          courtId: booking.courtId || null,
          courtName: booking.courtName,
          customerName: booking.customerName,
          startTime: booking.startTime || booking.time,
          endTime: booking.endTime,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          dateFormat: dateFormat,
          dateStr: dateStr,
          rawDate: rawDate
        });
      }
    });
    
    console.log(`Найдено бронирований на 11 августа: ${aug11Bookings.length}\n`);
    
    // Анализируем наличие courtId
    const withCourtId = aug11Bookings.filter(b => b.courtId);
    const withoutCourtId = aug11Bookings.filter(b => !b.courtId);
    
    console.log(`✅ С courtId: ${withCourtId.length} бронирований`);
    console.log(`❌ БЕЗ courtId: ${withoutCourtId.length} бронирований\n`);
    
    // Показываем уникальные courtId
    const uniqueCourtIds = [...new Set(withCourtId.map(b => b.courtId))];
    console.log('📋 Уникальные courtId:');
    uniqueCourtIds.forEach(id => {
      const count = withCourtId.filter(b => b.courtId === id).length;
      const names = [...new Set(withCourtId.filter(b => b.courtId === id).map(b => b.courtName))];
      console.log(`   ${id}: ${count} бронирований (название: ${names.join(', ')})`);
    });
    
    // Показываем бронирования без courtId
    if (withoutCourtId.length > 0) {
      console.log('\n⚠️  Бронирования БЕЗ courtId (они не будут видны в модальном окне!):');
      console.log('=' .repeat(60));
      
      withoutCourtId.forEach(b => {
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
        
        const icon = occupiesSlot ? '🔴 ЗАНЯТ' : '🟢 свободен';
        
        console.log(`${icon} ${b.startTime}-${b.endTime} | ${b.courtName} | ${b.customerName}`);
        console.log(`     Status: ${status} | Payment: ${paymentStatus}`);
        console.log(`     ID: ${b.id}`);
      });
    }
    
    // Анализ форматов дат
    const dateFormats = {};
    aug11Bookings.forEach(b => {
      dateFormats[b.dateFormat] = (dateFormats[b.dateFormat] || 0) + 1;
    });
    
    console.log('\n📊 Форматы дат:');
    Object.entries(dateFormats).forEach(([format, count]) => {
      console.log(`   ${format}: ${count} бронирований`);
    });
    
    // Показываем примеры значений date
    console.log('\n📅 Примеры значений поля date:');
    const seen = new Set();
    aug11Bookings.forEach(b => {
      const key = b.dateFormat;
      if (!seen.has(key)) {
        seen.add(key);
        if (b.dateFormat === 'string') {
          console.log(`   ${b.dateFormat}: "${b.rawDate}"`);
        } else if (b.dateFormat === 'timestamp') {
          console.log(`   ${b.dateFormat}: Timestamp { seconds: ${b.rawDate?.seconds}, nanoseconds: ${b.rawDate?.nanoseconds} }`);
        } else {
          console.log(`   ${b.dateFormat}: ${JSON.stringify(b.rawDate)}`);
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
  
  process.exit(0);
}

checkCourtIds();