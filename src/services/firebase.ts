import { initializeApp } from 'firebase/app'
import { getFirestore, initializeFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { getDatabase } from 'firebase/database'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: "AIzaSyAnp3SY9XEyF-le5q_Tcv-7Le2qqvtz0ZM",
  authDomain: "sports-booking-app-1d7e5.firebaseapp.com",
  databaseURL: "https://sports-booking-app-1d7e5-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "sports-booking-app-1d7e5",
  storageBucket: "sports-booking-app-1d7e5.firebasestorage.app",
  messagingSenderId: "648540980109",
  appId: "1:648540980109:web:97fbe182c59bb2641ab3c4",
  measurementId: "G-VL4MCP1PZP"
}

const app = initializeApp(firebaseConfig)

// Инициализация Firestore с настройками
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: false,
  cacheSizeBytes: 50 * 1024 * 1024 // 50 MB cache
})

export const auth = getAuth(app)
export const storage = getStorage(app)
export const realtimeDb = getDatabase(app)
export const functions = getFunctions(app, 'europe-west1') // Указываем регион