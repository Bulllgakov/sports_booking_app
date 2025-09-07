const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function callParseFunction() {
  console.log('Вызываем Cloud Function parseClubs для Казани...\n');
  
  try {
    // Получаем токен авторизации
    const auth = admin.auth();
    
    // Параметры запроса как в админке
    const requestData = {
      data: {
        city: 'Казань',
        sport: 'padel', 
        bbox: '48.95,55.65,49.35,55.95',
        center: '49.106911,55.796129',
        keywords: ['падел', 'padel', 'падел клуб', 'padel club']
      }
    };
    
    // Вызываем Cloud Function напрямую через HTTP
    const fetch = require('node-fetch');
    const response = await fetch('https://europe-west1-sports-booking-app-1d7e5.cloudfunctions.net/parseClubs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await admin.auth().createCustomToken('test-superadmin')}`
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Ошибка вызова функции:', error);
      return;
    }
    
    const result = await response.json();
    
    if (result.result && result.result.clubs) {
      console.log(`Найдено клубов: ${result.result.clubs.length}\n`);
      
      result.result.clubs.forEach((club, index) => {
        console.log(`${index + 1}. ${club.name}`);
        console.log(`   Адрес: ${club.address}`);
        console.log(`   Сайт: ${club.website || 'НЕТ САЙТА'}`);
        console.log(`   Телефоны: ${club.phones?.join(', ') || 'НЕТ'}`);
        console.log(`   Фото: ${club.photos?.length || 0} шт.`);
        if (club.photos && club.photos.length > 0) {
          const photoType = club.photos[0].includes('streetview') ? 'Street View' :
                           club.photos[0].includes('staticmap') ? 'Static Map' :
                           club.photos[0].includes('place/photo') ? 'Google Places' : 'Other';
          console.log(`   Тип фото: ${photoType}`);
        }
        console.log(`   Теги: ${club.tags?.slice(0, 3).join(', ') || 'НЕТ'}`);
        console.log('---\n');
      });
    } else {
      console.log('Клубы не найдены или ошибка в ответе');
      console.log('Ответ:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
  
  process.exit(0);
}

callParseFunction();