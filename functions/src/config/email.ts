import * as functions from "firebase-functions";
import * as nodemailer from "nodemailer";

// Получаем email конфигурацию из переменных окружения
const emailConfig = {
  user: functions.config().email?.user || "noreply@allcourt.ru",
  pass: functions.config().email?.password || "",
  fromName: functions.config().email?.from_name || "Все Корты",
};

// Создаем единый transporter для всех email
export const emailTransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: emailConfig.user,
    pass: emailConfig.pass,
  },
});

// Формируем правильный адрес отправителя
export const getFromAddress = () => {
  // Если используется Gmail, FROM должен совпадать с auth.user
  if (emailConfig.user.includes("@gmail.com")) {
    return `${emailConfig.fromName} <${emailConfig.user}>`;
  }

  // Для других провайдеров можно использовать кастомный FROM
  return `${emailConfig.fromName} <noreply@allcourt.ru>`;
};

// Экспортируем конфигурацию для использования в других местах
export {emailConfig};

