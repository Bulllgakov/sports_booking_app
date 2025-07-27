import * as functions from "firebase-functions";
import {sendEmail} from "../services/emailService";

const region = "europe-west1";

/**
 * Тестовая функция для проверки работы Firebase Extension для отправки email
 * Можно вызвать через Firebase Console или HTTP запрос
 */
export const testEmailSending = functions
  .region(region)
  .https.onCall(async (data, context) => {
    // Проверяем авторизацию
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const {testEmail} = data;

    if (!testEmail) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Test email address is required"
      );
    }

    // Проверяем, что пользователь - суперадмин
    const admin = await import("firebase-admin");
    const adminDoc = await admin.firestore()
      .collection("admins")
      .doc(context.auth.uid)
      .get();

    if (!adminDoc.exists || adminDoc.data()?.role !== "superadmin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only superadmins can test email sending"
      );
    }

    try {
      // Создаем HTML без ссылки на emailId
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
    }
    .header {
      background: #00A86B;
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background: #f8f9fa;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .info-box {
      background: white;
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 15px;
      margin: 20px 0;
    }
    .success {
      color: #00A86B;
      font-weight: bold;
    }
    code {
      background: #e9ecef;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Тестовое письмо</h1>
  </div>
  
  <div class="content">
    <p class="success">✅ Если вы видите это письмо, значит настройка email работает корректно!</p>
    
    <div class="info-box">
      <h3>Информация о конфигурации:</h3>
      <ul>
        <li>Отправлено через: Firebase Extension (firestore-send-email)</li>
        <li>Коллекция для писем: <code>mail</code></li>
        <li>Время отправки: ${new Date().toLocaleString("ru-RU")}</li>
      </ul>
    </div>
    
    <p>Это тестовое письмо было отправлено для проверки работы системы email-уведомлений.</p>
    
    <h3>Что проверено:</h3>
    <ul>
      <li>✅ SMTP соединение работает</li>
      <li>✅ Firebase Extension настроено правильно</li>
      <li>✅ Письма успешно доставляются</li>
    </ul>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      Это автоматическое письмо. Не отвечайте на него.
    </p>
  </div>
</body>
</html>`;

      // Отправляем тестовое письмо
      const emailId = await sendEmail({
        to: testEmail,
        message: {
          subject: "Тестовое письмо - Все Корты",
          html: htmlContent,
          text: "Тестовое письмо от Все Корты. Если вы видите это письмо, настройка email работает корректно!",
        },
      });

      return {
        success: true,
        message: "Тестовое письмо отправлено",
        emailId: emailId,
        testEmail: testEmail,
      };
    } catch (error: any) {
      console.error("Error sending test email:", error);
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Ошибка при отправке тестового письма"
      );
    }
  });

