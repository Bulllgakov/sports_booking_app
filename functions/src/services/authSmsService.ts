import * as admin from "firebase-admin";
import {SMSService} from "./smsService";
import {SMSTemplatesSettings} from "../types/smsTemplates";

export class AuthSMSService {
  private smsService: SMSService;

  constructor() {
    this.smsService = new SMSService();
  }

  /**
   * Генерирует случайный 6-значный код
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Отправляет SMS с кодом авторизации
   */
  async sendAuthCode(phone: string): Promise<{success: boolean; codeId?: string}> {
    try {
      const db = admin.firestore();

      // Получаем настройки SMS шаблонов
      const templatesDoc = await db.collection("settings").doc("smsTemplates").get();
      const templates = templatesDoc.data() as SMSTemplatesSettings | undefined;

      if (!templates?.authCode?.enabled) {
        console.log("Auth code SMS is disabled");
        return {success: false};
      }

      // Генерируем код
      const code = this.generateCode();

      // Заменяем переменные в шаблоне
      const message = templates.authCode.template.replace("{code}", code);

      // Нормализуем телефон
      const normalizedPhone = this.normalizePhone(phone);

      // Сохраняем код в базе данных с TTL 5 минут
      const codeDoc = await db.collection("sms_auth_codes").add({
        phone: normalizedPhone,
        code: code,
        attempts: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 минут
      });

      // Отправляем SMS
      const success = await this.smsService.sendSMS(normalizedPhone, message);

      if (success) {
        // Логируем отправку
        await db.collection("sms_logs").add({
          type: "auth_code",
          phone: normalizedPhone,
          message: message,
          success: true,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {success: true, codeId: codeDoc.id};
      } else {
        // Удаляем код если SMS не отправилось
        await codeDoc.delete();
        return {success: false};
      }
    } catch (error) {
      console.error("Error sending auth code SMS:", error);
      return {success: false};
    }
  }

  /**
   * Проверяет код авторизации
   */
  async verifyAuthCode(phone: string, code: string): Promise<boolean> {
    try {
      const db = admin.firestore();
      const normalizedPhone = this.normalizePhone(phone);

      // Ищем активный код для этого телефона
      const codesQuery = await db.collection("sms_auth_codes")
        .where("phone", "==", normalizedPhone)
        .where("code", "==", code)
        .where("expiresAt", ">", new Date())
        .orderBy("expiresAt", "desc")
        .limit(1)
        .get();

      if (codesQuery.empty) {
        return false;
      }

      const codeDoc = codesQuery.docs[0];
      const codeData = codeDoc.data();

      // Проверяем количество попыток
      if (codeData.attempts >= 3) {
        console.log(`Too many attempts for code ${codeDoc.id}`);
        return false;
      }

      // Увеличиваем счетчик попыток
      await codeDoc.ref.update({
        attempts: admin.firestore.FieldValue.increment(1),
        lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Если код правильный, помечаем как использованный
      await codeDoc.ref.update({
        verified: true,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Удаляем все другие коды для этого телефона
      const allCodesQuery = await db.collection("sms_auth_codes")
        .where("phone", "==", normalizedPhone)
        .get();

      const batch = db.batch();
      allCodesQuery.docs.forEach((doc) => {
        if (doc.id !== codeDoc.id) {
          batch.delete(doc.ref);
        }
      });
      await batch.commit();

      return true;
    } catch (error) {
      console.error("Error verifying auth code:", error);
      return false;
    }
  }

  /**
   * Нормализует телефонный номер
   */
  private normalizePhone(phone: string): string {
    // Удаляем все нецифровые символы
    let normalized = phone.replace(/\D/g, "");

    // Если номер начинается с 8, заменяем на 7
    if (normalized.startsWith("8") && normalized.length === 11) {
      normalized = "7" + normalized.substring(1);
    }

    // Если номер не начинается с 7, добавляем
    if (!normalized.startsWith("7")) {
      normalized = "7" + normalized;
    }

    return normalized;
  }
}
