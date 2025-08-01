import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '../sports-booking-app-1d7e5-firebase-adminsdk-1qjgw-b49f8b2a76.json'), 'utf8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function createTestOpenGames() {
  try {
    // Используем SmartPadel для тестов
    const venueId = 'SmartPadel';
    const venueDoc = await db.collection('venues').doc(venueId).get();
    
    if (!venueDoc.exists) {
      console.log('SmartPadel venue not found');
      return;
    }

    const venue = { id: venueDoc.id, ...venueDoc.data() };
    console.log(`Using test venue: ${venue.name}`);

    // Получаем корты SmartPadel
    const courtsSnapshot = await db.collection('venues').doc(venueId)
      .collection('courts')
      .where('status', '==', 'active')
      .get();
    
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
    
    const gamesToCreate = [];

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

      const gameData = {
        venueId: venue.id,
        venueName: venue.name,
        courtId: court.id,
        courtName: court.name,
        sport: court.type,
        date: admin.firestore.Timestamp.fromDate(date),
        dateString: formatDateString(date),
        time: time,
        duration: duration,
        maxPlayers: maxPlayers,
        currentPlayers: currentPlayers,
        totalPrice: totalPrice,
        pricePerPlayer: pricePerPlayer,
        level: levels[Math.floor(Math.random() * levels.length)],
        description: `Ищем игроков для ${court.type === 'padel' ? 'падела' : court.type === 'tennis' ? 'тенниса' : 'бадминтона'}. Уровень: ${levels[Math.floor(Math.random() * levels.length)]}`,
        organizer: {
          id: 'test-user-' + i,
          name: names[Math.floor(Math.random() * names.length)],
          phone: '+7 (999) 123-45-67'
        },
        players: [],
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Добавляем организатора в список игроков
      gameData.players.push({
        id: gameData.organizer.id,
        name: gameData.organizer.name,
        status: 'confirmed',
        joinedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Добавляем остальных игроков
      for (let j = 1; j < currentPlayers; j++) {
        gameData.players.push({
          id: 'test-player-' + i + '-' + j,
          name: names[Math.floor(Math.random() * names.length)],
          status: 'confirmed',
          joinedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      gamesToCreate.push(gameData);
    }

    // Создаем игры в базе данных
    console.log(`Creating ${gamesToCreate.length} open games...`);
    
    for (const game of gamesToCreate) {
      const docRef = await db.collection('openGames').add(game);
      console.log(`Created game: ${game.courtName} on ${game.dateString} at ${game.time} (${game.currentPlayers}/${game.maxPlayers} players)`);
    }

    console.log('Successfully created all test open games!');
    process.exit(0);

  } catch (error) {
    console.error('Error creating test games:', error);
    process.exit(1);
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