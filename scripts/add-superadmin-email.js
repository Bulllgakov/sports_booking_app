const admin = require('firebase-admin');

// Инициализация Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "sports-booking-app-1d7e5",
  });
}

const db = admin.firestore();

async function addSuperAdminEmail() {
  const email = process.argv[2];
  
  if (!email) {
    console.error('Пожалуйста, укажите email адрес');
    console.log('Использование: node add-superadmin-email.js your-email@example.com');
    process.exit(1);
  }

  // Валидация email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('Неверный формат email адреса');
    process.exit(1);
  }

  try {
    const docRef = db.collection('settings').doc('notifications');
    const doc = await docRef.get();
    
    let superAdminEmails = [];
    
    if (doc.exists) {
      const data = doc.data();
      superAdminEmails = data.superAdminEmails || [];
      
      if (superAdminEmails.includes(email)) {
        console.log(`Email ${email} уже добавлен в список`);
        process.exit(0);
      }
    }
    
    superAdminEmails.push(email);
    
    await docRef.set({
      superAdminEmails: superAdminEmails,
      updatedAt: new Date()
    }, { merge: true });
    
    console.log(`✅ Email ${email} успешно добавлен в список уведомлений суперадминистраторов`);
    console.log(`Всего email адресов: ${superAdminEmails.length}`);
    
  } catch (error) {
    console.error('Ошибка при добавлении email:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

addSuperAdminEmail();