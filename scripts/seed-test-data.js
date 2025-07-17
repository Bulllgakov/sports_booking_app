import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

// Firebase config from firebase.ts
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

async function seedTestData() {
  try {
    console.log('🚀 Начинаем создание тестовых данных...');

    // Create test venue
    const venueData = {
      name: 'Спортивный клуб "Чемпион"',
      address: 'ул. Ленина, 25, Москва',
      phone: '+7 (495) 123-45-67',
      city: 'Москва',
      photos: [
        'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=800&q=80',
        'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80'
      ],
      logoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80',
      rating: 4.8,
      amenities: ['showers', 'parking', 'cafe', 'lockers'],
      workingHours: {
        weekday: '07:00-23:00',
        weekend: '08:00-22:00'
      },
      description: 'Современный спортивный клуб с профессиональными кортами для тенниса, падела и бадминтона. У нас есть все необходимое для комфортной игры: раздевалки с душевыми, парковка, кафе и прокат снаряжения.',
      organizationType: 'ooo',
      inn: '7707083893',
      bankAccount: '40702810900000123456',
      paymentEnabled: true,
      status: 'active',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const venueRef = await addDoc(collection(db, 'venues'), venueData);
    console.log('✅ Создан клуб:', venueData.name, 'ID:', venueRef.id);

    // Create 4 courts for this venue
    const courts = [
      {
        name: 'Падел корт 1',
        type: 'padel',
        courtType: 'indoor',
        priceWeekday: 1900,
        priceWeekend: 2400,
        status: 'active',
        venueId: venueRef.id,
        createdAt: Timestamp.now()
      },
      {
        name: 'Падел корт 2',
        type: 'padel',
        courtType: 'indoor',
        priceWeekday: 1900,
        priceWeekend: 2400,
        status: 'active',
        venueId: venueRef.id,
        createdAt: Timestamp.now()
      },
      {
        name: 'Теннисный корт 1',
        type: 'tennis',
        courtType: 'outdoor',
        priceWeekday: 2500,
        priceWeekend: 3000,
        status: 'active',
        venueId: venueRef.id,
        createdAt: Timestamp.now()
      },
      {
        name: 'Бадминтон',
        type: 'badminton',
        courtType: 'indoor',
        priceWeekday: 1200,
        priceWeekend: 1500,
        status: 'active',
        venueId: venueRef.id,
        createdAt: Timestamp.now()
      }
    ];

    for (const court of courts) {
      const courtRef = await addDoc(collection(db, 'courts'), court);
      console.log('✅ Создан корт:', court.name, 'ID:', courtRef.id);
    }

    // Create another venue
    const venueData2 = {
      name: 'Теннисный центр "Ace"',
      address: 'пр. Мира, 89, Москва',
      phone: '+7 (495) 987-65-43',
      city: 'Москва',
      photos: [
        'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=800&q=80',
        'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&q=80'
      ],
      rating: 4.6,
      amenities: ['showers', 'parking', 'proshop'],
      workingHours: {
        weekday: '06:00-23:00',
        weekend: '07:00-22:00'
      },
      description: 'Профессиональный теннисный центр с крытыми и открытыми кортами. Школа тенниса для детей и взрослых.',
      status: 'active',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const venueRef2 = await addDoc(collection(db, 'venues'), venueData2);
    console.log('✅ Создан клуб:', venueData2.name, 'ID:', venueRef2.id);

    // Create 2 courts for second venue
    const courts2 = [
      {
        name: 'Центральный корт',
        type: 'tennis',
        courtType: 'indoor',
        priceWeekday: 3000,
        priceWeekend: 3500,
        status: 'active',
        venueId: venueRef2.id,
        createdAt: Timestamp.now()
      },
      {
        name: 'Корт №2',
        type: 'tennis',
        courtType: 'outdoor',
        priceWeekday: 2200,
        priceWeekend: 2700,
        status: 'active',
        venueId: venueRef2.id,
        createdAt: Timestamp.now()
      }
    ];

    for (const court of courts2) {
      const courtRef = await addDoc(collection(db, 'courts'), court);
      console.log('✅ Создан корт:', court.name, 'ID:', courtRef.id);
    }

    console.log('\n🎉 Все тестовые данные успешно созданы!');
    console.log('📱 Теперь вы можете увидеть эти клубы в мобильном приложении');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при создании тестовых данных:', error);
    process.exit(1);
  }
}

// Run the seed function
seedTestData();