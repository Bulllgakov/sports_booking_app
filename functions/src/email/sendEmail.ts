import * as nodemailer from "nodemailer";
import * as admin from "firebase-admin";

const db = admin.firestore();

// Создаем транспорт для отправки писем
const transporter = nodemailer.createTransport({
  host: "smtp.timeweb.ru",
  port: 465,
  secure: true,
  auth: {
    user: "noreply@allcourt.ru",
    pass: "v3H2OO139",
  },
});

/**
 * Функция для обработки писем из коллекции mail
 */
export async function processEmailQueue() {
  try {
    // Получаем письма со статусом PROCESSING
    const snapshot = await db.collection("mail")
      .where("delivery.state", "==", "PROCESSING")
      .limit(5)
      .get();

    const promises = snapshot.docs.map(async (doc: any) => {
      const emailData = doc.data();

      try {
        // Отправляем письмо
        const info = await transporter.sendMail({
          from: emailData.from || "Все Корты <noreply@allcourt.ru>",
          to: emailData.to,
          subject: emailData.message?.subject || "Без темы",
          text: emailData.message?.text || "",
          html: emailData.message?.html || emailData.message?.text || "",
        });

        // Обновляем статус
        await doc.ref.update({
          "delivery.state": "SUCCESS",
          "delivery.endTime": new Date(),
          "delivery.info": {
            messageId: info.messageId,
            accepted: info.accepted,
            response: info.response,
          },
        });

        console.log("Email sent successfully:", doc.id);
      } catch (error: any) {
        // Обновляем статус с ошибкой
        await doc.ref.update({
          "delivery.state": "ERROR",
          "delivery.error": error.message,
          "delivery.endTime": new Date(),
          "delivery.attempts": (emailData.delivery?.attempts || 0) + 1,
        });

        console.error("Error sending email:", doc.id, error);
      }
    });

    await Promise.all(promises);
  } catch (error) {
    console.error("Error processing email queue:", error);
  }
}

