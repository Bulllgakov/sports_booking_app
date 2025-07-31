const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateWorkingHours() {
  console.log('Starting working hours migration...');
  
  try {
    const venuesSnapshot = await db.collection('venues').get();
    console.log(`Found ${venuesSnapshot.size} venues to migrate`);
    
    let migrated = 0;
    let skipped = 0;
    
    for (const doc of venuesSnapshot.docs) {
      const venue = doc.data();
      const venueId = doc.id;
      
      // Check if already migrated
      if (venue.workingHours && venue.workingHours.monday) {
        console.log(`Venue ${venue.name} already migrated, skipping...`);
        skipped++;
        continue;
      }
      
      // Get current working hours
      const currentHours = venue.workingHours || {
        weekday: '07:00-23:00',
        weekend: '08:00-22:00'
      };
      
      // Create new format
      const newWorkingHours = {
        monday: currentHours.weekday || '07:00-23:00',
        tuesday: currentHours.weekday || '07:00-23:00',
        wednesday: currentHours.weekday || '07:00-23:00',
        thursday: currentHours.weekday || '07:00-23:00',
        friday: currentHours.weekday || '07:00-23:00',
        saturday: currentHours.weekend || '08:00-22:00',
        sunday: currentHours.weekend || '08:00-22:00'
      };
      
      // Keep old format for backward compatibility
      if (currentHours.weekday) {
        newWorkingHours.weekday = currentHours.weekday;
      }
      if (currentHours.weekend) {
        newWorkingHours.weekend = currentHours.weekend;
      }
      
      // Update venue
      await db.collection('venues').doc(venueId).update({
        workingHours: newWorkingHours,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`✓ Migrated venue: ${venue.name}`);
      migrated++;
    }
    
    console.log(`\nMigration complete!`);
    console.log(`Migrated: ${migrated} venues`);
    console.log(`Skipped: ${skipped} venues (already migrated)`);
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    process.exit();
  }
}

migrateWorkingHours();