import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {DEFAULT_SMS_TEMPLATES, SMSTemplatesSettings} from "../types/smsTemplates";

const region = "europe-west1";

// Получение шаблонов SMS
export const getSMSTemplates = functions.region(region).https.onCall(async (data, context) => {
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
      "Only superadmins can access SMS templates"
    );
  }

  try {
    // Получаем шаблоны из Firestore
    const templatesDoc = await admin.firestore()
      .collection("settings")
      .doc("smsTemplates")
      .get();

    if (!templatesDoc.exists) {
      // Возвращаем дефолтные шаблоны
      return DEFAULT_SMS_TEMPLATES;
    }

    return templatesDoc.data() as SMSTemplatesSettings;
  } catch (error) {
    console.error("Error getting SMS templates:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to get SMS templates"
    );
  }
});

// Обновление шаблонов SMS
export const updateSMSTemplates = functions.region(region).https.onCall(async (data, context) => {
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
      "Only superadmins can update SMS templates"
    );
  }

  const templates = data as SMSTemplatesSettings;

  // Валидация шаблонов
  for (const [key, template] of Object.entries(templates)) {
    if (template.template && template.template.length > 70) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Template ${key} exceeds 70 characters limit`
      );
    }
  }

  try {
    await admin.firestore()
      .collection("settings")
      .doc("smsTemplates")
      .set({
        ...templates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: context.auth.token.email,
      }, {merge: true});

    // Логируем изменение
    await admin.firestore().collection("auditLogs").add({
      action: "sms_templates_updated",
      userId: context.auth.uid,
      userEmail: context.auth.token.email,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: templates,
    });

    return {success: true};
  } catch (error) {
    console.error("Error updating SMS templates:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to update SMS templates"
    );
  }
});
