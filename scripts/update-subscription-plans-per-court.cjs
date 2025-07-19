const admin = require('firebase-admin');

// Initialize Firebase Admin using Application Default Credentials
// Run: export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"
admin.initializeApp({
  projectId: 'allcourt-2025'
});

const db = admin.firestore();

async function updateSubscriptionPlans() {
  try {
    // Define updated subscription plans with per-court pricing
    const plans = [
      {
        id: 'start',
        name: 'СТАРТ',
        price: 0,
        pricePerCourt: 0,
        currency: 'RUB',
        interval: 'month',
        active: true,
        limits: {
          maxCourts: 2,
          maxBookingsPerMonth: -1, // unlimited
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
          'До 2 кортов бесплатно',
          'Неограниченные бронирования',
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
        price: 990,
        pricePerCourt: 990,
        currency: 'RUB',
        interval: 'month',
        active: true,
        limits: {
          maxCourts: -1, // unlimited
          maxBookingsPerMonth: -1, // unlimited
          smsEmailNotifications: 500, // per court
          customDesign: false,
          apiAccess: false,
          multiVenue: false,
          searchPriority: 10,
          abTesting: false,
          trainersModule: false,
          personalManager: false
        },
        features: [
          '990₽ за корт в месяц',
          'От 3 кортов',
          'Неограниченные бронирования',
          'SMS/Email уведомления (500 шт/месяц на корт)',
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
        price: 1990,
        pricePerCourt: 1990,
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
          '1,990₽ за корт в месяц',
          'От 1 корта',
          'SMS/Email без ограничений',
          'Белый лейбл PRO (кастомизация дизайна)',
          'API доступ для интеграций',
          'Мультиплощадки (управление сетью)',
          'Топ в поиске (+30% видимости)',
          'A/B тестирование цен',
          'Модуль абонементов и пакетов',
          'Модуль тренеров и расписания',
          'Персональный менеджер'
        ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        id: 'premium',
        name: 'ПРЕМИУМ',
        price: -1, // по запросу
        pricePerCourt: -1,
        currency: 'RUB',
        interval: 'month',
        active: true,
        limits: {
          maxCourts: -1,
          maxBookingsPerMonth: -1,
          smsEmailNotifications: -1,
          customDesign: true,
          apiAccess: true,
          multiVenue: true,
          searchPriority: 50,
          abTesting: true,
          trainersModule: true,
          personalManager: true
        },
        features: [
          'Все функции ПРОФИ',
          'Т-Банк Мультирасчеты',
          'Кастомные интеграции',
          'Выделенный сервер',
          'SLA гарантии',
          'Приоритетная разработка функций',
          'Выделенный менеджер 24/7'
        ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    ];

    // Update subscription_plans collection
    console.log('Updating subscription plans to per-court pricing model...');
    for (const plan of plans) {
      await db.collection('subscription_plans').doc(plan.id).set(plan, { merge: true });
      console.log(`✅ Updated plan: ${plan.name}`);
    }

    console.log('\n✨ Subscription plans successfully updated to per-court pricing model!');
    console.log('📝 New pricing structure:');
    console.log('  - СТАРТ: До 2 кортов бесплатно');
    console.log('  - СТАНДАРТ: 990₽ за корт (от 3 кортов)');
    console.log('  - ПРОФИ: 1,990₽ за корт (от 1 корта)');
    console.log('  - ПРЕМИУМ: По запросу');
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating subscription plans:', error);
    process.exit(1);
  }
}

// Run the update
updateSubscriptionPlans();