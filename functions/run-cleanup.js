const admin = require('firebase-admin');
admin.initializeApp();

const { cleanupWebBookings } = require('./lib/admin/cleanupWebBookings');

async function runCleanup() {
  const db = admin.firestore();
  
  try {
    // Создаем временного суперадмина
    console.log('Creating temporary super admin...');
    await db.collection('users').doc('temp-cleanup-admin').set({
      email: 'temp@cleanup.com',
      role: 'super_admin',
      name: 'Cleanup Admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Running cleanup function...');
    
    // Вызываем функцию
    const result = await cleanupWebBookings({}, {
      auth: {
        uid: 'temp-cleanup-admin',
        token: {
          email: 'temp@cleanup.com',
          email_verified: true
        }
      }
    });
    
    console.log('\nResult:', JSON.stringify(result, null, 2));
    
    // Удаляем временного админа
    console.log('\nCleaning up temporary admin...');
    await db.collection('users').doc('temp-cleanup-admin').delete();
    
    console.log('Done!');
    
  } catch (error) {
    console.error('Error:', error.message);
    // Пытаемся удалить временного админа даже в случае ошибки
    try {
      await db.collection('users').doc('temp-cleanup-admin').delete();
    } catch (e) {}
  }
}

runCleanup();