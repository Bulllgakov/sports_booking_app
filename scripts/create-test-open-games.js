const admin = require('firebase-admin');
const serviceAccount = require('../sports-booking-app-1d7e5-firebase-adminsdk-1qjgw-b49f8b2a76.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function createTestOpenGames() {
  try {
    // Получаем активные клубы
    const venuesSnapshot = await db.collection('venues')
      .where('status', '==', 'active')
      .limit(3)
      .get();
    
    if (venuesSnapshot.empty) {
      console.log('No active venues found');
      return;
    }

    const venues = [];
    venuesSnapshot.forEach(doc => {
      venues.push({ id: doc.id, ...doc.data() });
    });

    console.log(`Found ${venues.length} active venues`);

    // Даты с 15 по 30 августа 2025
    const dates = [];
    for (let day = 15; day <= 30; day++) {
      dates.push(new Date(2025, 7, day)); // 7 = август (месяцы с 0)
    }

    const gameTypes = ['padel', 'tennis', 'badminton'];
    const times = ['10:00', '14:00', '18:00', '20:00'];
    const gamesToCreate = [];

    // Создаем игры для каждого клуба
    for (const venue of venues) {
      // Получаем корты клуба
      const courtsSnapshot = await db.collection('venues').doc(venue.id)
        .collection('courts')
        .where('status', '==', 'active')
        .get();
      
      if (courtsSnapshot.empty) {
        console.log(`No active courts for venue ${venue.name}`);
        continue;
      }

      const courts = [];
      courtsSnapshot.forEach(doc => {
        courts.push({ id: doc.id, ...doc.data() });
      });

      // Создаем 3-4 игры для каждого клуба
      const numGames = 3 + Math.floor(Math.random() * 2);
      
      for (let i = 0; i < numGames; i++) {
        const court = courts[Math.floor(Math.random() * courts.length)];
        const date = dates[Math.floor(Math.random() * dates.length)];
        const time = times[Math.floor(Math.random() * times.length)];
        
        // Рассчитываем цену на основе цены корта
        const pricePerHour = court.pricePerHour || court.priceWeekday || 2000;
        const duration = 60; // 1 час
        const totalPrice = pricePerHour;
        const maxPlayers = court.type === 'padel' ? 4 : court.type === 'tennis' ? 4 : 6;
        const pricePerPlayer = Math.round(totalPrice / maxPlayers);

        const gameData = {
          venueId: venue.id,
          venueName: venue.name,
          courtId: court.id,
          courtName: court.name,
          sport: court.type,
          date: admin.firestore.Timestamp.fromDate(date),
          dateString: `${date.getDate()} августа`,
          time: time,
          duration: duration,
          maxPlayers: maxPlayers,
          currentPlayers: 1 + Math.floor(Math.random() * (maxPlayers - 1)), // 1 до maxPlayers-1
          totalPrice: totalPrice,
          pricePerPlayer: pricePerPlayer,
          level: ['любой', 'начинающий', 'средний', 'продвинутый'][Math.floor(Math.random() * 4)],
          description: `Ищем игроков для ${court.type === 'padel' ? 'падела' : court.type === 'tennis' ? 'тенниса' : 'бадминтона'}`,
          organizer: {
            id: 'test-user-' + i,
            name: ['Александр', 'Дмитрий', 'Михаил', 'Сергей', 'Андрей'][Math.floor(Math.random() * 5)],
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

        // Добавляем еще игроков
        for (let j = 1; j < gameData.currentPlayers; j++) {
          gameData.players.push({
            id: 'test-player-' + j,
            name: ['Елена', 'Ольга', 'Иван', 'Петр', 'Анна'][Math.floor(Math.random() * 5)],
            status: 'confirmed',
            joinedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        gamesToCreate.push(gameData);
      }
    }

    // Создаем игры в базе данных
    console.log(`Creating ${gamesToCreate.length} open games...`);
    
    const batch = db.batch();
    gamesToCreate.forEach(game => {
      const docRef = db.collection('openGames').doc();
      batch.set(docRef, game);
    });

    await batch.commit();
    console.log('Successfully created test open games!');

  } catch (error) {
    console.error('Error creating test games:', error);
  }
}

createTestOpenGames();