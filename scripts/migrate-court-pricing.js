const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateCourtPricing() {
  console.log('Starting court pricing migration...');
  
  try {
    const venuesSnapshot = await db.collection('venues').get();
    console.log(`Found ${venuesSnapshot.size} venues to check`);
    
    let migrated = 0;
    let skipped = 0;
    
    for (const venueDoc of venuesSnapshot.docs) {
      const venueId = venueDoc.id;
      const venueName = venueDoc.data().name;
      
      console.log(`\nChecking courts for venue: ${venueName}`);
      
      // Get all courts for this venue
      const courtsSnapshot = await db.collection('venues').doc(venueId).collection('courts').get();
      
      for (const courtDoc of courtsSnapshot.docs) {
        const court = courtDoc.data();
        const courtId = courtDoc.id;
        
        // Check if already migrated
        if (court.pricing) {
          console.log(`  Court ${court.name} already has pricing, skipping...`);
          skipped++;
          continue;
        }
        
        // Get current prices
        const priceWeekday = court.priceWeekday || 1900;
        const priceWeekend = court.priceWeekend || 2400;
        
        // Create new pricing structure
        const newPricing = {
          monday: { basePrice: priceWeekday, intervals: [] },
          tuesday: { basePrice: priceWeekday, intervals: [] },
          wednesday: { basePrice: priceWeekday, intervals: [] },
          thursday: { basePrice: priceWeekday, intervals: [] },
          friday: { basePrice: priceWeekday, intervals: [] },
          saturday: { basePrice: priceWeekend, intervals: [] },
          sunday: { basePrice: priceWeekend, intervals: [] }
        };
        
        // Update court
        await db.collection('venues').doc(venueId).collection('courts').doc(courtId).update({
          pricing: newPricing,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`  ✓ Migrated court: ${court.name}`);
        migrated++;
      }
    }
    
    console.log(`\nMigration complete!`);
    console.log(`Migrated: ${migrated} courts`);
    console.log(`Skipped: ${skipped} courts (already migrated)`);
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    process.exit();
  }
}

migrateCourtPricing();