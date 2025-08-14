const admin = require('firebase-admin');
const path = require('path');

// Инициализация Firebase Admin
const serviceAccount = require('../functions/sports-booking-app-1d7e5-firebase-adminsdk-l8j87-51baafb1a0.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://sports-booking-app-1d7e5.firebaseio.com"
});

const db = admin.firestore();

async function analyzeAndFixBookings() {
  console.log('🔍 Анализ бронирований...\n');

  try {
    // Получаем все бронирования
    const bookingsSnapshot = await db.collection('bookings').get();
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
      errors: []
    };

    const batch = db.batch();
    let batchCount = 0;
    const maxBatchSize = 500;

    for (const doc of bookingsSnapshot.docs) {
      const booking = doc.data();
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
          const createdAt = booking.createdAt?.toDate() || new Date(booking.createdAt);
          const now = new Date();
          const diffInHours = (now - createdAt) / (1000 * 60 * 60);
          
          if (diffInHours > 24) {
            // Если прошло больше суток - считаем истекшим
            newPaymentStatus = 'expired';
          } else {
            newPaymentStatus = 'awaiting_payment';
          }
        }

        console.log(`📝 Исправление бронирования ${doc.id}:`);
        console.log(`   Status: ${booking.status || 'нет'} → PaymentStatus: ${newPaymentStatus}`);
        
        batch.update(doc.ref, {
          paymentStatus: newPaymentStatus,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        stats.fixed++;
        batchCount++;

        // Если достигли лимита batch, выполняем и создаем новый
        if (batchCount >= maxBatchSize) {
          await batch.commit();
          console.log(`✅ Обновлено ${batchCount} записей`);
          batchCount = 0;
          // Создаем новый batch
          batch = db.batch();
        }
      }
      
      // Проверяем несоответствия между status и paymentStatus
      if (booking.status === 'confirmed' && 
          booking.paymentStatus && 
          booking.paymentStatus !== 'paid' && 
          booking.paymentStatus !== 'online_payment' &&
          booking.paymentStatus !== 'not_required') {
        console.log(`⚠️  Несоответствие в ${doc.id}:`);
        console.log(`   Status: ${booking.status}, PaymentStatus: ${booking.paymentStatus}`);
        
        // Исправляем несоответствие
        batch.update(doc.ref, {
          paymentStatus: 'paid',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        stats.fixed++;
        batchCount++;
      }
      
      // Проверяем отмененные бронирования
      if (booking.status === 'cancelled' && 
          booking.paymentStatus && 
          booking.paymentStatus === 'awaiting_payment') {
        console.log(`⚠️  Отмененное бронирование с ожиданием оплаты ${doc.id}`);
        
        // Исправляем
        batch.update(doc.ref, {
          paymentStatus: 'cancelled',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        stats.fixed++;
        batchCount++;
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
      const updatedSnapshot = await db.collection('bookings')
        .where('paymentStatus', '==', null)
        .get();
      console.log(`Осталось без paymentStatus: ${updatedSnapshot.size}`);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

// Добавляем проверку занятости слотов
async function checkSlotOccupancy() {
  console.log('\n🔍 Проверка занятости слотов...\n');
  
  try {
    // Получаем бронирования на сегодня и завтра
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const bookingsSnapshot = await db.collection('bookings')
      .where('date', '>=', admin.firestore.Timestamp.fromDate(today))
      .where('date', '<=', admin.firestore.Timestamp.fromDate(tomorrow))
      .get();
    
    console.log(`Бронирований на сегодня-завтра: ${bookingsSnapshot.size}\n`);
    
    const occupyingSlots = [];
    const freeSlots = [];
    
    bookingsSnapshot.forEach(doc => {
      const booking = doc.data();
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
        occupyingSlots.push({
          id: doc.id,
          courtId: booking.courtId,
          date: booking.date?.toDate?.() || booking.date,
          time: booking.startTime || booking.time,
          status: status,
          paymentStatus: paymentStatus
        });
      } else {
        freeSlots.push({
          id: doc.id,
          courtId: booking.courtId,
          date: booking.date?.toDate?.() || booking.date,
          time: booking.startTime || booking.time,
          status: status,
          paymentStatus: paymentStatus
        });
      }
    });
    
    console.log('📍 Слоты, которые ЗАНИМАЮТ корт:');
    occupyingSlots.forEach(slot => {
      console.log(`  ${slot.id}: ${slot.time} | Status: ${slot.status} | Payment: ${slot.paymentStatus}`);
    });
    
    console.log('\n✅ Слоты, которые НЕ занимают корт:');
    freeSlots.forEach(slot => {
      console.log(`  ${slot.id}: ${slot.time} | Status: ${slot.status} | Payment: ${slot.paymentStatus}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при проверке слотов:', error);
  }
}

// Запускаем анализ и исправление
async function main() {
  console.log('🚀 Запуск скрипта исправления статусов бронирований\n');
  
  await analyzeAndFixBookings();
  await checkSlotOccupancy();
  
  console.log('\n✅ Скрипт завершен');
  process.exit(0);
}

main();