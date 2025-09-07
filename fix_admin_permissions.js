const admin = require('firebase-admin');
const serviceAccount = require('./sports-booking-app-1d7e5-firebase-adminsdk-s4gxe-8c8e4e4cf2.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixAdminPermissions() {
  try {
    // Ищем администратора для клуба HRdTfA8xGhnrf4DbwmjD
    const adminsSnapshot = await db.collection('admins')
      .where('venueId', '==', 'HRdTfA8xGhnrf4DbwmjD')
      .where('role', '==', 'admin')
      .get();

    if (adminsSnapshot.empty) {
      console.log('Администратор не найден для клуба HRdTfA8xGhnrf4DbwmjD');
      return;
    }

    // Обновляем права для каждого администратора
    const updatePromises = adminsSnapshot.docs.map(doc => {
      console.log(`Обновление прав для администратора: ${doc.id}`);
      return doc.ref.update({
        permissions: [
          "manage_bookings",
          "manage_courts", 
          "manage_club",
          "manage_finance",
          "view_reports",
          "create_bookings",
          "manage_admins"
        ],
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await Promise.all(updatePromises);
    console.log('Права успешно обновлены!');
    
  } catch (error) {
    console.error('Ошибка при обновлении прав:', error);
  } finally {
    process.exit();
  }
}

fixAdminPermissions();
