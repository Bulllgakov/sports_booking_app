import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  where,
  Timestamp,
  writeBatch
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

async function analyzeAndFixBookings() {
  console.log('🔍 Анализ бронирований...\n');

  try {
    // Получаем все бронирования
    const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
    console.log(`Всего бронирований: ${bookingsSnapshot.size}\n`);

    const stats = {
      total: 0,
      withPaymentStatus: 0,
      withoutPaymentStatus: 0,
      awaitingPayment: 0,
      paid: 0,
      onlinePayment: 0,
      cancelled: 0,
      refunded: 0,
      error: 0,
      expired: 0,
      notRequired: 0,
      fixed: 0,
      needsFix: []
    };

    let batch = writeBatch(db);
    let batchCount = 0;
    const maxBatchSize = 400; // Firebase лимит - 500, оставляем запас

    for (const docSnapshot of bookingsSnapshot.docs) {
      const booking = docSnapshot.data();
      const bookingId = docSnapshot.id;
      stats.total++;

      // Проверяем наличие paymentStatus
      if (booking.paymentStatus) {
        stats.withPaymentStatus++;
        
        // Подсчитываем по типам
        switch (booking.paymentStatus) {
          case 'awaiting_payment':
            stats.awaitingPayment++;
            break;
          case 'paid':
            stats.paid++;
            break;
          case 'online_payment':
            stats.onlinePayment++;
            break;
          case 'cancelled':
            stats.cancelled++;
            break;
          case 'refunded':
            stats.refunded++;
            break;
          case 'error':
            stats.error++;
            break;
          case 'expired':
            stats.expired++;
            break;
          case 'not_required':
            stats.notRequired++;
            break;
        }

        // Проверяем несоответствия между status и paymentStatus
        if (booking.status === 'confirmed' && 
            booking.paymentStatus !== 'paid' && 
            booking.paymentStatus !== 'online_payment' &&
            booking.paymentStatus !== 'not_required') {
          console.log(`⚠️  Несоответствие в ${bookingId}:`);
          console.log(`   Status: ${booking.status}, PaymentStatus: ${booking.paymentStatus}`);
          console.log(`   → Исправляем paymentStatus на 'paid'`);
          
          batch.update(doc(db, 'bookings', bookingId), {
            paymentStatus: 'paid',
            updatedAt: Timestamp.now()
          });
          stats.fixed++;
          stats.needsFix.push({ id: bookingId, reason: 'status-mismatch' });
          batchCount++;
        }
        
        // Проверяем отмененные бронирования с неверным paymentStatus
        if (booking.status === 'cancelled' && 
            booking.paymentStatus === 'awaiting_payment') {
          console.log(`⚠️  Отмененное бронирование с ожиданием оплаты ${bookingId}`);
          console.log(`   → Исправляем paymentStatus на 'cancelled'`);
          
          batch.update(doc(db, 'bookings', bookingId), {
            paymentStatus: 'cancelled',
            updatedAt: Timestamp.now()
          });
          stats.fixed++;
          stats.needsFix.push({ id: bookingId, reason: 'cancelled-awaiting' });
          batchCount++;
        }
      } else {
        stats.withoutPaymentStatus++;
        
        // Добавляем paymentStatus на основе status
        let newPaymentStatus = 'awaiting_payment';
        
        if (booking.status === 'confirmed') {
          // Если подтверждено, считаем оплаченным
          newPaymentStatus = 'paid';
        } else if (booking.status === 'cancelled') {
          // Если отменено
          newPaymentStatus = 'cancelled';
        } else if (booking.status === 'pending') {
          // Если ожидает - проверяем давность
          const createdAt = booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
          const now = new Date();
          const diffInHours = (now - createdAt) / (1000 * 60 * 60);
          
          if (diffInHours > 24) {
            // Если прошло больше суток - считаем истекшим
            newPaymentStatus = 'expired';
          } else {
            newPaymentStatus = 'awaiting_payment';
          }
        }

        console.log(`📝 Добавление paymentStatus для ${bookingId}:`);
        console.log(`   Status: ${booking.status || 'нет'} → PaymentStatus: ${newPaymentStatus}`);
        
        batch.update(doc(db, 'bookings', bookingId), {
          paymentStatus: newPaymentStatus,
          updatedAt: Timestamp.now()
        });
        
        stats.fixed++;
        stats.needsFix.push({ id: bookingId, reason: 'missing-payment-status' });
        batchCount++;
      }

      // Если достигли лимита batch, выполняем и создаем новый
      if (batchCount >= maxBatchSize) {
        await batch.commit();
        console.log(`✅ Обновлено ${batchCount} записей`);
        batchCount = 0;
        batch = writeBatch(db); // Создаем новый batch
      }
    }

    // Выполняем оставшиеся обновления
    if (batchCount > 0) {
      await batch.commit();
      console.log(`✅ Обновлено ${batchCount} записей`);
    }

    // Выводим статистику
    console.log('\n📊 Статистика:');
    console.log('═══════════════════════════════════════');
    console.log(`Всего бронирований: ${stats.total}`);
    console.log(`С paymentStatus: ${stats.withPaymentStatus}`);
    console.log(`Без paymentStatus: ${stats.withoutPaymentStatus}`);
    console.log('\nРаспределение по статусам оплаты:');
    console.log(`  Ожидает оплаты: ${stats.awaitingPayment}`);
    console.log(`  Оплачено: ${stats.paid}`);
    console.log(`  Онлайн оплата: ${stats.onlinePayment}`);
    console.log(`  Отменено: ${stats.cancelled}`);
    console.log(`  Возвращено: ${stats.refunded}`);
    console.log(`  Ошибка: ${stats.error}`);
    console.log(`  Истекло: ${stats.expired}`);
    console.log(`  Не требуется: ${stats.notRequired}`);
    console.log('\n✅ Исправлено записей: ' + stats.fixed);

    // Проверяем результат
    if (stats.fixed > 0) {
      console.log('\n🔄 Проверка результатов...');
      const q = query(collection(db, 'bookings'), where('paymentStatus', '==', null));
      const updatedSnapshot = await getDocs(q);
      console.log(`Осталось без paymentStatus: ${updatedSnapshot.size}`);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

// Проверка занятости слотов на сегодня
async function checkTodaySlots() {
  console.log('\n🔍 Проверка занятости слотов на сегодня...\n');
  
  try {
    // Получаем бронирования на сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Запрашиваем все бронирования (без фильтрации по дате из-за разных форматов)
    const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
    
    const todayBookings = [];
    const todayDateStr = today.toISOString().split('T')[0];
    
    bookingsSnapshot.forEach(docSnapshot => {
      const booking = docSnapshot.data();
      const bookingDate = booking.date;
      
      // Проверяем разные форматы даты
      let dateStr = '';
      if (typeof bookingDate === 'string') {
        dateStr = bookingDate;
      } else if (bookingDate?.toDate) {
        dateStr = bookingDate.toDate().toISOString().split('T')[0];
      } else if (bookingDate?.seconds) {
        dateStr = new Date(bookingDate.seconds * 1000).toISOString().split('T')[0];
      }
      
      if (dateStr === todayDateStr) {
        todayBookings.push({
          id: docSnapshot.id,
          ...booking
        });
      }
    });
    
    console.log(`Бронирований на сегодня: ${todayBookings.length}\n`);
    
    const occupyingSlots = [];
    const freeSlots = [];
    
    todayBookings.forEach(booking => {
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
      
      const slotInfo = {
        id: booking.id,
        courtName: booking.courtName,
        time: booking.startTime || booking.time,
        endTime: booking.endTime,
        status: status,
        paymentStatus: paymentStatus,
        customerName: booking.customerName
      };
      
      if (occupiesSlot) {
        occupyingSlots.push(slotInfo);
      } else {
        freeSlots.push(slotInfo);
      }
    });
    
    // Сортируем по времени
    occupyingSlots.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    freeSlots.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    
    if (occupyingSlots.length > 0) {
      console.log('📍 Слоты, которые ЗАНИМАЮТ корт:');
      occupyingSlots.forEach(slot => {
        console.log(`  ${slot.time}-${slot.endTime} | ${slot.courtName} | ${slot.customerName}`);
        console.log(`    Status: ${slot.status} | Payment: ${slot.paymentStatus}`);
      });
    }
    
    if (freeSlots.length > 0) {
      console.log('\n✅ Слоты, которые НЕ занимают корт:');
      freeSlots.forEach(slot => {
        console.log(`  ${slot.time}-${slot.endTime} | ${slot.courtName} | ${slot.customerName}`);
        console.log(`    Status: ${slot.status} | Payment: ${slot.paymentStatus}`);
      });
    }
    
    if (occupyingSlots.length === 0 && freeSlots.length === 0) {
      console.log('Нет бронирований на сегодня');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке слотов:', error);
  }
}

// Запускаем анализ и исправление
async function main() {
  console.log('🚀 Запуск скрипта исправления статусов бронирований\n');
  console.log('Подключение к Firebase...\n');
  
  await analyzeAndFixBookings();
  await checkTodaySlots();
  
  console.log('\n✅ Скрипт завершен');
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});