import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {BookingSMSService} from "../services/bookingSmsService";

const region = "europe-west1";

/**
 * Cloud Function для обновления бронирования с отправкой SMS
 */
export const updateBooking = functions
  .region(region)
  .https.onCall(async (data, context) => {
    // Проверяем авторизацию
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const {bookingId, updates} = data;

    if (!bookingId || !updates) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Booking ID and updates are required"
      );
    }

    const db = admin.firestore();

    try {
      // Получаем текущие данные бронирования
      const bookingRef = db.collection("bookings").doc(bookingId);
      const bookingDoc = await bookingRef.get();

      if (!bookingDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Booking not found"
        );
      }

      const currentData = bookingDoc.data()!;

      // Проверяем права доступа
      const isAdmin = await checkAdminAccess(context.auth.uid, currentData.venueId);
      const isOwner = currentData.userId === context.auth.uid;

      if (!isAdmin && !isOwner) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You don't have permission to update this booking"
        );
      }

      // Определяем, какие изменения произошли
      const timeChanged = updates.startTime && updates.startTime !== currentData.startTime;
      const courtChanged = updates.courtId && updates.courtId !== currentData.courtId;
      const dateChanged = updates.date && !isSameDate(updates.date, currentData.date);

      // Обновляем бронирование
      const updateData = {
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: context.auth.uid,
      };

      await bookingRef.update(updateData);

      // Отправляем SMS если изменилось время или корт
      if ((timeChanged || courtChanged || dateChanged) && currentData.customerPhone) {
        try {
          const smsService = new BookingSMSService();

          // Получаем название корта
          let courtName = currentData.courtName;
          if (courtChanged && updates.courtId) {
            const courtDoc = await db.collection("courts").doc(updates.courtId).get();
            if (courtDoc.exists) {
              courtName = courtDoc.data()?.name || courtName;
            }
          }

          const newTime = updates.startTime || currentData.startTime;

          await smsService.sendBookingModification(
            bookingId,
            newTime,
            courtName || "Корт"
          );

          console.log(`SMS notification sent for booking modification: ${bookingId}`);
        } catch (smsError) {
          console.error("Error sending SMS notification:", smsError);
          // Не прерываем процесс если SMS не отправилось
        }
      }

      // Логируем изменение
      await db.collection("auditLogs").add({
        action: "booking_updated",
        bookingId: bookingId,
        userId: context.auth.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        changes: updates,
        previousValues: {
          startTime: timeChanged ? currentData.startTime : undefined,
          courtId: courtChanged ? currentData.courtId : undefined,
          date: dateChanged ? currentData.date : undefined,
        },
      });

      return {
        success: true,
        message: "Booking updated successfully",
        smsNotificationSent: timeChanged || courtChanged || dateChanged,
      };
    } catch (error) {
      console.error("Error updating booking:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to update booking"
      );
    }
  });

/**
 * Проверяет, является ли пользователь администратором клуба
 */
async function checkAdminAccess(userId: string, venueId: string): Promise<boolean> {
  const db = admin.firestore();

  try {
    // Получаем пользователя по ID
    const userRecord = await admin.auth().getUser(userId);
    const userEmail = userRecord.email;

    if (!userEmail) {
      return false;
    }

    // Проверяем, является ли пользователь администратором
    const adminQuery = await db
      .collection("admins")
      .where("email", "==", userEmail)
      .where("venueId", "==", venueId)
      .limit(1)
      .get();

    return !adminQuery.empty;
  } catch (error) {
    console.error("Error checking admin access:", error);
    return false;
  }
}

/**
 * Проверяет, одинаковые ли даты
 */
function isSameDate(date1: any, date2: any): boolean {
  const d1 = date1.toDate ? date1.toDate() : new Date(date1);
  const d2 = date2.toDate ? date2.toDate() : new Date(date2);

  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}
