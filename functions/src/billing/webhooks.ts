import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {TBankAPI, getTBankConfig} from "../utils/tbank";
import {BookingSMSService} from "../services/bookingSmsService";

const region = "europe-west1";

// Интерфейс для уведомления от Т-Банк
interface TBankNotification {
  TerminalKey: string;
  OrderId: string;
  Success: boolean;
  Status: string;
  PaymentId: number;
  ErrorCode: string;
  Amount: number;
  RebillId?: string;
  CardId?: string;
  Pan?: string;
  ExpDate?: string;
  Token: string;
}

// Webhook для обработки уведомлений от Т-Банк
export const tbankWebhook = functions
  .region(region)
  .https.onRequest(async (req, res) => {
    // Т-Банк отправляет только POST запросы
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const notification = req.body as TBankNotification;
      console.log("Received TBank notification:", {
        OrderId: notification.OrderId,
        Status: notification.Status,
        PaymentId: notification.PaymentId,
        Success: notification.Success,
      });

      // Проверяем подпись
      const tbankConfig = await getTBankConfig();
      const tbankAPI = new TBankAPI(tbankConfig);

      if (!tbankAPI.verifyNotification(notification)) {
        console.error("Invalid notification signature");
        res.status(400).send("Invalid signature");
        return;
      }

      // Сохраняем webhook в лог
      await admin.firestore().collection("payment_webhooks").add({
        source: "tbank",
        type: "notification",
        status: "pending",
        payload: notification,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Обрабатываем уведомление в зависимости от статуса
      switch (notification.Status) {
      case "CONFIRMED":
        await handlePaymentConfirmed(notification);
        break;
      case "REJECTED":
      case "REVERSED":
        await handlePaymentFailed(notification);
        break;
      case "REFUNDED":
      case "PARTIAL_REFUNDED":
        await handlePaymentRefunded(notification);
        break;
      default:
        console.log(`Unhandled payment status: ${notification.Status}`);
      }

      // Т-Банк ожидает ответ "OK"
      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(500).send("Internal Server Error");
    }
  });

/**
 * Обработка успешного платежа
 * @param {TBankNotification} notification - Уведомление от Т-Банк
 * @return {Promise<void>}
 */
async function handlePaymentConfirmed(notification: TBankNotification) {
  const db = admin.firestore();

  try {
    // Проверяем тип платежа по OrderId
    const isBookingPayment = notification.OrderId.startsWith("booking_");

    if (isBookingPayment) {
      // Обрабатываем платеж за бронирование
      await handleBookingPaymentConfirmed(notification);
      return;
    }

    // Находим invoice по OrderId (для подписок)
    const invoiceQuery = await db
      .collection("invoices")
      .where("orderId", "==", notification.OrderId)
      .limit(1)
      .get();

    if (invoiceQuery.empty) {
      console.error(`Invoice not found for order: ${notification.OrderId}`);
      return;
    }

    const invoiceDoc = invoiceQuery.docs[0];
    const invoiceData = invoiceDoc.data();

    // Обновляем статус invoice
    await invoiceDoc.ref.update({
      status: "paid",
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      paymentId: notification.PaymentId.toString(),
      rebillId: notification.RebillId || null,
      cardInfo: notification.Pan ? {
        last4: notification.Pan.slice(-4),
        expDate: notification.ExpDate,
      } : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Если это первый платеж, сохраняем RebillId
    if (notification.RebillId && invoiceData.venueId) {
      // Проверяем, есть ли уже payment method
      const existingMethod = await db
        .collection("payment_methods")
        .where("venueId", "==", invoiceData.venueId)
        .where("rebillId", "==", notification.RebillId)
        .limit(1)
        .get();

      if (existingMethod.empty && notification.Pan && notification.ExpDate) {
        // Создаем новый payment method
        await db.collection("payment_methods").add({
          venueId: invoiceData.venueId,
          type: "card",
          last4: notification.Pan.slice(-4),
          brand: detectCardBrand(notification.Pan),
          expiryMonth: parseInt(notification.ExpDate.substring(0, 2)),
          expiryYear: 2000 + parseInt(notification.ExpDate.substring(2, 4)),
          rebillId: notification.RebillId,
          isDefault: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    // Обновляем или создаем подписку
    if (invoiceData.planKey && invoiceData.venueId) {
      await updateSubscription(
        invoiceData.venueId,
        invoiceData.planKey,
        invoiceData.courtsCount || 1
      );
    }

    console.log(`Payment confirmed for order: ${notification.OrderId}`);
  } catch (error) {
    console.error("Error handling confirmed payment:", error);
  }
}

/**
 * Обработка неудачного платежа
 * @param {TBankNotification} notification - Уведомление от Т-Банк
 * @return {Promise<void>}
 */
async function handlePaymentFailed(notification: TBankNotification) {
  const db = admin.firestore();

  try {
    // Находим invoice по OrderId
    const invoiceQuery = await db
      .collection("invoices")
      .where("orderId", "==", notification.OrderId)
      .limit(1)
      .get();

    if (invoiceQuery.empty) {
      console.error(`Invoice not found for order: ${notification.OrderId}`);
      return;
    }

    const invoiceDoc = invoiceQuery.docs[0];

    // Обновляем статус invoice
    await invoiceDoc.ref.update({
      status: "failed",
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
      failureReason: `Payment ${notification.Status.toLowerCase()}: ${notification.ErrorCode}`,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Payment failed for order: ${notification.OrderId}`);
  } catch (error) {
    console.error("Error handling failed payment:", error);
  }
}

/**
 * Обработка возврата платежа
 * @param {TBankNotification} notification - Уведомление от Т-Банк
 * @return {Promise<void>}
 */
async function handlePaymentRefunded(notification: TBankNotification) {
  const db = admin.firestore();

  try {
    // Проверяем тип платежа по OrderId
    const isBookingPayment = notification.OrderId.startsWith("booking_");

    if (isBookingPayment) {
      // Обрабатываем возврат за бронирование
      await handleBookingRefund(notification);
      return;
    }

    // Находим invoice по OrderId
    const invoiceQuery = await db
      .collection("invoices")
      .where("orderId", "==", notification.OrderId)
      .limit(1)
      .get();

    if (invoiceQuery.empty) {
      console.error(`Invoice not found for order: ${notification.OrderId}`);
      return;
    }

    const invoiceDoc = invoiceQuery.docs[0];

    // Обновляем статус invoice
    await invoiceDoc.ref.update({
      status: "refunded",
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      refundAmount: notification.Amount / 100, // Конвертируем из копеек
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Payment refunded for order: ${notification.OrderId}`);
  } catch (error) {
    console.error("Error handling refunded payment:", error);
  }
}

/**
 * Обновление подписки после успешной оплаты
 * @param {string} venueId - ID клуба
 * @param {string} planKey - Ключ тарифного плана
 * @param {number} courtsCount - Количество кортов
 * @return {Promise<void>}
 */
async function updateSubscription(
  venueId: string,
  planKey: string,
  courtsCount: number
) {
  const db = admin.firestore();

  try {
    // Находим существующую подписку
    const subQuery = await db
      .collection("subscriptions")
      .where("venueId", "==", venueId)
      .limit(1)
      .get();

    const now = admin.firestore.Timestamp.now();
    const endDate = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 дней
    );

    if (subQuery.empty) {
      // Создаем новую подписку
      await db.collection("subscriptions").add({
        venueId: venueId,
        plan: planKey,
        status: "active",
        startDate: now,
        endDate: endDate,
        courtsCount: courtsCount,
        autoRenewal: true,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // Обновляем существующую подписку
      const subDoc = subQuery.docs[0];
      await subDoc.ref.update({
        plan: planKey,
        status: "active",
        endDate: endDate,
        courtsCount: courtsCount,
        lastPaymentAt: now,
        updatedAt: now,
      });
    }

    console.log(`Subscription updated for venue: ${venueId}`);
  } catch (error) {
    console.error("Error updating subscription:", error);
  }
}

/**
 * Обработка успешного платежа за бронирование
 * @param {TBankNotification} notification - Уведомление от Т-Банк
 * @return {Promise<void>}
 */
async function handleBookingPaymentConfirmed(notification: TBankNotification) {
  const db = admin.firestore();

  try {
    // Извлекаем bookingId из OrderId
    const bookingIdMatch = notification.OrderId.match(/booking_(.+)_\d+$/);
    if (!bookingIdMatch) {
      console.error(`Invalid booking order ID format: ${notification.OrderId}`);
      return;
    }
    const bookingId = bookingIdMatch[1];

    // Обновляем статус платежа
    const paymentQuery = await db
      .collection("payments")
      .where("bookingId", "==", bookingId)
      .where("paymentId", "==", notification.PaymentId.toString())
      .limit(1)
      .get();

    if (!paymentQuery.empty) {
      const paymentDoc = paymentQuery.docs[0];
      await paymentDoc.ref.update({
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        cardInfo: notification.Pan ? {
          last4: notification.Pan.slice(-4),
          brand: detectCardBrand(notification.Pan),
        } : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Обновляем статус бронирования
    const bookingRef = db.collection("bookings").doc(bookingId);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      console.error(`Booking not found: ${bookingId}`);
      return;
    }

    await bookingRef.update({
      paymentStatus: "paid",
      status: "confirmed",
      paymentCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Если это открытая игра, обновляем количество занятых мест
    const bookingData = bookingDoc.data();
    if (bookingData?.gameType === "open_join" && bookingData?.openGameId) {
      const openGameRef = db.collection("open_games").doc(bookingData.openGameId);
      await db.runTransaction(async (transaction) => {
        const openGameDoc = await transaction.get(openGameRef);
        if (openGameDoc.exists) {
          const currentOccupied = openGameDoc.data()?.playersOccupied || 0;
          transaction.update(openGameRef, {
            playersOccupied: currentOccupied + (bookingData.playersCount || 1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      });
    }

    console.log(`Booking payment confirmed for booking: ${bookingId}`);

    // Отправляем SMS подтверждение
    try {
      const smsService = new BookingSMSService();
      await smsService.sendBookingConfirmation(bookingId);
      console.log(`SMS confirmation sent for booking: ${bookingId}`);
    } catch (smsError) {
      console.error("Error sending SMS confirmation:", smsError);
      // Не прерываем процесс, если SMS не отправилось
    }
  } catch (error) {
    console.error("Error handling booking payment confirmed:", error);
  }
}

/**
 * Обработка возврата платежа за бронирование
 * @param {TBankNotification} notification - Уведомление от Т-Банк
 * @return {Promise<void>}
 */
async function handleBookingRefund(notification: TBankNotification) {
  const db = admin.firestore();

  try {
    // Извлекаем bookingId из OrderId
    const bookingIdMatch = notification.OrderId.match(/booking_(.+)_\d+$/);
    if (!bookingIdMatch) {
      console.error(`Invalid booking order ID format: ${notification.OrderId}`);
      return;
    }

    const bookingId = bookingIdMatch[1];

    // Обновляем статус платежа
    const paymentQuery = await db
      .collection("payments")
      .where("bookingId", "==", bookingId)
      .where("paymentId", "==", notification.PaymentId.toString())
      .limit(1)
      .get();

    if (!paymentQuery.empty) {
      const paymentDoc = paymentQuery.docs[0];
      await paymentDoc.ref.update({
        status: "refunded",
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
        refundAmount: notification.Amount / 100,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Обновляем статус бронирования
    await db.collection("bookings").doc(bookingId).update({
      paymentStatus: "refunded",
      status: "cancelled",
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      cancelReason: "Возврат платежа",
      refundAmount: notification.Amount / 100,
    });

    console.log(`Booking refund processed for booking: ${bookingId}`);

    // Отправляем SMS об отмене
    try {
      const smsService = new BookingSMSService();
      await smsService.sendBookingCancellation(bookingId);
      console.log(`SMS cancellation sent for booking: ${bookingId}`);
    } catch (smsError) {
      console.error("Error sending SMS cancellation:", smsError);
      // Не прерываем процесс, если SMS не отправилось
    }
  } catch (error) {
    console.error("Error handling booking refund:", error);
  }
}

/**
 * Определение бренда карты по первым цифрам
 * @param {string} pan - Номер карты
 * @return {string} - Бренд карты
 */
function detectCardBrand(pan: string): string {
  const firstDigit = pan.charAt(0);
  const firstTwo = pan.substring(0, 2);
  const firstFour = pan.substring(0, 4);

  if (firstDigit === "4") return "Visa";
  if (["51", "52", "53", "54", "55"].includes(firstTwo)) return "Mastercard";
  if (["2200", "2201", "2202", "2203", "2204"].includes(firstFour)) return "MIR";

  return "Unknown";
}
