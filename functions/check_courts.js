const admin = require('firebase-admin');

// Инициализация с дефолтными учетными данными
admin.initializeApp();

const db = admin.firestore();

async function checkCourts() {
  try {
    // Получаем все клубы
    const venuesSnapshot = await db.collection('venues').get();
    
    console.log(`Проверяем корты для ${venuesSnapshot.size} клубов:\n`);
    
    for (const venueDoc of venuesSnapshot.docs) {
      const venueData = venueDoc.data();
      const venueId = venueDoc.id;
      
      console.log(`\n📍 ${venueData.name} (ID: ${venueId}):`);
      
      // Проверяем поле courts
      if (venueData.courts && Array.isArray(venueData.courts)) {
        console.log(`  - Поле courts (массив): ${venueData.courts.length} кортов`);
        venueData.courts.forEach((court, index) => {
          console.log(`    ${index + 1}. ${court.name || court.title || 'Без названия'} (${court.type || 'тип не указан'})`);
        });
      } else {
        console.log(`  - Поле courts: отсутствует или не массив`);
      }
      
      // Проверяем коллекцию courts
      const courtsCollection = await db.collection('venues').doc(venueId).collection('courts').get();
      if (!courtsCollection.empty) {
        console.log(`  - Коллекция courts: ${courtsCollection.size} документов`);
        courtsCollection.forEach(courtDoc => {
          const courtData = courtDoc.data();
          console.log(`    • ${courtData.name || courtData.title || 'Без названия'} (ID: ${courtDoc.id})`);
        });
      } else {
        console.log(`  - Коллекция courts: пусто`);
      }
      
      // Проверяем подписку
      const subQuery = await db.collection('subscriptions')
        .where('venueId', '==', venueId)
        .where('status', 'in', ['active', 'trial'])
        .get();
      
      if (!subQuery.empty) {
        const subData = subQuery.docs[0].data();
        console.log(`  - Подписка: ${subData.plan}, кортов в usage: ${subData.usage?.courtsCount || 0}`);
      } else {
        console.log(`  - Подписка: не найдена`);
      }
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    process.exit();
  }
}

checkCourts();