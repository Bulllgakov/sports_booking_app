const admin = require('firebase-admin');

// Инициализация с дефолтными учетными данными
admin.initializeApp();

const db = admin.firestore();

async function updateCourtsCount() {
  try {
    // Получаем все клубы
    const venuesSnapshot = await db.collection('venues').get();
    
    console.log(`Обновляем количество кортов для ${venuesSnapshot.size} клубов:\n`);
    
    for (const venueDoc of venuesSnapshot.docs) {
      const venueData = venueDoc.data();
      const venueId = venueDoc.id;
      
      // Получаем корты из подколлекции
      const courtsCollection = await db.collection('venues').doc(venueId).collection('courts').get();
      const actualCourtsCount = courtsCollection.size;
      
      console.log(`\n📍 ${venueData.name}:`);
      console.log(`  - Найдено кортов в подколлекции: ${actualCourtsCount}`);
      
      // Получаем активную подписку клуба
      const subQuery = await db.collection('subscriptions')
        .where('venueId', '==', venueId)
        .where('status', 'in', ['active', 'trial'])
        .get();
      
      if (!subQuery.empty) {
        const subDoc = subQuery.docs[0];
        const subData = subDoc.data();
        const currentCourtsCount = subData.usage?.courtsCount || 0;
        
        // Обновляем количество кортов
        if (currentCourtsCount !== actualCourtsCount) {
          await subDoc.ref.update({
            'usage.courtsCount': actualCourtsCount,
            'usage.lastUpdated': admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`  ✅ Обновлено: ${currentCourtsCount} → ${actualCourtsCount}`);
        } else {
          console.log(`  ⏭️  Количество кортов уже актуально: ${actualCourtsCount}`);
        }
      } else {
        console.log(`  ❌ Активная подписка не найдена`);
      }
    }
    
    console.log('\n✅ Обновление завершено');
    
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    process.exit();
  }
}

updateCourtsCount();