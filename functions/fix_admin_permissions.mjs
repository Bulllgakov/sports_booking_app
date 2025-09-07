import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Читаем service account
const serviceAccount = JSON.parse(
  readFileSync('/Users/bulat/sports_booking_app/sports-booking-app-1d7e5-firebase-adminsdk-s4gxe-8c8e4e4cf2.json', 'utf8')
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

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
      const adminData = doc.data();
      console.log('Текущие права:', adminData.permissions);
      
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
        updatedAt: FieldValue.serverTimestamp()
      });
    });

    await Promise.all(updatePromises);
    console.log('Права успешно обновлены!');
    console.log('Новые права: manage_bookings, manage_courts, manage_club, manage_finance, view_reports, create_bookings, manage_admins');
    
  } catch (error) {
    console.error('Ошибка при обновлении прав:', error);
  } finally {
    process.exit();
  }
}

fixAdminPermissions();
