import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBfAIJJZsLoH4WqYleBcrX2cHp0BVDMiCE",
  authDomain: "sports-booking-app-1d7e5.firebaseapp.com",
  projectId: "sports-booking-app-1d7e5",
  storageBucket: "sports-booking-app-1d7e5.firebasestorage.app",
  messagingSenderId: "648540980109",
  appId: "1:648540980109:web:5b0f0b7e0c8e0c8e1d7e5f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, 'europe-west1');

async function fixAdminAccess() {
  const email = 'renation@yandex.ru';
  
  console.log(`Fixing admin access for ${email}...`);
  
  try {
    const fixAdminAccessFn = httpsCallable(functions, 'fixAdminAccess');
    const result = await fixAdminAccessFn({ email });
    
    console.log('Result:', result.data);
  } catch (error) {
    console.error('Error:', error);
  }
}

fixAdminAccess();