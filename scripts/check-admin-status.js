import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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
const db = getFirestore(app);

async function checkAdminStatus() {
  const adminId = 'MoYGmNzUS1U6N4zgnSTq';
  
  console.log(`Checking admin ${adminId}...`);
  
  try {
    const adminDoc = await getDoc(doc(db, 'admins', adminId));
    
    if (adminDoc.exists()) {
      const adminData = adminDoc.data();
      console.log('Admin data:', adminData);
      
      // Check venue
      if (adminData.venueId) {
        const venueDoc = await getDoc(doc(db, 'venues', adminData.venueId));
        if (venueDoc.exists()) {
          console.log('\nVenue data:', venueDoc.data());
        }
      }
    } else {
      console.log('Admin not found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAdminStatus();