import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAnp3SY9XEyF-le5q_Tcv-7Le2qqvtz0ZM",
  authDomain: "sports-booking-app-1d7e5.firebaseapp.com",
  projectId: "sports-booking-app-1d7e5",
  storageBucket: "sports-booking-app-1d7e5.appspot.com",
  messagingSenderId: "1025055227687",
  appId: "1:1025055227687:web:3fae8e87d646e716871e8f"
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, 'europe-west1');
const auth = getAuth(app);

async function createSubscriptions() {
  try {
    // Авторизуемся как суперадмин
    console.log('Авторизация...');
    await signInWithEmailAndPassword(auth, 'admin@allcourt.ru', 'admin123');
    
    console.log('Вызов функции createMissingSubscriptions...');
    const createMissingSubscriptions = httpsCallable(functions, 'createMissingSubscriptions');
    const result = await createMissingSubscriptions({});
    
    console.log('Результат:', result.data);
    
    if (result.data.results) {
      console.log('\nДетали по клубам:');
      result.data.results.forEach(r => {
        if (r.status === 'created') {
          console.log(`✅ ${r.venueName}: создана подписка START (${r.courtsCount} кортов)`);
        } else {
          console.log(`⏭️  ${r.venueName}: подписка уже существует`);
        }
      });
    }
    
    console.log(`\nИтого: создано ${result.data.created} подписок, пропущено ${result.data.skipped}`);
  } catch (error) {
    console.error('Ошибка:', error);
  }
  
  process.exit();
}

createSubscriptions();