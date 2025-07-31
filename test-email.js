import { initializeApp } from 'firebase/app';
import { getFirestore, addDoc, collection } from 'firebase/firestore';

// Firebase конфигурация
const firebaseConfig = {
  apiKey: "AIzaSyAJcZKZl5NFiDKN-MLHOb8C0KdjGtpG6oc",
  authDomain: "sports-booking-app-1d7e5.firebaseapp.com",
  projectId: "sports-booking-app-1d7e5",
  storageBucket: "sports-booking-app-1d7e5.appspot.com",
  messagingSenderId: "648540980109",
  appId: "1:648540980109:web:a7e7b9f65b0df2c4dd3bd9",
  measurementId: "G-BQT2VC3XWJ"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Отправка тестового письма
async function sendTestEmail() {
  try {
    const docRef = await addDoc(collection(db, 'mail'), {
      to: ['vahitovbr@gmail.com'],
      message: {
        subject: 'Тест отправки email через Firebase Extension',
        text: 'Это тестовое письмо для проверки работы Firebase Extension для отправки email.',
        html: '<p>Это <strong>тестовое письмо</strong> для проверки работы Firebase Extension для отправки email.</p>'
      }
    });
    console.log('Письмо добавлено в очередь с ID:', docRef.id);
  } catch (error) {
    console.error('Ошибка при добавлении письма:', error);
  }
}

sendTestEmail();