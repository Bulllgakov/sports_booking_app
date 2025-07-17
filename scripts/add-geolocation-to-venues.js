import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, GeoPoint } from 'firebase/firestore';

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
const db = getFirestore(app);

// Moscow locations for test venues
const venueLocations = {
  'SmartPadel': {
    latitude: 55.7522,  // Near Moscow center
    longitude: 37.6156,
    city: 'Москва'
  },
  'Теннисный центр "Ace"': {
    latitude: 55.7939,  // North Moscow
    longitude: 37.6176,
    city: 'Москва'
  }
};

async function addGeolocationToVenues() {
  try {
    console.log('🌍 Добавляем геолокацию к клубам...');
    
    // Get all venues
    const venuesSnapshot = await getDocs(collection(db, 'venues'));
    
    for (const venueDoc of venuesSnapshot.docs) {
      const venueData = venueDoc.data();
      const venueName = venueData.name;
      
      if (venueLocations[venueName]) {
        const location = venueLocations[venueName];
        
        // Update venue with geolocation
        await updateDoc(doc(db, 'venues', venueDoc.id), {
          location: new GeoPoint(location.latitude, location.longitude),
          city: location.city,
          updatedAt: new Date()
        });
        
        console.log(`✅ Обновлен ${venueName}:`);
        console.log(`   📍 Координаты: ${location.latitude}, ${location.longitude}`);
        console.log(`   🏙️  Город: ${location.city}`);
      }
    }
    
    console.log('\n🎉 Геолокация успешно добавлена!');
    console.log('📱 Теперь в приложении будет показываться расстояние до клубов');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при добавлении геолокации:', error);
    process.exit(1);
  }
}

// Run the update
addGeolocationToVenues();