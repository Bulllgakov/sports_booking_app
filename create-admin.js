// Скрипт для создания тестового админа
import { initializeApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAnp3SY9XEyF-le5q_Tcv-7Le2qqvtz0ZM",
  authDomain: "sports-booking-app-1d7e5.firebaseapp.com",
  projectId: "sports-booking-app-1d7e5",
  storageBucket: "sports-booking-app-1d7e5.firebasestorage.app",
  messagingSenderId: "648540980109",
  appId: "1:648540980109:web:97fbe182c59bb2641ab3c4",
  measurementId: "G-VL4MCP1PZP"
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

async function createAdmin() {
  try {
    console.log('Создание тестового админа...')
    
    // Создаем пользователя в Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      'admin@test.com', 
      'admin123'
    )
    
    const user = userCredential.user
    console.log('Пользователь создан:', user.uid)
    
    // Добавляем запись в коллекцию admins
    await setDoc(doc(db, 'admins', user.uid), {
      name: 'Тестовый Админ',
      email: 'admin@test.com',
      role: 'admin',
      venueId: 'test-venue-1',
      permissions: ['read', 'write', 'delete'],
      createdAt: new Date(),
      lastLogin: null,
      twoFactorEnabled: false
    })
    
    console.log('Админ успешно создан!')
    console.log('Данные для входа:')
    console.log('Email: admin@test.com')
    console.log('Пароль: admin123')
    
    process.exit(0)
    
  } catch (error) {
    console.error('Ошибка при создании админа:', error.message)
    process.exit(1)
  }
}

createAdmin()