const admin = require('firebase-admin');

// Инициализация с дефолтными учетными данными
admin.initializeApp();

const db = admin.firestore();

async function createMissingSubscriptions() {
  try {
    // Получаем все клубы
    const venuesSnapshot = await db.collection('venues').get();
    
    console.log(`Найдено ${venuesSnapshot.size} клубов`);
    
    const results = [];
    
    for (const venueDoc of venuesSnapshot.docs) {
      const venueData = venueDoc.data();
      const venueId = venueDoc.id;
      
      // Проверяем, есть ли у клуба активная подписка
      const subQuery = await db.collection('subscriptions')
        .where('venueId', '==', venueId)
        .where('status', 'in', ['active', 'trial'])
        .get();
      
      if (subQuery.empty) {
        // Создаем подписку START
        const subscriptionData = {
          venueId: venueId,
          plan: 'start',
          status: 'active',
          startDate: admin.firestore.FieldValue.serverTimestamp(),
          endDate: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          usage: {
            courtsCount: venueData.courts?.length || 0,
            bookingsThisMonth: 0,
            smsEmailsSent: 0,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
          }
        };
        
        const newSubRef = await db.collection('subscriptions').add(subscriptionData);
        
        console.log(`✅ ${venueData.name}: создана подписка START (${venueData.courts?.length || 0} кортов)`);
        
        results.push({
          venueId: venueId,
          venueName: venueData.name,
          courtsCount: venueData.courts?.length || 0,
          subscriptionId: newSubRef.id,
          status: 'created'
        });
      } else {
        console.log(`⏭️  ${venueData.name}: подписка уже существует`);
        
        results.push({
          venueId: venueId,
          venueName: venueData.name,
          status: 'already_exists'
        });
      }
    }
    
    const created = results.filter(r => r.status === 'created').length;
    const skipped = results.filter(r => r.status === 'already_exists').length;
    
    console.log(`\n✅ Итого: создано ${created} подписок, пропущено ${skipped}`);
    
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    process.exit();
  }
}

createMissingSubscriptions();