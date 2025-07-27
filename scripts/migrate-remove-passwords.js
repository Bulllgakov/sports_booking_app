import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '../sports-booking-app-1d7e5-firebase-adminsdk-ukp0k-2a0868ee2b.json'), 'utf8')
)

// Инициализация Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

async function migrateRemovePasswords() {
  console.log('Starting password removal migration...')
  
  try {
    // Получаем всех администраторов
    const adminsSnapshot = await db.collection('admins').get()
    
    let totalCount = 0
    let updatedCount = 0
    
    console.log(`Found ${adminsSnapshot.size} admins to check`)
    
    // Обрабатываем каждого администратора
    for (const doc of adminsSnapshot.docs) {
      totalCount++
      const adminData = doc.data()
      
      // Проверяем, есть ли поле password
      if (adminData.password !== undefined) {
        console.log(`Removing password from admin: ${adminData.email}`)
        
        // Удаляем поле password
        await doc.ref.update({
          password: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
        
        updatedCount++
      }
    }
    
    console.log('\nMigration completed!')
    console.log(`Total admins processed: ${totalCount}`)
    console.log(`Passwords removed: ${updatedCount}`)
    
  } catch (error) {
    console.error('Migration error:', error)
    process.exit(1)
  }
  
  process.exit(0)
}

// Запускаем миграцию
migrateRemovePasswords()