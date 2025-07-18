const admin = require('firebase-admin');

// Initialize Firebase Admin using Application Default Credentials
// Run: export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"
admin.initializeApp({
  projectId: 'allcourt-2025'
});

const db = admin.firestore();

async function initializeSubscriptionPlans() {
  try {
    // Define subscription plans
    const plans = [
      {
        id: 'start',
        name: 'СТАРТ',
        price: 0,
        currency: 'RUB',
        interval: 'month',
        active: true,
        limits: {
          maxCourts: 6,
          maxBookingsPerMonth: 100,
          smsEmailNotifications: 0,
          customDesign: false,
          apiAccess: false,
          multiVenue: false,
          searchPriority: 0,
          abTesting: false,
          trainersModule: false,
          personalManager: false
        },
        features: [
          'До 6 кортов',
          'До 100 бронирований в месяц',
          'Управление расписанием',
          'Онлайн-оплата (свой эквайринг)',
          'Белый лейбл (логотип клуба)',
          'Push-уведомления в приложении',
          'Мобильное приложение для клиентов',
          'Базовая отчетность',
          'QR-коды для бронирований'
        ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        id: 'standard',
        name: 'СТАНДАРТ',
        price: 2990,
        currency: 'RUB',
        interval: 'month',
        active: true,
        limits: {
          maxCourts: 20,
          maxBookingsPerMonth: -1, // unlimited
          smsEmailNotifications: 1000,
          customDesign: false,
          apiAccess: false,
          multiVenue: false,
          searchPriority: 10,
          abTesting: false,
          trainersModule: false,
          personalManager: false
        },
        features: [
          'До 20 кортов',
          'Неограниченные бронирования',
          'Все функции тарифа Старт',
          'SMS/Email уведомления (1,000 шт/месяц)',
          'Расширенная аналитика и отчеты',
          'Управление ценами и скидками',
          'Промокоды и акции',
          'Интеграция с календарями (Google, Яндекс)',
          'Экспорт данных в Excel',
          'Приоритет в поиске (+10%)'
        ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        id: 'pro',
        name: 'ПРОФИ',
        price: 5990,
        currency: 'RUB',
        interval: 'month',
        active: true,
        limits: {
          maxCourts: -1, // unlimited
          maxBookingsPerMonth: -1,
          smsEmailNotifications: -1,
          customDesign: true,
          apiAccess: true,
          multiVenue: true,
          searchPriority: 30,
          abTesting: true,
          trainersModule: true,
          personalManager: true
        },
        features: [
          'Неограниченное количество кортов',
          'Все функции тарифа Стандарт',
          'SMS/Email без ограничений',
          'Белый лейбл PRO (кастомизация дизайна)',
          'API доступ для интеграций',
          'Мультиплощадки (управление сетью)',
          'Топ в поиске (+30% видимости)',
          'A/B тестирование цен',
          'Модуль абонементов и пакетов',
          'Модуль тренеров и расписания',
          'Персональный менеджер',
          'Обучение команды (онлайн)'
        ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    ];

    // Create subscription_plans collection
    console.log('Creating subscription plans...');
    for (const plan of plans) {
      await db.collection('subscription_plans').doc(plan.id).set(plan);
      console.log(`✅ Created plan: ${plan.name}`);
    }

    // Create a sample subscription for existing venues
    console.log('\nCreating free subscriptions for existing venues...');
    const venuesSnapshot = await db.collection('venues').get();
    
    for (const venueDoc of venuesSnapshot.docs) {
      const venue = venueDoc.data();
      
      // Check if venue already has a subscription
      const existingSub = await db.collection('subscriptions')
        .where('venueId', '==', venueDoc.id)
        .where('status', 'in', ['active', 'trial'])
        .get();
      
      if (existingSub.empty) {
        // Create free subscription
        const subscription = {
          venueId: venueDoc.id,
          plan: 'start',
          status: 'active',
          startDate: admin.firestore.FieldValue.serverTimestamp(),
          endDate: null, // Free plan doesn't expire
          trialEndDate: null,
          usage: {
            courtsCount: 0,
            bookingsThisMonth: 0,
            smsEmailsSent: 0,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('subscriptions').add(subscription);
        console.log(`✅ Created free subscription for: ${venue.name}`);
      } else {
        console.log(`ℹ️  Subscription already exists for: ${venue.name}`);
      }
    }

    console.log('\n✅ Subscription plans initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing subscription plans:', error);
    process.exit(1);
  }
}

initializeSubscriptionPlans();