import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

// Интерфейс для SMS провайдеров
interface SMSProvider {
  sendSMS(phone: string, message: string): Promise<boolean>;
}

// SMS.RU провайдер
class SMSRuProvider implements SMSProvider {
  private apiId: string;
  private baseUrl = "https://sms.ru/sms/send";

  constructor(apiId: string) {
    this.apiId = apiId;
  }

  async sendSMS(phone: string, message: string): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        api_id: this.apiId,
        to: phone,
        msg: message,
        json: "1",
      });

      const response = await fetch(`${this.baseUrl}?${params}`, {
        method: "GET",
      });

      const data = await response.json() as Record<string, unknown>;

      if (data.status === "OK") {
        console.log(`SMS sent successfully to ${phone}`);
        return true;
      } else {
        console.error("SMS.RU error:", data);
        return false;
      }
    } catch (error) {
      console.error("Error sending SMS via SMS.RU:", error);
      return false;
    }
  }
}


// Главный класс для работы с SMS
export class SMSService {
  private provider: SMSProvider | null = null;
  private isTestMode = false;
  private initialized = false;

  // Инициализация сервиса с настройками из Firestore
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Получаем настройки из Firestore
      const settingsDoc = await admin.firestore()
        .collection("settings")
        .doc("sms")
        .get();

      if (settingsDoc.exists) {
        const settings = settingsDoc.data()!;
        this.isTestMode = settings.testMode === true;

        if (this.isTestMode) {
          console.log("SMS Service running in TEST MODE");
        } else if (settings.smsruApiId) {
          this.provider = new SMSRuProvider(settings.smsruApiId);
          console.log("Using SMS.RU provider from Firestore settings");
        }
      } else {
        // Fallback на config если нет настроек в Firestore
        const config = functions.config();
        this.isTestMode = config.sms?.test_mode === "true";

        if (this.isTestMode) {
          console.log("SMS Service running in TEST MODE (from config)");
        } else if (config.sms?.smsru_api_id) {
          this.provider = new SMSRuProvider(config.sms.smsru_api_id);
          console.log("Using SMS.RU provider from config");
        }
      }

      if (!this.provider && !this.isTestMode) {
        console.warn("No SMS provider configured, running in test mode");
        this.isTestMode = true;
      }

      this.initialized = true;
    } catch (error) {
      console.error("Error initializing SMS service:", error);
      this.isTestMode = true;
      this.initialized = true;
    }
  }

  // Отправка SMS с кодом верификации
  async sendVerificationCode(phone: string, code: string): Promise<boolean> {
    await this.initialize();
    const message = `Ваш код подтверждения для Все Корты: ${code}`;
    return this.sendSMS(phone, message);
  }

  // Отправка уведомления о новом бронировании
  async sendBookingConfirmation(phone: string, booking: {
    venueName: string;
    courtName: string;
    date: string;
    time: string;
    totalPrice: number;
  }): Promise<boolean> {
    await this.initialize();
    const message = `Бронирование подтверждено!\n${booking.venueName}, ${booking.courtName}\n` +
      `${booking.date} в ${booking.time}\nСтоимость: ${booking.totalPrice}₽`;
    return this.sendSMS(phone, message);
  }

  // Отправка напоминания о предстоящей игре
  async sendBookingReminder(phone: string, booking: {
    venueName: string;
    time: string;
  }): Promise<boolean> {
    await this.initialize();
    const message = `Напоминание: у вас игра сегодня в ${booking.time} в ${booking.venueName}`;
    return this.sendSMS(phone, message);
  }

  // Отправка уведомления об отмене
  async sendCancellationNotice(phone: string, booking: {
    venueName: string;
    date: string;
    time: string;
  }): Promise<boolean> {
    await this.initialize();
    const message = `Ваше бронирование отменено: ${booking.venueName}, ${booking.date} в ${booking.time}`;
    return this.sendSMS(phone, message);
  }

  // Отправка уведомления о возврате средств
  async sendRefundNotice(phone: string, amount: number): Promise<boolean> {
    await this.initialize();
    const message = `Возврат средств: ${amount}₽ будут возвращены на вашу карту в течение 3-5 рабочих дней`;
    return this.sendSMS(phone, message);
  }

  // Тестовая отправка SMS
  async sendTestSMS(phone: string): Promise<boolean> {
    await this.initialize();
    const message = "Тестовое сообщение от Все Корты";
    return this.sendSMS(phone, message);
  }

  // Базовый метод отправки SMS
  async sendSMS(phone: string, message: string): Promise<boolean> {
    // Нормализуем номер телефона
    const normalizedPhone = this.normalizePhone(phone);

    if (!this.isValidPhone(normalizedPhone)) {
      console.error(`Invalid phone number: ${phone}`);
      return false;
    }

    if (this.isTestMode) {
      console.log(`[TEST MODE] SMS to ${normalizedPhone}: ${message}`);

      // Сохраняем в логи для тестирования
      await admin.firestore().collection("smsLogs").add({
        phone: normalizedPhone,
        message,
        testMode: true,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return true;
    }

    try {
      const result = await this.provider!.sendSMS(normalizedPhone, message);

      // Логируем отправку
      await admin.firestore().collection("smsLogs").add({
        phone: normalizedPhone,
        message,
        success: result,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Обновляем счетчик
      await admin.firestore().collection("stats").doc("sms").set({
        sent: admin.firestore.FieldValue.increment(1),
        lastSent: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});

      return result;
    } catch (error) {
      console.error("Error sending SMS:", error);

      // Логируем ошибку
      await admin.firestore().collection("smsLogs").add({
        phone: normalizedPhone,
        message,
        success: false,
        error: String(error),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return false;
    }
  }

  // Нормализация номера телефона
  private normalizePhone(phone: string): string {
    // Удаляем все нецифровые символы
    let normalized = phone.replace(/\D/g, "");

    // Если номер начинается с 8, заменяем на 7
    if (normalized.startsWith("8") && normalized.length === 11) {
      normalized = "7" + normalized.substring(1);
    }

    // Если номер не начинается с 7, добавляем
    if (!normalized.startsWith("7") && normalized.length === 10) {
      normalized = "7" + normalized;
    }

    return normalized;
  }

  // Валидация номера телефона
  private isValidPhone(phone: string): boolean {
    // Проверяем, что номер содержит 11 цифр и начинается с 7
    return /^7\d{10}$/.test(phone);
  }
}

// Экспортируем синглтон
export const smsService = new SMSService();

