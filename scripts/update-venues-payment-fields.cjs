const admin = require('firebase-admin');

// Initialize Firebase Admin using Application Default Credentials
// Run: export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"
admin.initializeApp({
  projectId: 'allcourt-2025'
});

const db = admin.firestore();

async function updateVenuesPaymentFields() {
  try {
    console.log('Updating venues with payment fields...');
    
    const venuesSnapshot = await db.collection('venues').get();
    
    for (const venueDoc of venuesSnapshot.docs) {
      const venue = venueDoc.data();
      
      // Add payment-related fields if they don't exist
      const updates = {};
      
      if (venue.paymentEnabled === undefined) {
        updates.paymentEnabled = false;
      }
      
      if (venue.paymentTestMode === undefined) {
        updates.paymentTestMode = true;
      }
      
      if (venue.paymentProvider === undefined) {
        updates.paymentProvider = '';
      }
      
      if (venue.paymentCredentials === undefined) {
        updates.paymentCredentials = {};
      }
      
      if (venue.commissionPercent === undefined) {
        updates.commissionPercent = 0; // No commission in new model
      }
      
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        
        await db.collection('venues').doc(venueDoc.id).update(updates);
        console.log(`✅ Updated venue: ${venue.name}`);
      } else {
        console.log(`ℹ️  Venue already has payment fields: ${venue.name}`);
      }
    }
    
    console.log('\n✅ All venues updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating venues:', error);
    process.exit(1);
  }
}

updateVenuesPaymentFields();