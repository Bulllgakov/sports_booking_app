const admin = require('firebase-admin');

// Initialize without service account (will use default credentials)
admin.initializeApp();

const db = admin.firestore();

async function updateBookingStatus() {
  const paymentId = '3022d21c-000f-5000-b000-18343c33bc33';
  
  console.log('Looking for booking with paymentId:', paymentId);
  
  try {
    // Найти бронирование по paymentId
    const bookingQuery = await db
      .collection('bookings')
      .where('paymentId', '==', paymentId)
      .limit(1)
      .get();
    
    if (bookingQuery.empty) {
      console.log('Booking not found for paymentId:', paymentId);
      return;
    }
    
    const bookingDoc = bookingQuery.docs[0];
    const bookingId = bookingDoc.id;
    const bookingData = bookingDoc.data();
    
    console.log('Found booking:', bookingId);
    console.log('Current status:', bookingData.status);
    console.log('Current paymentStatus:', bookingData.paymentStatus);
    
    // Обновить статус на refunded
    await bookingDoc.ref.update({
      paymentStatus: 'refunded',
      status: 'cancelled',
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      cancelReason: 'Возврат платежа',
      refundAmount: 10,
      refundId: '3022d475-0015-5000-b000-17fb22ee3d42',
      paymentHistory: admin.firestore.FieldValue.arrayUnion({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        action: 'refunded',
        userId: 'manual-fix',
        userName: 'Manual Update',
        note: 'Ручное обновление статуса после успешного возврата через YooKassa'
      })
    });
    
    console.log('Booking status updated successfully');
    
  } catch (error) {
    console.error('Error updating booking:', error);
  } finally {
    process.exit();
  }
}

updateBookingStatus();