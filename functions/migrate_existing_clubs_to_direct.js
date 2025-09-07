// Migration script to set existing clubs to use direct acquiring
// Run this once to preserve existing clubs' payment settings

const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'sports-booking-app-1d7e5'
});

const db = admin.firestore();

// IDs of the existing 3 clubs that should keep direct acquiring
// TODO: Replace these with actual club IDs
const EXISTING_CLUBS = [
  'club_id_1', // Replace with actual club ID
  'club_id_2', // Replace with actual club ID  
  'club_id_3'  // Replace with actual club ID
];

async function migrateExistingClubs() {
  console.log('Starting migration for existing clubs...');
  
  try {
    // First, get all venues to identify which ones need migration
    const venuesSnapshot = await db.collection('venues').get();
    console.log(`Found ${venuesSnapshot.size} total venues`);
    
    const batch = db.batch();
    let migratedCount = 0;
    let defaultedCount = 0;
    
    venuesSnapshot.docs.forEach(doc => {
      const venueId = doc.id;
      const data = doc.data();
      const venueRef = doc.ref;
      
      // Check if this is one of the existing clubs
      if (EXISTING_CLUBS.includes(venueId)) {
        // Set to direct payment type for existing clubs
        batch.update(venueRef, {
          paymentType: 'direct',
          platformCommission: 0, // No platform commission for direct payments
          multiaccountsConfig: {
            status: 'not_applicable',
            note: 'Клуб использует собственный эквайринг (существующий клуб)'
          },
          paymentTypeMigratedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`- ${data.name || venueId}: Set to DIRECT acquiring (existing club)`);
        migratedCount++;
      } else if (!data.paymentType) {
        // Set default payment type for all other clubs
        batch.update(venueRef, {
          paymentType: 'multiaccounts',
          platformCommission: data.platformCommission || 1, // Default 1% commission
          multiaccountsConfig: {
            status: 'not_configured',
            note: 'Требуется настройка Мультирасчетов'
          },
          paymentTypeMigratedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`- ${data.name || venueId}: Set to MULTIACCOUNTS (default for new clubs)`);
        defaultedCount++;
      } else {
        console.log(`- ${data.name || venueId}: Already has payment type: ${data.paymentType}`);
      }
    });
    
    // Commit the batch
    await batch.commit();
    
    console.log('\n=== Migration Summary ===');
    console.log(`Migrated to DIRECT: ${migratedCount} clubs`);
    console.log(`Defaulted to MULTIACCOUNTS: ${defaultedCount} clubs`);
    console.log('Migration completed successfully!');
    
    // List clubs that need to be updated with actual IDs
    if (EXISTING_CLUBS.includes('club_id_1')) {
      console.log('\n⚠️  IMPORTANT: Update EXISTING_CLUBS array with actual club IDs!');
      console.log('Current venues in the system:');
      venuesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.paymentEnabled || data.paymentProvider) {
          console.log(`  - ID: ${doc.id}, Name: ${data.name}, Provider: ${data.paymentProvider || 'none'}`);
        }
      });
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the migration
migrateExistingClubs();