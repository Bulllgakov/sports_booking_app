const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Инициализация Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'allcourt-2025'
});

const db = admin.firestore();

async function migrateSubscriptionPlans() {
  console.log('🚀 Начинаем миграцию тарифов...');
  
  try {
    // Получаем все подписки
    const subscriptionsSnapshot = await db.collection('subscriptions').get();
    
    let updated = 0;
    let skipped = 0;
    
    for (const doc of subscriptionsSnapshot.docs) {
      const data = doc.data();
      let needsUpdate = false;
      let newPlan = data.plan;
      
      // Преобразуем старые названия в новые
      if (data.plan === 'start') {
        newPlan = 'basic';
        needsUpdate = true;
      } else if (data.plan === 'standard') {
        newPlan = 'crm';
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await doc.ref.update({
          plan: newPlan,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Обновлен тариф для подписки ${doc.id}: ${data.plan} → ${newPlan}`);
        updated++;
      } else {
        skipped++;
      }
    }
    
    console.log(`\n📊 Результаты миграции:`);
    console.log(`✅ Обновлено: ${updated} подписок`);
    console.log(`⏭️ Пропущено: ${skipped} подписок (уже имеют новые названия)`);
    console.log(`📝 Всего обработано: ${subscriptionsSnapshot.size} подписок`);
    
  } catch (error) {
    console.error('❌ Ошибка при миграции:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Запускаем миграцию
migrateSubscriptionPlans();