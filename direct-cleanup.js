// Direct cleanup script that doesn't require authentication
const admin = require('firebase-admin');

// Initialize Firebase Admin with explicit project
const serviceAccount = {
  projectId: 'sports-booking-app-1d7e5'
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'sports-booking-app-1d7e5'
});

async function cleanupWebBookings() {
  const db = admin.firestore();
  
  console.log('🚀 Starting cleanup of web bookings with online payment...');
  
  try {
    // Find bookings to delete
    const queries = await Promise.all([
      db.collection('bookings')
        .where('source', '==', 'web')
        .where('paymentMethod', '==', 'online')
        .get(),
      
      db.collection('bookings')
        .where('paymentStatus', '==', 'online_payment')
        .get(),
      
      db.collection('bookings')
        .where('createdBy.userId', '==', 'web-client')
        .get()
    ]);
    
    // Collect unique booking IDs
    const allBookingsToDelete = new Set();
    
    queries.forEach((query, index) => {
      console.log(`Query ${index + 1} found ${query.size} bookings`);
      query.docs.forEach(doc => {
        allBookingsToDelete.add(doc.id);
      });
    });
    
    console.log(`\n📊 Total unique bookings to delete: ${allBookingsToDelete.size}`);
    
    if (allBookingsToDelete.size === 0) {
      console.log('✅ No bookings found to delete.');
      return;
    }
    
    // Delete bookings in batches
    const bookingIds = Array.from(allBookingsToDelete);
    const batchSize = 500;
    let totalDeleted = 0;
    
    for (let i = 0; i < bookingIds.length; i += batchSize) {
      const batch = db.batch();
      const currentBatch = bookingIds.slice(i, i + batchSize);
      
      currentBatch.forEach(bookingId => {
        const bookingRef = db.collection('bookings').doc(bookingId);
        batch.delete(bookingRef);
      });
      
      await batch.commit();
      totalDeleted += currentBatch.length;
      console.log(`✅ Deleted batch of ${currentBatch.length} bookings. Total: ${totalDeleted}`);
    }
    
    // Delete related payments
    console.log('\n💰 Cleaning up related payments...');
    let deletedPayments = 0;
    
    for (const bookingId of bookingIds) {
      const paymentsQuery = await db
        .collection('payments')
        .where('bookingId', '==', bookingId)
        .get();
      
      if (!paymentsQuery.empty) {
        const paymentBatch = db.batch();
        paymentsQuery.docs.forEach(doc => {
          paymentBatch.delete(doc.ref);
          deletedPayments++;
        });
        await paymentBatch.commit();
      }
    }
    
    console.log(`\n🎉 Cleanup completed!`);
    console.log(`   📊 Deleted bookings: ${totalDeleted}`);
    console.log(`   💰 Deleted payments: ${deletedPayments}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // If it's a permission error, provide instructions
    if (error.code === 7 || error.message.includes('PERMISSION_DENIED')) {
      console.log('\n⚠️  Permission denied. You need to authenticate with Firebase.');
      console.log('   Run: firebase login');
      console.log('   Then: export GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json');
    }
  }
}

// Check if Firebase CLI is authenticated
const { execSync } = require('child_process');
try {
  execSync('firebase projects:list', { stdio: 'ignore' });
  console.log('✅ Firebase CLI authenticated\n');
} catch (e) {
  console.log('⚠️  Firebase CLI not authenticated. Running anyway...\n');
}

// Run the cleanup
cleanupWebBookings()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });