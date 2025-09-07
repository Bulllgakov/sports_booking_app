// Script to list all clubs with payment settings
const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'sports-booking-app-1d7e5'
});

const db = admin.firestore();

async function listClubsWithPayment() {
  console.log('Загрузка клубов с настройками оплаты...\n');
  
  try {
    const venuesSnapshot = await db.collection('venues').get();
    console.log(`Всего клубов в системе: ${venuesSnapshot.size}\n`);
    
    console.log('=== КЛУБЫ С НАСТРОЕННЫМ ЭКВАЙРИНГОМ ===\n');
    
    const clubsWithPayment = [];
    
    venuesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Проверяем, есть ли настройки оплаты
      if (data.paymentEnabled || data.paymentProvider || data.paymentCredentials) {
        clubsWithPayment.push({
          id: doc.id,
          name: data.name || 'Без названия',
          provider: data.paymentProvider || 'не указан',
          enabled: data.paymentEnabled || false,
          paymentType: data.paymentType || 'не установлен',
          hasCredentials: !!data.paymentCredentials
        });
      }
    });
    
    if (clubsWithPayment.length === 0) {
      console.log('Нет клубов с настроенным эквайрингом');
    } else {
      clubsWithPayment.forEach((club, index) => {
        console.log(`${index + 1}. ${club.name}`);
        console.log(`   ID: ${club.id}`);
        console.log(`   Провайдер: ${club.provider}`);
        console.log(`   Статус: ${club.enabled ? 'Активен' : 'Не активен'}`);
        console.log(`   Тип платежей: ${club.paymentType}`);
        console.log(`   Учетные данные: ${club.hasCredentials ? 'Есть' : 'Нет'}`);
        console.log('');
      });
    }
    
    console.log('\n=== ВСЕ КЛУБЫ В СИСТЕМЕ ===\n');
    
    venuesSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.name || 'Без названия'} (ID: ${doc.id})`);
    });
    
    console.log('\n✅ Готово!');
    
  } catch (error) {
    console.error('Ошибка:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the script
listClubsWithPayment();