import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {BookingSMSService} from "../services/bookingSmsService";

const region = "europe-west1";

/**
 * Cron job для отправки SMS напоминаний за 2 часа до игры
 * Запускается каждые 15 минут
 */
export const sendBookingReminders = functions
  .region(region)
  .pubsub.schedule("*/15 * * * *") // Каждые 15 минут
  .timeZone("Europe/Moscow")
  .onRun(async (_context) => {
    const db = admin.firestore();
    const smsService = new BookingSMSService();

    try {
      // Получаем текущее время
      const now = new Date();

      // Время через 2 часа
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      // Время через 2 часа 15 минут (чтобы не пропустить бронирования)
      const twoHours15MinLater = new Date(now.getTime() + 2 * 60 * 60 * 1000 + 15 * 60 * 1000);

      console.log(
        `Checking for bookings between ${twoHoursLater.toISOString()} and ${twoHours15MinLater.toISOString()}`
      );

      // Находим все подтвержденные бронирования на следующие 2 часа
      const bookingsQuery = await db
        .collection("bookings")
        .where("status", "==", "confirmed")
        .where("paymentStatus", "==", "paid")
        .where("reminderSent", "!=", true)
        .where("date", ">=", twoHoursLater)
        .where("date", "<=", twoHours15MinLater)
        .get();

      if (bookingsQuery.empty) {
        console.log("No bookings found for reminders");
        return;
      }

      console.log(`Found ${bookingsQuery.size} bookings for reminders`);

      // Отправляем напоминания
      const promises = bookingsQuery.docs.map(async (doc) => {
        const bookingId = doc.id;
        const bookingData = doc.data();

        try {
          // Проверяем время начала игры
          const bookingDate = bookingData.date.toDate ? bookingData.date.toDate() : new Date(bookingData.date);
          const startTime = bookingData.startTime;

          // Парсим время начала
          const [hours, minutes] = startTime.split(":").map(Number);
          bookingDate.setHours(hours, minutes, 0, 0);

          // Проверяем, что игра действительно через 2 часа (с погрешностью 15 минут)
          const timeDiff = bookingDate.getTime() - now.getTime();
          const hoursDiff = timeDiff / (1000 * 60 * 60);

          if (hoursDiff >= 1.75 && hoursDiff <= 2.25) {
            console.log(`Sending reminder for booking ${bookingId}`);
            await smsService.sendBookingReminder(bookingId);
          } else {
            console.log(`Skipping booking ${bookingId}, time diff: ${hoursDiff} hours`);
          }
        } catch (error) {
          console.error(`Error sending reminder for booking ${bookingId}:`, error);
        }
      });

      await Promise.all(promises);
      console.log("Booking reminders job completed");
    } catch (error) {
      console.error("Error in booking reminders job:", error);
    }
  });

/**
 * Функция для ручной отправки напоминания (для тестирования)
 */
export const sendBookingReminderManual = functions
  .region(region)
  .https.onCall(async (data, context) => {
    // Проверяем авторизацию
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const {bookingId} = data;

    if (!bookingId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Booking ID is required"
      );
    }

    try {
      const smsService = new BookingSMSService();
      const success = await smsService.sendBookingReminder(bookingId);

      if (success) {
        return {success: true, message: "Reminder sent successfully"};
      } else {
        throw new functions.https.HttpsError(
          "internal",
          "Failed to send reminder"
        );
      }
    } catch (error) {
      console.error("Error sending manual reminder:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to send reminder"
      );
    }
  });
