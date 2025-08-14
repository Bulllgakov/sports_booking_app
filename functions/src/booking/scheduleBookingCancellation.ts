import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {CloudTasksClient} from "@google-cloud/tasks";

const region = "europe-west1";
const tasksClient = new CloudTasksClient();

interface BookingData {
  paymentMethod: string;
  paymentStatus?: string;
  venueId: string;
  createdAt: admin.firestore.Timestamp;
}

/**
 * Триггер на создание бронирования - планирует автоматическую отмену
 */
export const scheduleBookingCancellation = functions
  .region(region)
  .firestore
  .document("bookings/{bookingId}")
  .onCreate(async (snapshot, context) => {
    const booking = snapshot.data() as BookingData;
    const bookingId = context.params.bookingId;

    // Проверяем, нужно ли планировать отмену
    if (booking.paymentStatus !== "awaiting_payment") {
      console.log(`Booking ${bookingId} doesn't need cancellation scheduling`);
      return;
    }

    // Определяем время отмены в зависимости от способа оплаты
    let delayMinutes = 0;
    if (booking.paymentMethod === "online") {
      delayMinutes = 15; // 15 минут для онлайн оплаты
    } else if (booking.paymentMethod === "transfer" ||
               booking.paymentMethod === "cash" ||
               booking.paymentMethod === "card_on_site") {
      // Для перевода на р.счет, наличных и карты в клубе не планируем отмену
      console.log(`Booking ${bookingId} with ${booking.paymentMethod} payment - no cancellation needed`);
      return;
    } else if (booking.paymentMethod === "sberbank_card" ||
               booking.paymentMethod === "tbank_card" ||
               booking.paymentMethod === "vtb_card") {
      delayMinutes = 30; // 30 минут для карт банков
    } else {
      // Для старых бронирований без указания метода - 30 минут
      delayMinutes = 30;
      console.log(`Booking ${bookingId} without payment method - scheduling cancellation in 30 minutes`);
    }

    // Вычисляем время выполнения задачи
    const createdAt = booking.createdAt.toDate();
    const executeAt = new Date(createdAt.getTime() + delayMinutes * 60 * 1000);

    try {
      // Создаем Cloud Task
      const project = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
      const location = region;
      const queue = "booking-cancellation";
      const parent = tasksClient.queuePath(project!, location, queue);

      // URL функции для отмены конкретного бронирования
      const url = `https://${location}-${project}.cloudfunctions.net/cancelSpecificBooking`;

      const task = {
        httpRequest: {
          httpMethod: "POST" as const,
          url,
          headers: {
            "Content-Type": "application/json",
          },
          body: Buffer.from(JSON.stringify({
            bookingId,
            venueId: booking.venueId,
            expectedPaymentMethod: booking.paymentMethod,
          })).toString("base64"),
        },
        scheduleTime: {
          seconds: Math.floor(executeAt.getTime() / 1000),
        },
      };

      const [response] = await tasksClient.createTask({
        parent,
        task,
      });

      console.log(`Scheduled cancellation for booking ${bookingId} at ${executeAt.toISOString()}`);
      // Сохраняем ID задачи в бронировании для возможной отмены
      await snapshot.ref.update({
        cancellationTaskName: response.name,
        scheduledCancellationTime: admin.firestore.Timestamp.fromDate(executeAt),
      });
    } catch (error) {
      console.error(`Error scheduling cancellation for booking ${bookingId}:`, error);
      // Не прерываем выполнение - пусть старый механизм подстрахует
    }
  });

/**
 * Функция для отмены конкретного бронирования
 */
export const cancelSpecificBooking = functions
  .region(region)
  .https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const {bookingId, venueId, expectedPaymentMethod} = req.body;

    if (!bookingId || !venueId) {
      res.status(400).json({error: "Missing required parameters"});
      return;
    }

    try {
      const db = admin.firestore();
      const bookingRef = db.collection("bookings").doc(bookingId);
      const bookingDoc = await bookingRef.get();

      if (!bookingDoc.exists) {
        console.log(`Booking ${bookingId} not found - might be already deleted`);
        res.json({success: true, message: "Booking not found"});
        return;
      }

      const booking = bookingDoc.data()!;

      // Проверяем, что бронирование все еще ожидает оплаты
      if (booking.paymentStatus !== "awaiting_payment") {
        console.log(`Booking ${bookingId} already has payment status: ${booking.paymentStatus}`);
        res.json({success: true, message: "Booking already processed"});
        return;
      }

      // Дополнительная проверка способа оплаты (на случай изменений)
      if (booking.paymentMethod !== expectedPaymentMethod) {
        console.log(
          `Booking ${bookingId} payment method changed from ${expectedPaymentMethod} to ${booking.paymentMethod}`,
        );
        res.json({success: true, message: "Payment method changed"});
        return;
      }

      // Определяем причину отмены
      let reason = "";
      if (booking.paymentMethod === "online") {
        reason = "Истекло время для онлайн оплаты (15 минут)";
      } else {
        reason = "Истекло время для подтверждения оплаты (30 минут)";
      }

      // Отменяем бронирование
      await bookingRef.update({
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

      console.log(`Successfully cancelled booking ${bookingId}: ${reason}`);
      res.json({
        success: true,
        message: `Booking ${bookingId} cancelled`,
        reason,
      });
    } catch (error) {
      console.error(`Error cancelling booking ${bookingId}:`, error);
      res.status(500).json({
        success: false,
        error: "Failed to cancel booking",
      });
    }
  });

/**
 * Триггер на обновление бронирования - отменяет запланированную задачу при оплате
 */
export const cancelScheduledCancellation = functions
  .region(region)
  .firestore
  .document("bookings/{bookingId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data() as BookingData & {cancellationTaskName?: string};
    const after = change.after.data() as BookingData;
    const bookingId = context.params.bookingId;

    // Проверяем, изменился ли статус оплаты с awaiting_payment на что-то другое
    if (before.paymentStatus === "awaiting_payment" &&
        after.paymentStatus !== "awaiting_payment" &&
        before.cancellationTaskName) {
      try {
        // Отменяем запланированную задачу
        await tasksClient.deleteTask({
          name: before.cancellationTaskName,
        });

        console.log(`Cancelled scheduled cancellation for booking ${bookingId}`);
        // Удаляем информацию о задаче из документа
        await change.after.ref.update({
          cancellationTaskName: admin.firestore.FieldValue.delete(),
          scheduledCancellationTime: admin.firestore.FieldValue.delete(),
        });
      } catch (error) {
        // Задача может быть уже выполнена или не существовать
        console.log(`Could not cancel task for booking ${bookingId}:`, error);
      }
    }
  });
