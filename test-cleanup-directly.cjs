// Simple test that directly executes the cleanup logic without Firebase Auth
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'sports-booking-app-1d7e5',
  credential: admin.credential.applicationDefault()
});

async function directCleanup() {
  console.log('🚀 Starting direct cleanup of web bookings...');
  
  const db = admin.firestore();
  
  try {
    // Get all problematic bookings directly
    console.log('🔍 Searching for web bookings to delete...');
    
    const webBookingsQuery = await db
      .collection('bookings')
      .where('source', '==', 'web')
      .where('paymentMethod', '==', 'online')
      .get();
    
    const onlinePaymentBookingsQuery = await db
      .collection('bookings')
      .where('paymentStatus', '==', 'online_payment')
      .get();
    
    const webClientBookingsQuery = await db
      .collection('bookings')
      .where('createdBy.userId', '==', 'web-client')
      .get();
    
    // Collect unique booking IDs
    const allBookingsToDelete = new Set();
    
    webBookingsQuery.docs.forEach(doc => {
      allBookingsToDelete.add(doc.id);
      console.log(`   📋 Found booking: ${doc.id} (source=web, paymentMethod=online)`);
    });
    
    onlinePaymentBookingsQuery.docs.forEach(doc => {
      allBookingsToDelete.add(doc.id);
      console.log(`   💳 Found booking: ${doc.id} (paymentStatus=online_payment)`);
    });
    
    webClientBookingsQuery.docs.forEach(doc => {
      allBookingsToDelete.add(doc.id);
      console.log(`   🌐 Found booking: ${doc.id} (createdBy.userId=web-client)`);
    });
    
    console.log(`\n📊 Total unique bookings to delete: ${allBookingsToDelete.size}`);
    
    if (allBookingsToDelete.size === 0) {
      console.log('✅ No problematic bookings found. Nothing to delete.');
      return { success: true, deletedBookings: 0, deletedPayments: 0 };
    }
    
    // Show first few booking IDs for verification
    const bookingIds = Array.from(allBookingsToDelete);
    console.log(`📝 First few booking IDs: ${bookingIds.slice(0, 5).join(', ')}${bookingIds.length > 5 ? '...' : ''}`);
    
    // Ask for confirmation
    console.log('\n⚠️  About to delete these bookings. Proceeding in 3 seconds...');
    console.log('   Press Ctrl+C to cancel now if needed.');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Delete bookings in batches
    console.log('\n🗑️  Starting deletion...');
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
      console.log(`   ✅ Deleted batch of ${currentBatch.length} bookings. Total: ${totalDeleted}`);
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
        console.log(`   🧹 Deleted ${paymentsQuery.size} payments for booking ${bookingId}`);
      }
    }
    
    console.log(`\n🎉 Cleanup completed successfully!`);
    console.log(`   📊 Deleted bookings: ${totalDeleted}`);
    console.log(`   💰 Deleted payments: ${deletedPayments}`);
    
    return {
      success: true,
      deletedBookings: totalDeleted,
      deletedPayments: deletedPayments,
      message: `Successfully deleted ${totalDeleted} web bookings and ${deletedPayments} related payments`
    };
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return { success: false, error: error.message };
  }
}

// Run the cleanup
directCleanup().then(result => {
  console.log('\n🏁 Final result:', JSON.stringify(result, null, 2));
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});