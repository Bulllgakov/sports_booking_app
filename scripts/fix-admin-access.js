import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

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

async function fixAdminAccess() {
  const email = 'renation@yandex.ru';
  
  console.log(`Checking admin access for ${email}...`);
  
  // Check if admin exists
  const adminsRef = collection(db, 'admins');
  const q = query(adminsRef, where('email', '==', email));
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    console.log('Admin already exists:');
    snapshot.forEach(doc => {
      console.log('ID:', doc.id);
      console.log('Data:', doc.data());
    });
  } else {
    console.log('Admin not found. Checking venues...');
    
    // Check if venue exists
    const venuesRef = collection(db, 'venues');
    const vq = query(venuesRef, where('email', '==', email));
    const venueSnapshot = await getDocs(vq);
    
    if (!venueSnapshot.empty) {
      const venueDoc = venueSnapshot.docs[0];
      const venueId = venueDoc.id;
      console.log('Found venue:', venueId);
      console.log('Venue data:', venueDoc.data());
      
      // Create admin
      console.log('Creating admin...');
      const adminData = {
        name: venueDoc.data().name || 'Администратор',
        email: email,
        role: 'admin',
        venueId: venueId,
        permissions: [
          'manage_bookings',
          'manage_courts', 
          'manage_clients',
          'manage_settings'
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const adminRef = await addDoc(collection(db, 'admins'), adminData);
      console.log('Admin created successfully with ID:', adminRef.id);
      
      // Update venue status to active if it's pending
      if (venueDoc.data().status === 'pending') {
        await updateDoc(doc(db, 'venues', venueId), {
          status: 'active',
          updatedAt: new Date()
        });
        console.log('Venue status updated to active');
      }
      
    } else {
      console.log('No venue found for this email. The registration might have failed.');
    }
  }
}

fixAdminAccess()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });