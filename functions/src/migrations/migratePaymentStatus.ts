import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Миграция для исправления статусов оплаты
 *
 * Старая схема:
 * - paymentStatus: 'paid' - означало оплачено наличными или картой
 * - paymentStatus: 'online_payment' - означало оплачено онлайн
 *
 * Новая схема:
 * - paymentStatus: 'paid' - просто означает оплачено (любым способом)
 * - paymentMethod определяет способ оплаты
 *
 * Логика миграции:
 * 1. Если paymentStatus === 'paid' и paymentMethod === 'online' -> оставляем как есть
 * 2. Если paymentStatus === 'paid' и paymentMethod !== 'online' -> оставляем как есть
 * 3. Если paymentStatus === 'online_payment' -> меняем на 'paid'
 */

export const migratePaymentStatuses = functions.region("europe-west1").https.onCall(async (data, context) => {
  // Проверяем авторизацию
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Требуется авторизация");
  }

  // Проверяем, что это суперадмин
  const adminSnapshot = await admin.firestore()
    .collection("admins")
    .where("email", "==", context.auth.token.email)
    .get();

  if (adminSnapshot.empty) {
    throw new functions.https.HttpsError("permission-denied", "Недостаточно прав");
  }

  const adminData = adminSnapshot.docs[0].data();
  if (adminData.role !== "superadmin") {
    throw new functions.https.HttpsError("permission-denied", "Только суперадмин может запускать миграцию");
  }

  try {
    const bookingsRef = admin.firestore().collection("bookings");
    const snapshot = await bookingsRef.get();

    let updatedCount = 0;
    let batch = admin.firestore().batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      let needsUpdate = false;
      const updates: any = {};

      // Если статус online_payment, меняем на paid
      if (data.paymentStatus === "online_payment") {
        updates.paymentStatus = "paid";
        needsUpdate = true;

        // Убеждаемся, что paymentMethod установлен в 'online'
        if (data.paymentMethod !== "online") {
          updates.paymentMethod = "online";
        }
      }

      // Если статус paid, проверяем paymentMethod
      if (data.paymentStatus === "paid" && !data.paymentMethod) {
        // Если нет paymentMethod, пытаемся определить по другим полям
        if (data.paymentId || data.paymentUrl) {
          updates.paymentMethod = "online";
        } else {
          updates.paymentMethod = "cash"; // По умолчанию считаем наличными
        }
        needsUpdate = true;
      }

      if (needsUpdate) {
        batch.update(doc.ref, updates);
        updatedCount++;
        batchCount++;

        // Firestore имеет ограничение в 500 операций на batch
        if (batchCount === 500) {
          await batch.commit();
          batch = admin.firestore().batch();
          batchCount = 0;
        }
      }
    }

    // Коммитим оставшиеся изменения
    if (batchCount > 0) {
      await batch.commit();
    }

    return {
      success: true,
      message: `Миграция завершена. Обновлено записей: ${updatedCount} из ${snapshot.size}`,
      totalRecords: snapshot.size,
      updatedRecords: updatedCount,
    };
  } catch (error) {
    console.error("Ошибка при миграции:", error);
    throw new functions.https.HttpsError("internal", "Ошибка при выполнении миграции");
  }
});

// Функция для проверки статусов перед миграцией
export const checkPaymentStatuses = functions.region("europe-west1").https.onCall(async (data, context) => {
  // Проверяем авторизацию
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Требуется авторизация");
  }

  try {
    const bookingsRef = admin.firestore().collection("bookings");
    const snapshot = await bookingsRef.get();

    const stats = {
      total: snapshot.size,
      paid: 0,
      online_payment: 0,
      awaiting_payment: 0,
      cancelled: 0,
      refunded: 0,
      error: 0,
      other: 0,
      needsMigration: 0,
    };

    const paymentMethods = {
      cash: 0,
      card_on_site: 0,
      transfer: 0,
      online: 0,
      sberbank_card: 0,
      tbank_card: 0,
      vtb_card: 0,
      undefined: 0,
      other: 0,
    };

    snapshot.forEach((doc) => {
      const data = doc.data();

      // Статистика по статусам
      switch (data.paymentStatus) {
      case "paid":
        stats.paid++;
        break;
      case "online_payment":
        stats.online_payment++;
        stats.needsMigration++;
        break;
      case "awaiting_payment":
        stats.awaiting_payment++;
        break;
      case "cancelled":
        stats.cancelled++;
        break;
      case "refunded":
        stats.refunded++;
        break;
      case "error":
        stats.error++;
        break;
      default:
        stats.other++;
      }

      // Статистика по методам оплаты
      const method = data.paymentMethod;
      if (!method) {
        paymentMethods.undefined++;
      } else if (method in paymentMethods) {
        paymentMethods[method as keyof typeof paymentMethods]++;
      } else {
        paymentMethods.other++;
      }
    });

    return {
      success: true,
      stats,
      paymentMethods,
      message: `Найдено ${stats.needsMigration} записей для миграции`,
    };
  } catch (error) {
    console.error("Ошибка при проверке:", error);
    throw new functions.https.HttpsError("internal", "Ошибка при проверке данных");
  }
});
