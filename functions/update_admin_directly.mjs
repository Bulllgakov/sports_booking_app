import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBYQEWyC-ASPoLpBVQvH_2KWyWX0j4qJaY",
  authDomain: "sports-booking-app-1d7e5.firebaseapp.com",
  projectId: "sports-booking-app-1d7e5",
  storageBucket: "sports-booking-app-1d7e5.appspot.com",
  messagingSenderId: "1025055227687",
  appId: "1:1025055227687:web:3fae8e87d646e716871e8f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateAdminPermissions() {
  try {
    console.log('Ищем администратора для клуба HRdTfA8xGhnrf4DbwmjD...');
    
    const adminsRef = collection(db, 'admins');
    const q = query(adminsRef, 
      where('venueId', '==', 'HRdTfA8xGhnrf4DbwmjD'),
      where('role', '==', 'admin')
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('Администратор не найден');
      return;
    }
    
    for (const adminDoc of querySnapshot.docs) {
      const adminData = adminDoc.data();
      console.log('Найден администратор:', adminDoc.id);
      console.log('Email:', adminData.email);
      console.log('Текущие права:', adminData.permissions);
      
      // Обновляем права
      await updateDoc(doc(db, 'admins', adminDoc.id), {
        permissions: [
          "manage_bookings",
          "manage_courts",
          "manage_club",
          "manage_finance",
          "view_reports",
          "create_bookings",
          "manage_admins"
        ],
        updatedAt: new Date()
      });
      
      console.log('Права успешно обновлены!');
    }
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

updateAdminPermissions();
