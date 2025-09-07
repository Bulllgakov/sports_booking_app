import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Инициализация с дефолтными credentials
initializeApp({
  projectId: 'sports-booking-app-1d7e5'
});

const db = getFirestore();

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
    let clubsWithTennis = [];
    
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
        let hasTennis = false;
        
        courtsSnapshot.forEach(courtDoc => {
          totalCourts++;
          const courtData = courtDoc.data();
          const sportType = courtData.sportType;
          
          if (sportType) {
            courtsWithSportType++;
            // Подсчитываем виды спорта
            const sportTypeLower = sportType.toLowerCase();
            sportTypesFound[sportTypeLower] = (sportTypesFound[sportTypeLower] || 0) + 1;
            
            if (sportTypeLower === 'tennis' || sportTypeLower === 'теннис') {
              hasTennis = true;
            }
          }
        });
        
        if (hasTennis) {
          clubsWithTennis.push(venueName);
        }
      }
    }
    
    console.log('========================================');
    console.log('ИТОГОВАЯ СТАТИСТИКА:');
    console.log(`Всего клубов: ${venuesSnapshot.size}`);
    console.log(`Клубов с кортами: ${clubsWithCourts}`);
    console.log(`Всего кортов: ${totalCourts}`);
    console.log(`Кортов с указанным видом спорта: ${courtsWithSportType}`);
    console.log(`Кортов БЕЗ вида спорта: ${totalCourts - courtsWithSportType}`);
    
    console.log('\nНайденные виды спорта:');
    Object.entries(sportTypesFound).forEach(([sport, count]) => {
      console.log(`  "${sport}": ${count} кортов`);
    });
    
    console.log(`\nКлубы с теннисными кортами (${clubsWithTennis.length}):`);
    clubsWithTennis.forEach(club => {
      console.log(`  - ${club}`);
    });
    
    // Проверим конкретно клуб "Олимпия"
    console.log('\n========================================');
    console.log('ДЕТАЛЬНАЯ ПРОВЕРКА КЛУБОВ С ТЕННИСОМ:');
    
    // Ищем все клубы со словом "Олимпия"
    const venuesWithOlympia = await db.collection('venues')
      .get();
    
    for (const doc of venuesWithOlympia.docs) {
      const data = doc.data();
      if (data.name && data.name.toLowerCase().includes('олимп')) {
        const courts = await db.collection('venues')
          .doc(doc.id)
          .collection('courts')
          .get();
        
        console.log(`\nКлуб: ${data.name} (ID: ${doc.id})`);
        console.log(`  Город: ${data.city || 'не указан'}`);
        console.log(`  Статус: ${data.status || 'не указан'}`);
        console.log(`  Кортов: ${courts.size}`);
        
        courts.forEach(courtDoc => {
          const courtData = courtDoc.data();
          console.log(`    Корт "${courtData.name}": sportType = "${courtData.sportType || 'НЕ УКАЗАН'}"`);
        });
      }
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
  
  process.exit();
}

checkCourtsSportTypes();