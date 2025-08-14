import * as functions from "firebase-functions";
import {checkBookingLimits, logBookingActivity} from "./checkBookingLimits";

/**
 * Cloud Function для валидации запроса на создание бронирования
 * Используется только для публичных интерфейсов (веб и мобильное приложение)
 * Админка не имеет ограничений
 */
export const validateBookingRequest = functions.https.onCall(async (data, context) => {
  const {phoneNumber, venueId, source} = data;

  // Если запрос от админа - пропускаем все проверки
  if (source === "admin" && context.auth) {
    return {
      success: true,
      allowed: true,
      requiresCaptcha: false,
    };
  }

  if (!phoneNumber || !venueId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Необходимо указать номер телефона и ID клуба"
    );
  }

  // Проверка лимитов бронирований только для публичных интерфейсов
  const limitCheck = await checkBookingLimits(phoneNumber, venueId);

  if (!limitCheck.allowed) {
    // Логируем попытку создания при превышении лимита
    await logBookingActivity(phoneNumber, "blocked", "", data.ipAddress);

    throw new functions.https.HttpsError(
      "resource-exhausted",
      limitCheck.reason || "Превышен лимит бронирований"
    );
  }

  return {
    success: true,
    allowed: true,
    requiresCaptcha: false,
  };
});
