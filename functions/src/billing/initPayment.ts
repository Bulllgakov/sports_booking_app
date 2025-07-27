import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {TBankAPI, getTBankConfig} from "../utils/tbank";

const region = "europe-west1";

// Интерфейс для запроса инициализации платежа
interface InitPaymentRequest {
  venueId: string;
  planKey: "standard" | "pro" | "premium";
  amount: number;
  courtsCount: number;
}

// Функция инициализации платежа для подписки
export const initSubscriptionPayment = functions
  .region(region)
  .https.onCall(async (data: InitPaymentRequest, context) => {
    // Проверяем авторизацию
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const {venueId, planKey, amount, courtsCount} = data;

    // Валидация входных данных
    if (!venueId || !planKey || !amount || !courtsCount) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields"
      );
    }

    try {
      // Проверяем, что пользователь имеет доступ к этому клубу
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
      if (adminData?.role !== "superadmin" && adminData?.venueId !== venueId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Access denied to this venue"
        );
      }

      // Получаем информацию о клубе
      const venueDoc = await admin.firestore()
        .collection("venues")
        .doc(venueId)
        .get();

      if (!venueDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Venue not found"
        );
      }

      const venueData = venueDoc.data();

      // Получаем конфигурацию Т-Банк
      const tbankConfig = await getTBankConfig();
      const tbankAPI = new TBankAPI(tbankConfig);

      // Создаем заказ
      const orderId = `sub_${venueId}_${Date.now()}`;
      const description = `Подписка "${getPlanName(planKey)}" для ${venueData?.name || "Клуб"} (${courtsCount} кортов)`;

      // Инициализируем платеж
      const initResponse = await tbankAPI.initPayment({
        Amount: amount * 100, // Т-Банк принимает сумму в копейках
        OrderId: orderId,
        Description: description,
        CustomerKey: venueId,
        Recurrent: "Y", // Включаем рекуррентные платежи
        DATA: {
          venueId: venueId,
          planKey: planKey,
          courtsCount: courtsCount.toString(),
        },
      });

      if (!initResponse.Success) {
        throw new Error(`Payment initialization failed: ${initResponse.Message || initResponse.ErrorCode}`);
      }

      // Создаем запись о платеже
      await admin.firestore().collection("invoices").add({
        venueId: venueId,
        subscriptionId: "", // Будет обновлено после оплаты
        orderId: orderId,
        paymentId: initResponse.PaymentId,
        amount: amount,
        currency: "RUB",
        status: "pending",
        description: description,
        planKey: planKey,
        courtsCount: courtsCount,
        period: {
          start: admin.firestore.Timestamp.now(),
          end: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 дней
          ),
        },
        attempts: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        paymentUrl: initResponse.PaymentURL,
        paymentId: initResponse.PaymentId,
        orderId: orderId,
      };
    } catch (error: any) {
      console.error("Init payment error:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to initialize payment"
      );
    }
  });

/**
 * Получение названия плана по ключу
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
