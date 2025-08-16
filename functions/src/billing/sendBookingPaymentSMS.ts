import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {smsService} from "../services/smsService";
import {SMSTemplatesSettings, DEFAULT_SMS_TEMPLATES} from "../types/smsTemplates";

const region = "europe-west1";
const db = admin.firestore();

interface SendBookingPaymentSMSRequest {
  bookingId: string;
  phone: string;
  customerName: string;
  venueId: string;
  venueName: string;
  courtName: string;
  date: string;
  time: string;
  paymentUrl: string;
}

export const sendBookingPaymentSMS = functions
  .region(region)
  .https.onCall(async (data: SendBookingPaymentSMSRequest, context) => {
    console.log("=== sendBookingPaymentSMS function called ===");
    console.log("Auth context:", context.auth ? "authenticated" : "not authenticated");
    console.log("Data received:", JSON.stringify(data));

    // Проверяем авторизацию - только администраторы могут отправлять SMS
    if (!context.auth) {
      console.error("Authentication failed - no auth context");
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const {
      bookingId,
      phone,
      customerName,
      venueName,
      date,
      time,
      paymentUrl,
    } = data;

    // Валидация входных данных
    const missingFields = [];
    if (!bookingId) missingFields.push("bookingId");
    if (!phone) missingFields.push("phone");
    if (!customerName) missingFields.push("customerName");
    if (!paymentUrl) missingFields.push("paymentUrl");

    if (missingFields.length > 0) {
      console.error("Missing required fields:", missingFields);
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Missing required fields: ${missingFields.join(", ")}`
      );
    }

    try {
      console.log("sendBookingPaymentSMS called with:", {
        bookingId,
        phone,
        customerName,
        venueName,
        date,
        time,
      });

      // Инициализируем SMS сервис
      await smsService.initialize();

      // Проверяем настройки SMS
      const smsSettingsDoc = await admin.firestore()
        .collection("settings")
        .doc("sms")
        .get();

      const smsSettings = smsSettingsDoc.data();
      console.log("SMS settings:", {
        exists: smsSettingsDoc.exists,
        testMode: smsSettings?.testMode,
        hasApiId: !!smsSettings?.smsruApiId,
      });

      if (!smsSettingsDoc.exists) {
        console.error("SMS settings not configured");
        throw new functions.https.HttpsError(
          "failed-precondition",
          "SMS service is not configured. Please configure SMS settings in admin panel."
        );
      }

      // Получаем информацию о бронировании
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

      // Получаем настройки SMS шаблонов
      const templatesDoc = await admin.firestore()
        .collection("settings")
        .doc("smsTemplates")
        .get();

      const templates = templatesDoc.exists ?
        templatesDoc.data() as SMSTemplatesSettings :
        DEFAULT_SMS_TEMPLATES;

      console.log("SMS templates loaded:", {
        hasPaymentLink: !!templates?.paymentLink,
        enabled: templates?.paymentLink?.enabled,
      });

      if (!templates?.paymentLink?.enabled) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Payment link SMS is disabled"
        );
      }

      // Получаем информацию о площадке для часового пояса
      let venueTimezone = "Europe/Moscow";
      if (data.venueId) {
        try {
          const venueDoc = await db.collection("venues").doc(data.venueId).get();
          const venue = venueDoc.data();
          venueTimezone = venue?.timezone || "Europe/Moscow";
        } catch (venueError) {
          console.warn("Could not fetch venue data:", venueError);
          // Используем timezone по умолчанию
        }
      } else {
        console.warn("No venueId provided, using default timezone");
      }

      // Форматируем дату с учетом часового пояса клуба
      const dateObj = new Date(date);
      const formattedDate = dateObj.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        timeZone: venueTimezone,
      });

      // Формируем текст SMS используя шаблон
      const message = templates.paymentLink.template
        .replace("{name}", customerName)
        .replace("{date}", formattedDate)
        .replace("{time}", time)
        .replace("{link}", paymentUrl)
        .replace("{venue}", venueName);

      console.log("Sending SMS with message:", message, "to phone:", phone);

      // Проверяем инициализацию SMS сервиса
      if (!smsService) {
        throw new functions.https.HttpsError(
          "internal",
          "SMS service is not initialized"
        );
      }

      // Отправляем SMS
      let success = false;
      try {
        success = await smsService.sendSMS(phone, message);
        console.log("SMS send result:", success);
      } catch (smsError) {
        console.error("Error in smsService.sendSMS:", smsError);
        throw new functions.https.HttpsError(
          "internal",
          `SMS service error: ${smsError instanceof Error ? smsError.message : "Unknown error"}`
        );
      }

      if (!success) {
        throw new functions.https.HttpsError(
          "internal",
          "Failed to send SMS - service returned false"
        );
      }

      // Обновляем бронирование - добавляем информацию об отправке SMS
      await admin.firestore()
        .collection("bookings")
        .doc(bookingId)
        .update({
          paymentSmsInfo: {
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            sentTo: phone,
            paymentUrl: paymentUrl,
          },
        });

      // Логируем отправку SMS
      await admin.firestore().collection("sms_logs").add({
        type: "payment_link",
        bookingId: bookingId,
        phone: phone,
        message: message,
        success: true,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        message: "SMS sent successfully",
      };
    } catch (error) {
      console.error("=== Error in sendBookingPaymentSMS ===");
      console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      console.error("Full error:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        error instanceof Error ? error.message : "Failed to send SMS"
      );
    }
  });
