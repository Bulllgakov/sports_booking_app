import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {createRefund} from "../utils/yookassa";
import {processTBankRefund} from "../utils/tbank";

/**
 * Облачная функция для обработки возврата платежа
 */
export const processBookingRefund = functions
  .region("europe-west1")
  .https.onCall(async (data, context) => {
    // Проверяем авторизацию
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Необходима авторизация для выполнения этой операции"
      );
    }

    const {bookingId, reason} = data;

    if (!bookingId || !reason) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Не указан ID бронирования или причина возврата"
      );
    }

    const db = admin.firestore();

    try {
      // Получаем данные бронирования
      const bookingDoc = await db.collection("bookings").doc(bookingId).get();

      if (!bookingDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Бронирование не найдено"
        );
      }

      const booking = bookingDoc.data()!;

      // Проверяем, не был ли уже сделан возврат
      if (booking.refundStatus === "completed" || booking.refundStatus === "processing") {
        throw new functions.https.HttpsError(
          "already-exists",
          booking.refundStatus === "completed" ?
            "Возврат по этому бронированию уже выполнен" :
            "Запрос на возврат уже обрабатывается"
        );
      }

      // Проверяем статус оплаты
      if (booking.paymentStatus !== "paid") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Возврат возможен только для оплаченных бронирований"
        );
      }

      // Получаем часовой пояс клуба
      const venueDocForTimezone = await db.collection("venues").doc(booking.venueId).get();
      const venueDataForTimezone = venueDocForTimezone.exists ? venueDocForTimezone.data() : null;
      const clubTimezone = venueDataForTimezone?.timezone || "Europe/Moscow";

      // Проверяем, что день бронирования еще не прошел
      const bookingDate = booking.date.toDate ? booking.date.toDate() : new Date(booking.date);

      // Создаем форматтер для получения текущей даты в часовом поясе клуба
      const nowInClubTZ = new Intl.DateTimeFormat("en-CA", {
        timeZone: clubTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      // Создаем форматтер для получения даты бронирования в часовом поясе клуба
      const bookingDateInClubTZ = new Intl.DateTimeFormat("en-CA", {
        timeZone: clubTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(bookingDate);

      // Сравниваем даты как строки (YYYY-MM-DD)
      // Если текущая дата больше даты бронирования - возврат невозможен
      if (nowInClubTZ > bookingDateInClubTZ) {
        const bookingDateStr = new Intl.DateTimeFormat("ru-RU", {
          timeZone: clubTimezone,
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(bookingDate);
        
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Возврат невозможен после окончания дня бронирования " +
          `(${bookingDateStr}). Возврат был доступен до конца этого дня.`
        );
      }

      // Проверяем способ оплаты
      if (booking.paymentMethod !== "online") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Автоматический возврат доступен только для онлайн оплат"
        );
      }

      // Получаем данные клуба для настроек платежной системы
      const venueDoc = await db.collection("venues").doc(booking.venueId).get();

      if (!venueDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Клуб не найден"
        );
      }

      const venue = venueDoc.data()!;
      const paymentProvider = venue.paymentProvider;
      const paymentCredentials = venue.paymentCredentials || {};
      const paymentEnabled = venue.paymentEnabled;

      // Проверяем, что платежная система включена
      if (!paymentEnabled) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Платежная система не включена для этого клуба"
        );
      }

      let refundResult: {success: boolean; refundId?: string; error?: string};

      // Обрабатываем возврат в зависимости от платежной системы
      if (paymentProvider === "yookassa") {
        // Возврат через ЮKassa
        if (!booking.paymentId) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Отсутствует ID платежа для возврата"
          );
        }

        if (!paymentCredentials.shopId || !paymentCredentials.secretKey) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Не настроены учетные данные ЮKassa"
          );
        }

        refundResult = await createRefund(
          paymentCredentials.shopId,
          paymentCredentials.secretKey,
          booking.paymentId,
          booking.amount,
          reason
        );
      } else if (paymentProvider === "tbank") {
        // Возврат через Т-Банк
        if (!booking.paymentId) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Отсутствует ID платежа для возврата"
          );
        }

        if (!paymentCredentials.terminalKey || !paymentCredentials.password) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Не настроены учетные данные Т-Банк"
          );
        }

        refundResult = await processTBankRefund(
          paymentCredentials.terminalKey,
          paymentCredentials.password,
          booking.paymentId,
          booking.amount
        );
      } else {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Платежная система "${paymentProvider}" не настроена или не поддерживает возвраты`
        );
      }

      if (refundResult.success) {
        // Обновляем статус бронирования
        const now = new Date();
        await bookingDoc.ref.update({
          status: "cancelled", // Обновляем статус бронирования на отменено
          refundStatus: "processing",
          refundId: refundResult.refundId,
          refundRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
          refundReason: reason,
          refundRequestedBy: {
            userId: context.auth.uid,
            userName: context.auth.token.name || context.auth.token.email || "Администратор",
          },
          paymentHistory: admin.firestore.FieldValue.arrayUnion({
            timestamp: now.toISOString(), // Используем ISO строку вместо serverTimestamp
            action: "refund_requested",
            userId: context.auth.uid,
            userName: context.auth.token.name || context.auth.token.email || "Администратор",
            note: `Запрос на возврат: ${reason}`,
          }),
        });

        return {
          success: true,
          refundId: refundResult.refundId,
          message: "Запрос на возврат успешно создан",
        };
      } else {
        throw new functions.https.HttpsError(
          "internal",
          refundResult.error || "Ошибка при создании возврата"
        );
      }
    } catch (error) {
      console.error("Error processing refund:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `Ошибка при обработке возврата: ${(error as Error).message}`
      );
    }
  });
