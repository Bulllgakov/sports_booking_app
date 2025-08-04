import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const region = "europe-west1";

// Функция для автоматической очистки просроченных неоплаченных бронирований
export const cleanupExpiredBookings = functions
  .region(region)
  .pubsub.schedule("every 10 minutes")
  .onRun(async (_context) => {
    const db = admin.firestore();

    try {
      // Получаем бронирования со статусом "Ожидает оплату" старше 10 минут
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      // Получаем отмененные бронирования старше 15 минут
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      // Очищаем бронирования "Ожидает оплату" (10 минут)
      const awaitingPaymentQuery = await db
        .collection("bookings")
        .where("paymentStatus", "==", "awaiting_payment")
        .where("createdAt", "<=", tenMinutesAgo)
        .get();

      // Очищаем отмененные бронирования (15 минут)
      const cancelledBookingsQuery = await db
        .collection("bookings")
        .where("status", "==", "cancelled")
        .where("cancelledAt", "<=", fifteenMinutesAgo)
        .get();

      const batch = db.batch();
      let deleteCount = 0;

      // Обрабатываем бронирования "Ожидает оплату"
      if (!awaitingPaymentQuery.empty) {
        awaitingPaymentQuery.docs.forEach((doc) => {
          const bookingData = doc.data();
          console.log(`Deleting awaiting payment booking: ${doc.id}`, {
            courtId: bookingData.courtId,
            date: bookingData.date,
            time: bookingData.startTime || bookingData.time,
            customerName: bookingData.customerName,
            createdAt: bookingData.createdAt,
          });

          batch.delete(doc.ref);
          deleteCount++;
        });
      }

      // Обрабатываем отмененные бронирования
      if (!cancelledBookingsQuery.empty) {
        cancelledBookingsQuery.docs.forEach((doc) => {
          const bookingData = doc.data();
          console.log(`Deleting cancelled booking: ${doc.id}`, {
            courtId: bookingData.courtId,
            date: bookingData.date,
            time: bookingData.startTime || bookingData.time,
            customerName: bookingData.customerName,
            cancelledAt: bookingData.cancelledAt,
          });

          batch.delete(doc.ref);
          deleteCount++;
        });
      }

      if (deleteCount > 0) {
        await batch.commit();
        const awaitingCount = awaitingPaymentQuery.docs.length;
        const cancelledCount = cancelledBookingsQuery.docs.length;
        console.log(`Successfully deleted ${deleteCount} bookings`, {
          awaitingPayment: awaitingCount,
          cancelled: cancelledCount,
        });
      } else {
        console.log("No bookings to clean up");
      }

      // Также очищаем соответствующие платежи
      const expiredPaymentsQuery = await db
        .collection("payments")
        .where("status", "==", "pending")
        .where("createdAt", "<=", tenMinutesAgo)
        .get();

      if (!expiredPaymentsQuery.empty) {
        const paymentBatch = db.batch();
        let paymentDeleteCount = 0;

        expiredPaymentsQuery.docs.forEach((doc) => {
          paymentBatch.delete(doc.ref);
          paymentDeleteCount++;
        });

        await paymentBatch.commit();
        console.log(`Successfully deleted ${paymentDeleteCount} expired payments`);
      }
    } catch (error) {
      console.error("Error cleaning up expired bookings:", error);
    }
  });

// Ручная функция для очистки просроченных бронирований (для тестирования или ручного запуска)
export const manualCleanupExpiredBookings = functions
  .region(region)
  .https.onCall(async (data, context) => {
    // Проверяем, что пользователь авторизован и имеет права админа
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    const db = admin.firestore();

    try {
      // Получаем пользователя и проверяем его роль
      const userDoc = await db.collection("users").doc(context.auth.uid).get();
      const userData = userDoc.data();

      if (!userData || userData.role !== "admin") {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only admins can manually cleanup bookings",
        );
      }

      // Получаем таймаут из параметров (по умолчанию 30 минут)
      const timeoutMinutes = data.timeoutMinutes || 30;
      const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);

      const expiredBookingsQuery = await db
        .collection("bookings")
        .where("paymentStatus", "==", "pending")
        .where("status", "==", "pending")
        .where("createdAt", "<=", cutoffTime)
        .get();

      const batch = db.batch();
      let deleteCount = 0;

      expiredBookingsQuery.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deleteCount++;
      });

      if (deleteCount > 0) {
        await batch.commit();
      }

      return {
        success: true,
        deletedCount: deleteCount,
        message: `Successfully deleted ${deleteCount} expired bookings`,
      };
    } catch (error) {
      console.error("Error in manual cleanup:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to cleanup expired bookings",
      );
    }
  });
