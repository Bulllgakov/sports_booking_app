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
      // Включаем и старые бронирования без paymentStatus
      const [awaitingPaymentBookings, pendingBookings] = await Promise.all([
        db.collection("bookings")
          .where("paymentStatus", "==", "awaiting_payment")
          .get(),
        db.collection("bookings")
          .where("status", "==", "pending")
          .get(),
      ]);

      // Объединяем оба набора бронирований
      const allBookings = [...awaitingPaymentBookings.docs, ...pendingBookings.docs];
      // Убираем дубликаты по ID
      const uniqueBookings = Array.from(
        new Map(allBookings.map((doc) => [doc.id, doc])).values()
      );

      const batch = db.batch();
      let cancelledCount = 0;

      for (const doc of uniqueBookings) {
        const booking = doc.data();
        const createdAt = booking.createdAt?.toDate() || new Date(booking.createdAt);
        const diffInMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));

        let shouldCancel = false;
        let reason = "";

        // Для старых бронирований без paymentStatus проверяем статус
        const isUnpaid = booking.paymentStatus === "awaiting_payment" ||
                        (!booking.paymentStatus && booking.status === "pending");

        // Пропускаем уже оплаченные или отмененные
        if (!isUnpaid) continue;

        // Проверяем условия отмены в зависимости от способа оплаты
        // ВАЖНО: cash и card_on_site НЕ имеют ограничения по времени
        if (booking.paymentMethod === "cash" ||
            booking.paymentMethod === "card_on_site" ||
            booking.paymentMethod === "transfer") {
          // Наличные, карта в клубе и перевод на р.счет - БЕЗ ОГРАНИЧЕНИЯ по времени
          shouldCancel = false;
          console.log(`Бронирование ${doc.id} с методом оплаты ${booking.paymentMethod} не будет отменено`);
        } else if (booking.paymentMethod === "online" && diffInMinutes > 15) {
          // Онлайн оплата - 15 минут
          shouldCancel = true;
          reason = "Истекло время для онлайн оплаты (15 минут)";
        } else if ((booking.paymentMethod === "sberbank_card" ||
                    booking.paymentMethod === "tbank_card" ||
                    booking.paymentMethod === "vtb_card") && diffInMinutes > 30) {
          // Карты банков - 30 минут
          shouldCancel = true;
          reason = "Истекло время для подтверждения оплаты (30 минут)";
        } else if (!booking.paymentMethod && diffInMinutes > 30) {
          // Для старых бронирований без указания метода оплаты - 30 минут
          shouldCancel = true;
          reason = "Истекло время для подтверждения оплаты (30 минут)";
          console.log(`Бронирование ${doc.id} без метода оплаты будет отменено через ${diffInMinutes} минут`);
        }

        if (shouldCancel) {
          // Обновляем оба статуса: paymentStatus на 'expired', status на cancelled
          batch.update(doc.ref, {
            status: "cancelled",
            paymentStatus: "expired", // Статус "Время истекло"
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            cancelReason: reason,
            paymentHistory: admin.firestore.FieldValue.arrayUnion({
              timestamp: admin.firestore.Timestamp.now(),
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
      // Включаем и старые бронирования без paymentStatus
      const [awaitingPaymentBookings, pendingBookings] = await Promise.all([
        db.collection("bookings")
          .where("paymentStatus", "==", "awaiting_payment")
          .get(),
        db.collection("bookings")
          .where("status", "==", "pending")
          .get(),
      ]);

      // Объединяем оба набора бронирований
      const allBookings = [...awaitingPaymentBookings.docs, ...pendingBookings.docs];
      // Убираем дубликаты по ID
      const uniqueBookings = Array.from(
        new Map(allBookings.map((doc) => [doc.id, doc])).values()
      );

      const batch = db.batch();
      let cancelledCount = 0;
      const cancelledBookings: {id: string; reason: string; [key: string]: unknown}[] = [];

      for (const doc of uniqueBookings) {
        const booking = doc.data();
        const createdAt = booking.createdAt?.toDate() || new Date(booking.createdAt);
        const diffInMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));

        let shouldCancel = false;
        let reason = "";

        // Для старых бронирований без paymentStatus проверяем статус
        const isUnpaid = booking.paymentStatus === "awaiting_payment" ||
                        (!booking.paymentStatus && booking.status === "pending");

        // Пропускаем уже оплаченные или отмененные
        if (!isUnpaid) continue;

        // Проверяем условия отмены в зависимости от способа оплаты
        // ВАЖНО: cash и card_on_site НЕ имеют ограничения по времени
        if (booking.paymentMethod === "cash" ||
            booking.paymentMethod === "card_on_site" ||
            booking.paymentMethod === "transfer") {
          // Наличные, карта в клубе и перевод на р.счет - БЕЗ ОГРАНИЧЕНИЯ по времени
          shouldCancel = false;
          console.log(`Бронирование ${doc.id} с методом оплаты ${booking.paymentMethod} не будет отменено`);
        } else if (booking.paymentMethod === "online" && diffInMinutes > 15) {
          // Онлайн оплата - 15 минут
          shouldCancel = true;
          reason = "Истекло время для онлайн оплаты (15 минут)";
        } else if ((booking.paymentMethod === "sberbank_card" ||
                    booking.paymentMethod === "tbank_card" ||
                    booking.paymentMethod === "vtb_card") && diffInMinutes > 30) {
          // Карты банков - 30 минут
          shouldCancel = true;
          reason = "Истекло время для подтверждения оплаты (30 минут)";
        } else if (!booking.paymentMethod && diffInMinutes > 30) {
          // Для старых бронирований без указания метода оплаты - 30 минут
          shouldCancel = true;
          reason = "Истекло время для подтверждения оплаты (30 минут)";
          console.log(`Бронирование ${doc.id} без метода оплаты будет отменено через ${diffInMinutes} минут`);
        }

        if (shouldCancel) {
          // Обновляем оба статуса: paymentStatus на 'expired', status на cancelled
          batch.update(doc.ref, {
            status: "cancelled",
            paymentStatus: "expired", // Статус "Время истекло"
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            cancelReason: reason,
            paymentHistory: admin.firestore.FieldValue.arrayUnion({
              timestamp: admin.firestore.Timestamp.now(),
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
