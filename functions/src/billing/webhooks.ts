import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {TBankAPI, getTBankConfig} from "../utils/tbank";

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
