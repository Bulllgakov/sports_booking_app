import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Firebase config
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
const auth = getAuth(app);
const db = getFirestore(app);

async function createSuperAdmin() {
  try {
    // Superadmin credentials
    const email = 'superadmin@allcourt.ru';
    const password = 'AllCourt2024Super!';
    
    console.log('🚀 Создаем суперадминистратора платформы "Все Корты"...');
    
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('✅ Пользователь создан в Firebase Auth:', user.uid);
    
    // Create superadmin document in Firestore
    await setDoc(doc(db, 'admins', user.uid), {
      name: 'Суперадминистратор',
      email: email,
      role: 'superadmin',
      venueId: null, // Суперадмин не привязан к конкретному клубу
      permissions: [
        'manage_all_venues',
        'manage_all_bookings', 
        'manage_all_users',
        'manage_platform_settings',
        'view_all_reports',
        'manage_finance',
        'manage_admins'
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Суперадминистратор создан в Firestore');
    console.log('\n👑 Данные суперадмина:');
    console.log('Email:', email);
    console.log('Пароль:', password);
    console.log('Роль: superadmin');
    console.log('\n⚠️  ВАЖНО: Текущая админка не поддерживает полный функционал суперадмина!');
    console.log('Необходимо доработать интерфейс для управления всеми клубами.');
    
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('ℹ️  Суперадминистратор уже существует');
      console.log('\n👑 Данные для входа:');
      console.log('Email: superadmin@allcourt.ru');
      console.log('Пароль: AllCourt2024Super!');
    } else {
      console.error('❌ Ошибка при создании суперадминистратора:', error);
    }
    process.exit(1);
  }
}

// Run the function
createSuperAdmin();