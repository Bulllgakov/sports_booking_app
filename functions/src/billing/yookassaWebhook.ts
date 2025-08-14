import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {YooKassaAPI} from "../utils/yookassa";
import {BookingSMSService} from "../services/bookingSmsService";

const region = "europe-west1";

// Интерфейс для уведомления от YooKassa
interface YooKassaNotification {
  type: string;
  event: string;
  object: {
    id: string;
    status: string;
    amount: {
      value: string;
      currency: string;
    };
    payment_method?: {
      type: string;
      id: string;
      saved: boolean;
      card?: {
        last4: string;
        expiry_year: string;
        expiry_month: string;
        card_type: string;
      };
    };
    metadata?: Record<string, any>;
  };
}

// Webhook для обработки уведомлений от YooKassa
export const yookassaWebhook = functions
  .region(region)
  .https.onRequest(async (req, res) => {
    // YooKassa отправляет только POST запросы
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      console.log("YooKassa webhook received:", {
        method: req.method,
        headers: JSON.stringify(req.headers),
        body: JSON.stringify(req.body),
      });

      const notification = req.body as YooKassaNotification;
      const signature = req.headers["http-signature"] as string;

      console.log("Received YooKassa notification:", {
        type: notification.type,
        event: notification.event,
        paymentId: notification.object.id,
        status: notification.object.status,
      });

      // Получаем bookingId из metadata для платежей или ищем по payment_id для возвратов
      let bookingId: string | undefined;

      if (notification.event === "refund.succeeded") {
        // Для возвратов ищем booking по payment_id
        const paymentId = (notification.object as any).payment_id;
        if (paymentId) {
          console.log(`Looking for booking with paymentId: ${paymentId}`);
          const bookingQuery = await admin.firestore()
            .collection("bookings")
            .where("paymentId", "==", paymentId)
            .limit(1)
            .get();

          if (!bookingQuery.empty) {
            bookingId = bookingQuery.docs[0].id;
            console.log(`Found booking ${bookingId} for payment ${paymentId}`);
          } else {
            console.error(`Booking not found for paymentId: ${paymentId}`);
            res.status(404).send("Booking not found for refund");
            return;
          }
        }
      } else {
        // Для обычных платежей используем metadata
        bookingId = notification.object.metadata?.bookingId;
      }

      if (!bookingId) {
        console.error("Booking ID not found");
        res.status(400).send("Invalid notification");
        return;
      }

      // Получаем информацию о бронировании
      const bookingDoc = await admin.firestore()
        .collection("bookings")
        .doc(bookingId)
        .get();

      if (!bookingDoc.exists) {
        console.error(`Booking not found: ${bookingId}`);
        res.status(404).send("Booking not found");
        return;
      }

      const bookingData = bookingDoc.data();
      const venueId = bookingData?.venueId;

      if (!venueId) {
        console.error("Venue ID not found in booking");
        res.status(400).send("Invalid booking data");
        return;
      }

      // Получаем конфигурацию YooKassa для клуба
      const venueDoc = await admin.firestore()
        .collection("venues")
        .doc(venueId)
        .get();

      if (!venueDoc.exists) {
        console.error(`Venue not found: ${venueId}`);
        res.status(404).send("Venue not found");
        return;
      }

      const venueData = venueDoc.data();

      if (venueData?.paymentProvider !== "yookassa") {
        console.error("YooKassa is not configured for this venue");
        res.status(400).send("Payment provider mismatch");
        return;
      }

      // Проверяем подпись
      const yookassaAPI = new YooKassaAPI({
        shopId: venueData.paymentCredentials.shopId,
        secretKey: venueData.paymentCredentials.secretKey,
        testMode: venueData.paymentTestMode || false,
      });

      // Проверяем подпись webhook (YooKassa всегда работает в боевом режиме)
      if (signature && !yookassaAPI.verifyWebhook(notification, signature)) {
        console.error("Invalid notification signature");
        res.status(400).send("Invalid signature");
        return;
      }

      // Сохраняем webhook в лог
      await admin.firestore().collection("payment_webhooks").add({
        source: "yookassa",
        type: notification.type,
        event: notification.event,
        status: "pending",
        payload: notification,
        bookingId: bookingId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Обрабатываем уведомление в зависимости от типа и статуса
      if (notification.type === "notification" && notification.event === "payment.succeeded") {
        await handlePaymentSucceeded(notification, bookingId);
      } else if (notification.type === "notification" && notification.event === "payment.canceled") {
        await handlePaymentCanceled(notification, bookingId);
      } else if (notification.type === "notification" && notification.event === "refund.succeeded") {
        await handleRefundSucceeded(notification, bookingId);
      }

      // YooKassa ожидает статус 200
      res.status(200).send();
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(500).send("Internal Server Error");
    }
  });

/**
 * Обработка успешного платежа
 */
async function handlePaymentSucceeded(notification: YooKassaNotification, bookingId: string) {
  const db = admin.firestore();

  try {
    // Обновляем статус платежа
    const paymentQuery = await db
      .collection("payments")
      .where("bookingId", "==", bookingId)
      .where("paymentId", "==", notification.object.id)
      .limit(1)
      .get();

    if (!paymentQuery.empty) {
      const paymentDoc = paymentQuery.docs[0];
      await paymentDoc.ref.update({
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Обновляем статус бронирования и добавляем запись в историю платежей
    await db.collection("bookings").doc(bookingId).update({
      paymentStatus: "paid",
      status: "confirmed",
      paymentCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      paymentHistory: admin.firestore.FieldValue.arrayUnion({
        timestamp: admin.firestore.Timestamp.now(),
        action: "paid",
        userId: "yookassa-webhook",
        userName: "ЮKassa",
        note: `Платеж подтвержден. ID платежа: ${notification.object.id}`,
        paymentAmount: notification.object.amount?.value || 0,
        paymentMethod: notification.object.payment_method?.type || "unknown",
      }),
    });

    // Если это открытая игра, обновляем количество занятых мест
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
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

    console.log(`Payment succeeded for booking: ${bookingId}`);

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
    console.error("Error handling payment succeeded:", error);
  }
}

/**
 * Обработка отмененного платежа
 */
async function handlePaymentCanceled(notification: YooKassaNotification, bookingId: string) {
  const db = admin.firestore();

  try {
    // Обновляем статус платежа
    const paymentQuery = await db
      .collection("payments")
      .where("bookingId", "==", bookingId)
      .where("paymentId", "==", notification.object.id)
      .limit(1)
      .get();

    if (!paymentQuery.empty) {
      const paymentDoc = paymentQuery.docs[0];
      await paymentDoc.ref.update({
        status: "canceled",
        canceledAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Помечаем бронирование как отмененное вместо удаления
    // Это позволяет пользователю увидеть страницу отмены
    await db.collection("bookings").doc(bookingId).update({
      paymentStatus: "cancelled",
      status: "cancelled",
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      paymentHistory: admin.firestore.FieldValue.arrayUnion({
        timestamp: admin.firestore.Timestamp.now(),
        action: "cancelled",
        userId: "yookassa-webhook",
        userName: "ЮKassa",
        note: `Платеж отменен. ID платежа: ${notification.object.id}`,
      }),
    });

    console.log(`Payment canceled, booking marked as cancelled: ${bookingId}`);
  } catch (error) {
    console.error("Error handling payment canceled:", error);
  }
}

/**
 * Обработка успешного возврата
 */
async function handleRefundSucceeded(notification: YooKassaNotification, bookingId: string) {
  const db = admin.firestore();

  try {
    // Получаем payment_id из объекта возврата
    const paymentId = (notification.object as any).payment_id;
    const refundId = notification.object.id;
    const refundAmount = parseFloat(notification.object.amount.value);

    console.log(`Processing refund ${refundId} for payment ${paymentId}, booking ${bookingId}`);

    // Обновляем статус платежа в коллекции payments (если есть)
    const paymentQuery = await db
      .collection("payments")
      .where("bookingId", "==", bookingId)
      .where("paymentId", "==", paymentId)
      .limit(1)
      .get();

    if (!paymentQuery.empty) {
      const paymentDoc = paymentQuery.docs[0];
      await paymentDoc.ref.update({
        status: "refunded",
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
        refundAmount: refundAmount,
        refundId: refundId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Обновляем статус бронирования и добавляем запись в историю платежей
    await db.collection("bookings").doc(bookingId).update({
      paymentStatus: "refunded",
      status: "cancelled",
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      cancelReason: "Возврат платежа",
      refundAmount: refundAmount,
      refundId: refundId,
      paymentHistory: admin.firestore.FieldValue.arrayUnion({
        timestamp: new Date().toISOString(),
        action: "refunded",
        userId: "system",
        userName: "YooKassa Webhook",
        note: `Возврат ${refundAmount} руб. (ID: ${refundId})`,
      }),
    });

    console.log(`Refund succeeded for booking: ${bookingId} - booking cancelled`);

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
    console.error("Error handling refund succeeded:", error);
  }
}
