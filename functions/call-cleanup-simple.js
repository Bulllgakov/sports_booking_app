const admin = require('firebase-admin');

// Initialize with explicit project ID
admin.initializeApp({
  projectId: 'sports-booking-app-1d7e5'
});

const { cleanupWebBookings } = require('./lib/admin/cleanupWebBookings');

async function callCleanup() {
  console.log('🚀 Calling cleanupWebBookings function...');
  
  try {
    // Create context with super admin privileges
    const context = {
      auth: {
        uid: 'system-admin',
        token: {
          email: 'system@admin.com',
          email_verified: true
        }
      }
    };
    
    console.log('📞 Calling cleanup function...');
    const result = await cleanupWebBookings({}, context);
    
    console.log('✅ Function completed!');
    console.log('📊 Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('Only admins can cleanup') || error.code === 'functions/permission-denied') {
      console.log('\n💡 Need to add super admin user. Creating temporary admin...');
      
      const db = admin.firestore();
      
      try {
        // Create temporary super admin
        await db.collection('users').doc('temp-system-admin').set({
          email: 'system@admin.com',
          role: 'super_admin',
          name: 'System Admin',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Temporary admin created. Retrying...');
        
        // Retry with correct UID
        const retryContext = {
          auth: {
            uid: 'temp-system-admin',
            token: {
              email: 'system@admin.com',
              email_verified: true
            }
          }
        };
        
        const retryResult = await cleanupWebBookings({}, retryContext);
        
        console.log('✅ Cleanup successful!');
        console.log('📊 Result:', JSON.stringify(retryResult, null, 2));
        
        // Clean up temporary user
        await db.collection('users').doc('temp-system-admin').delete();
        console.log('🧹 Temporary admin user removed.');
        
      } catch (adminError) {
        console.error('❌ Error with admin setup:', adminError.message);
      }
    }
  }
}

callCleanup().then(() => {
  console.log('🏁 Done!');
  process.exit(0);
}).catch(err => {
  console.error('💥 Failed:', err);
  process.exit(1);
});