import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAnp3SY9XEyF-le5q_Tcv-7Le2qqvtz0ZM",
  authDomain: "sports-booking-app-1d7e5.firebaseapp.com",
  databaseURL: "https://sports-booking-app-1d7e5-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "sports-booking-app-1d7e5",
  storageBucket: "sports-booking-app-1d7e5.firebasestorage.app",
  messagingSenderId: "648540980109",
  appId: "1:648540980109:web:97fbe182c59bb2641ab3c4",
  measurementId: "G-VL4MCP1PZP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function testLogin() {
  const email = 'renation@yandex.ru';
  const password = 'qweqwe';
  
  console.log(`Testing login for ${email}...`);
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Login successful!');
    console.log('User ID:', userCredential.user.uid);
    console.log('Email:', userCredential.user.email);
    console.log('Email verified:', userCredential.user.emailVerified);
  } catch (error) {
    console.error('❌ Login failed:', error.code, error.message);
  }
}

testLogin();