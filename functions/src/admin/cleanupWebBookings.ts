import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const region = "europe-west1";

// Функция для удаления бронирований, созданных через веб с онлайн оплатой
export const cleanupWebBookings = functions
  .region(region)
  .https.onCall(async (data, context) => {
    // Проверяем авторизацию
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    const db = admin.firestore();

    try {
      // Получаем пользователя и проверяем права
      const userDoc = await db.collection("users").doc(context.auth.uid).get();
      const userData = userDoc.data();

      // Проверяем, является ли пользователь суперадмином
      if (!userData || userData.role !== "super_admin") {
        // Проверяем обычных админов
        const adminDoc = await db.collection("admins").where("email", "==", context.auth.token.email).limit(1).get();
        if (adminDoc.empty) {
          throw new functions.https.HttpsError(
            "permission-denied",
            "Only admins can cleanup web bookings",
          );
        }
      }

      console.log("Starting cleanup of web bookings with online payment...");

      // Ищем бронирования, созданные через веб с онлайн оплатой
      const webBookingsQuery = await db
        .collection("bookings")
        .where("source", "==", "web")
        .where("paymentMethod", "==", "online")
        .get();

      // Также ищем бронирования с paymentStatus = 'online_payment'
      const onlinePaymentBookingsQuery = await db
        .collection("bookings")
        .where("paymentStatus", "==", "online_payment")
        .get();

      // Также ищем бронирования, созданные пользователем 'web-client'
      const webClientBookingsQuery = await db
        .collection("bookings")
        .where("createdBy.userId", "==", "web-client")
        .get();

      const allBookingsToDelete = new Set();

      // Собираем уникальные ID бронирований для удаления
      webBookingsQuery.docs.forEach((doc) => {
        allBookingsToDelete.add(doc.id);
      });

      onlinePaymentBookingsQuery.docs.forEach((doc) => {
        allBookingsToDelete.add(doc.id);
      });

      webClientBookingsQuery.docs.forEach((doc) => {
        allBookingsToDelete.add(doc.id);
      });

      console.log(`Found ${allBookingsToDelete.size} web bookings to delete`);

      if (allBookingsToDelete.size === 0) {
        return {
          success: true,
          deletedCount: 0,
          message: "No web bookings found to delete",
        };
      }

      // Удаляем бронирования батчами (максимум 500 за раз)
      const bookingIds = Array.from(allBookingsToDelete);
      const batchSize = 500;
      let totalDeleted = 0;

      for (let i = 0; i < bookingIds.length; i += batchSize) {
        const batch = db.batch();
        const currentBatch = bookingIds.slice(i, i + batchSize);

        currentBatch.forEach((bookingId) => {
          const bookingRef = db.collection("bookings").doc(bookingId as string);
          batch.delete(bookingRef);
        });

        await batch.commit();
        totalDeleted += currentBatch.length;
        console.log(`Deleted batch of ${currentBatch.length} bookings. Total: ${totalDeleted}`);
      }

      // Также очищаем связанные платежи
      console.log("Cleaning up related payments...");
      let deletedPayments = 0;

      for (const bookingId of bookingIds) {
        const paymentsQuery = await db
          .collection("payments")
          .where("bookingId", "==", bookingId)
          .get();

        if (!paymentsQuery.empty) {
          const paymentBatch = db.batch();
          paymentsQuery.docs.forEach((doc) => {
            paymentBatch.delete(doc.ref);
            deletedPayments++;
          });
          await paymentBatch.commit();
        }
      }

      console.log(`Cleanup completed. Deleted ${totalDeleted} bookings and ${deletedPayments} payments`);

      return {
        success: true,
        deletedBookings: totalDeleted,
        deletedPayments: deletedPayments,
        message: `Successfully deleted ${totalDeleted} web bookings and ${deletedPayments} related payments`,
      };
    } catch (error) {
      console.error("Error in cleanup web bookings:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to cleanup web bookings",
      );
    }
  });
