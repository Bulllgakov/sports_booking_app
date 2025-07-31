import * as crypto from "crypto";
import axios from "axios";

// Интерфейсы для YooKassa API
interface YooKassaConfig {
  shopId: string;
  secretKey: string;
  testMode: boolean;
}

interface YooKassaPaymentRequest {
  amount: {
    value: string;
    currency: string;
  };
  payment_method_data?: {
    type: string;
  };
  confirmation: {
    type: string;
    return_url: string;
  };
  capture: boolean;
  description?: string;
  metadata?: Record<string, any>;
  save_payment_method?: boolean;
}

interface YooKassaPaymentResponse {
  id: string;
  status: string;
  amount: {
    value: string;
    currency: string;
  };
  description?: string;
  confirmation?: {
    type: string;
    confirmation_url?: string;
  };
  created_at: string;
  expires_at?: string;
  metadata?: Record<string, any>;
  payment_method?: {
    id: string;
    type: string;
    saved: boolean;
  };
}

/**
 * Класс для работы с API YooKassa
 */
export class YooKassaAPI {
  private config: YooKassaConfig;
  private baseURL = "https://api.yookassa.ru/v3";

  /**
   * Конструктор класса YooKassaAPI
   * @param {YooKassaConfig} config - Конфигурация для API YooKassa
   */
  constructor(config: YooKassaConfig) {
    this.config = config;
  }

  /**
   * Получение заголовков для запроса
   * @return {Record<string, string>} - Заголовки
   */
  private getHeaders(): Record<string, string> {
    const auth = Buffer.from(`${this.config.shopId}:${this.config.secretKey}`).toString("base64");
    return {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Создание платежа
   * @param {YooKassaPaymentRequest} request - Параметры платежа
   * @return {Promise<YooKassaPaymentResponse>} - Ответ от API
   */
  async createPayment(request: YooKassaPaymentRequest): Promise<YooKassaPaymentResponse> {
    try {
      const idempotenceKey = crypto.randomBytes(16).toString("hex");
      
      const response = await axios.post(
        `${this.baseURL}/payments`,
        request,
        {
          headers: {
            ...this.getHeaders(),
            "Idempotence-Key": idempotenceKey,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("YooKassa Create Payment error:", error.response?.data || error.message);
      throw new Error(`Payment creation failed: ${error.response?.data?.description || error.message}`);
    }
  }

  /**
   * Получение информации о платеже
   * @param {string} paymentId - ID платежа
   * @return {Promise<YooKassaPaymentResponse>} - Информация о платеже
   */
  async getPayment(paymentId: string): Promise<YooKassaPaymentResponse> {
    try {
      const response = await axios.get(
        `${this.baseURL}/payments/${paymentId}`,
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("YooKassa Get Payment error:", error.response?.data || error.message);
      throw new Error(`Get payment failed: ${error.response?.data?.description || error.message}`);
    }
  }

  /**
   * Подтверждение платежа
   * @param {string} paymentId - ID платежа
   * @param {string} amount - Сумма для подтверждения
   * @return {Promise<YooKassaPaymentResponse>} - Ответ от API
   */
  async capturePayment(paymentId: string, amount: string): Promise<YooKassaPaymentResponse> {
    try {
      const idempotenceKey = crypto.randomBytes(16).toString("hex");
      
      const response = await axios.post(
        `${this.baseURL}/payments/${paymentId}/capture`,
        {
          amount: {
            value: amount,
            currency: "RUB",
          },
        },
        {
          headers: {
            ...this.getHeaders(),
            "Idempotence-Key": idempotenceKey,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("YooKassa Capture Payment error:", error.response?.data || error.message);
      throw new Error(`Payment capture failed: ${error.response?.data?.description || error.message}`);
    }
  }

  /**
   * Отмена платежа
   * @param {string} paymentId - ID платежа
   * @return {Promise<YooKassaPaymentResponse>} - Ответ от API
   */
  async cancelPayment(paymentId: string): Promise<YooKassaPaymentResponse> {
    try {
      const idempotenceKey = crypto.randomBytes(16).toString("hex");
      
      const response = await axios.post(
        `${this.baseURL}/payments/${paymentId}/cancel`,
        {},
        {
          headers: {
            ...this.getHeaders(),
            "Idempotence-Key": idempotenceKey,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("YooKassa Cancel Payment error:", error.response?.data || error.message);
      throw new Error(`Payment cancellation failed: ${error.response?.data?.description || error.message}`);
    }
  }

  /**
   * Создание возврата
   * @param {string} paymentId - ID платежа
   * @param {string} amount - Сумма возврата
   * @return {Promise<any>} - Ответ от API
   */
  async createRefund(paymentId: string, amount: string): Promise<any> {
    try {
      const idempotenceKey = crypto.randomBytes(16).toString("hex");
      
      const response = await axios.post(
        `${this.baseURL}/refunds`,
        {
          payment_id: paymentId,
          amount: {
            value: amount,
            currency: "RUB",
          },
        },
        {
          headers: {
            ...this.getHeaders(),
            "Idempotence-Key": idempotenceKey,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("YooKassa Create Refund error:", error.response?.data || error.message);
      throw new Error(`Refund creation failed: ${error.response?.data?.description || error.message}`);
    }
  }

  /**
   * Проверка подписи уведомления от YooKassa
   * @param {any} notification - Уведомление от YooKassa
   * @param {string} signature - Подпись из заголовка
   * @return {boolean} - Результат проверки подписи
   */
  verifyWebhook(notification: any, signature: string): boolean {
    try {
      const json = JSON.stringify(notification);
      const expectedSignature = crypto
        .createHmac("sha256", this.config.secretKey)
        .update(json)
        .digest("base64");
      
      return signature === expectedSignature;
    } catch (error) {
      console.error("YooKassa Webhook verification error:", error);
      return false;
    }
  }
}