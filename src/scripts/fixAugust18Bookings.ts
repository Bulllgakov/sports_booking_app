import { initializeApp } from 'firebase/app'
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  doc,
  Timestamp 
} from 'firebase/firestore'

// Firebase конфигурация
const firebaseConfig = {
  apiKey: "AIzaSyD0rNKhhOlx1P65C0vuQmpq7BZAx4962gc",
  authDomain: "sports-booking-app-1d7e5.firebaseapp.com",
  projectId: "sports-booking-app-1d7e5",
  storageBucket: "sports-booking-app-1d7e5.appspot.com",
  messagingSenderId: "681253662878",
  appId: "1:681253662878:web:e0e7e9f14c66da80e0f42c",
  measurementId: "G-7G8GCFZ8TZ"
}

// Инициализация Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function fixBookingDates() {
  console.log('Начинаем корректировку дат бронирований...')
  
  try {
    // Получаем все бронирования
    const bookingsRef = collection(db, 'bookings')
    const snapshot = await getDocs(bookingsRef)
    
    console.log(`Найдено всего бронирований: ${snapshot.size}`)
    
    let fixedCount = 0
    const updates: Promise<void>[] = []
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data()
      const bookingId = docSnap.id
      
      // Проверяем дату бронирования
      if (data.date) {
        const bookingDate = data.date.toDate ? data.date.toDate() : new Date(data.date)
        
        // Проверяем дату в часовом поясе клуба (предполагаем Europe/Moscow или Asia/Yekaterinburg)
        const dateInMoscow = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Europe/Moscow',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(bookingDate)
        
        const dateInYekaterinburg = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Yekaterinburg',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(bookingDate)
        
        // Если дата показывает 19 августа, но должна быть 18 августа
        if (dateInMoscow === '2025-08-19' || dateInYekaterinburg === '2025-08-19') {
          console.log(`Найдено бронирование для корректировки: ${bookingId}`)
          console.log(`  Текущая дата UTC: ${bookingDate.toISOString()}`)
          console.log(`  Дата в Moscow: ${dateInMoscow}`)
          console.log(`  Дата в Yekaterinburg: ${dateInYekaterinburg}`)
          
          // Проверяем, нужно ли это исправить (если время создания указывает на 18 августа)
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null
          if (createdAt) {
            const createdDateStr = new Intl.DateTimeFormat('en-CA', {
              timeZone: 'Europe/Moscow',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).format(createdAt)
            
            // Если бронирование создано 18 августа, но дата показывает 19 августа
            if (createdDateStr === '2025-08-18') {
              // Корректируем дату - вычитаем 24 часа
              const correctedDate = new Date(bookingDate.getTime() - 24 * 60 * 60 * 1000)
              
              console.log(`  Корректируем на: ${correctedDate.toISOString()}`)
              
              // Обновляем документ
              const updatePromise = updateDoc(doc(db, 'bookings', bookingId), {
                date: Timestamp.fromDate(correctedDate),
                _dateFixed: true,
                _dateFixedAt: Timestamp.now()
              })
              
              updates.push(updatePromise)
              fixedCount++
            }
          }
        }
      }
    })
    
    if (updates.length > 0) {
      console.log(`\nИсправляем ${fixedCount} бронирований...`)
      await Promise.all(updates)
      console.log('✅ Все бронирования успешно исправлены!')
    } else {
      console.log('✅ Не найдено бронирований, требующих корректировки')
    }
    
  } catch (error) {
    console.error('❌ Ошибка при корректировке бронирований:', error)
  }
}

// Запускаем корректировку
fixBookingDates()
  .then(() => {
    console.log('\n🎉 Скрипт завершен')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Скрипт завершился с ошибкой:', error)
    process.exit(1)
  })