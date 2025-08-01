import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCo7Y42v1p5cqKZKBBBvJCfqJRe4b_pdKs",
  authDomain: "sports-booking-app-1d7e5.firebaseapp.com",
  projectId: "sports-booking-app-1d7e5",
  storageBucket: "sports-booking-app-1d7e5.appspot.com",
  messagingSenderId: "144537904920",
  appId: "1:144537904920:web:9303bd5a8e8f926f37bb81"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listVenues() {
  try {
    const venuesSnapshot = await getDocs(collection(db, 'venues'));
    console.log(`Found ${venuesSnapshot.size} venues:\n`);
    
    venuesSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`Name: ${data.name}`);
      console.log(`Status: ${data.status}`);
      console.log(`Address: ${data.address}`);
      console.log('---');
    });
  } catch (error) {
    console.error('Error listing venues:', error);
  }
}

listVenues();