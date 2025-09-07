const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkCourtsSportTypes() {
  try {
    console.log('Проверка видов спорта в кортах...\n');
    
    // Получаем все клубы
    const venuesSnapshot = await db.collection('venues').get();
    console.log(`Найдено клубов: ${venuesSnapshot.size}\n`);
    
    let clubsWithCourts = 0;
    let totalCourts = 0;
    let courtsWithSportType = 0;
    let sportTypesFound = {};
    
    for (const venueDoc of venuesSnapshot.docs) {
      const venueData = venueDoc.data();
      const venueName = venueData.name || 'Без названия';
      
      // Получаем корты для каждого клуба
      const courtsSnapshot = await db.collection('venues')
        .doc(venueDoc.id)
        .collection('courts')
        .get();
      
      if (courtsSnapshot.size > 0) {
        clubsWithCourts++;
        console.log(`\nКлуб: ${venueName} (ID: ${venueDoc.id})`);
        console.log(`  Кортов: ${courtsSnapshot.size}`);
        
        courtsSnapshot.forEach(courtDoc => {
          totalCourts++;
          const courtData = courtDoc.data();
          const courtName = courtData.name || 'Без названия';
          const sportType = courtData.sportType;
          
          console.log(`    - ${courtName}: sportType = ${sportType || 'НЕ УКАЗАН'}`);
          
          if (sportType) {
            courtsWithSportType++;
            // Подсчитываем виды спорта
            const sportTypeLower = sportType.toLowerCase();
            sportTypesFound[sportTypeLower] = (sportTypesFound[sportTypeLower] || 0) + 1;
          }
        });
      }
    }
    
    console.log('\n========================================');
    console.log('ИТОГОВАЯ СТАТИСТИКА:');
    console.log(`Всего клубов: ${venuesSnapshot.size}`);
    console.log(`Клубов с кортами: ${clubsWithCourts}`);
    console.log(`Всего кортов: ${totalCourts}`);
    console.log(`Кортов с указанным видом спорта: ${courtsWithSportType}`);
    console.log(`Кортов БЕЗ вида спорта: ${totalCourts - courtsWithSportType}`);
    
    console.log('\nНайденные виды спорта:');
    Object.entries(sportTypesFound).forEach(([sport, count]) => {
      console.log(`  ${sport}: ${count} кортов`);
    });
    
    // Проверим конкретно клуб "Олимпия"
    console.log('\n========================================');
    console.log('ПРОВЕРКА КЛУБА "ОЛИМПИЯ":');
    const olympiaQuery = await db.collection('venues')
      .where('name', '==', 'Олимпия')
      .get();
    
    if (!olympiaQuery.empty) {
      const olympiaDoc = olympiaQuery.docs[0];
      const olympiaCourts = await db.collection('venues')
        .doc(olympiaDoc.id)
        .collection('courts')
        .get();
      
      console.log(`Найден клуб Олимпия (ID: ${olympiaDoc.id})`);
      console.log(`Кортов: ${olympiaCourts.size}`);
      
      olympiaCourts.forEach(courtDoc => {
        const courtData = courtDoc.data();
        console.log(`  Корт "${courtData.name}": sportType = ${courtData.sportType}`);
      });
    } else {
      console.log('Клуб "Олимпия" не найден');
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
  
  process.exit();
}

checkCourtsSportTypes();