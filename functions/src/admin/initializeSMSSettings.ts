import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const region = "europe-west1";

// Функция для инициализации SMS настроек из config
export const initializeSMSSettings = functions.region(region).https.onCall(async (data, context) => {
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
      "Only superadmins can initialize SMS settings"
    );
  }

  try {
    // Проверяем, есть ли уже настройки
    const settingsDoc = await admin.firestore()
      .collection("settings")
      .doc("sms")
      .get();

    if (settingsDoc.exists) {
      return {
        success: false,
        message: "SMS settings already initialized",
      };
    }

    // Получаем конфигурацию
    const config = functions.config();

    // Создаем начальные настройки
    const initialSettings: Record<string, unknown> = {
      provider: "smsru",
      testMode: config.sms?.test_mode === "true",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: context.auth.token.email,
    };

    // Добавляем учетные данные для SMS.RU
    if (config.sms?.smsru_api_id) {
      initialSettings.smsruApiId = config.sms.smsru_api_id;
    }

    // Сохраняем настройки
    await admin.firestore()
      .collection("settings")
      .doc("sms")
      .set(initialSettings);

    // Логируем действие
    await admin.firestore().collection("auditLogs").add({
      action: "sms_settings_initialized",
      userId: context.auth.uid,
      userEmail: context.auth.token.email,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        provider: initialSettings.provider,
        testMode: initialSettings.testMode,
      },
    });

    return {
      success: true,
      message: "SMS settings initialized successfully",
    };
  } catch (error) {
    console.error("Error initializing SMS settings:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to initialize SMS settings"
    );
  }
});

