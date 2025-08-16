import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {sendEmail} from "../services/emailService";

export const createTrainerAccount = functions.https.onCall(async (data, context) => {
  // Проверяем авторизацию и права
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Требуется авторизация");
  }

  // Получаем данные админа
  const adminSnapshot = await admin.firestore()
    .collection("admins")
    .where("email", "==", context.auth.token.email)
    .get();

  if (adminSnapshot.empty) {
    throw new functions.https.HttpsError("permission-denied", "Недостаточно прав");
  }

  const adminData = adminSnapshot.docs[0].data();

  // Проверяем, что это админ или суперадмин
  if (!["admin", "superadmin"].includes(adminData.role)) {
    throw new functions.https.HttpsError("permission-denied", "Только администраторы могут создавать аккаунты тренеров");
  }

  const {trainerId, email, password, name} = data;

  if (!trainerId || !email || !password || !name) {
    throw new functions.https.HttpsError("invalid-argument", "Необходимы trainerId, email, password и name");
  }

  try {
    // Получаем данные тренера
    const trainerDoc = await admin.firestore()
      .collection("trainers")
      .doc(trainerId)
      .get();

    if (!trainerDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Тренер не найден");
    }

    const trainerData = trainerDoc.data()!;

    // Проверяем, что тренер относится к клубу админа (если не суперадмин)
    if (adminData.role !== "superadmin" && trainerData.clubId !== adminData.venueId) {
      throw new functions.https.HttpsError("permission-denied", "Вы можете создавать аккаунты только для тренеров вашего клуба");
    }

    // Проверяем, нет ли уже аккаунта для этого тренера
    const existingAdminSnapshot = await admin.firestore()
      .collection("admins")
      .where("trainerId", "==", trainerId)
      .get();

    if (!existingAdminSnapshot.empty) {
      throw new functions.https.HttpsError("already-exists", "Аккаунт для этого тренера уже существует");
    }

    // Создаем пользователя в Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      emailVerified: true,
    });

    // Создаем запись админа с ролью trainer
    await admin.firestore().collection("admins").add({
      email,
      name,
      role: "trainer",
      trainerId,
      venueId: trainerData.clubId,
      permissions: ["view_own_profile", "edit_own_profile"],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: context.auth.uid,
    });

    // Обновляем запись тренера, добавляя email
    await admin.firestore()
      .collection("trainers")
      .doc(trainerId)
      .update({
        email,
        hasAccount: true,
        accountCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Получаем информацию о клубе
    const venueDoc = await admin.firestore()
      .collection("venues")
      .doc(trainerData.clubId)
      .get();

    const venueData = venueDoc.exists ? venueDoc.data() : null;

    // Отправляем email тренеру с данными для входа
    try {
      await sendEmail({
        to: email,
        from: "Все Корты <noreply@allcourt.ru>",
        message: {
          subject: "Добро пожаловать в систему Все Корты",
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #00A86B; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: white; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; }
    .credentials { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 30px; background: #00A86B; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Добро пожаловать в Все Корты!</h1>
    </div>
    <div class="content">
      <p>Здравствуйте, ${name}!</p>
      
      <p>Для вас создан личный кабинет тренера в системе управления спортивным клубом "${venueData?.name || "Все Корты"}".</p>
      
      <div class="credentials">
        <h3>Данные для входа:</h3>
        <p><strong>Сайт:</strong> <a href="https://allcourt.ru/login">https://allcourt.ru/login</a></p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Пароль:</strong> ${password}</p>
      </div>
      
      <p><strong>В личном кабинете вы сможете:</strong></p>
      <ul>
        <li>Управлять своим расписанием работы</li>
        <li>Просматривать бронирования с вашим участием</li>
        <li>Настраивать периоды отпусков и выходных</li>
        <li>Редактировать профессиональную информацию</li>
        <li>Управлять ценами на занятия</li>
      </ul>
      
      <center>
        <a href="https://allcourt.ru/login" class="button">Войти в личный кабинет</a>
      </center>
      
      <p><strong>Важно:</strong> Рекомендуем сменить пароль при первом входе в систему для обеспечения безопасности вашего аккаунта.</p>
      
      <div class="footer">
        <p>Это письмо отправлено автоматически. Пожалуйста, не отвечайте на него.</p>
        <p>По всем вопросам обращайтесь к администратору вашего клуба.</p>
        <p>© 2024 Все Корты. Все права защищены.</p>
      </div>
    </div>
  </div>
</body>
</html>
        `,
        },
      });
      console.log("Email sent to trainer:", email);
    } catch (emailError) {
      console.error("Error sending email to trainer:", emailError);
      // Не прерываем процесс, если email не отправился
    }

    return {
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
      message: "Аккаунт создан. Данные для входа отправлены на email тренера.",
    };
  } catch (error: any) {
    console.error("Ошибка при создании аккаунта тренера:", error);
    if (error.code === "auth/email-already-exists") {
      throw new functions.https.HttpsError("already-exists", "Пользователь с таким email уже существует");
    }
    if (error.code === "auth/invalid-email") {
      throw new functions.https.HttpsError("invalid-argument", "Некорректный email адрес");
    }
    if (error.code === "auth/weak-password") {
      throw new functions.https.HttpsError("invalid-argument", "Пароль слишком слабый");
    }
    throw new functions.https.HttpsError("internal", "Произошла ошибка при создании аккаунта");
  }
});

export const resetTrainerPassword = functions.https.onCall(async (data, context) => {
  // Проверяем авторизацию и права
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Требуется авторизация");
  }

  // Получаем данные админа
  const adminSnapshot = await admin.firestore()
    .collection("admins")
    .where("email", "==", context.auth.token.email)
    .get();

  if (adminSnapshot.empty) {
    throw new functions.https.HttpsError("permission-denied", "Недостаточно прав");
  }

  const adminData = adminSnapshot.docs[0].data();

  // Проверяем, что это админ или суперадмин
  if (!["admin", "superadmin"].includes(adminData.role)) {
    throw new functions.https.HttpsError("permission-denied", "Только администраторы могут менять пароли тренеров");
  }

  const {trainerId, newPassword} = data;

  if (!trainerId || !newPassword || newPassword.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "Необходимы trainerId и newPassword (минимум 6 символов)");
  }

  try {
    // Получаем данные тренера
    const trainerDoc = await admin.firestore()
      .collection("trainers")
      .doc(trainerId)
      .get();

    if (!trainerDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Тренер не найден");
    }

    const trainerData = trainerDoc.data()!;

    // Проверяем, что тренер относится к клубу админа (если не суперадмин)
    if (adminData.role !== "superadmin" && trainerData.clubId !== adminData.venueId) {
      throw new functions.https.HttpsError("permission-denied", "Вы можете менять пароли только тренеров вашего клуба");
    }

    // Находим аккаунт админа для этого тренера
    const trainerAdminSnapshot = await admin.firestore()
      .collection("admins")
      .where("trainerId", "==", trainerId)
      .get();

    if (trainerAdminSnapshot.empty) {
      throw new functions.https.HttpsError("not-found", "Аккаунт тренера не найден");
    }

    const trainerAdminData = trainerAdminSnapshot.docs[0].data();

    // Обновляем пароль в Firebase Auth
    const user = await admin.auth().getUserByEmail(trainerAdminData.email);
    await admin.auth().updateUser(user.uid, {
      password: newPassword,
    });

    // Получаем информацию о клубе
    const venueDoc = await admin.firestore()
      .collection("venues")
      .doc(trainerData.clubId)
      .get();

    const venueData = venueDoc.exists ? venueDoc.data() : null;

    // Отправляем email тренеру с новым паролем
    try {
      await sendEmail({
        to: trainerAdminData.email,
        from: "Все Корты <noreply@allcourt.ru>",
        message: {
          subject: "Изменение пароля в системе Все Корты",
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #00A86B; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: white; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; }
    .credentials { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffc107; }
    .button { display: inline-block; padding: 12px 30px; background: #00A86B; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Изменение пароля</h1>
    </div>
    <div class="content">
      <p>Здравствуйте, ${trainerAdminData.name}!</p>
      
      <p>Администратор клуба "${venueData?.name || "Все Корты"}" изменил пароль для вашего аккаунта.</p>
      
      <div class="credentials">
        <h3>Новые данные для входа:</h3>
        <p><strong>Сайт:</strong> <a href="https://allcourt.ru/login">https://allcourt.ru/login</a></p>
        <p><strong>Email:</strong> ${trainerAdminData.email}</p>
        <p><strong>Новый пароль:</strong> ${newPassword}</p>
      </div>
      
      <center>
        <a href="https://allcourt.ru/login" class="button">Войти в личный кабинет</a>
      </center>
      
      <p><strong>Важно:</strong> Рекомендуем запомнить новый пароль или сохранить его в надежном месте.</p>
      
      <div class="footer">
        <p>Это письмо отправлено автоматически. Пожалуйста, не отвечайте на него.</p>
        <p>По всем вопросам обращайтесь к администратору вашего клуба.</p>
        <p>© 2024 Все Корты. Все права защищены.</p>
      </div>
    </div>
  </div>
</body>
</html>
        `,
        },
      });
      console.log("Password reset email sent to trainer:", trainerAdminData.email);
    } catch (emailError) {
      console.error("Error sending email to trainer:", emailError);
      // Не прерываем процесс, если email не отправился
    }

    return {
      success: true,
      message: "Пароль успешно изменен. Новый пароль отправлен на email тренера.",
    };
  } catch (error: any) {
    console.error("Ошибка при изменении пароля тренера:", error);
    throw new functions.https.HttpsError("internal", "Произошла ошибка при изменении пароля");
  }
});

export const deleteTrainerAccount = functions.https.onCall(async (data, context) => {
  // Проверяем авторизацию и права
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Требуется авторизация");
  }

  // Получаем данные админа
  const adminSnapshot = await admin.firestore()
    .collection("admins")
    .where("email", "==", context.auth.token.email)
    .get();

  if (adminSnapshot.empty) {
    throw new functions.https.HttpsError("permission-denied", "Недостаточно прав");
  }

  const adminData = adminSnapshot.docs[0].data();

  // Проверяем, что это админ или суперадмин
  if (!["admin", "superadmin"].includes(adminData.role)) {
    throw new functions.https.HttpsError("permission-denied", "Только администраторы могут удалять аккаунты тренеров");
  }

  const {trainerId} = data;

  if (!trainerId) {
    throw new functions.https.HttpsError("invalid-argument", "Необходим trainerId");
  }

  try {
    // Получаем данные тренера
    const trainerDoc = await admin.firestore()
      .collection("trainers")
      .doc(trainerId)
      .get();

    if (!trainerDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Тренер не найден");
    }

    const trainerData = trainerDoc.data()!;

    // Проверяем, что тренер относится к клубу админа (если не суперадмин)
    if (adminData.role !== "superadmin" && trainerData.clubId !== adminData.venueId) {
      throw new functions.https.HttpsError("permission-denied", "Вы можете удалять аккаунты только тренеров вашего клуба");
    }

    // Находим аккаунт админа для этого тренера
    const trainerAdminSnapshot = await admin.firestore()
      .collection("admins")
      .where("trainerId", "==", trainerId)
      .get();

    if (trainerAdminSnapshot.empty) {
      throw new functions.https.HttpsError("not-found", "Аккаунт тренера не найден");
    }

    const trainerAdminData = trainerAdminSnapshot.docs[0].data();

    // Удаляем пользователя из Firebase Auth
    try {
      const user = await admin.auth().getUserByEmail(trainerAdminData.email);
      await admin.auth().deleteUser(user.uid);
    } catch (authError) {
      console.error("Ошибка при удалении пользователя из Auth:", authError);
    }

    // Удаляем запись админа
    await trainerAdminSnapshot.docs[0].ref.delete();

    // Обновляем запись тренера
    await admin.firestore()
      .collection("trainers")
      .doc(trainerId)
      .update({
        hasAccount: false,
        accountDeletedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return {
      success: true,
      message: "Аккаунт тренера успешно удален",
    };
  } catch (error: any) {
    console.error("Ошибка при удалении аккаунта тренера:", error);
    throw new functions.https.HttpsError("internal", "Произошла ошибка при удалении аккаунта");
  }
});
