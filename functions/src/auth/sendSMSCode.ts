import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {smsService} from "../services/smsService";

const region = "europe-west1";

export const sendSMSCode = functions.region(region).https.onCall(async (data, _context) => {
  const {phoneNumber} = data;

  if (!phoneNumber) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Phone number is required"
    );
  }

  try {
    // Генерируем 4-значный код
    const code = Math.floor(1000 + Math.random() * 9000).toString();

    // В тестовом режиме используем фиксированный код
    const isTestMode = functions.config().sms?.test_mode === "true";
    const finalCode = isTestMode ? "1234" : code;

    // Сохраняем код в Firestore
    await admin.firestore().collection("phoneVerificationCodes").doc(phoneNumber).set({
      code: finalCode,
      phoneNumber,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      attempts: 0,
      used: false,
    });

    // Отправляем SMS
    const sent = await smsService.sendVerificationCode(phoneNumber, finalCode);

    if (!sent && !isTestMode) {
      throw new functions.https.HttpsError(
        "internal",
        "Failed to send SMS"
      );
    }

    return {
      success: true,
      testMode: isTestMode,
    };
  } catch (error) {
    console.error("Error sending SMS code:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to send verification code"
    );
  }
});

export const verifySMSCode = functions.region(region).https.onCall(async (data, _context) => {
  const {phoneNumber, code} = data;

  if (!phoneNumber || !code) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Phone number and code are required"
    );
  }

  try {
    const docRef = admin.firestore().collection("phoneVerificationCodes").doc(phoneNumber);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Verification code not found"
      );
    }

    const codeData = doc.data()!;

    // Проверяем количество попыток
    if (codeData.attempts >= 3) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Too many attempts. Please request a new code"
      );
    }

    // Проверяем срок действия кода (10 минут)
    const createdAt = codeData.createdAt.toDate();
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    if (diffMinutes > 10) {
      throw new functions.https.HttpsError(
        "deadline-exceeded",
        "Verification code expired"
      );
    }

    if (codeData.used) {
      throw new functions.https.HttpsError(
        "already-exists",
        "Verification code already used"
      );
    }

    // Проверяем код
    if (codeData.code !== code) {
      // Увеличиваем счетчик попыток
      await docRef.update({
        attempts: admin.firestore.FieldValue.increment(1),
      });

      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid verification code"
      );
    }

    // Помечаем код как использованный
    await docRef.update({used: true});

    // Создаем или обновляем пользователя
    const userRef = admin.firestore().collection("users").doc(phoneNumber);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        phoneNumber,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      await userRef.update({
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Генерируем custom token для авторизации
    const customToken = await admin.auth().createCustomToken(phoneNumber, {
      phoneNumber,
    });

    return {
      success: true,
      token: customToken,
      isNewUser: !userDoc.exists,
    };
  } catch (error: unknown) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    console.error("Error verifying SMS code:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to verify code"
    );
  }
});

