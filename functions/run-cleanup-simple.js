const admin = require('firebase-admin');
admin.initializeApp();

const { cleanupWebBookings } = require('./lib/admin/cleanupWebBookings');

async function runCleanup() {
  try {
    console.log('🚀 Запуск функции cleanupWebBookings...\n');
    
    // Вызываем функцию от имени существующего суперадмина
    const result = await cleanupWebBookings({}, {
      auth: {
        uid: 'existing-superadmin', // Подойдет любой ID
        token: {
          email: 'superadmin@allcourt.ru',
          email_verified: true
        }
      }
    });
    
    console.log('✅ Результат:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

runCleanup();