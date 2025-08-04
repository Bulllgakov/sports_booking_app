// Прямое удаление через Firebase Admin SDK
const admin = require('firebase-admin');

// Инициализация если еще не инициализирован
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function deleteWebBookings() {
  console.log('🔍 Поиск бронирований для удаления...\n');
  
  try {
    // Собираем все проблемные бронирования
    const queries = await Promise.all([
      db.collection('bookings')
        .where('source', '==', 'web')
        .where('paymentMethod', '==', 'online')
        .get(),
      
      db.collection('bookings')
        .where('paymentStatus', '==', 'online_payment')
        .get(),
      
      db.collection('bookings')
        .where('createdBy.userId', '==', 'web-client')
        .get()
    ]);
    
    // Собираем уникальные ID
    const bookingIds = new Set();
    
    queries.forEach((query, index) => {
      console.log(`Запрос ${index + 1}: найдено ${query.size} бронирований`);
      query.docs.forEach(doc => bookingIds.add(doc.id));
    });
    
    const totalBookings = bookingIds.size;
    console.log(`\n📊 Всего уникальных бронирований к удалению: ${totalBookings}`);
    
    if (totalBookings === 0) {
      console.log('✅ Нет бронирований для удаления');
      return { success: true, deletedBookings: 0, deletedPayments: 0 };
    }
    
    // Удаляем бронирования
    console.log('\n🗑️  Удаление бронирований...');
    const bookingIdsArray = Array.from(bookingIds);
    let deletedCount = 0;
    
    // Удаляем батчами по 500
    for (let i = 0; i < bookingIdsArray.length; i += 500) {
      const batch = db.batch();
      const batchIds = bookingIdsArray.slice(i, i + 500);
      
      batchIds.forEach(id => {
        batch.delete(db.collection('bookings').doc(id));
      });
      
      await batch.commit();
      deletedCount += batchIds.length;
      console.log(`✅ Удалено ${deletedCount} из ${totalBookings}`);
    }
    
    // Удаляем связанные платежи
    console.log('\n💰 Удаление связанных платежей...');
    let deletedPayments = 0;
    
    for (const bookingId of bookingIdsArray) {
      const payments = await db.collection('payments')
        .where('bookingId', '==', bookingId)
        .get();
      
      if (!payments.empty) {
        const batch = db.batch();
        payments.docs.forEach(doc => {
          batch.delete(doc.ref);
          deletedPayments++;
        });
        await batch.commit();
      }
    }
    
    console.log(`\n🎉 Готово!`);
    console.log(`   Удалено бронирований: ${deletedCount}`);
    console.log(`   Удалено платежей: ${deletedPayments}`);
    
    return {
      success: true,
      deletedBookings: deletedCount,
      deletedPayments: deletedPayments,
      message: `Успешно удалено ${deletedCount} бронирований и ${deletedPayments} платежей`
    };
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    return { success: false, error: error.message };
  }
}

// Запускаем функцию
deleteWebBookings()
  .then(result => {
    console.log('\n📋 Результат:', JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Критическая ошибка:', err);
    process.exit(1);
  });