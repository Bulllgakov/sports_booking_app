const admin = require('firebase-admin');

// Инициализация с дефолтными учетными данными
admin.initializeApp();

const db = admin.firestore();

async function updateCourtsCount() {
  try {
    // Получаем все клубы
    const venuesSnapshot = await db.collection('venues').get();
    
    console.log(`Проверяем ${venuesSnapshot.size} клубов...`);
    
    for (const venueDoc of venuesSnapshot.docs) {
      const venueData = venueDoc.data();
      const venueId = venueDoc.id;
      const actualCourtsCount = venueData.courts?.length || 0;
      
      // Получаем активную подписку клуба
      const subQuery = await db.collection('subscriptions')
        .where('venueId', '==', venueId)
        .where('status', 'in', ['active', 'trial'])
        .get();
      
      if (!subQuery.empty) {
        const subDoc = subQuery.docs[0];
        const subData = subDoc.data();
        const currentCourtsCount = subData.usage?.courtsCount || 0;
        
        // Обновляем количество кортов, если оно отличается
        if (currentCourtsCount !== actualCourtsCount) {
          await subDoc.ref.update({
            'usage.courtsCount': actualCourtsCount,
            'usage.lastUpdated': admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`✅ ${venueData.name}: обновлено количество кортов ${currentCourtsCount} → ${actualCourtsCount}`);
        } else {
          console.log(`⏭️  ${venueData.name}: количество кортов актуально (${actualCourtsCount})`);
        }
      } else {
        console.log(`❌ ${venueData.name}: активная подписка не найдена`);
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