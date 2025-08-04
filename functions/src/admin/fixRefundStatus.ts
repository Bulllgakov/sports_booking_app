import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const fixRefundStatus = functions
  .region("europe-west1")
  .https.onRequest(async (req, res) => {
    try {
      const paymentId = "3022d21c-000f-5000-b000-18343c33bc33";

      console.log("Looking for booking with paymentId:", paymentId);

      // Найти бронирование по paymentId
      const bookingQuery = await admin.firestore()
        .collection("bookings")
        .where("paymentId", "==", paymentId)
        .limit(1)
        .get();

      if (bookingQuery.empty) {
        console.log("Booking not found for paymentId:", paymentId);
        res.status(404).send("Booking not found");
        return;
      }

      const bookingDoc = bookingQuery.docs[0];
      const bookingId = bookingDoc.id;
      const bookingData = bookingDoc.data();

      console.log("Found booking:", bookingId);
      console.log("Current status:", bookingData.status);
      console.log("Current paymentStatus:", bookingData.paymentStatus);

      // Обновить статус на refunded
      await bookingDoc.ref.update({
        paymentStatus: "refunded",
        status: "cancelled",
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        cancelReason: "Возврат платежа",
        refundAmount: 10,
        refundId: "3022d475-0015-5000-b000-17fb22ee3d42",
        paymentHistory: admin.firestore.FieldValue.arrayUnion({
          timestamp: new Date().toISOString(),
          action: "refunded",
          userId: "manual-fix",
          userName: "Manual Update",
          note: "Ручное обновление статуса после успешного возврата через YooKassa",
        }),
      });

      res.status(200).json({
        success: true,
        bookingId: bookingId,
        message: "Booking status updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating booking:", error);
      res.status(500).json({error: error.message});
    }
  });
