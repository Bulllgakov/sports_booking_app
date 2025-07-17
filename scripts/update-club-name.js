import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

// Firebase config from firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyAnp3SY9XEyF-le5q_Tcv-7Le2qqvtz0ZM",
  authDomain: "sports-booking-app-1d7e5.firebaseapp.com",
  projectId: "sports-booking-app-1d7e5",
  storageBucket: "sports-booking-app-1d7e5.firebasestorage.app",
  messagingSenderId: "648540980109",
  appId: "1:648540980109:web:97fbe182c59bb2641ab3c4",
  measurementId: "G-VL4MCP1PZP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateClubName() {
  try {
    console.log('🔍 Ищем клуб "Спортивный клуб Чемпион"...');
    
    // Find the venue with the old name
    const q = query(collection(db, 'venues'), where('name', '==', 'Спортивный клуб "Чемпион"'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('❌ Клуб не найден');
      return;
    }
    
    // Update the venue name
    const venueDoc = snapshot.docs[0];
    const venueRef = doc(db, 'venues', venueDoc.id);
    
    await updateDoc(venueRef, {
      name: 'SmartPadel',
      description: 'Современный падел-клуб с профессиональными кортами. У нас есть все необходимое для комфортной игры: раздевалки с душевыми, парковка, кафе и прокат снаряжения.',
      updatedAt: new Date()
    });
    
    console.log('✅ Название клуба успешно изменено на SmartPadel');
    console.log('🎉 ID клуба:', venueDoc.id);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при обновлении названия:', error);
    process.exit(1);
  }
}

// Run the update function
updateClubName();