import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {TBankAPI, getTBankConfig} from "../utils/tbank";

const region = "europe-west1";

// Интерфейс для подписки
interface Subscription {
  id: string;
  venueId: string;
  plan: string;
  status: string;
  courtsCount: number;
  endDate: admin.firestore.Timestamp;
  autoRenewal: boolean;
}

// Интерфейс для платежного метода
interface PaymentMethod {
  id: string;
  venueId: string;
  rebillId: string;
  isDefault: boolean;
}

// Функция для обработки рекуррентного платежа
export const processRecurringPayment = functions
  .region(region)
  .https.onCall(async (data: { subscriptionId: string }, context) => {
    // Проверяем, что вызов идет от суперадмина или системы
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required"
      );
    }

    const {subscriptionId} = data;

    if (!subscriptionId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Subscription ID is required"
      );
    }

    try {
      // Получаем подписку
      const subDoc = await admin.firestore()
        .collection("subscriptions")
        .doc(subscriptionId)
        .get();

      if (!subDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Subscription not found"
        );
      }

      const subscription = {
        id: subDoc.id,
        ...subDoc.data(),
      } as Subscription;

      // Проверяем, нужно ли обрабатывать платеж
      if (subscription.status !== "active" || !subscription.autoRenewal) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Subscription is not active or auto-renewal is disabled"
        );
      }

      // Получаем платежный метод
      const paymentMethod = await getDefaultPaymentMethod(subscription.venueId);
      if (!paymentMethod) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "No payment method found for venue"
        );
      }

      // Рассчитываем сумму
      const amount = calculateSubscriptionAmount(subscription.plan, subscription.courtsCount);

      // Выполняем рекуррентный платеж
      const result = await chargeRecurringPayment(
        subscription,
        paymentMethod,
        amount
      );

      return {
        success: result.success,
        paymentId: result.paymentId,
        message: result.message,
      };
    } catch (error: any) {
      console.error("Recurring payment error:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to process recurring payment"
      );
    }
  });

// Scheduled функция для ежемесячного биллинга
export const monthlyBilling = functions
  .region(region)
  .pubsub
  .schedule("0 6 * * *") // Каждый день в 6:00 UTC
  .onRun(async (_context) => {
    console.log("Starting monthly billing check...");

    try {
      const now = admin.firestore.Timestamp.now();
      const db = admin.firestore();

      // Находим подписки, которые истекают сегодня
      const expiringSubsQuery = await db
        .collection("subscriptions")
        .where("status", "==", "active")
        .where("autoRenewal", "==", true)
        .where("endDate", "<=", now)
        .get();

      console.log(`Found ${expiringSubsQuery.size} expiring subscriptions`);

      // Обрабатываем каждую подписку
      const promises = expiringSubsQuery.docs.map(async (doc) => {
        const subscription = {
          id: doc.id,
          ...doc.data(),
        } as Subscription;

        try {
          // Получаем платежный метод
          const paymentMethod = await getDefaultPaymentMethod(subscription.venueId);
          if (!paymentMethod) {
            console.error(`No payment method for venue: ${subscription.venueId}`);
            await markSubscriptionAsPending(subscription.id);
            return;
          }

          // Рассчитываем сумму
          const amount = calculateSubscriptionAmount(subscription.plan, subscription.courtsCount);

          // Выполняем платеж
          const result = await chargeRecurringPayment(
            subscription,
            paymentMethod,
            amount
          );

          if (!result.success) {
            await handleFailedPayment(subscription.id, result.message);
          }
        } catch (error) {
          console.error(`Error processing subscription ${subscription.id}:`, error);
          await handleFailedPayment(subscription.id, "Processing error");
        }
      });

      await Promise.all(promises);
      console.log("Monthly billing completed");
    } catch (error) {
      console.error("Monthly billing error:", error);
    }
  });

/**
 * Получение платежного метода по умолчанию для клуба
 * @param {string} venueId - ID клуба
 * @return {Promise<PaymentMethod | null>} - Платежный метод или null
 */
async function getDefaultPaymentMethod(venueId: string): Promise<PaymentMethod | null> {
  const methodQuery = await admin.firestore()
    .collection("payment_methods")
    .where("venueId", "==", venueId)
    .where("isDefault", "==", true)
    .limit(1)
    .get();

  if (methodQuery.empty) {
    return null;
  }

  const doc = methodQuery.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as PaymentMethod;
}

/**
 * Расчет суммы подписки
 * @param {string} plan - Тарифный план
 * @param {number} courtsCount - Количество кортов
 * @return {number} - Сумма подписки
 */
function calculateSubscriptionAmount(plan: string, courtsCount: number): number {
  const prices: Record<string, number> = {
    standard: 990,
    pro: 1990,
    premium: 2990,
  };

  const pricePerCourt = prices[plan] || 990;
  return pricePerCourt * courtsCount;
}

/**
 * Выполнение рекуррентного платежа
 * @param {Subscription} subscription - Подписка
 * @param {PaymentMethod} paymentMethod - Платежный метод
 * @param {number} amount - Сумма платежа
 * @return {Promise<Object>} - Результат платежа
 */
async function chargeRecurringPayment(
  subscription: Subscription,
  paymentMethod: PaymentMethod,
  amount: number
): Promise<{ success: boolean; paymentId?: string; message: string }> {
  try {
    // Получаем информацию о клубе
    const venueDoc = await admin.firestore()
      .collection("venues")
      .doc(subscription.venueId)
      .get();

    const venueData = venueDoc.data();
    const venueName = venueData?.name || "Клуб";

    // Создаем заказ
    const orderId = `sub_recurring_${subscription.id}_${Date.now()}`;
    const description =
      `Подписка "${getPlanName(subscription.plan)}" для ${venueName} (${subscription.courtsCount} кортов)`;

    // Создаем invoice
    const invoiceRef = await admin.firestore().collection("invoices").add({
      venueId: subscription.venueId,
      subscriptionId: subscription.id,
      orderId: orderId,
      amount: amount,
      currency: "RUB",
      status: "processing",
      description: description,
      period: {
        start: subscription.endDate,
        end: admin.firestore.Timestamp.fromDate(
          new Date(subscription.endDate.toDate().getTime() + 30 * 24 * 60 * 60 * 1000)
        ),
      },
      paymentMethodId: paymentMethod.id,
      attempts: 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Получаем конфигурацию Т-Банк
    const tbankConfig = await getTBankConfig();
    const tbankAPI = new TBankAPI(tbankConfig);

    // Инициализируем платеж
    const initResponse = await tbankAPI.initPayment({
      Amount: amount * 100, // В копейках
      OrderId: orderId,
      Description: description,
      CustomerKey: subscription.venueId,
    });

    if (!initResponse.Success || !initResponse.PaymentId) {
      throw new Error(`Init failed: ${initResponse.Message || initResponse.ErrorCode}`);
    }

    // Выполняем рекуррентный платеж
    const chargeResponse = await tbankAPI.chargePayment({
      PaymentId: initResponse.PaymentId,
      RebillId: paymentMethod.rebillId,
    });

    if (chargeResponse.Success) {
      // Обновляем invoice
      await invoiceRef.update({
        paymentId: chargeResponse.PaymentId,
        status: "paid",
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        paymentId: chargeResponse.PaymentId,
        message: "Payment successful",
      };
    } else {
      // Обновляем invoice с ошибкой
      await invoiceRef.update({
        status: "failed",
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        failureReason: chargeResponse.Message || chargeResponse.ErrorCode,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: false,
        message: chargeResponse.Message || "Payment failed",
      };
    }
  } catch (error: any) {
    console.error("Charge payment error:", error);
    return {
      success: false,
      message: error.message || "Payment processing error",
    };
  }
}

/**
 * Обработка неудачного платежа
 * @param {string} subscriptionId - ID подписки
 * @param {string} reason - Причина неудачи
 * @return {Promise<void>}
 */
async function handleFailedPayment(subscriptionId: string, reason: string) {
  const db = admin.firestore();

  // Получаем настройки биллинга
  const billingSettings = await db.collection("settings").doc("billing").get();
  const gracePeriodDays = billingSettings.data()?.gracePeriodDays || 3;

  // Обновляем подписку
  await db.collection("subscriptions").doc(subscriptionId).update({
    status: "payment_failed",
    lastPaymentError: reason,
    gracePeriodEnd: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000)
    ),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // TODO: Отправить уведомление клубу о проблеме с оплатой
}

/**
 * Пометить подписку как ожидающую оплаты
 * @param {string} subscriptionId - ID подписки
 * @return {Promise<void>}
 */
async function markSubscriptionAsPending(subscriptionId: string) {
  await admin.firestore()
    .collection("subscriptions")
    .doc(subscriptionId)
    .update({
      status: "pending_payment",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Получение названия плана
 * @param {string} planKey - Ключ плана
 * @return {string} - Название плана
 */
function getPlanName(planKey: string): string {
  const plans: Record<string, string> = {
    standard: "Стандарт",
    pro: "Профи",
    premium: "Премиум",
  };
  return plans[planKey] || planKey;
}
