import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {TBankAPI} from "../utils/tbank";
import {YooKassaAPI} from "../utils/yookassa";

const region = "europe-west1";

// Интерфейс для запроса инициализации платежа за бронирование
interface InitBookingPaymentRequest {
  bookingId: string;
  amount: number;
  description: string;
  returnUrl: string;
  userId: string;
  customerEmail?: string;
  customerPhone?: string;
}

interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  paymentId?: string;
  error?: string;
}

// Функция инициализации платежа для бронирования
export const initBookingPayment = functions
  .region(region)
  .https.onCall(async (data: InitBookingPaymentRequest, context) => {
    // Для публичных бронирований авторизация не требуется
    const isAuthenticated = !!context.auth;

    const {bookingId, amount, description, returnUrl, userId, customerEmail, customerPhone} = data;

    // Валидация входных данных
    if (!bookingId || !amount || !description || !returnUrl) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields"
      );
    }

    try {
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

      const bookingData = bookingDoc.data();

      // Проверяем права доступа только для авторизованных пользователей
      if (isAuthenticated && bookingData?.userId) {
        if (bookingData.userId !== userId && bookingData.userId !== context.auth?.uid) {
          throw new functions.https.HttpsError(
            "permission-denied",
            "Access denied to this booking"
          );
        }
      }

      // Проверяем, что бронирование еще не оплачено
      if (bookingData?.paymentStatus === "paid") {
        throw new functions.https.HttpsError(
          "already-exists",
          "Booking is already paid"
        );
      }

      // Получаем информацию о клубе
      const venueDoc = await admin.firestore()
        .collection("venues")
        .doc(bookingData?.venueId || "")
        .get();

      if (!venueDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Venue not found"
        );
      }

      const venueData = venueDoc.data();

      // Проверяем настройки платежей клуба
      if (!venueData?.paymentEnabled) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Payments are not enabled for this venue"
        );
      }

      const paymentProvider = venueData.paymentProvider;
      const paymentCredentials = venueData.paymentCredentials;

      if (!paymentProvider || !paymentCredentials) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Payment provider not configured"
        );
      }

      let paymentResponse: PaymentResponse;

      // Инициализируем платеж в зависимости от провайдера
      switch (paymentProvider) {
      case "tbank":
        paymentResponse = await initTBankPayment({
          credentials: paymentCredentials,
          bookingId,
          amount,
          description,
          returnUrl,
          customerEmail,
          customerPhone,
          testMode: venueData.paymentTestMode || false,
        });
        break;

      case "yookassa":
        paymentResponse = await initYooKassaPayment({
          credentials: paymentCredentials,
          bookingId,
          amount,
          description,
          returnUrl,
          testMode: venueData.paymentTestMode || false,
          customerEmail,
          customerPhone,
        });
        break;

      default:
        throw new functions.https.HttpsError(
          "unimplemented",
          `Payment provider ${paymentProvider} is not supported`
        );
      }

      if (!paymentResponse.success) {
        throw new functions.https.HttpsError(
          "internal",
          paymentResponse.error || "Payment initialization failed"
        );
      }

      // Создаем запись о платеже
      await admin.firestore().collection("payments").add({
        bookingId: bookingId,
        venueId: bookingData?.venueId || "",
        userId: userId || null,
        amount: amount,
        currency: "RUB",
        status: "pending",
        provider: paymentProvider,
        paymentId: paymentResponse.paymentId,
        description: description,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Обновляем статус платежа в бронировании
      await bookingDoc.ref.update({
        paymentStatus: "awaiting_payment",
        paymentId: paymentResponse.paymentId,
        paymentUrl: paymentResponse.paymentUrl, // Сохраняем ссылку на оплату
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        paymentUrl: paymentResponse.paymentUrl,
        paymentId: paymentResponse.paymentId,
      };
    } catch (error: any) {
      console.error("Init booking payment error:", error);

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
 * Инициализация платежа через Т-Банк
 */
async function initTBankPayment(params: {
  credentials: any;
  bookingId: string;
  amount: number;
  description: string;
  returnUrl: string;
  customerEmail?: string;
  customerPhone?: string;
  testMode: boolean;
}): Promise<PaymentResponse> {
  try {
    const tbankAPI = new TBankAPI({
      terminalKey: params.credentials.terminalKey,
      password: params.credentials.password,
      testMode: params.testMode,
    });

    const orderId = `booking_${params.bookingId}_${Date.now()}`;

    const initResponse = await tbankAPI.initPayment({
      Amount: params.amount * 100, // Т-Банк принимает сумму в копейках
      OrderId: orderId,
      Description: params.description,
      SuccessURL: params.returnUrl,
      FailURL: params.returnUrl,
      DATA: {
        bookingId: params.bookingId,
        Email: params.customerEmail || "",
        Phone: params.customerPhone || "",
      },
    });

    if (!initResponse.Success) {
      return {
        success: false,
        error: initResponse.Message || initResponse.ErrorCode,
      };
    }

    return {
      success: true,
      paymentUrl: initResponse.PaymentURL,
      paymentId: initResponse.PaymentId,
    };
  } catch (error: any) {
    console.error("TBank payment initialization error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Инициализация платежа через YooKassa
 */
async function initYooKassaPayment(params: {
  credentials: any;
  bookingId: string;
  amount: number;
  description: string;
  returnUrl: string;
  testMode: boolean;
  customerEmail?: string;
  customerPhone?: string;
}): Promise<PaymentResponse> {
  try {
    console.log("Initializing YooKassa with params:", {
      shopId: params.credentials.shopId,
      testMode: params.testMode,
      hasSecretKey: !!params.credentials.secretKey,
    });

    const yooKassaAPI = new YooKassaAPI({
      shopId: params.credentials.shopId,
      secretKey: params.credentials.secretKey,
      testMode: params.testMode,
    });

    // Подготавливаем данные чека
    // Форматируем телефон для YooKassa (должен быть в формате +79999999999)
    let formattedPhone = "";
    if (params.customerPhone) {
      console.log("Original phone:", params.customerPhone);
      // Убираем все символы кроме цифр
      const cleanPhone = params.customerPhone.replace(/\D/g, "");
      console.log("Cleaned phone:", cleanPhone);
      // Добавляем + если нет, и проверяем что начинается с 7
      if (cleanPhone.startsWith("7") && cleanPhone.length === 11) {
        formattedPhone = `+${cleanPhone}`;
      } else if (cleanPhone.startsWith("8") && cleanPhone.length === 11) {
        formattedPhone = `+7${cleanPhone.substring(1)}`;
      } else if (cleanPhone.length === 10) {
        formattedPhone = `+7${cleanPhone}`;
      }
      console.log("Formatted phone:", formattedPhone);
    }

    // Проверяем обязательные поля для чека
    if (!params.customerEmail && !formattedPhone) {
      console.log("No customer contact info provided, creating payment without receipt");
    } else {
      console.log("Creating payment with receipt for:", {
        email: !!params.customerEmail,
        phone: !!formattedPhone,
      });
    }

    const receiptData = {
      customer: {
        ...(params.customerEmail && {email: params.customerEmail}),
        ...(formattedPhone && {phone: formattedPhone}),
      },
      items: [{
        description: params.description.substring(0, 128), // YooKassa ограничивает длину описания
        quantity: "1.00",
        amount: {
          value: params.amount.toFixed(2),
          currency: "RUB",
        },
        vat_code: 1, // НДС не облагается
        payment_mode: "full_payment",
        payment_subject: "service",
      }],
    };

    const paymentRequest = {
      amount: {
        value: params.amount.toFixed(2),
        currency: "RUB",
      },
      confirmation: {
        type: "redirect",
        return_url: params.returnUrl,
      },
      capture: true,
      description: params.description,
      metadata: {
        bookingId: params.bookingId,
      },
      // Добавляем чек только если есть контактные данные
      ...(Object.keys(receiptData.customer).length > 0 && {receipt: receiptData}),
    };

    console.log("Creating payment with request:", JSON.stringify(paymentRequest, null, 2));

    const payment = await yooKassaAPI.createPayment(paymentRequest);

    if (payment.status === "canceled") {
      return {
        success: false,
        error: "Payment was canceled",
      };
    }

    console.log("Payment created successfully:", {
      id: payment.id,
      status: payment.status,
      hasConfirmationUrl: !!payment.confirmation?.confirmation_url,
    });

    // Обновляем статус бронирования на awaiting_payment
    await admin.firestore().collection("bookings").doc(params.bookingId).update({
      paymentStatus: "awaiting_payment",
      paymentId: payment.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Создаем запись о платеже
    await admin.firestore().collection("payments").add({
      bookingId: params.bookingId,
      paymentId: payment.id,
      amount: params.amount,
      status: "pending",
      provider: "yookassa",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      paymentUrl: payment.confirmation?.confirmation_url,
      paymentId: payment.id,
    };
  } catch (error: any) {
    console.error("YooKassa payment initialization error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
