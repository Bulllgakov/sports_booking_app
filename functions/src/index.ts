import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

admin.initializeApp();

// Конфигурация для nodemailer (нужно настроить с реальными данными)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: functions.config().email?.user || "noreply@allcourt.ru",
    pass: functions.config().email?.password || "",
  },
});

// Функция для отправки приветственного email с доступами
export const sendWelcomeEmail = functions.firestore
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
      
      <p><small>Эта ссылка действительна в течение 24 часов. После первого входа вы сможете использовать ваш email и пароль для авторизации.</small></p>
      
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

      await transporter.sendMail(mailOptions);
      
      console.log("Welcome email sent to:", adminData.email);
    } catch (error) {
      console.error("Error sending welcome email:", error);
    }
  });

// Функция для отправки кода верификации email
export const sendVerificationCode = functions.https.onCall(async (data, context) => {
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
    await transporter.sendMail(mailOptions);
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
export const verifyCode = functions.https.onCall(async (data, context) => {
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