const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createOpenGames() {
  try {
    // Получаем клубы из базы
    const venuesSnapshot = await db.collection('venues').limit(3).get();
    const venues = venuesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (venues.length === 0) {
      console.log('No venues found. Please create venues first.');
      return;
    }

    // Получаем корты для каждого клуба
    const venuesWithCourts = [];
    for (const venue of venues) {
      const courtsSnapshot = await db.collection('courts')
        .where('venueId', '==', venue.id)
        .limit(2)
        .get();
      
      if (!courtsSnapshot.empty) {
        const courts = courtsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        venuesWithCourts.push({ venue, courts });
      }
    }

    if (venuesWithCourts.length === 0) {
      console.log('No courts found. Please create courts first.');
      return;
    }

    // Массив открытых игр для создания
    const openGames = [];
    const today = new Date();
    
    // Генерируем даты на ближайшие 3 недели
    const dates = [];
    for (let i = 1; i <= 21; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }

    // 1. Теннис - завтра вечером
    if (venuesWithCourts[0]) {
      const { venue, courts } = venuesWithCourts[0];
      if (courts[0] && courts[0].sport === 'tennis') {
        openGames.push({
          venueId: venue.id,
          venueName: venue.name,
          courtId: courts[0].id,
          courtName: courts[0].name,
          sport: 'tennis',
          date: admin.firestore.Timestamp.fromDate(dates[0]),
          time: '19:00',
          duration: 120,
          organizerId: 'user_test_1',
          organizerName: 'Александр Петров',
          organizerPhone: '+7 (900) 123-45-67',
          playerLevel: 'intermediate',
          playersTotal: 4,
          playersOccupied: 2,
          pricePerPlayer: 800,
          description: 'Играем парный теннис 2х2. Ищем еще двоих игроков среднего уровня. Мячи есть.',
          status: 'active',
          bookingId: `booking_${Date.now()}_1`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    // 2. Футбол - через 3 дня
    if (venuesWithCourts[1]) {
      const { venue, courts } = venuesWithCourts[1];
      const footballCourt = courts.find(c => c.sport === 'football') || courts[0];
      openGames.push({
        venueId: venue.id,
        venueName: venue.name,
        courtId: footballCourt.id,
        courtName: footballCourt.name,
        sport: 'football',
        date: admin.firestore.Timestamp.fromDate(dates[2]),
        time: '20:00',
        duration: 90,
        organizerId: 'user_test_2',
        organizerName: 'Иван Сидоров',
        organizerPhone: '+7 (900) 234-56-78',
        playerLevel: 'amateur',
        playersTotal: 10,
        playersOccupied: 6,
        pricePerPlayer: 500,
        description: 'Собираем команды 5х5. Нужны еще 4 человека. Форма любая, манишки есть.',
        status: 'active',
        bookingId: `booking_${Date.now()}_2`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // 3. Бадминтон - выходные
    if (venuesWithCourts[0]) {
      const { venue, courts } = venuesWithCourts[0];
      openGames.push({
        venueId: venue.id,
        venueName: venue.name,
        courtId: courts[1] ? courts[1].id : courts[0].id,
        courtName: courts[1] ? courts[1].name : courts[0].name,
        sport: 'badminton',
        date: admin.firestore.Timestamp.fromDate(dates[4]),
        time: '10:00',
        duration: 90,
        organizerId: 'user_test_3',
        organizerName: 'Мария Иванова',
        organizerPhone: '+7 (900) 345-67-89',
        playerLevel: 'beginner',
        playersTotal: 4,
        playersOccupied: 3,
        pricePerPlayer: 600,
        description: 'Утренний бадминтон в субботу. Нужен 1 игрок, уровень начальный. Воланы свои.',
        status: 'active',
        bookingId: `booking_${Date.now()}_3`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // 4. Волейбол - через неделю
    if (venuesWithCourts[2]) {
      const { venue, courts } = venuesWithCourts[2];
      openGames.push({
        venueId: venue.id,
        venueName: venue.name,
        courtId: courts[0].id,
        courtName: courts[0].name,
        sport: 'volleyball',
        date: admin.firestore.Timestamp.fromDate(dates[6]),
        time: '18:00',
        duration: 120,
        organizerId: 'user_test_4',
        organizerName: 'Дмитрий Волков',
        organizerPhone: '+7 (900) 456-78-90',
        playerLevel: 'intermediate',
        playersTotal: 12,
        playersOccupied: 8,
        pricePerPlayer: 400,
        description: 'Играем 6х6. Нужны 4 человека, желательно с опытом игры. Мяч есть.',
        status: 'active',
        bookingId: `booking_${Date.now()}_4`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // 5. Баскетбол - через 10 дней
    if (venuesWithCourts[1]) {
      const { venue, courts } = venuesWithCourts[1];
      openGames.push({
        venueId: venue.id,
        venueName: venue.name,
        courtId: courts[0].id,
        courtName: courts[0].name,
        sport: 'basketball',
        date: admin.firestore.Timestamp.fromDate(dates[9]),
        time: '19:30',
        duration: 90,
        organizerId: 'user_test_5',
        organizerName: 'Андрей Козлов',
        organizerPhone: '+7 (900) 567-89-01',
        playerLevel: 'amateur',
        playersTotal: 10,
        playersOccupied: 7,
        pricePerPlayer: 450,
        description: 'Стритбол 5х5. Ищем 3 игроков. Уровень любительский, главное желание играть!',
        status: 'active',
        bookingId: `booking_${Date.now()}_5`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // 6. Теннис - через 2 недели
    if (venuesWithCourts[0]) {
      const { venue, courts } = venuesWithCourts[0];
      if (courts[0] && courts[0].sport === 'tennis') {
        openGames.push({
          venueId: venue.id,
          venueName: venue.name,
          courtId: courts[0].id,
          courtName: courts[0].name,
          sport: 'tennis',
          date: admin.firestore.Timestamp.fromDate(dates[13]),
          time: '17:00',
          duration: 60,
          organizerId: 'user_test_6',
          organizerName: 'Елена Федорова',
          organizerPhone: '+7 (900) 678-90-12',
          playerLevel: 'advanced',
          playersTotal: 2,
          playersOccupied: 1,
          pricePerPlayer: 1200,
          description: 'Ищу партнера для игры в теннис. Уровень продвинутый. Свои мячи.',
          status: 'active',
          bookingId: `booking_${Date.now()}_6`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    // 7. Футбол - через 5 дней
    if (venuesWithCourts[2]) {
      const { venue, courts } = venuesWithCourts[2];
      openGames.push({
        venueId: venue.id,
        venueName: venue.name,
        courtId: courts[0].id,
        courtName: courts[0].name,
        sport: 'football',
        date: admin.firestore.Timestamp.fromDate(dates[4]),
        time: '21:00',
        duration: 90,
        organizerId: 'user_test_7',
        organizerName: 'Сергей Новиков',
        organizerPhone: '+7 (900) 789-01-23',
        playerLevel: 'intermediate',
        playersTotal: 14,
        playersOccupied: 10,
        pricePerPlayer: 550,
        description: 'Вечерний футбол 7х7. Нужны 4 игрока. Поле с искусственной травой.',
        status: 'active',
        bookingId: `booking_${Date.now()}_7`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // 8. Бадминтон - через неделю вечером
    if (venuesWithCourts[1]) {
      const { venue, courts } = venuesWithCourts[1];
      openGames.push({
        venueId: venue.id,
        venueName: venue.name,
        courtId: courts[1] ? courts[1].id : courts[0].id,
        courtName: courts[1] ? courts[1].name : courts[0].name,
        sport: 'badminton',
        date: admin.firestore.Timestamp.fromDate(dates[6]),
        time: '20:00',
        duration: 120,
        organizerId: 'user_test_8',
        organizerName: 'Ольга Смирнова',
        organizerPhone: '+7 (900) 890-12-34',
        playerLevel: 'intermediate',
        playersTotal: 4,
        playersOccupied: 2,
        pricePerPlayer: 700,
        description: 'Парная игра 2х2. Ищем пару среднего уровня. Воланы будут.',
        status: 'active',
        bookingId: `booking_${Date.now()}_8`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // 9. Волейбол - выходные через 2 недели
    if (venuesWithCourts[0]) {
      const { venue, courts } = venuesWithCourts[0];
      openGames.push({
        venueId: venue.id,
        venueName: venue.name,
        courtId: courts[0].id,
        courtName: courts[0].name,
        sport: 'volleyball',
        date: admin.firestore.Timestamp.fromDate(dates[11]),
        time: '15:00',
        duration: 180,
        organizerId: 'user_test_9',
        organizerName: 'Павел Морозов',
        organizerPhone: '+7 (900) 901-23-45',
        playerLevel: 'amateur',
        playersTotal: 16,
        playersOccupied: 12,
        pricePerPlayer: 350,
        description: 'Большая игра в воскресенье! Играем несколько партий, команды меняются. Нужны 4 человека.',
        status: 'active',
        bookingId: `booking_${Date.now()}_9`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // 10. Теннис настольный - послезавтра
    if (venuesWithCourts[1]) {
      const { venue, courts } = venuesWithCourts[1];
      openGames.push({
        venueId: venue.id,
        venueName: venue.name,
        courtId: courts[0].id,
        courtName: courts[0].name,
        sport: 'table_tennis',
        date: admin.firestore.Timestamp.fromDate(dates[1]),
        time: '18:30',
        duration: 90,
        organizerId: 'user_test_10',
        organizerName: 'Виктор Лебедев',
        organizerPhone: '+7 (900) 012-34-56',
        playerLevel: 'beginner',
        playersTotal: 4,
        playersOccupied: 1,
        pricePerPlayer: 300,
        description: 'Настольный теннис для начинающих. Можно приходить без опыта, научим! Ракетки есть.',
        status: 'active',
        bookingId: `booking_${Date.now()}_10`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Создаем открытые игры в базе данных
    const batch = db.batch();
    
    for (const game of openGames) {
      const docRef = db.collection('open_games').doc();
      batch.set(docRef, game);
      console.log(`Creating open game: ${game.sport} at ${game.venueName} on ${game.date.toDate().toLocaleDateString()}`);
    }

    await batch.commit();
    console.log(`\nSuccessfully created ${openGames.length} open games!`);

  } catch (error) {
    console.error('Error creating open games:', error);
  } finally {
    process.exit();
  }
}

// Run the script
createOpenGames();