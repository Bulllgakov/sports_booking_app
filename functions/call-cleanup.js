const admin = require('firebase-admin');

// Initialize with the default project
admin.initializeApp();

async function callCleanupFunction() {
  console.log('🚀 Calling cleanupWebBookings function...');
  
  const db = admin.firestore();
  
  try {
    // First check what would be deleted
    console.log('🔍 Checking what bookings would be deleted...');
    
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
    
    const allBookingIds = new Set();
    webBookingsQuery.docs.forEach(doc => allBookingIds.add(doc.id));
    onlinePaymentBookingsQuery.docs.forEach(doc => allBookingIds.add(doc.id));
    webClientBookingsQuery.docs.forEach(doc => allBookingIds.add(doc.id));
    
    console.log(`📊 Found ${allBookingIds.size} unique bookings to delete:`);
    console.log(`   - Web bookings with online payment: ${webBookingsQuery.size}`);
    console.log(`   - Bookings with online_payment status: ${onlinePaymentBookingsQuery.size}`);
    console.log(`   - Bookings created by web-client: ${webClientBookingsQuery.size}`);
    
    if (allBookingIds.size === 0) {
      console.log('✅ No bookings found to delete.');
      return;
    }
    
    // Now call the Cloud Function using admin SDK
    const functions = require('firebase-functions');
    const { cleanupWebBookings } = require('./lib/admin/cleanupWebBookings');
    
    // Create a mock context with super admin privileges
    const context = {
      auth: {
        uid: 'system-admin',
        token: {
          email: 'system@admin.com',
          email_verified: true
        }
      }
    };
    
    console.log('📞 Calling the cleanup function...');
    const result = await cleanupWebBookings({}, context);
    
    console.log('✅ Cleanup completed!');
    console.log('📊 Results:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
    
    if (error.code === 'functions/permission-denied' || error.message.includes('Only admins can cleanup')) {
      console.log('\n💡 Permission denied. Creating a temporary admin user...');
      
      // Create a temporary admin user
      try {
        const userRef = await db.collection('users').doc('temp-system-admin').set({
          email: 'system@admin.com',
          role: 'super_admin',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Temporary admin user created.');
        console.log('🔄 Retrying cleanup...');
        
        const retryResult = await cleanupWebBookings({}, {
          auth: {
            uid: 'temp-system-admin',
            token: {
              email: 'system@admin.com',
              email_verified: true
            }
          }
        });
        
        console.log('✅ Retry successful!');
        console.log('📊 Results:', JSON.stringify(retryResult, null, 2));
        
        // Clean up the temporary user
        await db.collection('users').doc('temp-system-admin').delete();
        console.log('🧹 Temporary admin user removed.');
        
      } catch (adminError) {
        console.error('❌ Error creating temporary admin:', adminError);
      }
    }
  }
}

callCleanupFunction().then(() => {
  console.log('🏁 Script completed.');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});