const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');

// Initialize Firebase Admin SDK
// Make sure you have GOOGLE_APPLICATION_CREDENTIALS environment variable set
// or the service account key file in the correct location
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'sports-booking-app-1d7e5', // Replace with your actual project ID
  });
}

/**
 * Test script for cleanupWebBookings Cloud Function
 * 
 * This script calls the deployed cleanupWebBookings function using the Firebase Admin SDK.
 * The function requires authentication and admin privileges.
 */
async function testCleanupWebBookings() {
  try {
    console.log('🚀 Starting test of cleanupWebBookings function...');
    
    // You need to provide a valid admin user's UID or email
    // Replace with an actual admin user from your system
    const adminEmail = 'admin@example.com'; // Replace with actual admin email
    const adminUid = 'admin-user-id'; // Replace with actual admin UID, or leave null to find by email
    
    let userRecord;
    
    if (adminUid) {
      // Get user by UID
      userRecord = await getAuth().getUser(adminUid);
    } else {
      // Get user by email
      userRecord = await getAuth().getUserByEmail(adminEmail);
    }
    
    console.log(`📧 Found user: ${userRecord.email} (UID: ${userRecord.uid})`);
    
    // Create a custom token for authentication
    const customToken = await getAuth().createCustomToken(userRecord.uid);
    console.log('🔐 Created custom token for authentication');
    
    // Import the Firebase Functions SDK to call the function
    const functions = require('firebase-functions-test')();
    
    // Get reference to the deployed function
    const { cleanupWebBookings } = require('./lib/admin/cleanupWebBookings');
    
    // Create mock context with authentication
    const context = {
      auth: {
        uid: userRecord.uid,
        token: {
          email: userRecord.email,
          email_verified: true,
          firebase: {
            identities: {
              email: [userRecord.email]
            },
            sign_in_provider: 'custom'
          }
        }
      }
    };
    
    console.log('📞 Calling cleanupWebBookings function...');
    
    // Call the function
    const result = await cleanupWebBookings({}, context);
    
    console.log('✅ Function completed successfully!');
    console.log('📊 Results:', JSON.stringify(result, null, 2));
    
    // Log summary
    if (result.success) {
      console.log(`\n📈 Summary:`);
      console.log(`   - Deleted bookings: ${result.deletedBookings || 0}`);
      console.log(`   - Deleted payments: ${result.deletedPayments || 0}`);
      console.log(`   - Message: ${result.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing cleanupWebBookings:', error);
    
    if (error.code === 'functions/unauthenticated') {
      console.log('\n💡 Authentication error. Make sure:');
      console.log('   - The user exists in your Firebase Auth');
      console.log('   - The user has admin privileges in your database');
    } else if (error.code === 'functions/permission-denied') {
      console.log('\n💡 Permission denied. Make sure:');
      console.log('   - The user has role "super_admin" in the users collection, OR');
      console.log('   - The user email exists in the admins collection');
    }
  } finally {
    // Cleanup
    functions.cleanup();
    process.exit(0);
  }
}

/**
 * Alternative method: Call the deployed function via HTTPS
 * This method calls the actual deployed function on Firebase
 */
async function testCleanupWebBookingsHTTPS() {
  try {
    console.log('🌐 Testing via HTTPS call to deployed function...');
    
    // You need to get an ID token for authentication
    // This is more complex as you need to authenticate as a user first
    
    const adminEmail = 'admin@example.com'; // Replace with actual admin email
    const userRecord = await getAuth().getUserByEmail(adminEmail);
    
    // Create custom token
    const customToken = await getAuth().createCustomToken(userRecord.uid);
    
    // You would need to exchange this custom token for an ID token
    // This typically requires the Firebase Auth REST API or client SDK
    console.log('🔐 Custom token created:', customToken);
    console.log('💡 To complete HTTPS testing, you need to:');
    console.log('   1. Exchange the custom token for an ID token using Firebase Auth REST API');
    console.log('   2. Use the ID token in Authorization header: "Bearer <ID_TOKEN>"');
    console.log('   3. Make POST request to: https://europe-west1-<PROJECT_ID>.cloudfunctions.net/cleanupWebBookings');
    
  } catch (error) {
    console.error('❌ Error in HTTPS test setup:', error);
  }
}

/**
 * Check what bookings would be affected by the cleanup
 * This is a dry-run to see what data exists before cleanup
 */
async function checkWebBookingsData() {
  try {
    console.log('🔍 Checking existing web bookings data...');
    
    const db = admin.firestore();
    
    // Check bookings with source="web" AND paymentMethod="online"
    const webBookingsQuery = await db
      .collection('bookings')
      .where('source', '==', 'web')
      .where('paymentMethod', '==', 'online')
      .get();
    
    console.log(`📋 Found ${webBookingsQuery.size} bookings with source="web" AND paymentMethod="online"`);
    
    // Check bookings with paymentStatus="online_payment"
    const onlinePaymentBookingsQuery = await db
      .collection('bookings')
      .where('paymentStatus', '==', 'online_payment')
      .get();
    
    console.log(`💳 Found ${onlinePaymentBookingsQuery.size} bookings with paymentStatus="online_payment"`);
    
    // Check bookings created by web-client
    const webClientBookingsQuery = await db
      .collection('bookings')
      .where('createdBy.userId', '==', 'web-client')
      .get();
    
    console.log(`🌐 Found ${webClientBookingsQuery.size} bookings with createdBy.userId="web-client"`);
    
    // Collect unique booking IDs
    const allBookingIds = new Set();
    
    webBookingsQuery.docs.forEach(doc => allBookingIds.add(doc.id));
    onlinePaymentBookingsQuery.docs.forEach(doc => allBookingIds.add(doc.id));
    webClientBookingsQuery.docs.forEach(doc => allBookingIds.add(doc.id));
    
    console.log(`🎯 Total unique bookings that would be deleted: ${allBookingIds.size}`);
    
    // Check related payments
    let totalPayments = 0;
    for (const bookingId of allBookingIds) {
      const paymentsQuery = await db
        .collection('payments')
        .where('bookingId', '==', bookingId)
        .get();
      totalPayments += paymentsQuery.size;
    }
    
    console.log(`💰 Related payments that would be deleted: ${totalPayments}`);
    
    return {
      totalBookings: allBookingIds.size,
      totalPayments: totalPayments
    };
    
  } catch (error) {
    console.error('❌ Error checking data:', error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'check';
  
  switch (command) {
    case 'check':
      console.log('🔍 Running data check (dry run)...\n');
      await checkWebBookingsData();
      break;
      
    case 'test':
      console.log('🧪 Running function test...\n');
      await testCleanupWebBookings();
      break;
      
    case 'https':
      console.log('🌐 Setting up HTTPS test...\n');
      await testCleanupWebBookingsHTTPS();
      break;
      
    default:
      console.log('Usage: node test-cleanup-web-bookings.js [command]');
      console.log('Commands:');
      console.log('  check  - Check what data would be affected (default)');
      console.log('  test   - Run the actual function test');
      console.log('  https  - Setup HTTPS test (shows instructions)');
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testCleanupWebBookings,
  testCleanupWebBookingsHTTPS,
  checkWebBookingsData
};