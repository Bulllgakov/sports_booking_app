import * as admin from "firebase-admin";
import {SMSService} from "./smsService";
import {SMSTemplatesSettings} from "../types/smsTemplates";

export class BookingSMSService {
  private smsService: SMSService;

  constructor() {
    this.smsService = new SMSService();
  }

  /**
   * Отправляет SMS подтверждение бронирования
   */
  async sendBookingConfirmation(bookingId: string): Promise<boolean> {
    try {
      console.log(`Starting sendBookingConfirmation for booking: ${bookingId}`);
      const db = admin.firestore();

      // Получаем данные бронирования
      const bookingDoc = await db.collection("bookings").doc(bookingId).get();
      if (!bookingDoc.exists) {
        console.error(`Booking ${bookingId} not found`);
        return false;
      }

      const booking = bookingDoc.data()!;
      console.log(`Booking data loaded for: ${bookingId}, phone: ${booking.customerPhone}`);

      // Получаем настройки SMS шаблонов
      const templatesDoc = await db.collection("settings").doc("smsTemplates").get();
      const templates = templatesDoc.data() as SMSTemplatesSettings | undefined;

      console.log("SMS templates loaded:", {
        exists: templatesDoc.exists,
        hasBookingConfirmation: !!templates?.bookingConfirmation,
        enabled: templates?.bookingConfirmation?.enabled,
      });

      if (!templates?.bookingConfirmation?.enabled) {
        console.log("Booking confirmation SMS is disabled");
        return false;
      }

      // Инициализируем SMS сервис
      await this.smsService.initialize();

      // Получаем информацию о площадке
      const venueDoc = await db.collection("venues").doc(booking.venueId).get();
      const venue = venueDoc.data();

      // Получаем информацию о корте
      const courtDoc = await db.collection("venues").doc(booking.venueId)
        .collection("courts").doc(booking.courtId).get();
      const court = courtDoc.data();

      // Форматируем дату и время
      const bookingDate = booking.date.toDate ? booking.date.toDate() : new Date(booking.date);
      // Используем часовой пояс клуба, если указан, иначе Москва по умолчанию
      const venueTimezone = venue?.timezone || "Europe/Moscow";
      const dateStr = bookingDate.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: venueTimezone,
      });

      // Форматируем время с интервалом
      const startTime = booking.startTime || booking.time || "00:00";
      let endTime = booking.endTime;

      // Если нет endTime, вычисляем из duration
      if (!endTime && booking.duration) {
        const [hours, minutes] = startTime.split(":").map(Number);
        const durationMinutes = booking.duration;
        const endHours = Math.floor((hours * 60 + minutes + durationMinutes) / 60);
        const endMinutes = (hours * 60 + minutes + durationMinutes) % 60;
        endTime = `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
      }

      const timeStr = endTime ? `${startTime}-${endTime}` : startTime;

      // Заменяем переменные в шаблоне
      const message = templates.bookingConfirmation.template
        .replace(/{name}/g, booking.customerName || "")
        .replace(/{venue}/g, venue?.name || "")
        .replace(/{court}/g, court?.name || booking.courtName || "")
        .replace(/{date}/g, dateStr)
        .replace(/{time}/g, timeStr)
        .replace(/{price}/g, booking.amount?.toString() ||
          booking.totalPrice?.toString() || booking.price?.toString() || "");

      // Отправляем SMS
      const phone = this.normalizePhone(booking.customerPhone);
      const success = await this.smsService.sendSMS(phone, message);

      if (success) {
        // Логируем отправку
        await db.collection("sms_logs").add({
          type: "booking_confirmation",
          bookingId: bookingId,
          phone: phone,
          message: message,
          success: true,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return success;
    } catch (error) {
      console.error("Error sending booking confirmation SMS:", error);
      return false;
    }
  }

  /**
   * Отправляет SMS об отмене бронирования
   */
  async sendBookingCancellation(bookingId: string): Promise<boolean> {
    try {
      const db = admin.firestore();

      // Получаем данные бронирования
      const bookingDoc = await db.collection("bookings").doc(bookingId).get();
      if (!bookingDoc.exists) {
        console.error(`Booking ${bookingId} not found`);
        return false;
      }

      const booking = bookingDoc.data()!;

      // Получаем настройки SMS шаблонов
      const templatesDoc = await db.collection("settings").doc("smsTemplates").get();
      const templates = templatesDoc.data() as SMSTemplatesSettings | undefined;

      if (!templates?.bookingCancellation?.enabled) {
        console.log("Booking cancellation SMS is disabled");
        return false;
      }

      // Инициализируем SMS сервис
      await this.smsService.initialize();

      // Получаем информацию о площадке
      const venueDoc = await db.collection("venues").doc(booking.venueId).get();
      const venue = venueDoc.data();

      // Форматируем дату и время
      const bookingDate = booking.date.toDate ? booking.date.toDate() : new Date(booking.date);
      // Используем часовой пояс клуба, если указан, иначе Москва по умолчанию
      const venueTimezone = venue?.timezone || "Europe/Moscow";
      const dateStr = bookingDate.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: venueTimezone,
      });

      // Форматируем время с интервалом
      const startTime = booking.startTime || booking.time || "00:00";
      let endTime = booking.endTime;

      // Если нет endTime, вычисляем из duration
      if (!endTime && booking.duration) {
        const [hours, minutes] = startTime.split(":").map(Number);
        const durationMinutes = booking.duration;
        const endHours = Math.floor((hours * 60 + minutes + durationMinutes) / 60);
        const endMinutes = (hours * 60 + minutes + durationMinutes) % 60;
        endTime = `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
      }

      const timeStr = endTime ? `${startTime}-${endTime}` : startTime;

      // Заменяем переменные в шаблоне
      const message = templates.bookingCancellation.template
        .replace(/{venue}/g, venue?.name || "")
        .replace(/{date}/g, dateStr)
        .replace(/{time}/g, timeStr);

      // Отправляем SMS
      const phone = this.normalizePhone(booking.customerPhone);
      const success = await this.smsService.sendSMS(phone, message);

      if (success) {
        // Логируем отправку
        await db.collection("sms_logs").add({
          type: "booking_cancellation",
          bookingId: bookingId,
          phone: phone,
          message: message,
          success: true,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return success;
    } catch (error) {
      console.error("Error sending booking cancellation SMS:", error);
      return false;
    }
  }

  /**
   * Отправляет SMS об изменении бронирования
   */
  async sendBookingModification(bookingId: string, newTime: string, newCourt: string): Promise<boolean> {
    try {
      const db = admin.firestore();

      // Получаем данные бронирования
      const bookingDoc = await db.collection("bookings").doc(bookingId).get();
      if (!bookingDoc.exists) {
        console.error(`Booking ${bookingId} not found`);
        return false;
      }

      const booking = bookingDoc.data()!;

      // Получаем настройки SMS шаблонов
      const templatesDoc = await db.collection("settings").doc("smsTemplates").get();
      const templates = templatesDoc.data() as SMSTemplatesSettings | undefined;

      if (!templates?.bookingModification?.enabled) {
        console.log("Booking modification SMS is disabled");
        return false;
      }

      // Инициализируем SMS сервис
      await this.smsService.initialize();

      // Заменяем переменные в шаблоне
      const message = templates.bookingModification.template
        .replace(/{time}/g, newTime)
        .replace(/{court}/g, newCourt);

      // Отправляем SMS
      const phone = this.normalizePhone(booking.customerPhone);
      const success = await this.smsService.sendSMS(phone, message);

      if (success) {
        // Логируем отправку
        await db.collection("sms_logs").add({
          type: "booking_modification",
          bookingId: bookingId,
          phone: phone,
          message: message,
          success: true,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return success;
    } catch (error) {
      console.error("Error sending booking modification SMS:", error);
      return false;
    }
  }

  /**
   * Отправляет SMS напоминание о предстоящей игре
   */
  async sendBookingReminder(bookingId: string): Promise<boolean> {
    try {
      const db = admin.firestore();

      // Получаем данные бронирования
      const bookingDoc = await db.collection("bookings").doc(bookingId).get();
      if (!bookingDoc.exists) {
        console.error(`Booking ${bookingId} not found`);
        return false;
      }

      const booking = bookingDoc.data()!;

      // Получаем настройки SMS шаблонов
      const templatesDoc = await db.collection("settings").doc("smsTemplates").get();
      const templates = templatesDoc.data() as SMSTemplatesSettings | undefined;

      if (!templates?.bookingReminder?.enabled) {
        console.log("Booking reminder SMS is disabled");
        return false;
      }

      // Инициализируем SMS сервис
      await this.smsService.initialize();

      // Получаем информацию о площадке
      const venueDoc = await db.collection("venues").doc(booking.venueId).get();
      const venue = venueDoc.data();

      // Получаем информацию о корте
      const courtDoc = await db.collection("venues").doc(booking.venueId)
        .collection("courts").doc(booking.courtId).get();
      const court = courtDoc.data();

      // Форматируем время с интервалом
      const startTime = booking.startTime || booking.time || "00:00";
      let endTime = booking.endTime;

      // Если нет endTime, вычисляем из duration
      if (!endTime && booking.duration) {
        const [hours, minutes] = startTime.split(":").map(Number);
        const durationMinutes = booking.duration;
        const endHours = Math.floor((hours * 60 + minutes + durationMinutes) / 60);
        const endMinutes = (hours * 60 + minutes + durationMinutes) % 60;
        endTime = `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
      }

      const timeStr = endTime ? `${startTime}-${endTime}` : startTime;

      // Заменяем переменные в шаблоне
      const message = templates.bookingReminder.template
        .replace(/{venue}/g, venue?.name || "")
        .replace(/{court}/g, court?.name || booking.courtName || "")
        .replace(/{time}/g, timeStr);

      // Отправляем SMS
      const phone = this.normalizePhone(booking.customerPhone);
      const success = await this.smsService.sendSMS(phone, message);

      if (success) {
        // Логируем отправку
        await db.collection("sms_logs").add({
          type: "booking_reminder",
          bookingId: bookingId,
          phone: phone,
          message: message,
          success: true,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Отмечаем, что напоминание отправлено
        await bookingDoc.ref.update({
          reminderSent: true,
          reminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return success;
    } catch (error) {
      console.error("Error sending booking reminder SMS:", error);
      return false;
    }
  }

  /**
   * Нормализует телефонный номер для отправки SMS
   */
  private normalizePhone(phone: string): string {
    // Удаляем все нецифровые символы
    let normalized = phone.replace(/\D/g, "");

    // Если номер начинается с 8, заменяем на 7
    if (normalized.startsWith("8") && normalized.length === 11) {
      normalized = "7" + normalized.substring(1);
    }

    // Если номер не начинается с 7, добавляем
    if (!normalized.startsWith("7")) {
      normalized = "7" + normalized;
    }

    return normalized;
  }
}
