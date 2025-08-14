import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {smsService} from "../services/smsService";

const region = "europe-west1";

// Получение текущих настроек SMS
export const getSMSSettings = functions.region(region).https.onCall(async (data, context) => {
  // Проверяем авторизацию суперадмина
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  // Проверяем роль суперадмина
  const adminDoc = await admin.firestore()
    .collection("admins")
    .where("email", "==", context.auth.token.email)
    .limit(1)
    .get();

  if (adminDoc.empty || adminDoc.docs[0].data().role !== "superadmin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only superadmins can access SMS settings"
    );
  }

  try {
    // Получаем настройки из Firestore
    const settingsDoc = await admin.firestore()
      .collection("settings")
      .doc("sms")
      .get();

    if (!settingsDoc.exists) {
      // Возвращаем дефолтные настройки
      return {
        provider: "smsru",
        testMode: false,
        smsruApiId: "",
      };
    }

    const settings = settingsDoc.data()!;

    // Маскируем чувствительные данные
    return {
      provider: "smsru",
      testMode: settings.testMode || false,
      smsruApiId: settings.smsruApiId ? maskApiKey(settings.smsruApiId) : "",
    };
  } catch (error) {
    console.error("Error getting SMS settings:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to get SMS settings"
    );
  }
});

// Обновление настроек SMS
export const updateSMSSettings = functions.region(region).https.onCall(async (data, context) => {
  // Проверяем авторизацию суперадмина
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  // Проверяем роль суперадмина
  const adminDoc = await admin.firestore()
    .collection("admins")
    .where("email", "==", context.auth.token.email)
    .limit(1)
    .get();

  if (adminDoc.empty || adminDoc.docs[0].data().role !== "superadmin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only superadmins can update SMS settings"
    );
  }

  const {testMode, smsruApiId} = data;

  // Provider is always smsru now

  try {
    // Получаем текущие настройки
    const currentDoc = await admin.firestore()
      .collection("settings")
      .doc("sms")
      .get();

    const currentSettings = currentDoc.exists ? currentDoc.data()! : {};

    // Подготавливаем обновленные настройки
    const updatedSettings: Record<string, unknown> = {
      provider: "smsru",
      testMode: testMode || false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: context.auth.token.email,
    };

    // Обновляем только если переданы новые значения (не маскированные)
    if (smsruApiId && !smsruApiId.includes("*")) {
      updatedSettings.smsruApiId = smsruApiId;
    } else if (currentSettings.smsruApiId) {
      updatedSettings.smsruApiId = currentSettings.smsruApiId;
    }

    // Сохраняем настройки
    await admin.firestore()
      .collection("settings")
      .doc("sms")
      .set(updatedSettings, {merge: true});

    // Логируем изменение
    await admin.firestore().collection("auditLogs").add({
      action: "sms_settings_updated",
      userId: context.auth.uid,
      userEmail: context.auth.token.email,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        provider: "smsru",
        testMode,
      },
    });

    return {success: true};
  } catch (error) {
    console.error("Error updating SMS settings:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to update SMS settings"
    );
  }
});

// Тестовая отправка SMS
export const testSMSSending = functions.region(region).https.onCall(async (data, context) => {
  // Проверяем авторизацию суперадмина
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  // Проверяем роль суперадмина
  const adminDoc = await admin.firestore()
    .collection("admins")
    .where("email", "==", context.auth.token.email)
    .limit(1)
    .get();

  if (adminDoc.empty || adminDoc.docs[0].data().role !== "superadmin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only superadmins can test SMS"
    );
  }

  const {phoneNumber} = data;

  if (!phoneNumber) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Phone number is required"
    );
  }

  try {
    const success = await smsService.sendTestSMS(phoneNumber);

    // Логируем тест
    await admin.firestore().collection("auditLogs").add({
      action: "sms_test_sent",
      userId: context.auth.uid,
      userEmail: context.auth.token.email,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        phoneNumber,
        success,
      },
    });

    return {
      success,
      message: success ?
        "Тестовое SMS успешно отправлено" :
        "Не удалось отправить SMS. Проверьте настройки",
    };
  } catch (error) {
    console.error("Error testing SMS:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to send test SMS"
    );
  }
});

// Получение статистики SMS
export const getSMSStats = functions.region(region).https.onCall(async (data, context) => {
  // Проверяем авторизацию суперадмина
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  // Проверяем роль суперадмина
  const adminDoc = await admin.firestore()
    .collection("admins")
    .where("email", "==", context.auth.token.email)
    .limit(1)
    .get();

  if (adminDoc.empty || adminDoc.docs[0].data().role !== "superadmin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only superadmins can view SMS stats"
    );
  }

  try {
    // Получаем общую статистику
    const statsDoc = await admin.firestore()
      .collection("stats")
      .doc("sms")
      .get();

    const stats = statsDoc.exists ? statsDoc.data()! : {sent: 0};

    // Получаем последние SMS логи
    const logsSnapshot = await admin.firestore()
      .collection("smsLogs")
      .orderBy("timestamp", "desc")
      .limit(50)
      .get();

    const logs = logsSnapshot.docs.map((doc) => {
      const data = doc.data();
      let timestamp = null;

      if (data.timestamp) {
        try {
          // Проверяем, является ли timestamp Firestore Timestamp
          if (data.timestamp.toDate) {
            timestamp = data.timestamp.toDate().toISOString();
          } else if (data.timestamp instanceof Date) {
            timestamp = data.timestamp.toISOString();
          }
        } catch (e) {
          console.error("Error converting timestamp:", e);
        }
      }

      return {
        id: doc.id,
        ...data,
        timestamp,
      };
    });

    let lastSentISO = null;
    if (stats.lastSent) {
      try {
        if (stats.lastSent.toDate) {
          lastSentISO = stats.lastSent.toDate().toISOString();
        } else if (stats.lastSent instanceof Date) {
          lastSentISO = stats.lastSent.toISOString();
        }
      } catch (e) {
        console.error("Error converting lastSent:", e);
      }
    }

    return {
      totalSent: stats.sent || 0,
      lastSent: lastSentISO,
      recentLogs: logs,
    };
  } catch (error) {
    console.error("Error getting SMS stats:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to get SMS stats"
    );
  }
});

// Функция для маскирования API ключа
function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return apiKey;
  }
  const start = apiKey.substring(0, 4);
  const end = apiKey.substring(apiKey.length - 4);
  const masked = "*".repeat(apiKey.length - 8);
  return `${start}${masked}${end}`;
}

