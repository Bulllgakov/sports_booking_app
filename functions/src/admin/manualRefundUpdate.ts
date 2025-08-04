import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const region = "europe-west1";

export const manualRefundUpdate = functions
  .region(region)
  .https.onRequest(async (req, res) => {
    try {
      const {bookingId, paymentId} = req.query;

      if (!bookingId && !paymentId) {
        res.status(400).send("bookingId или paymentId обязателен");
        return;
      }

      const db = admin.firestore();
      let booking: any;

      if (bookingId) {
        const bookingDoc = await db.collection("bookings").doc(bookingId as string).get();
        if (!bookingDoc.exists) {
          res.status(404).send("Бронирование не найдено");
          return;
        }
        booking = {id: bookingDoc.id, ...bookingDoc.data()};
      } else if (paymentId) {
        const bookingQuery = await db
          .collection("bookings")
          .where("paymentId", "==", paymentId)
          .limit(1)
          .get();

        if (bookingQuery.empty) {
          res.status(404).send("Бронирование не найдено по paymentId");
          return;
        }
        booking = {id: bookingQuery.docs[0].id, ...bookingQuery.docs[0].data()};
      } else {
        res.status(400).send("Не удалось найти бронирование");
        return;
      }

      console.log(`Обновляем статус возврата для бронирования ${booking.id}`);

      // Обновляем статус бронирования
      await db.collection("bookings").doc(booking.id).update({
        paymentStatus: "refunded",
        status: "cancelled",
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        cancelReason: "Возврат платежа (ручное обновление)",
        paymentHistory: admin.firestore.FieldValue.arrayUnion({
          timestamp: new Date().toISOString(),
          action: "refunded",
          userId: "system",
          userName: "Manual Update",
          note: "Ручное обновление статуса возврата",
        }),
      });

      res.status(200).json({
        success: true,
        message: `Статус бронирования ${booking.id} обновлен на refunded`,
        bookingId: booking.id,
      });
    } catch (error) {
      console.error("Ошибка при обновлении статуса возврата:", error);
      res.status(500).send("Внутренняя ошибка сервера");
    }
  });
