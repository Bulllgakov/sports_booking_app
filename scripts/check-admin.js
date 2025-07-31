import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./functions/serviceAccountKey.json', 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkAdmin() {
  // Проверяем по email
  const adminsSnapshot = await db.collection('admins')
    .where('email', '==', 'renation@yandex.ru')
    .get();
  
  if (!adminsSnapshot.empty) {
    console.log('Found admin:');
    adminsSnapshot.forEach(doc => {
      console.log('ID:', doc.id);
      console.log('Data:', JSON.stringify(doc.data(), null, 2));
    });
  } else {
    console.log('Admin not found in admins collection');
    
    // Проверяем venues
    const venuesSnapshot = await db.collection('venues')
      .where('email', '==', 'renation@yandex.ru')
      .get();
    
    if (!venuesSnapshot.empty) {
      console.log('\nFound venue:');
      venuesSnapshot.forEach(doc => {
        console.log('Venue ID:', doc.id);
        console.log('Data:', JSON.stringify(doc.data(), null, 2));
      });
    } else {
      console.log('Venue not found either');
    }
  }
}

checkAdmin().then(() => process.exit(0)).catch(console.error);