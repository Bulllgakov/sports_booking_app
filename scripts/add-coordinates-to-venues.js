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

// Координаты для клубов в Москве
const venueCoordinates = {
  'SmartPadel': {
    lat: 55.7539,
    lng: 37.6208,
    address: 'ул. Тверская, 12, Москва'
  },
  'Теннисный центр Ace': {
    lat: 55.7600,
    lng: 37.6420,
    address: 'Цветной бульвар, 15, Москва'
  },
  'Padel Club Moscow': {
    lat: 55.7415,
    lng: 37.6156,
    address: 'ул. Большая Якиманка, 26, Москва'
  },
  'Tennis Park': {
    lat: 55.7700,
    lng: 37.5950,
    address: 'Ленинградский проспект, 36, Москва'
  },
  'Sport Life': {
    lat: 55.7350,
    lng: 37.5880,
    address: 'Кутузовский проспект, 48, Москва'
  }
};

async function updateVenuesWithCoordinates() {
  try {
    console.log('🗺️  Добавляем координаты для клубов...');
    
    const venuesSnapshot = await getDocs(collection(db, 'venues'));
    
    for (const venueDoc of venuesSnapshot.docs) {
      const venueData = venueDoc.data();
      const venueName = venueData.name;
      
      // Находим координаты для клуба
      const coords = Object.entries(venueCoordinates).find(([key, _]) => 
        venueName.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(venueName.toLowerCase())
      );
      
      if (coords) {
        const [_, coordData] = coords;
        const location = new GeoPoint(coordData.lat, coordData.lng);
        
        await updateDoc(doc(db, 'venues', venueDoc.id), {
          location: location,
          address: coordData.address,
          city: 'Москва',
          updatedAt: new Date()
        });
        
        console.log(`✅ Обновлен ${venueName}:`, coordData);
      } else {
        // Если нет специфических координат, используем случайные в пределах Москвы
        const randomLat = 55.7558 + (Math.random() - 0.5) * 0.1;
        const randomLng = 37.6173 + (Math.random() - 0.5) * 0.2;
        const location = new GeoPoint(randomLat, randomLng);
        
        await updateDoc(doc(db, 'venues', venueDoc.id), {
          location: location,
          city: 'Москва',
          updatedAt: new Date()
        });
        
        console.log(`✅ Обновлен ${venueName} (случайные координаты):`, { lat: randomLat, lng: randomLng });
      }
    }
    
    console.log('\n✅ Все клубы обновлены с координатами!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

// Запускаем обновление
updateVenuesWithCoordinates();