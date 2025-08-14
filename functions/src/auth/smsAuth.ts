import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {AuthSMSService} from "../services/authSmsService";

const region = "europe-west1";

/**
 * Отправка SMS кода для авторизации
 */
export const sendAuthSMSCode = functions.region(region).https.onCall(async (data, _context) => {
  const {phone} = data;

  if (!phone) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Phone number is required"
    );
  }

  // Валидация телефона
  const phoneRegex = /^[\d\s\-()\\+]+$/;
  if (!phoneRegex.test(phone)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid phone number format"
    );
  }

  try {
    const smsService = new AuthSMSService();
    const result = await smsService.sendAuthCode(phone);

    if (result.success) {
      return {
        success: true,
        codeId: result.codeId,
      };
    } else {
      throw new functions.https.HttpsError(
        "internal",
        "Failed to send SMS code"
      );
    }
  } catch (error) {
    console.error("Error sending auth SMS code:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to send SMS code"
    );
  }
});

/**
 * Проверка SMS кода авторизации
 */
export const verifyAuthSMSCode = functions.region(region).https.onCall(async (data, _context) => {
  const {phone, code} = data;

  if (!phone || !code) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Phone number and code are required"
    );
  }

  // Валидация кода
  if (!/^\d{6}$/.test(code)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid code format"
    );
  }

  try {
    const smsService = new AuthSMSService();
    const isValid = await smsService.verifyAuthCode(phone, code);

    if (isValid) {
      // Здесь можно создать custom token для авторизации
      // или вернуть успешный результат для дальнейшей обработки на клиенте
      return {
        success: true,
        verified: true,
      };
    } else {
      return {
        success: false,
        verified: false,
        error: "Invalid or expired code",
      };
    }
  } catch (error) {
    console.error("Error verifying auth SMS code:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to verify SMS code"
    );
  }
});

/**
 * Очистка истекших SMS кодов (запускается по расписанию)
 */
export const cleanupExpiredAuthCodes = functions
  .region(region)
  .pubsub.schedule("every 1 hours")
  .onRun(async (_context) => {
    const db = admin.firestore();

    try {
      // Находим все истекшие коды
      const expiredCodesQuery = await db.collection("sms_auth_codes")
        .where("expiresAt", "<", new Date())
        .limit(500) // Ограничиваем количество для одного запуска
        .get();

      if (expiredCodesQuery.empty) {
        console.log("No expired auth codes to cleanup");
        return;
      }

      // Удаляем пакетно
      const batch = db.batch();
      let count = 0;

      expiredCodesQuery.docs.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
      });

      await batch.commit();
      console.log(`Cleaned up ${count} expired auth codes`);
    } catch (error) {
      console.error("Error cleaning up expired auth codes:", error);
    }
  });
