import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  limit,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { addDays, startOfToday } from 'date-fns';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAnp3SY9XEyF-le5q_Tcv-7Le2qqvtz0ZM",
  authDomain: "allcourt.ru",
  projectId: "sports-booking-app-1d7e5",
  storageBucket: "sports-booking-app-1d7e5.firebasestorage.app",
  messagingSenderId: "648540980109",
  appId: "1:648540980109:web:97fbe182c59bb2641ab3c4",
  measurementId: "G-VL4MCP1PZP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test data
const workingHours = {
  'понедельник': { open: '07:00', close: '23:00' },
  'вторник': { open: '07:00', close: '23:00' },
  'среда': { open: '07:00', close: '23:00' },
  'четверг': { open: '07:00', close: '23:00' },
  'пятница': { open: '07:00', close: '23:00' },
  'суббота': { open: '08:00', close: '22:00' },
  'воскресенье': { open: '08:00', close: '22:00' }
};

const amenities = {
  smartpadel: ['parking', 'showers', 'cafe', 'lockers', 'wifi', 'changing_rooms', 'equipment_rental', 'shop'],
  ace: ['parking', 'showers', 'lockers', 'wifi', 'changing_rooms', 'equipment_rental']
};

const photos = {
  smartpadel: [
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80',
    'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80',
    'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&q=80'
  ],
  ace: [
    'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&q=80',
    'https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?w=800&q=80',
    'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&q=80'
  ]
};

const descriptions = {
  smartpadel: 'Современный центр падела с 8 крытыми кортами международного стандарта. Профессиональное покрытие, система климат-контроля, панорамные окна. Школа падела для всех уровней, от начинающих до профессионалов. Проводим турниры и корпоративные мероприятия.',
  ace: 'Премиальный теннисный центр с 6 открытыми грунтовыми кортами и 4 крытыми кортами с покрытием хард. Профессиональная школа тенниса, индивидуальные и групповые занятия. Подготовка к турнирам, детские группы от 4 лет.'
};

async function updateVenueData() {
  console.log('Updating venue data...');
  
  // Find SmartPadel
  const smartPadelQuery = query(
    collection(db, 'venues'),
    where('name', '==', 'SmartPadel'),
    limit(1)
  );
  const smartPadelSnapshot = await getDocs(smartPadelQuery);
  
  if (!smartPadelSnapshot.empty) {
    const smartPadelDoc = smartPadelSnapshot.docs[0];
    await updateDoc(doc(db, 'venues', smartPadelDoc.id), {
      workingHours: workingHours,
      amenities: amenities.smartpadel,
      photos: photos.smartpadel,
      description: descriptions.smartpadel,
      rating: 4.8,
      reviewsCount: 127,
      location: {
        latitude: 55.7558,
        longitude: 37.6173
      },
      updatedAt: serverTimestamp()
    });
    console.log('SmartPadel updated');
  }
  
  // Find Tennis Center Ace
  const aceQuery = query(
    collection(db, 'venues'),
    where('name', '==', 'Теннисный центр Асе'),
    limit(1)
  );
  const aceSnapshot = await getDocs(aceQuery);
  
  if (!aceSnapshot.empty) {
    const aceDoc = aceSnapshot.docs[0];
    await updateDoc(doc(db, 'venues', aceDoc.id), {
      workingHours: workingHours,
      amenities: amenities.ace,
      photos: photos.ace,
      description: descriptions.ace,
      rating: 4.9,
      reviewsCount: 89,
      location: {
        latitude: 55.7340,
        longitude: 37.6082
      },
      updatedAt: serverTimestamp()
    });
    console.log('Tennis Center Ace updated');
  }
}

async function addTestBookings() {
  console.log('Adding test bookings...');
  
  // Get venues
  const smartPadelQuery = query(
    collection(db, 'venues'),
    where('name', '==', 'SmartPadel'),
    limit(1)
  );
  const smartPadelSnapshot = await getDocs(smartPadelQuery);
  
  const aceQuery = query(
    collection(db, 'venues'),
    where('name', '==', 'Теннисный центр Асе'),
    limit(1)
  );
  const aceSnapshot = await getDocs(aceQuery);
  
  if (smartPadelSnapshot.empty || aceSnapshot.empty) {
    console.log('Venues not found');
    return;
  }
  
  const smartPadelId = smartPadelSnapshot.docs[0].id;
  const aceId = aceSnapshot.docs[0].id;
  
  // Get courts for each venue
  const smartPadelCourtsQuery = query(
    collection(db, 'courts'),
    where('venueId', '==', smartPadelId)
  );
  const smartPadelCourts = await getDocs(smartPadelCourtsQuery);
  
  const aceCourtsQuery = query(
    collection(db, 'courts'),
    where('venueId', '==', aceId)
  );
  const aceCourts = await getDocs(aceCourtsQuery);
  
  // Generate bookings for the next 7 days
  const bookings = [];
  const today = startOfToday();
  
  // SmartPadel bookings
  smartPadelCourts.docs.forEach(court => {
    for (let day = 0; day < 7; day++) {
      const date = addDays(today, day);
      
      // Popular morning slots (9-12)
      if (Math.random() > 0.3) {
        bookings.push({
          courtId: court.id,
          courtName: court.data().name,
          venueId: smartPadelId,
          venueName: 'SmartPadel',
          date: Timestamp.fromDate(date),
          time: '09:00',
          gameType: 'double',
          customerName: 'Иван Петров',
          customerPhone: '+7 (999) 123-45-67',
          price: court.data().pricePerHour,
          status: 'confirmed',
          createdAt: serverTimestamp()
        });
      }
      
      if (Math.random() > 0.4) {
        bookings.push({
          courtId: court.id,
          courtName: court.data().name,
          venueId: smartPadelId,
          venueName: 'SmartPadel',
          date: Timestamp.fromDate(date),
          time: '11:00',
          gameType: 'double',
          customerName: 'Мария Сидорова',
          customerPhone: '+7 (999) 234-56-78',
          price: court.data().pricePerHour,
          status: 'confirmed',
          createdAt: serverTimestamp()
        });
      }
      
      // Popular evening slots (18-21)
      if (Math.random() > 0.2) {
        bookings.push({
          courtId: court.id,
          courtName: court.data().name,
          venueId: smartPadelId,
          venueName: 'SmartPadel',
          date: Timestamp.fromDate(date),
          time: '18:00',
          gameType: 'double',
          customerName: 'Алексей Иванов',
          customerPhone: '+7 (999) 345-67-89',
          price: court.data().pricePerHour,
          status: 'confirmed',
          createdAt: serverTimestamp()
        });
      }
      
      if (Math.random() > 0.1) {
        bookings.push({
          courtId: court.id,
          courtName: court.data().name,
          venueId: smartPadelId,
          venueName: 'SmartPadel',
          date: Timestamp.fromDate(date),
          time: '19:00',
          gameType: 'double',
          customerName: 'Елена Козлова',
          customerPhone: '+7 (999) 456-78-90',
          price: court.data().pricePerHour,
          status: 'confirmed',
          createdAt: serverTimestamp()
        });
      }
      
      if (Math.random() > 0.3) {
        bookings.push({
          courtId: court.id,
          courtName: court.data().name,
          venueId: smartPadelId,
          venueName: 'SmartPadel',
          date: Timestamp.fromDate(date),
          time: '20:00',
          gameType: 'double',
          customerName: 'Дмитрий Новиков',
          customerPhone: '+7 (999) 567-89-01',
          price: court.data().pricePerHour,
          status: 'confirmed',
          createdAt: serverTimestamp()
        });
      }
    }
  });
  
  // Tennis Center Ace bookings
  aceCourts.docs.forEach(court => {
    for (let day = 0; day < 7; day++) {
      const date = addDays(today, day);
      
      // Morning slots
      if (Math.random() > 0.5) {
        bookings.push({
          courtId: court.id,
          courtName: court.data().name,
          venueId: aceId,
          venueName: 'Теннисный центр Асе',
          date: Timestamp.fromDate(date),
          time: '08:00',
          gameType: 'single',
          customerName: 'Ольга Смирнова',
          customerPhone: '+7 (999) 678-90-12',
          price: court.data().pricePerHour,
          status: 'confirmed',
          createdAt: serverTimestamp()
        });
      }
      
      if (Math.random() > 0.4) {
        bookings.push({
          courtId: court.id,
          courtName: court.data().name,
          venueId: aceId,
          venueName: 'Теннисный центр Асе',
          date: Timestamp.fromDate(date),
          time: '10:00',
          gameType: 'single',
          customerName: 'Сергей Федоров',
          customerPhone: '+7 (999) 789-01-23',
          price: court.data().pricePerHour,
          status: 'confirmed',
          createdAt: serverTimestamp()
        });
      }
      
      // Afternoon slots
      if (Math.random() > 0.6) {
        bookings.push({
          courtId: court.id,
          courtName: court.data().name,
          venueId: aceId,
          venueName: 'Теннисный центр Асе',
          date: Timestamp.fromDate(date),
          time: '14:00',
          gameType: 'double',
          customerName: 'Анна Васильева',
          customerPhone: '+7 (999) 890-12-34',
          price: court.data().pricePerHour,
          status: 'confirmed',
          createdAt: serverTimestamp()
        });
      }
      
      // Evening slots
      if (Math.random() > 0.3) {
        bookings.push({
          courtId: court.id,
          courtName: court.data().name,
          venueId: aceId,
          venueName: 'Теннисный центр Асе',
          date: Timestamp.fromDate(date),
          time: '17:00',
          gameType: 'single',
          customerName: 'Михаил Орлов',
          customerPhone: '+7 (999) 901-23-45',
          price: court.data().pricePerHour,
          status: 'confirmed',
          createdAt: serverTimestamp()
        });
      }
      
      if (Math.random() > 0.2) {
        bookings.push({
          courtId: court.id,
          courtName: court.data().name,
          venueId: aceId,
          venueName: 'Теннисный центр Асе',
          date: Timestamp.fromDate(date),
          time: '19:00',
          gameType: 'double',
          customerName: 'Екатерина Белова',
          customerPhone: '+7 (999) 012-34-56',
          price: court.data().pricePerHour,
          status: 'confirmed',
          createdAt: serverTimestamp()
        });
      }
    }
  });
  
  // Add all bookings in batches
  const batch = writeBatch(db);
  let batchCount = 0;
  
  for (const booking of bookings) {
    const bookingRef = doc(collection(db, 'bookings'));
    batch.set(bookingRef, booking);
    batchCount++;
    
    // Firestore batch limit is 500
    if (batchCount === 500) {
      await batch.commit();
      batchCount = 0;
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
  }
  
  console.log(`Added ${bookings.length} test bookings`);
}

async function addTestCustomers() {
  console.log('Adding test customers...');
  
  const customers = [
    {
      name: 'Иван Петров',
      phone: '+7 (999) 123-45-67',
      email: 'ivan.petrov@example.com',
      totalBookings: 24,
      favoriteVenue: 'SmartPadel',
      createdAt: serverTimestamp()
    },
    {
      name: 'Мария Сидорова',
      phone: '+7 (999) 234-56-78',
      email: 'maria.sidorova@example.com',
      totalBookings: 18,
      favoriteVenue: 'SmartPadel',
      createdAt: serverTimestamp()
    },
    {
      name: 'Алексей Иванов',
      phone: '+7 (999) 345-67-89',
      email: 'alexey.ivanov@example.com',
      totalBookings: 31,
      favoriteVenue: 'SmartPadel',
      createdAt: serverTimestamp()
    },
    {
      name: 'Елена Козлова',
      phone: '+7 (999) 456-78-90',
      email: 'elena.kozlova@example.com',
      totalBookings: 15,
      favoriteVenue: 'SmartPadel',
      createdAt: serverTimestamp()
    },
    {
      name: 'Дмитрий Новиков',
      phone: '+7 (999) 567-89-01',
      email: 'dmitry.novikov@example.com',
      totalBookings: 22,
      favoriteVenue: 'SmartPadel',
      createdAt: serverTimestamp()
    },
    {
      name: 'Ольга Смирнова',
      phone: '+7 (999) 678-90-12',
      email: 'olga.smirnova@example.com',
      totalBookings: 45,
      favoriteVenue: 'Теннисный центр Асе',
      createdAt: serverTimestamp()
    },
    {
      name: 'Сергей Федоров',
      phone: '+7 (999) 789-01-23',
      email: 'sergey.fedorov@example.com',
      totalBookings: 38,
      favoriteVenue: 'Теннисный центр Асе',
      createdAt: serverTimestamp()
    },
    {
      name: 'Анна Васильева',
      phone: '+7 (999) 890-12-34',
      email: 'anna.vasileva@example.com',
      totalBookings: 12,
      favoriteVenue: 'Теннисный центр Асе',
      createdAt: serverTimestamp()
    },
    {
      name: 'Михаил Орлов',
      phone: '+7 (999) 901-23-45',
      email: 'mikhail.orlov@example.com',
      totalBookings: 29,
      favoriteVenue: 'Теннисный центр Асе',
      createdAt: serverTimestamp()
    },
    {
      name: 'Екатерина Белова',
      phone: '+7 (999) 012-34-56',
      email: 'ekaterina.belova@example.com',
      totalBookings: 19,
      favoriteVenue: 'Теннисный центр Асе',
      createdAt: serverTimestamp()
    }
  ];
  
  for (const customer of customers) {
    await addDoc(collection(db, 'customers'), customer);
  }
  
  console.log(`Added ${customers.length} test customers`);
}

async function main() {
  try {
    console.log('Starting to add test data...');
    
    // Update venue data
    await updateVenueData();
    
    // Add test bookings
    await addTestBookings();
    
    // Add test customers
    await addTestCustomers();
    
    console.log('Test data added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding test data:', error);
    process.exit(1);
  }
}

main();