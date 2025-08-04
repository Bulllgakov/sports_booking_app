// Прямое подключение к Firestore и удаление проблемных бронирований
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Инициализация с проектом
const app = initializeApp({
  projectId: 'sports-booking-app-1d7e5'
});

const db = getFirestore();

async function cleanupBookings() {
  console.log('🔍 Поиск проблемных бронирований...\n');
  
  try {
    // Ищем все бронирования, которые могут вызывать проблему
    const problematicBookings = [];
    
    // 1. Бронирования с online_payment
    const onlinePaymentQuery = await db
      .collection('bookings')
      .where('paymentStatus', '==', 'online_payment')
      .get();
    
    console.log(`Найдено ${onlinePaymentQuery.size} бронирований с paymentStatus='online_payment'`);
    onlinePaymentQuery.forEach(doc => {
      problematicBookings.push({ id: doc.id, ...doc.data() });
    });
    
    // 2. Бронирования от web-client
    const webClientQuery = await db
      .collection('bookings')
      .where('createdBy.userId', '==', 'web-client')
      .get();
    
    console.log(`Найдено ${webClientQuery.size} бронирований с createdBy.userId='web-client'`);
    webClientQuery.forEach(doc => {
      if (!problematicBookings.find(b => b.id === doc.id)) {
        problematicBookings.push({ id: doc.id, ...doc.data() });
      }
    });
    
    // 3. Бронирования с source=web
    const webSourceQuery = await db
      .collection('bookings')
      .where('source', '==', 'web')
      .get();
    
    console.log(`Найдено ${webSourceQuery.size} бронирований с source='web'`);
    webSourceQuery.forEach(doc => {
      if (!problematicBookings.find(b => b.id === doc.id)) {
        problematicBookings.push({ id: doc.id, ...doc.data() });
      }
    });
    
    console.log(`\n📊 Всего проблемных бронирований: ${problematicBookings.length}`);
    
    if (problematicBookings.length === 0) {
      console.log('✅ Проблемных бронирований не найдено');
      return;
    }
    
    // Показываем примеры
    console.log('\n📝 Примеры бронирований для удаления:');
    problematicBookings.slice(0, 3).forEach(booking => {
      console.log(`- ${booking.id}: ${booking.courtName || 'Без названия'}, ${booking.date}, ${booking.startTime || booking.time}`);
    });
    
    // Спрашиваем подтверждение
    console.log(`\n⚠️  Будет удалено ${problematicBookings.length} бронирований.`);
    console.log('Нажмите Ctrl+C чтобы отменить, или подождите 3 секунды для продолжения...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Удаляем
    console.log('\n🗑️  Удаление бронирований...');
    let deleted = 0;
    
    for (const booking of problematicBookings) {
      try {
        await db.collection('bookings').doc(booking.id).delete();
        deleted++;
        if (deleted % 10 === 0) {
          console.log(`Удалено ${deleted} из ${problematicBookings.length}...`);
        }
      } catch (error) {
        console.error(`Ошибка при удалении ${booking.id}:`, error.message);
      }
    }
    
    console.log(`\n✅ Успешно удалено ${deleted} бронирований!`);
    console.log('Теперь календарь в админке должен работать.');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

// Запускаем
cleanupBookings()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  });