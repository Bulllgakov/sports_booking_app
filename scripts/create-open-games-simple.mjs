import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, getDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

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

async function createTestOpenGames() {
  try {
    // Используем SmartPadel для тестов
    const venueId = 'sL4XrpuUw988P1Gq89Bt'; // SmartPadel
    const venueDoc = await getDoc(doc(db, 'venues', venueId));
    
    if (!venueDoc.exists()) {
      console.log('SmartPadel venue not found');
      return;
    }

    const venue = { id: venueDoc.id, ...venueDoc.data() };
    console.log(`Using test venue: ${venue.name}`);

    // Получаем корты SmartPadel
    const courtsQuery = query(
      collection(db, 'venues', venueId, 'courts'),
      where('status', '==', 'active')
    );
    const courtsSnapshot = await getDocs(courtsQuery);
    
    if (courtsSnapshot.empty) {
      console.log('No active courts found for SmartPadel');
      return;
    }

    const courts = [];
    courtsSnapshot.forEach(doc => {
      courts.push({ id: doc.id, ...doc.data() });
    });
    console.log(`Found ${courts.length} active courts`);

    // Даты с 15 по 30 августа 2025
    const dates = [];
    for (let day = 15; day <= 30; day++) {
      dates.push(new Date(2025, 7, day)); // 7 = август (месяцы с 0)
    }

    const times = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
    const levels = ['любой', 'начинающий', 'средний', 'продвинутый'];
    const names = ['Александр', 'Дмитрий', 'Михаил', 'Сергей', 'Андрей', 'Елена', 'Ольга', 'Иван', 'Петр', 'Анна'];
    
    // Создаем 10 тестовых игр
    for (let i = 0; i < 10; i++) {
      const court = courts[Math.floor(Math.random() * courts.length)];
      const date = dates[Math.floor(Math.random() * dates.length)];
      const time = times[Math.floor(Math.random() * times.length)];
      
      // Рассчитываем цену
      const pricePerHour = court.pricePerHour || court.priceWeekday || 2000;
      const duration = 60; // 1 час
      const totalPrice = pricePerHour;
      const maxPlayers = court.type === 'padel' ? 4 : court.type === 'tennis' ? 4 : 6;
      const pricePerPlayer = Math.round(totalPrice / maxPlayers);
      
      // Случайное количество текущих игроков (от 1 до maxPlayers-1)
      const currentPlayers = 1 + Math.floor(Math.random() * (maxPlayers - 1));

      const players = [];
      const organizerName = names[Math.floor(Math.random() * names.length)];
      
      // Добавляем организатора
      players.push({
        id: 'test-user-' + i,
        name: organizerName,
        status: 'confirmed',
        joinedAt: new Date()
      });

      // Добавляем остальных игроков
      for (let j = 1; j < currentPlayers; j++) {
        players.push({
          id: 'test-player-' + i + '-' + j,
          name: names[Math.floor(Math.random() * names.length)],
          status: 'confirmed',
          joinedAt: new Date()
        });
      }

      const gameData = {
        venueId: venue.id,
        venueName: venue.name,
        courtId: court.id,
        courtName: court.name,
        sport: court.type,
        date: date,
        dateString: formatDateString(date),
        time: time,
        duration: duration,
        maxPlayers: maxPlayers,
        currentPlayers: currentPlayers,
        totalPrice: totalPrice,
        pricePerPlayer: pricePerPlayer,
        level: levels[Math.floor(Math.random() * levels.length)],
        description: `Ищем игроков для ${court.type === 'padel' ? 'падела' : court.type === 'tennis' ? 'тенниса' : 'бадминтона'}`,
        organizer: {
          id: 'test-user-' + i,
          name: organizerName,
          phone: '+7 (999) 123-45-67'
        },
        players: players,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      try {
        const docRef = await addDoc(collection(db, 'openGames'), gameData);
        console.log(`Created game: ${gameData.courtName} on ${gameData.dateString} at ${gameData.time} (${gameData.currentPlayers}/${gameData.maxPlayers} players)`);
      } catch (error) {
        console.error('Error adding game:', error);
      }
    }

    console.log('Successfully created all test open games!');

  } catch (error) {
    console.error('Error creating test games:', error);
  }
}

function formatDateString(date) {
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

createTestOpenGames();