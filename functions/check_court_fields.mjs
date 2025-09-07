import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Инициализация с дефолтными credentials
initializeApp({
  projectId: 'sports-booking-app-1d7e5'
});

const db = getFirestore();

async function checkCourtFields() {
  try {
    console.log('Проверка всех полей кортов...\n');
    
    // Получаем клуб Олимпия
    const olympia = await db.collection('venues')
      .where('name', '==', 'Олимпия')
      .get();
    
    if (!olympia.empty) {
      const venueDoc = olympia.docs[0];
      console.log(`Клуб: Олимпия (ID: ${venueDoc.id})\n`);
      
      // Получаем корты
      const courts = await db.collection('venues')
        .doc(venueDoc.id)
        .collection('courts')
        .get();
      
      courts.forEach(courtDoc => {
        const courtData = courtDoc.data();
        console.log(`Корт ID: ${courtDoc.id}`);
        console.log('Все поля корта:');
        console.log(JSON.stringify(courtData, null, 2));
        console.log('----------------------------\n');
      });
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
  
  process.exit();
}

checkCourtFields();