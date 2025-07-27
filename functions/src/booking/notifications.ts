import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  sendBookingConfirmationToCustomer as sendCustomerEmail,
  sendBookingNotificationToAdmin as sendAdminEmail,
} from "../services/emailService";

const region = "europe-west1";

// Интерфейс для данных бронирования
interface BookingData {
  id: string
  venueId: string
  venueName: string
  courtId: string
  courtName: string
  date: string
  startTime: string
  endTime: string
  duration: number
  customerName: string
  customerPhone: string
  customerEmail?: string
  amount: number
  status: string
  paymentMethod: string
  gameType: string
}


// Cloud Function - триггер на создание бронирования
export const sendBookingNotifications = functions
  .region(region)
  .firestore
  .document("bookings/{bookingId}")
  .onCreate(async (snap, context) => {
    const booking = snap.data() as BookingData;
    booking.id = context.params.bookingId;

    // Отправляем уведомление клиенту (если есть email)
    if (booking.customerEmail) {
      await sendCustomerEmail(booking);
    }

    // Получаем email администратора клуба
    try {
      const venueDoc = await admin.firestore()
        .collection("venues")
        .doc(booking.venueId)
        .get();

      if (venueDoc.exists) {
        const venueData = venueDoc.data();
        if (venueData?.email) {
          await sendAdminEmail(booking, venueData.email);
        }
      }
    } catch (error) {
      console.error("Error fetching venue data:", error);
    }
  });

// Cloud Function для ручной отправки уведомления
export const resendBookingNotification = functions
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
      // Получаем данные бронирования
      const bookingDoc = await admin.firestore()
        .collection("bookings")
        .doc(bookingId)
        .get();

      if (!bookingDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Booking not found"
        );
      }

      const booking = bookingDoc.data() as BookingData;
      booking.id = bookingId;

      // Проверяем доступ
      const adminDoc = await admin.firestore()
        .collection("admins")
        .doc(context.auth.uid)
        .get();

      if (!adminDoc.exists) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Admin not found"
        );
      }

      const adminData = adminDoc.data();
      if (adminData?.role !== "superadmin" && adminData?.venueId !== booking.venueId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Access denied to this booking"
        );
      }

      // Отправляем уведомления
      const promises = [];

      if (booking.customerEmail) {
        promises.push(sendCustomerEmail(booking));
      }

      const venueDoc = await admin.firestore()
        .collection("venues")
        .doc(booking.venueId)
        .get();

      if (venueDoc.exists) {
        const venueData = venueDoc.data();
        if (venueData?.email) {
          promises.push(sendAdminEmail(booking, venueData.email));
        }
      }

      await Promise.all(promises);

      return {success: true, message: "Notifications sent successfully"};
    } catch (error: any) {
      console.error("Error resending booking notification:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to resend notification"
      );
    }
  });
