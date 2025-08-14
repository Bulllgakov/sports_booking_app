import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Cloud Function для исправления статусов бронирований
 * Исправляет несоответствия между status и paymentStatus
 */
export const fixBookingStatuses = functions
  .region("europe-west1")
  .https.onRequest(async (req, res) => {
    // Проверяем метод запроса
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const db = admin.firestore();

    try {
      console.log("🔍 Начинаем анализ и исправление статусов бронирований...");

      // Получаем все бронирования
      const bookingsSnapshot = await db.collection("bookings").get();
      console.log(`Всего бронирований: ${bookingsSnapshot.size}`);

      const stats = {
        total: 0,
        fixed: 0,
        confirmedWithAwaitingPayment: 0,
        pendingWithPaid: 0,
        confirmedWithError: 0,
        cancelledWithAwaitingPayment: 0,
        missingPaymentStatus: 0,
        errors: [],
      };

      const batch = db.batch();
      let batchCount = 0;
      const maxBatchSize = 450; // Firebase лимит - 500

      for (const doc of bookingsSnapshot.docs) {
        const booking = doc.data();
        stats.total++;

        let needsUpdate = false;
        const updates: any = {};

        // 1. Проверяем наличие paymentStatus
        if (!booking.paymentStatus) {
          stats.missingPaymentStatus++;
          needsUpdate = true;

          // Устанавливаем paymentStatus на основе status
          if (booking.status === "confirmed") {
            updates.paymentStatus = "paid";
          } else if (booking.status === "cancelled") {
            updates.paymentStatus = "cancelled";
          } else if (booking.status === "pending") {
            // Проверяем давность для pending
            const createdAt = booking.createdAt?.toDate() || new Date(booking.createdAt);
            const now = new Date();
            const diffInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

            if (diffInHours > 24) {
              updates.paymentStatus = "expired";
            } else {
              updates.paymentStatus = "awaiting_payment";
            }
          } else {
            updates.paymentStatus = "awaiting_payment";
          }

          console.log(`Добавлен paymentStatus для ${doc.id}: ${updates.paymentStatus}`);
        }

        // 2. Исправляем несоответствие: confirmed с awaiting_payment
        // Если бронирование подтверждено, но оплата еще ожидается -
        // меняем статус бронирования на pending (ожидает)
        if (booking.status === "confirmed" &&
            booking.paymentStatus === "awaiting_payment") {
          stats.confirmedWithAwaitingPayment++;
          needsUpdate = true;
          updates.status = "pending"; // Меняем статус бронирования, а не оплаты!
          console.log(
            `Исправлено: ${doc.id} - status: confirmed → pending (т.к. paymentStatus: awaiting_payment)`
          );
        }

        // 3. Исправляем несоответствие: cancelled с awaiting_payment
        if (booking.status === "cancelled" &&
            booking.paymentStatus === "awaiting_payment") {
          stats.cancelledWithAwaitingPayment++;
          needsUpdate = true;
          updates.paymentStatus = "cancelled";
          console.log(`Исправлено: ${doc.id} - cancelled → cancelled`);
        }

        // 4. Исправляем несоответствие: pending с paid/online_payment
        // Если оплата прошла, но статус еще pending - подтверждаем бронирование
        if (booking.status === "pending" &&
            (booking.paymentStatus === "paid" ||
             booking.paymentStatus === "online_payment")) {
          stats.pendingWithPaid++;
          needsUpdate = true;
          updates.status = "confirmed";
          console.log(
            `Исправлено: ${doc.id} - status: pending → confirmed (т.к. paymentStatus: ${booking.paymentStatus})`
          );
        }

        // 5. Исправляем несоответствие: confirmed с cancelled/error/expired
        // Если бронирование подтверждено, но оплата отменена/ошибка - отменяем бронирование
        if (booking.status === "confirmed" &&
            (booking.paymentStatus === "cancelled" ||
             booking.paymentStatus === "error" ||
             booking.paymentStatus === "expired")) {
          stats.confirmedWithError++;
          needsUpdate = true;
          updates.status = "cancelled";
          console.log(
            `Исправлено: ${doc.id} - status: confirmed → cancelled (т.к. paymentStatus: ${booking.paymentStatus})`
          );
        }

        // Добавляем в batch если нужно обновление
        if (needsUpdate) {
          updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
          batch.update(doc.ref, updates);
          stats.fixed++;
          batchCount++;

          // Если достигли лимита batch, выполняем и создаем новый
          if (batchCount >= maxBatchSize) {
            await batch.commit();
            console.log(`✅ Обновлено ${batchCount} записей`);
            batchCount = 0;
            // batch будет создан заново при следующей итерации
          }
        }
      }

      // Выполняем оставшиеся обновления
      if (batchCount > 0) {
        await batch.commit();
        console.log(`✅ Обновлено последние ${batchCount} записей`);
      }

      // Проверяем слоты на сегодня
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayBookings = await db.collection("bookings")
        .where("date", ">=", admin.firestore.Timestamp.fromDate(today))
        .where("date", "<", admin.firestore.Timestamp.fromDate(tomorrow))
        .get();

      const todayStats = {
        total: 0,
        occupying: 0,
        free: 0,
      };

      todayBookings.forEach((doc) => {
        const booking = doc.data();
        const status = booking.status || "pending";
        const paymentStatus = booking.paymentStatus || "awaiting_payment";

        todayStats.total++;

        // Проверяем по логике из ТЗ
        const occupiesSlot =
          status !== "cancelled" &&
          paymentStatus !== "cancelled" &&
          paymentStatus !== "refunded" &&
          paymentStatus !== "error" &&
          (status === "confirmed" || status === "pending" ||
           paymentStatus === "paid" || paymentStatus === "online_payment" ||
           paymentStatus === "awaiting_payment");

        if (occupiesSlot) {
          todayStats.occupying++;
        } else {
          todayStats.free++;
        }
      });

      // Формируем ответ
      const response = {
        success: true,
        message: "Статусы бронирований успешно исправлены",
        stats: {
          total: stats.total,
          fixed: stats.fixed,
          details: {
            missingPaymentStatus: stats.missingPaymentStatus,
            confirmedWithAwaitingPayment: stats.confirmedWithAwaitingPayment,
            pendingWithPaid: stats.pendingWithPaid,
            confirmedWithError: stats.confirmedWithError,
            cancelledWithAwaitingPayment: stats.cancelledWithAwaitingPayment,
          },
        },
        todayBookings: {
          total: todayStats.total,
          occupyingSlots: todayStats.occupying,
          freeSlots: todayStats.free,
        },
      };

      console.log("✅ Миграция завершена:", response);
      res.json(response);
    } catch (error) {
      console.error("❌ Ошибка при исправлении статусов:", error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });
