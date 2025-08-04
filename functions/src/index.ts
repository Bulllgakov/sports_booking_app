import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {sendEmail} from "./services/emailService";

admin.initializeApp();

// Устанавливаем регион для всех функций
const region = "europe-west1";

/**
 * Функция для отправки уведомлений суперадминистраторам
 * @param {any} venueData - Данные клуба
 * @param {any} adminData - Данные администратора
 */
async function sendSuperAdminNotification(venueData: any, adminData: any) {
  try {
    // Получаем настройки уведомлений
    const notificationSettingsDoc = await admin.firestore()
      .collection("settings")
      .doc("notifications")
      .get();

    if (!notificationSettingsDoc.exists) {
      console.log("No notification settings found");
      return;
    }

    const settings = notificationSettingsDoc.data()!;
    const superAdminEmails = settings.superAdminEmails || [];

    if (superAdminEmails.length === 0) {
      console.log("No super admin emails configured");
      return;
    }

    // Отправляем email каждому суперадминистратору
    const emailPromises = superAdminEmails.map(async (email: string) => {
      const mailOptions = {
        to: email,
        from: "Все Корты <noreply@allcourt.ru>",
        subject: "🎉 Новый клуб зарегистрирован в системе Все Корты",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Новая регистрация клуба</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #00A86B 0%, #007A4D 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      padding: 40px 30px;
    }
    .info-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      padding: 10px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #666;
      width: 150px;
      flex-shrink: 0;
    }
    .info-value {
      color: #333;
      flex: 1;
    }
    .button {
      display: inline-block;
      background: #00A86B;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: 600;
    }
    .stats {
      display: flex;
      justify-content: space-around;
      text-align: center;
      margin: 30px 0;
    }
    .stat-item {
      flex: 1;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #00A86B;
    }
    .stat-label {
      color: #666;
      font-size: 14px;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 14px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Новый клуб в системе!</h1>
      <p style="margin: 10px 0 0 0; font-size: 18px;">Зарегистрирован новый спортивный клуб</p>
    </div>
    
    <div class="content">
      <h2>Информация о клубе</h2>
      
      <div class="info-card">
        <div class="info-row">
          <div class="info-label">Название клуба:</div>
          <div class="info-value"><strong>${venueData.name || "Не указано"}</strong></div>
        </div>
        <div class="info-row">
          <div class="info-label">Тип клуба:</div>
          <div class="info-value">${venueData.type || "Не указан"}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Адрес:</div>
          <div class="info-value">${venueData.address || "Не указан"}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Город:</div>
          <div class="info-value">${venueData.city || "Не указан"}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Телефон:</div>
          <div class="info-value">${venueData.phone || "Не указан"}</div>
        </div>
      </div>

      <h3>Администратор клуба</h3>
      <div class="info-card">
        <div class="info-row">
          <div class="info-label">Имя:</div>
          <div class="info-value">${adminData.name || "Не указано"}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Email:</div>
          <div class="info-value">${adminData.email}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Дата регистрации:</div>
          <div class="info-value">${new Date().toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}</div>
        </div>
      </div>

      <h3>Статистика системы</h3>
      <div class="stats">
        <div class="stat-item">
          <div class="stat-value">+1</div>
          <div class="stat-label">Новый клуб</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">🆓</div>
          <div class="stat-label">Тариф START</div>
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://allcourt.ru/admin" class="button">Перейти в админ-панель</a>
      </div>

      <p style="color: #666; font-size: 14px;">
        <strong>Примечание:</strong> Новые клубы автоматически регистрируются на бесплатном тарифе START (до 2 кортов). 
        При необходимости изменения тарифа, свяжитесь с администратором клуба.
      </p>
    </div>
    
    <div class="footer">
      <p>© 2024 Все Корты. Все права защищены.</p>
      <p>Это автоматическое уведомление. Пожалуйста, не отвечайте на него.</p>
    </div>
  </div>
</body>
</html>
        `,
      };

      return sendEmail({
        to: email,
        message: {
          subject: mailOptions.subject,
          html: mailOptions.html,
        },
      });
    });

    await Promise.all(emailPromises);
    console.log(`Super admin notifications sent to ${superAdminEmails.length} recipients`);
  } catch (error) {
    console.error("Error sending super admin notifications:", error);
  }
}

// Функция для отправки приветственного email с доступами
export const sendWelcomeEmail = functions.region(region).firestore
  .document("admins/{adminId}")
  .onCreate(async (snap, context) => {
    const adminData = snap.data();
    const adminId = context.params.adminId;

    if (!adminData.email || adminData.role !== "admin") {
      return;
    }

    // Получаем данные клуба
    const venueDoc = await admin.firestore()
      .collection("venues")
      .doc(adminData.venueId)
      .get();

    if (!venueDoc.exists) {
      console.error("Venue not found for admin:", adminId);
      return;
    }

    const venueData = venueDoc.data()!;

    // Отправляем уведомление суперадминистраторам о новом клубе
    await sendSuperAdminNotification(venueData, adminData);

    // Генерируем временную ссылку для входа
    const actionCodeSettings = {
      url: `https://allcourt.ru/admin/login?email=${encodeURIComponent(adminData.email)}`,
      handleCodeInApp: false,
    };

    try {
      // Генерируем ссылку для сброса пароля
      const resetLink = await admin.auth()
        .generatePasswordResetLink(adminData.email, actionCodeSettings);

      // Отправляем email
      const mailOptions = {
        from: "Все Корты <noreply@allcourt.ru>",
        to: adminData.email,
        subject: "Добро пожаловать в Все Корты! Ваши доступы к админ-панели",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Добро пожаловать в Все Корты</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: #00A86B;
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      padding: 40px 30px;
    }
    .button {
      display: inline-block;
      background: #00A86B;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: 600;
    }
    .info-box {
      background: #f8f9fa;
      border-left: 4px solid #00A86B;
      padding: 15px;
      margin: 20px 0;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 14px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎾 Все Корты</h1>
      <p style="margin: 10px 0 0 0; font-size: 18px;">Система управления спортивными клубами</p>
    </div>
    
    <div class="content">
      <h2>Добро пожаловать, ${adminData.name}!</h2>
      
      <p>Поздравляем! Ваш клуб <strong>${venueData.name}</strong> успешно зарегистрирован в системе "Все Корты".</p>
      
      <p>Теперь вы можете:</p>
      <ul>
        <li>Управлять кортами и расписанием</li>
        <li>Принимать онлайн-бронирования</li>
        <li>Отслеживать статистику и доходы</li>
        <li>Управлять клиентской базой</li>
      </ul>
      
      <div class="info-box">
        <h3 style="margin-top: 0;">Ваши доступы к админ-панели:</h3>
        <p><strong>Email:</strong> ${adminData.email}</p>
        <p><strong>Ссылка для входа:</strong> <a href="https://allcourt.ru/admin">https://allcourt.ru/admin</a></p>
      </div>
      
      <p>Для первого входа используйте кнопку ниже:</p>
      
      <div style="text-align: center;">
        <a href="${resetLink}" class="button">Войти в админ-панель</a>
      </div>
      
      <p><small>Эта ссылка действительна в течение 24 часов. 
      После первого входа вы сможете использовать ваш email и пароль для авторизации.</small></p>
      
      <h3>Что дальше?</h3>
      <ol>
        <li><strong>Настройте профиль клуба</strong> - добавьте логотип, описание и контактную информацию</li>
        <li><strong>Добавьте корты</strong> - укажите типы кортов, расписание работы и цены</li>
        <li><strong>Настройте способы оплаты</strong> - подключите онлайн-оплату для удобства клиентов</li>
        <li><strong>Пригласите сотрудников</strong> - добавьте менеджеров для помощи в управлении</li>
      </ol>
      
      <p>Если у вас возникнут вопросы, обратитесь в нашу службу поддержки:</p>
      <ul>
        <li>Email: support@allcourt.ru</li>
        <li>Телефон: +7 (495) 123-45-67</li>
      </ul>
    </div>
    
    <div class="footer">
      <p>© 2024 Все Корты. Все права защищены.</p>
      <p>Это автоматическое письмо. Пожалуйста, не отвечайте на него.</p>
    </div>
  </div>
</body>
</html>
        `,
      };

      // Отправляем через Firebase Extension
      await sendEmail({
        to: adminData.email,
        message: {
          subject: mailOptions.subject,
          html: mailOptions.html,
        },
      });

      console.log("Welcome email queued for:", adminData.email);
    } catch (error) {
      console.error("Error sending welcome email:", error);
    }
  });

// Функция для отправки кода верификации email
export const sendVerificationCode = functions.region(region).https.onCall(async (data, _context) => {
  const {email} = data;

  if (!email) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Email is required"
    );
  }

  // Генерируем 6-значный код
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Сохраняем код в Firestore с временной меткой
  await admin.firestore().collection("verificationCodes").doc(email).set({
    code,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    used: false,
  });

  // Отправляем email с кодом
  const mailOptions = {
    from: "Все Корты <noreply@allcourt.ru>",
    to: email,
    subject: "Код подтверждения - Все Корты",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 500px;
      margin: 0 auto;
      padding: 20px;
    }
    .code {
      background: #f4f4f4;
      font-size: 32px;
      font-weight: bold;
      text-align: center;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
      letter-spacing: 8px;
      color: #00A86B;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Подтверждение email</h2>
    <p>Для завершения регистрации введите этот код:</p>
    <div class="code">${code}</div>
    <p>Код действителен в течение 15 минут.</p>
    <p>Если вы не запрашивали этот код, просто проигнорируйте это письмо.</p>
  </div>
</body>
</html>
    `,
  };

  try {
    await sendEmail({
      to: email,
      message: {
        subject: mailOptions.subject,
        html: mailOptions.html,
      },
    });
    return {success: true};
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to send verification email"
    );
  }
});

// Функция для проверки кода верификации
export const verifyCode = functions.region(region).https.onCall(async (data, _context) => {
  const {email, code} = data;

  if (!email || !code) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Email and code are required"
    );
  }

  const docRef = admin.firestore().collection("verificationCodes").doc(email);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "Verification code not found"
    );
  }

  const codeData = doc.data()!;

  // Проверяем срок действия кода (15 минут)
  const createdAt = codeData.createdAt.toDate();
  const now = new Date();
  const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

  if (diffMinutes > 15) {
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

  if (codeData.code !== code) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid verification code"
    );
  }

  // Помечаем код как использованный
  await docRef.update({used: true});

  return {success: true};
});

// Функция для создания клуба после регистрации
export const createClubAfterRegistration = functions.region(region).auth.user()
  .onCreate(async (user) => {
    console.log("New user created:", user.uid, user.email);

    // Проверяем, есть ли данные о регистрации клуба в metadata
    const customClaims = user.customClaims;
    if (!customClaims?.pendingClubRegistration) {
      console.log("No pending club registration for user:", user.uid);
      return;
    }

    const registrationData = customClaims.pendingClubRegistration;
    console.log("Processing club registration:", registrationData);

    try {
    // Создаем клуб в коллекции venues
      const venueRef = await admin.firestore().collection("venues").add({
        ...registrationData.venueData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("Club created with ID:", venueRef.id);

      // Создаем бесплатную подписку
      await admin.firestore().collection("subscriptions").add({
        venueId: venueRef.id,
        plan: "start",
        status: "active",
        startDate: admin.firestore.FieldValue.serverTimestamp(),
        endDate: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        usage: {
          courtsCount: 0,
          bookingsThisMonth: 0,
          smsEmailsSent: 0,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        },
      });

      console.log("Subscription created for venue:", venueRef.id);

      // Создаем администратора
      const adminData = {
        name: "Администратор",
        email: user.email,
        role: "admin",
        venueId: venueRef.id,
        permissions: [
          "manage_bookings", "manage_courts", "manage_club",
          "manage_admins", "manage_finance", "view_reports", "create_bookings",
        ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await admin.firestore().collection("admins").add(adminData);

      console.log("Admin created for venue:", venueRef.id);

      // Отправляем уведомление суперадминистраторам
      await sendSuperAdminNotification(registrationData.venueData, {...adminData, email: user.email});

      // Удаляем временные данные из custom claims
      await admin.auth().setCustomUserClaims(user.uid, {
        ...customClaims,
        pendingClubRegistration: null,
        venueId: venueRef.id,
      });

      console.log("Club registration completed successfully");
    } catch (error) {
      console.error("Error creating club:", error);
      throw error;
    }
  });

// HTTP функция для создания клуба (альтернативный способ)
export const createClub = functions.region(region).runWith({
  invoker: "public",
}).https.onCall(async (data, context) => {
  // Проверяем авторизацию
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const {venueData} = data;
  const userId = context.auth.uid;
  const userEmail = context.auth.token.email;

  console.log("Creating club for user:", userId, userEmail);

  try {
    // Создаем клуб
    const venueRef = await admin.firestore().collection("venues").add({
      ...venueData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Создаем подписку
    await admin.firestore().collection("subscriptions").add({
      venueId: venueRef.id,
      plan: "start",
      status: "active",
      startDate: admin.firestore.FieldValue.serverTimestamp(),
      endDate: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      usage: {
        courtsCount: 0,
        bookingsThisMonth: 0,
        smsEmailsSent: 0,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
    });

    // Создаем администратора
    const adminData = {
      name: "Администратор",
      email: userEmail,
      role: "admin",
      venueId: venueRef.id,
      permissions: [
        "manage_bookings", "manage_courts", "manage_clients", "manage_settings",
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin.firestore().collection("admins").add(adminData);

    // Отправляем уведомление суперадминистраторам
    await sendSuperAdminNotification(venueData, {...adminData, email: userEmail});

    // Обновляем custom claims пользователя
    await admin.auth().setCustomUserClaims(userId, {
      venueId: venueRef.id,
    });

    return {
      success: true,
      venueId: venueRef.id,
    };
  } catch (error) {
    console.error("Error in createClub function:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to create club"
    );
  }
});

// HTTP функция для создания клуба (обход CORS)
export const createClubHttp = functions.region(region).https.onRequest(async (req, res) => {
  // Настраиваем CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const {venueData, password, userId} = req.body;

    if (!venueData || !password || !userId) {
      res.status(400).json({error: "Missing required fields"});
      return;
    }

    console.log("Creating club via HTTP for user:", userId);

    // Создаем клуб
    const venueRef = await admin.firestore().collection("venues").add({
      ...venueData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Создаем подписку
    await admin.firestore().collection("subscriptions").add({
      venueId: venueRef.id,
      plan: "start",
      status: "active",
      startDate: admin.firestore.FieldValue.serverTimestamp(),
      endDate: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      usage: {
        courtsCount: 0,
        bookingsThisMonth: 0,
        smsEmailsSent: 0,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
    });

    // Создаем администратора
    const adminData = {
      name: "Администратор",
      email: venueData.email,
      role: "admin",
      venueId: venueRef.id,
      permissions: [
        "manage_bookings", "manage_courts", "manage_clients", "manage_settings",
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin.firestore().collection("admins").add(adminData);

    // Отправляем уведомление суперадминистраторам
    await sendSuperAdminNotification(venueData, {...adminData, email: venueData.email});

    res.status(200).json({
      success: true,
      venueId: venueRef.id,
    });
  } catch (error) {
    console.error("Error in createClubHttp:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

// Экспорт функций для биллинга
export {initSubscriptionPayment} from "./billing/initPayment";
export {initBookingPayment} from "./billing/initBookingPayment";
export {processBookingRefund} from "./billing/processRefund";
export {testPaymentConnection} from "./billing/testPaymentConnection";
export {tbankWebhook} from "./billing/webhooks";
export {yookassaWebhook} from "./billing/yookassaWebhook";
export {processRecurringPayment, monthlyBilling} from "./billing/recurringPayment";

// Booking functions
export {cancelExpiredBookings, cancelExpiredBookingsManual} from "./booking/cancelExpiredBookings";

// Экспорт функций для уведомлений о бронировании
export {sendBookingNotifications, resendBookingNotification} from "./booking/notifications";

// Экспорт функций для очистки просроченных бронирований
export {cleanupExpiredBookings, manualCleanupExpiredBookings} from "./booking/cleanup";

// Экспорт функции для очистки веб-бронирований
export {cleanupWebBookings} from "./admin/cleanupWebBookings";
// Экспорт функции для возврата от пользователей
export {processUserRefund} from "./booking/processUserRefund";

// Экспорт функции для тестирования email
export {testEmailSending} from "./test/testEmail";

// Экспорт функции для исправления доступа админов
export {fixAdminAccess} from "./test/fixAdminAccess";

// Экспорт функции для создания тестовых открытых игр
export {createTestOpenGames} from "./test/createTestOpenGames";

// Временная функция для обработки email очереди
import {processEmailQueue} from "./email/sendEmail";

export const processEmailQueueManual = functions
  .region(region)
  .https.onCall(async (_data, _context) => {
    try {
      await processEmailQueue();
      return {success: true, message: "Email queue processed"};
    } catch (error: any) {
      console.error("Error processing email queue:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

// Admin functions
export {fixRefundStatus} from "./admin/fixRefundStatus";
export {manualRefundUpdate} from "./admin/manualRefundUpdate";
