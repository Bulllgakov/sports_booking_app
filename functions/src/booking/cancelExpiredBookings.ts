import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Облачная функция для автоматической отмены просроченных бронирований
 * Запускается каждые 5 минут
 */
export const cancelExpiredBookings = functions
  .region("europe-west1")
  .pubsub
  .schedule("every 5 minutes")
  .onRun(async (_context) => {
    const db = admin.firestore();
    const now = new Date();

    try {
      // Получаем все неоплаченные бронирования
      const bookingsSnapshot = await db.collection("bookings")
        .where("paymentStatus", "==", "awaiting_payment")
        .get();

      const batch = db.batch();
      let cancelledCount = 0;

      for (const doc of bookingsSnapshot.docs) {
        const booking = doc.data();
        const createdAt = booking.createdAt?.toDate() || new Date(booking.createdAt);
        const diffInMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));

        let shouldCancel = false;
        let reason = "";

        // Проверяем условия отмены в зависимости от способа оплаты
        if (booking.paymentMethod === "online" && diffInMinutes > 10) {
          // Онлайн оплата - 10 минут
          shouldCancel = true;
          reason = "Истекло время для онлайн оплаты (10 минут)";
        } else if (booking.paymentMethod === "transfer") {
          // Перевод на р.счет - без ограничения
          shouldCancel = false;
        } else if (diffInMinutes > 30) {
          // Остальные способы - 30 минут
          shouldCancel = true;
          reason = "Истекло время для подтверждения оплаты (30 минут)";
        }

        if (shouldCancel) {
          batch.update(doc.ref, {
            status: "cancelled",
            paymentStatus: "cancelled",
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            cancelReason: reason,
            paymentHistory: admin.firestore.FieldValue.arrayUnion({
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              action: "auto_cancelled",
              userId: "system",
              userName: "Система",
              note: reason,
            }),
          });
          cancelledCount++;

          console.log(`Отменено бронирование ${doc.id}: ${reason}`);
        }
      }

      if (cancelledCount > 0) {
        await batch.commit();
        console.log(`Автоматически отменено ${cancelledCount} бронирований`);
      } else {
        console.log("Нет бронирований для отмены");
      }

      return null;
    } catch (error) {
      console.error("Ошибка при отмене просроченных бронирований:", error);
      throw error;
    }
  });

/**
 * HTTP-функция для ручного запуска отмены просроченных бронирований (для тестирования)
 */
export const cancelExpiredBookingsManual = functions
  .region("europe-west1")
  .https.onRequest(async (req, res) => {
    // Проверяем метод запроса
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const db = admin.firestore();
    const now = new Date();

    try {
      // Получаем все неоплаченные бронирования
      const bookingsSnapshot = await db.collection("bookings")
        .where("paymentStatus", "==", "awaiting_payment")
        .get();

      const batch = db.batch();
      let cancelledCount = 0;
      const cancelledBookings: {id: string; reason: string; [key: string]: unknown}[] = [];

      for (const doc of bookingsSnapshot.docs) {
        const booking = doc.data();
        const createdAt = booking.createdAt?.toDate() || new Date(booking.createdAt);
        const diffInMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));

        let shouldCancel = false;
        let reason = "";

        // Проверяем условия отмены в зависимости от способа оплаты
        if (booking.paymentMethod === "online" && diffInMinutes > 15) {
          shouldCancel = true;
          reason = "Истекло время для онлайн оплаты (15 минут)";
        } else if (booking.paymentMethod === "transfer") {
          shouldCancel = false;
        } else if (diffInMinutes > 30) {
          shouldCancel = true;
          reason = "Истекло время для подтверждения оплаты (30 минут)";
        }

        if (shouldCancel) {
          batch.update(doc.ref, {
            status: "cancelled",
            paymentStatus: "cancelled",
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            cancelReason: reason,
            paymentHistory: admin.firestore.FieldValue.arrayUnion({
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              action: "auto_cancelled",
              userId: "system",
              userName: "Система",
              note: reason,
            }),
          });
          cancelledCount++;
          cancelledBookings.push({
            id: doc.id,
            ...booking,
            reason,
          });
        }
      }

      if (cancelledCount > 0) {
        await batch.commit();
      }

      res.json({
        success: true,
        message: `Автоматически отменено ${cancelledCount} бронирований`,
        cancelledCount,
        cancelledBookings,
      });
    } catch (error) {
      console.error("Ошибка при отмене просроченных бронирований:", error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });
