// Cleanup script using Firebase Admin SDK with emulator
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'sports-booking-app-1d7e5'
});

const db = getFirestore();

async function performCleanup() {
  console.log('🔍 Searching for bookings to clean up...\n');
  
  try {
    // Query bookings
    const [webBookings, onlinePaymentBookings, webClientBookings] = await Promise.all([
      db.collection('bookings')
        .where('source', '==', 'web')
        .where('paymentMethod', '==', 'online')
        .limit(10)
        .get(),
      
      db.collection('bookings')
        .where('paymentStatus', '==', 'online_payment')
        .limit(10)
        .get(),
      
      db.collection('bookings')
        .where('createdBy.userId', '==', 'web-client')
        .limit(10)
        .get()
    ]);
    
    // Collect and display found bookings
    const bookingsToDelete = new Map();
    
    console.log('📋 Web bookings with online payment:', webBookings.size);
    webBookings.forEach(doc => {
      const data = doc.data();
      bookingsToDelete.set(doc.id, data);
      console.log(`   - ${doc.id}: ${data.courtName || 'Unknown'} on ${data.date}`);
    });
    
    console.log('\n💳 Bookings with online_payment status:', onlinePaymentBookings.size);
    onlinePaymentBookings.forEach(doc => {
      const data = doc.data();
      bookingsToDelete.set(doc.id, data);
      console.log(`   - ${doc.id}: ${data.courtName || 'Unknown'} on ${data.date}`);
    });
    
    console.log('\n🌐 Bookings created by web-client:', webClientBookings.size);
    webClientBookings.forEach(doc => {
      const data = doc.data();
      bookingsToDelete.set(doc.id, data);
      console.log(`   - ${doc.id}: ${data.courtName || 'Unknown'} on ${data.date}`);
    });
    
    const totalBookings = bookingsToDelete.size;
    console.log(`\n📊 Total unique bookings found: ${totalBookings}`);
    
    if (totalBookings === 0) {
      console.log('✅ No problematic bookings found!');
      return;
    }
    
    // Show sample of data
    console.log('\n📝 Sample booking data:');
    const sampleBooking = Array.from(bookingsToDelete.values())[0];
    console.log(JSON.stringify(sampleBooking, null, 2));
    
    // Confirm deletion
    console.log('\n⚠️  About to delete these bookings. Continue? (y/N)');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 'y') {
      console.log('❌ Cleanup cancelled.');
      return;
    }
    
    // Perform deletion
    console.log('\n🗑️  Deleting bookings...');
    const batch = db.batch();
    let count = 0;
    
    for (const [bookingId] of bookingsToDelete) {
      batch.delete(db.collection('bookings').doc(bookingId));
      count++;
      
      // Commit batch every 500 operations
      if (count % 500 === 0) {
        await batch.commit();
        console.log(`   ✅ Deleted ${count} bookings...`);
      }
    }
    
    // Commit remaining
    if (count % 500 !== 0) {
      await batch.commit();
    }
    
    console.log(`\n✅ Successfully deleted ${count} bookings!`);
    
    // Also check for payments
    console.log('\n💰 Checking for related payments...');
    let paymentCount = 0;
    
    for (const [bookingId] of bookingsToDelete) {
      const payments = await db.collection('payments')
        .where('bookingId', '==', bookingId)
        .get();
      
      if (!payments.empty) {
        const paymentBatch = db.batch();
        payments.forEach(doc => {
          paymentBatch.delete(doc.ref);
          paymentCount++;
        });
        await paymentBatch.commit();
      }
    }
    
    console.log(`✅ Deleted ${paymentCount} related payments.`);
    console.log('\n🎉 Cleanup completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 7 || error.message.includes('PERMISSION_DENIED')) {
      console.log('\n💡 To fix permission issues:');
      console.log('1. Download service account key from Firebase Console');
      console.log('2. Set environment variable:');
      console.log('   export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"');
      console.log('3. Run this script again');
    }
  }
}

// Run the cleanup
performCleanup()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });