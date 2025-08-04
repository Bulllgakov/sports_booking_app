import * as crypto from "crypto";
import axios from "axios";
import * as admin from "firebase-admin";

// Интерфейсы для Т-Банк API
interface TBankConfig {
  terminalKey: string;
  password: string;
  testMode: boolean;
}

interface TBankInitRequest {
  Amount: number;
  OrderId: string;
  Description?: string;
  CustomerKey?: string;
  Recurrent?: "Y" | "N";
  PayType?: "O" | "T";
  SuccessURL?: string;
  FailURL?: string;
  NotificationURL?: string;
  DATA?: Record<string, string>;
}

interface TBankInitResponse {
  Success: boolean;
  ErrorCode: string;
  TerminalKey?: string;
  Status?: string;
  PaymentId?: string;
  OrderId?: string;
  Amount?: number;
  PaymentURL?: string;
  Message?: string;
  Details?: string;
}

interface TBankChargeRequest {
  PaymentId: string;
  RebillId: string;
  Amount?: number;
  OrderId?: string;
  Description?: string;
  DATA?: Record<string, string>;
}

interface TBankChargeResponse {
  Success: boolean;
  ErrorCode: string;
  TerminalKey?: string;
  Status?: string;
  PaymentId?: string;
  OrderId?: string;
  Amount?: number;
  Message?: string;
  Details?: string;
}

/**
 * Класс для работы с API Т-Банк
 */
export class TBankAPI {
  private config: TBankConfig;
  private baseURL: string;

  /**
   * Конструктор класса TBankAPI
   * @param {TBankConfig} config - Конфигурация для API Т-Банк
   */
  constructor(config: TBankConfig) {
    this.config = config;
    this.baseURL = config.testMode ?
      "https://rest-api-test.tinkoff.ru/v2" :
      "https://securepay.tinkoff.ru/v2";
  }

  /**
   * Генерация токена для подписи запроса
   * @param {Record<string, any>} params - Параметры запроса
   * @return {string} - Сгенерированный токен
   */
  public generateToken(params: Record<string, any>): string {
    // Добавляем TerminalKey и Password
    const tokenParams: Record<string, any> = {
      ...params,
      TerminalKey: this.config.terminalKey,
      Password: this.config.password,
    };

    // Удаляем Token из параметров если есть
    delete tokenParams["Token"];

    // Сортируем ключи
    const sortedKeys = Object.keys(tokenParams).sort();

    // Конкатенируем значения
    const concatenated = sortedKeys
      .map((key) => String(tokenParams[key]))
      .join("");

    // Создаем SHA-256 хэш
    return crypto
      .createHash("sha256")
      .update(concatenated)
      .digest("hex");
  }

  /**
   * Инициализация платежа
   * @param {TBankInitRequest} request - Параметры инициализации
   * @return {Promise<TBankInitResponse>} - Ответ от API
   */
  async initPayment(request: TBankInitRequest): Promise<TBankInitResponse> {
    const params: any = {
      ...request,
      TerminalKey: this.config.terminalKey,
    };

    // Генерируем токен
    params["Token"] = this.generateToken(params);

    try {
      const response = await axios.post(
        `${this.baseURL}/Init`,
        params,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("TBank Init error:", error.response?.data || error.message);
      throw new Error(`Payment initialization failed: ${error.response?.data?.Message || error.message}`);
    }
  }

  /**
   * Рекуррентный платеж
   * @param {TBankChargeRequest} request - Параметры рекуррентного платежа
   * @return {Promise<TBankChargeResponse>} - Ответ от API
   */
  async chargePayment(request: TBankChargeRequest): Promise<TBankChargeResponse> {
    const params: any = {
      ...request,
      TerminalKey: this.config.terminalKey,
    };

    // Генерируем токен
    params["Token"] = this.generateToken(params);

    try {
      const response = await axios.post(
        `${this.baseURL}/Charge`,
        params,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("TBank Charge error:", error.response?.data || error.message);
      throw new Error(`Recurring payment failed: ${error.response?.data?.Message || error.message}`);
    }
  }

  /**
   * Проверка статуса платежа
   * @param {string} paymentId - ID платежа
   * @return {Promise<any>} - Статус платежа
   */
  async getPaymentStatus(paymentId: string): Promise<any> {
    const params: any = {
      PaymentId: paymentId,
      TerminalKey: this.config.terminalKey,
    };

    params["Token"] = this.generateToken(params);

    try {
      const response = await axios.post(
        `${this.baseURL}/GetState`,
        params,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("TBank GetState error:", error.response?.data || error.message);
      throw new Error(`Get payment status failed: ${error.response?.data?.Message || error.message}`);
    }
  }

  /**
   * Проверка подписи уведомления от Т-Банк
   * @param {any} notification - Уведомление от Т-Банк
   * @return {boolean} - Результат проверки подписи
   */
  verifyNotification(notification: any): boolean {
    const params = {...notification};
    const receivedToken = params.Token;
    delete params.Token;

    const calculatedToken = this.generateToken(params);
    return receivedToken === calculatedToken;
  }
}

/**
 * Загрузка конфигурации из Firestore
 * @return {Promise<TBankConfig>} - Конфигурация Т-Банк
 */
/**
 * Обработка возврата платежа через Т-Банк
 * @param {string} terminalKey - Терминальный ключ
 * @param {string} password - Пароль
 * @param {string} paymentId - ID платежа
 * @param {number} amount - Сумма возврата в рублях
 * @return {Promise<{success: boolean; refundId?: string; error?: string}>}
 */
export async function processTBankRefund(
  terminalKey: string,
  password: string,
  paymentId: string,
  amount: number
): Promise<{success: boolean; refundId?: string; error?: string}> {
  try {
    const tbank = new TBankAPI({terminalKey, password, testMode: false});
    const params = {
      TerminalKey: terminalKey,
      PaymentId: paymentId,
      Amount: Math.round(amount * 100), // Конвертируем в копейки
    };

    // Генерируем токен (подпись)
    const token = tbank.generateToken(params);

    const response = await fetch("https://securepay.tinkoff.ru/v2/Cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...params,
        Token: token,
      }),
    });

    const responseData = await response.json();

    if (!response.ok || !responseData.Success) {
      console.error("T-Bank refund error:", responseData);
      return {
        success: false,
        error: responseData.Message || responseData.Details || "Ошибка при создании возврата",
      };
    }

    return {
      success: true,
      refundId: responseData.PaymentId,
    };
  } catch (error) {
    console.error("Error processing T-Bank refund:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

export async function getTBankConfig(): Promise<TBankConfig> {
  const doc = await admin.firestore()
    .collection("settings")
    .doc("billing")
    .get();

  if (!doc.exists) {
    throw new Error("Billing settings not configured");
  }

  const data = doc.data();
  if (!data?.tbank?.terminalKey || !data?.tbank?.password) {
    throw new Error("TBank credentials not configured");
  }

  return {
    terminalKey: data.tbank.terminalKey,
    password: data.tbank.password,
    testMode: data.tbank.testMode || false,
  };
}

