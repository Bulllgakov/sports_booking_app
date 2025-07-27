import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, updateDoc, doc, deleteField } from 'firebase/firestore'

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBJJlyra3XBWNBz0b0sSHcoGfV5kpABUyg",
  authDomain: "sports-booking-app-1d7e5.firebaseapp.com",
  projectId: "sports-booking-app-1d7e5",
  storageBucket: "sports-booking-app-1d7e5.appspot.com",
  messagingSenderId: "1024121365360",
  appId: "1:1024121365360:web:0a63e7a5f9ddc6bb43897f"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function migrateRemovePasswords() {
  console.log('Starting password removal migration...')
  
  try {
    // Get all admins
    const adminsCollection = collection(db, 'admins')
    const adminsSnapshot = await getDocs(adminsCollection)
    
    let totalCount = 0
    let updatedCount = 0
    
    console.log(`Found ${adminsSnapshot.size} admins to check`)
    
    // Process each admin
    for (const adminDoc of adminsSnapshot.docs) {
      totalCount++
      const adminData = adminDoc.data()
      
      // Check if password field exists
      if ('password' in adminData) {
        console.log(`Removing password from admin: ${adminData.email}`)
        
        // Remove password field
        await updateDoc(doc(db, 'admins', adminDoc.id), {
          password: deleteField(),
          updatedAt: new Date()
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

// Run migration
migrateRemovePasswords()