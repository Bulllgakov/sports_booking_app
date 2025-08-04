import * as crypto from "crypto";
import axios from "axios";
import {v4 as uuidv4} from "uuid";

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
  receipt?: {
    customer: {
      email?: string;
      phone?: string;
    };
    items: Array<{
      description: string;
      quantity: string;
      amount: {
        value: string;
        currency: string;
      };
      vat_code: number;
      payment_mode?: string;
      payment_subject?: string;
    }>;
  };
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

      // В тестовом режиме YooKassa может требовать специальный заголовок
      const headers: Record<string, string> = {
        ...this.getHeaders(),
        "Idempotence-Key": idempotenceKey,
      };

      // Добавляем тестовый режим в заголовки если включен
      if (this.config.testMode) {
        headers["X-Test-Mode"] = "true";
      }

      console.log("YooKassa API request:", {
        url: `${this.baseURL}/payments`,
        testMode: this.config.testMode,
        shopId: this.config.shopId,
      });

      const response = await axios.post(
        `${this.baseURL}/payments`,
        request,
        {headers}
      );

      console.log("YooKassa API response:", {
        status: response.status,
        id: response.data?.id,
        paymentStatus: response.data?.status,
        confirmationUrl: response.data?.confirmation?.confirmation_url,
      });

      return response.data;
    } catch (error: any) {
      console.error("YooKassa Create Payment error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
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

/**
 * Создание возврата платежа через YooKassa
 * @param {string} shopId - ID магазина
 * @param {string} secretKey - Секретный ключ
 * @param {string} paymentId - ID платежа для возврата
 * @param {number} amount - Сумма возврата
 * @param {string} reason - Причина возврата
 * @return {Promise<{success: boolean; refundId?: string; error?: string}>}
 */
export async function createRefund(
  shopId: string,
  secretKey: string,
  paymentId: string,
  amount: number,
  reason: string
): Promise<{success: boolean; refundId?: string; error?: string}> {
  try {
    const refundData = {
      payment_id: paymentId,
      amount: {
        value: amount.toFixed(2),
        currency: "RUB",
      },
      description: reason,
    };

    const authString = Buffer.from(`${shopId}:${secretKey}`).toString("base64");

    const response = await fetch("https://api.yookassa.ru/v3/refunds", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Type": "application/json",
        "Idempotence-Key": uuidv4(),
      },
      body: JSON.stringify(refundData),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("YooKassa refund error:", responseData);
      return {
        success: false,
        error: responseData.description || "Ошибка при создании возврата",
      };
    }

    return {
      success: true,
      refundId: responseData.id,
    };
  } catch (error) {
    console.error("Error creating YooKassa refund:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}
