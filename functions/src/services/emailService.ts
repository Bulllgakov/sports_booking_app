import * as admin from "firebase-admin";

/**
 * Отправка email через Firebase Extension (firestore-send-email)
 * Документы добавляются в коллекцию 'mail' и обрабатываются расширением
 */

interface EmailData {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  from?: string;
  replyTo?: string;
  message: {
    subject: string;
    text?: string;
    html?: string;
    attachments?: any[];
  };
  template?: {
    name: string;
    data: Record<string, any>;
  };
}

/**
 * Отправка email через Firebase Extension
 * @param {EmailData} emailData - Данные для отправки
 * @return {Promise<string>} ID документа в коллекции mail
 */
export async function sendEmail(emailData: EmailData): Promise<string> {
  try {
    const mailRef = await admin.firestore().collection("mail").add({
      ...emailData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("Email queued for sending:", mailRef.id);
    return mailRef.id;
  } catch (error) {
    console.error("Error queuing email:", error);
    throw error;
  }
}

/**
 * Отправка уведомления о бронировании клиенту
 * @param {any} booking - Данные бронирования
 * @return {Promise<void>}
 */
export async function sendBookingConfirmationToCustomer(booking: any): Promise<void> {
  if (!booking.customerEmail) {
    console.log("No customer email provided, skipping email notification");
    return;
  }

  const emailData: EmailData = {
    to: booking.customerEmail,
    message: {
      subject: `Подтверждение бронирования - ${booking.courtName}`,
      html: generateCustomerEmailHTML(booking),
    },
  };

  await sendEmail(emailData);
}

/**
 * Отправка уведомления о бронировании администратору
 * @param {any} booking - Данные бронирования
 * @param {string} adminEmail - Email администратора
 * @return {Promise<void>}
 */
export async function sendBookingNotificationToAdmin(booking: any, adminEmail: string): Promise<void> {
  const emailData: EmailData = {
    to: adminEmail,
    message: {
      subject: `Новое бронирование - ${booking.courtName} на ${formatDate(booking.date)}`,
      html: generateAdminEmailHTML(booking),
    },
  };

  await sendEmail(emailData);
}

/**
 * Генерация HTML для письма клиенту
 * @param {any} booking - Данные бронирования
 * @return {string} HTML контент
 */
function generateCustomerEmailHTML(booking: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
    .content {
      padding: 40px 30px;
    }
    .booking-details {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      padding: 5px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: 600;
      color: #666;
    }
    .value {
      color: #333;
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
      <h1>🎾 Бронирование подтверждено!</h1>
    </div>
    
    <div class="content">
      <p>Здравствуйте, ${booking.customerName}!</p>
      
      <p>Ваше бронирование успешно оформлено. Ниже приведены детали:</p>
      
      <div class="booking-details">
        <h3 style="margin-top: 0;">Информация о бронировании</h3>
        
        <div class="detail-row">
          <span class="label">Клуб:</span>
          <span class="value">${booking.venueName}</span>
        </div>
        
        <div class="detail-row">
          <span class="label">Корт:</span>
          <span class="value">${booking.courtName}</span>
        </div>
        
        <div class="detail-row">
          <span class="label">Дата:</span>
          <span class="value">${formatDate(booking.date)}</span>
        </div>
        
        <div class="detail-row">
          <span class="label">Время:</span>
          <span class="value">${booking.startTime} - ${booking.endTime}</span>
        </div>
        
        <div class="detail-row">
          <span class="label">Длительность:</span>
          <span class="value">${booking.duration} минут</span>
        </div>
        
        <div class="detail-row">
          <span class="label">Тип игры:</span>
          <span class="value">${booking.gameType === "single" ? "Индивидуальная" : "Открытая"}</span>
        </div>
        
        <div class="detail-row">
          <span class="label">Стоимость:</span>
          <span class="value" style="font-size: 18px; font-weight: bold; color: #00A86B;">
            ${booking.amount} ₽
          </span>
        </div>
        
        <div class="detail-row">
          <span class="label">Номер бронирования:</span>
          <span class="value">${booking.id}</span>
        </div>
      </div>
      
      <p>Сохраните это письмо для предъявления администратору клуба.</p>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Если у вас возникли вопросы или вам нужно отменить бронирование, 
        пожалуйста, свяжитесь с администратором клуба.
      </p>
    </div>
    
    <div class="footer">
      <p>© 2024 Все Корты. Все права защищены.</p>
      <p>Это автоматическое письмо. Пожалуйста, не отвечайте на него.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Генерация HTML для письма администратору
 * @param {any} booking - Данные бронирования
 * @return {string} HTML контент
 */
function generateAdminEmailHTML(booking: any): string {
  return `
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
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .booking-card {
      background: #f8f9fa;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .detail-row {
      margin: 8px 0;
    }
    .label {
      font-weight: bold;
      display: inline-block;
      width: 150px;
    }
    .highlight {
      background: #ffeb3b;
      padding: 2px 6px;
      border-radius: 3px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>🎾 Новое бронирование</h2>
    
    <div class="booking-card">
      <div class="detail-row">
        <span class="label">Клиент:</span>
        <span class="highlight">${booking.customerName}</span>
      </div>
      
      <div class="detail-row">
        <span class="label">Телефон:</span>
        ${booking.customerPhone}
      </div>
      
      <div class="detail-row">
        <span class="label">Корт:</span>
        ${booking.courtName}
      </div>
      
      <div class="detail-row">
        <span class="label">Дата:</span>
        <strong>${formatDate(booking.date)}</strong>
      </div>
      
      <div class="detail-row">
        <span class="label">Время:</span>
        <strong>${booking.startTime} - ${booking.endTime}</strong> (${booking.duration} мин)
      </div>
      
      <div class="detail-row">
        <span class="label">Тип игры:</span>
        ${booking.gameType === "single" ? "Индивидуальная" : "Открытая"}
      </div>
      
      <div class="detail-row">
        <span class="label">Стоимость:</span>
        <strong style="color: #00A86B; font-size: 18px;">${booking.amount} ₽</strong>
      </div>
      
      <div class="detail-row">
        <span class="label">Способ оплаты:</span>
        ${getPaymentMethodText(booking.paymentMethod)}
      </div>
      
      <div class="detail-row">
        <span class="label">ID бронирования:</span>
        <code>${booking.id}</code>
      </div>
    </div>
    
    <p style="text-align: center; margin-top: 30px;">
      <a href="https://allcourt.ru/admin/bookings" 
         style="background: #00A86B; color: white; padding: 10px 20px; 
                text-decoration: none; border-radius: 5px; display: inline-block;">
        Открыть в админ-панели
      </a>
    </p>
  </div>
</body>
</html>`;
}

/**
 * Форматирование даты
 * @param {string} dateString - Строка с датой
 * @return {string} Отформатированная дата
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString("ru-RU", options);
}

/**
 * Получение текста способа оплаты
 * @param {string} method - Код способа оплаты
 * @return {string} Текстовое описание
 */
function getPaymentMethodText(method: string): string {
  const methods: Record<string, string> = {
    online: "Онлайн оплата",
    cash: "Наличные",
    online_payment: "Оплачено онлайн",
    pay_at_venue: "Оплата в клубе",
  };
  return methods[method] || method;
}

/**
 * Проверка статуса отправки email
 * @param {string} mailDocId - ID документа в коллекции mail
 * @return {Promise<any>} Информация о доставке
 */
export async function checkEmailStatus(mailDocId: string): Promise<any> {
  try {
    const mailDoc = await admin.firestore().collection("mail").doc(mailDocId).get();

    if (!mailDoc.exists) {
      throw new Error("Email document not found");
    }

    const data = mailDoc.data();
    return {
      id: mailDocId,
      status: data?.delivery?.state || "PENDING",
      error: data?.delivery?.error,
      info: data?.delivery?.info,
      attempts: data?.delivery?.attempts || 0,
    };
  } catch (error) {
    console.error("Error checking email status:", error);
    throw error;
  }
}

