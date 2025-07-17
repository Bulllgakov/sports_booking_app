import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';

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

async function createAdminUser() {
  try {
    // Admin credentials
    const email = 'admin@smartpadel.com';
    const password = 'SmartPadel2024!';
    const venueId = 'sL4XrpuUw988P1Gq89Bt'; // SmartPadel venue ID
    
    console.log('🚀 Создаем администратора для SmartPadel...');
    
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('✅ Пользователь создан в Firebase Auth:', user.uid);
    
    // Create admin document in Firestore
    await setDoc(doc(db, 'admins', user.uid), {
      name: 'Администратор SmartPadel',
      email: email,
      role: 'admin',
      venueId: venueId,
      permissions: ['manage_bookings', 'manage_courts', 'manage_club', 'view_reports'],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Администратор создан в Firestore');
    console.log('\n📧 Данные для входа в админку:');
    console.log('Email:', email);
    console.log('Пароль:', password);
    console.log('\n🔗 Админка доступна по адресу: http://localhost:8080/admin/login');
    
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('ℹ️  Пользователь с таким email уже существует');
      console.log('\n📧 Данные для входа в админку:');
      console.log('Email: admin@smartpadel.com');
      console.log('Пароль: SmartPadel2024!');
      console.log('\n🔗 Админка доступна по адресу: http://localhost:8080/admin/login');
    } else {
      console.error('❌ Ошибка при создании администратора:', error);
    }
    process.exit(1);
  }
}

// Run the function
createAdminUser();