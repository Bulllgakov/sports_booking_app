// Скрипт для создания открытых игр через веб-интерфейс
// Запустите этот код в консоли браузера на странице с приложением

const createOpenGames = async () => {
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
  const { getFirestore, collection, addDoc, serverTimestamp, Timestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  // Инициализация Firebase (используйте ваши настройки)
  const firebaseConfig = {
    // Вставьте сюда ваши настройки Firebase
  };
  
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  const today = new Date();
  const dates = [];
  for (let i = 1; i <= 21; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date);
  }
  
  const openGames = [
    {
      venueId: 'venue1', // Замените на реальный ID
      venueName: 'Спортивный комплекс Олимп',
      courtId: 'court1', // Замените на реальный ID
      courtName: 'Корт №1',
      sport: 'tennis',
      date: Timestamp.fromDate(dates[0]),
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      venueId: 'venue2',
      venueName: 'Арена Спорт',
      courtId: 'court2',
      courtName: 'Футбольное поле',
      sport: 'football',
      date: Timestamp.fromDate(dates[2]),
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      venueId: 'venue1',
      venueName: 'Спортивный комплекс Олимп',
      courtId: 'court3',
      courtName: 'Корт №3',
      sport: 'badminton',
      date: Timestamp.fromDate(dates[4]),
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      venueId: 'venue3',
      venueName: 'Фитнес Центр Энергия',
      courtId: 'court4',
      courtName: 'Волейбольная площадка',
      sport: 'volleyball',
      date: Timestamp.fromDate(dates[6]),
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      venueId: 'venue2',
      venueName: 'Арена Спорт',
      courtId: 'court5',
      courtName: 'Баскетбольная площадка',
      sport: 'basketball',
      date: Timestamp.fromDate(dates[9]),
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      venueId: 'venue1',
      venueName: 'Спортивный комплекс Олимп',
      courtId: 'court1',
      courtName: 'Корт №1',
      sport: 'tennis',
      date: Timestamp.fromDate(dates[13]),
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      venueId: 'venue3',
      venueName: 'Фитнес Центр Энергия',
      courtId: 'court6',
      courtName: 'Мини-футбольное поле',
      sport: 'football',
      date: Timestamp.fromDate(dates[4]),
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      venueId: 'venue2',
      venueName: 'Арена Спорт',
      courtId: 'court7',
      courtName: 'Корт для бадминтона',
      sport: 'badminton',
      date: Timestamp.fromDate(dates[6]),
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      venueId: 'venue1',
      venueName: 'Спортивный комплекс Олимп',
      courtId: 'court8',
      courtName: 'Волейбольный зал',
      sport: 'volleyball',
      date: Timestamp.fromDate(dates[11]),
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      venueId: 'venue2',
      venueName: 'Арена Спорт',
      courtId: 'court9',
      courtName: 'Теннисный стол №1',
      sport: 'table_tennis',
      date: Timestamp.fromDate(dates[1]),
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
  ];
  
  // Создаем открытые игры
  for (const game of openGames) {
    try {
      await addDoc(collection(db, 'open_games'), game);
      console.log(`Created ${game.sport} game at ${game.venueName}`);
    } catch (error) {
      console.error('Error creating game:', error);
    }
  }
  
  console.log('All open games created successfully!');
};

// Для запуска скопируйте эту функцию в консоль браузера и вызовите:
// createOpenGames();