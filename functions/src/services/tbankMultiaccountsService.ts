import axios from 'axios';
import * as functions from 'firebase-functions';
import { getTBankConfig, generateTBankToken, formatAmountForTBank } from '../config/tbankConfig';

/**
 * Сервис для работы с API Т-Банка Мультирасчеты (E2C - E-commerce to Consumer)
 */
export class TBankMultiaccountsService {
  private config = getTBankConfig();
  
  /**
   * Инициализация платежа через Мультирасчеты
   */
  async initPayment(params: {
    amount: number;
    orderId: string;
    description: string;
    customerEmail: string;
    customerPhone?: string;
    successUrl: string;
    failUrl: string;
    shops: Array<{
      shopCode: string;      // ID клуба в нашей системе
      amount: number;        // Сумма для клуба (за вычетом комиссии платформы)
      name: string;          // Название клуба
      fee?: number;          // Комиссия платформы (если нужно показать отдельно)
    }>;
  }) {
    try {
      const requestData = {
        TerminalKey: this.config.terminalKeyE2C,
        Amount: formatAmountForTBank(params.amount),
        OrderId: params.orderId,
        Description: params.description,
        CustomerKey: params.customerEmail,
        SuccessURL: params.successUrl,
        FailURL: params.failUrl,
        NotificationURL: `${functions.config().app?.url || 'https://allcourt.ru'}/api/webhooks/tbank-multiaccounts`,
        
        // Данные о магазинах (получателях)
        Shops: params.shops.map(shop => ({
          ShopCode: shop.shopCode,
          Amount: formatAmountForTBank(shop.amount),
          Name: shop.name,
          Fee: shop.fee ? formatAmountForTBank(shop.fee) : undefined
        })),
        
        // Данные покупателя
        DATA: {
          Email: params.customerEmail,
          Phone: params.customerPhone
        }
      };
      
      // Генерируем токен для подписи
      const token = generateTBankToken({
        TerminalKey: requestData.TerminalKey,
        Amount: requestData.Amount,
        OrderId: requestData.OrderId
      }, this.config.password);
      
      const response = await axios.post(
        `${this.config.apiUrl}Init`,
        { ...requestData, Token: token },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.data.Success) {
        throw new Error(response.data.ErrorCode || 'Payment initialization failed');
      }
      
      return {
        paymentId: response.data.PaymentId,
        paymentUrl: response.data.PaymentURL,
        status: response.data.Status
      };
      
    } catch (error: any) {
      console.error('Error initializing T-Bank payment:', error.response?.data || error);
      throw new Error(`Failed to initialize payment: ${error.message}`);
    }
  }
  
  /**
   * Регистрация нового получателя (клуба) в системе Мультирасчетов
   */
  async registerShop(params: {
    shopCode: string;        // Уникальный ID клуба
    name: string;            // Название клуба
    inn: string;             // ИНН
    email: string;           // Email для уведомлений
    phone: string;           // Телефон
    bankAccount: string;     // Расчетный счет
    bankBik: string;         // БИК банка
    legalAddress: string;    // Юридический адрес
    directorName: string;    // ФИО руководителя
    kpp?: string;           // КПП (для юрлиц)
    ogrn?: string;          // ОГРН/ОГРНИП
  }) {
    try {
      const requestData = {
        TerminalKey: this.config.terminalKeyE2C,
        ShopCode: params.shopCode,
        Name: params.name,
        Inn: params.inn,
        Email: params.email,
        Phone: params.phone,
        Account: params.bankAccount,
        BankBik: params.bankBik,
        LegalAddress: params.legalAddress,
        CEO: params.directorName,
        KPP: params.kpp,
        OGRN: params.ogrn
      };
      
      // Генерируем токен
      const token = generateTBankToken({
        TerminalKey: requestData.TerminalKey,
        ShopCode: requestData.ShopCode,
        Inn: requestData.Inn
      }, this.config.password);
      
      const response = await axios.post(
        `${this.config.apiUrl}AddShop`,
        { ...requestData, Token: token },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.data.Success) {
        throw new Error(response.data.ErrorCode || 'Shop registration failed');
      }
      
      return {
        shopCode: response.data.ShopCode,
        status: 'registered',
        message: 'Магазин успешно зарегистрирован'
      };
      
    } catch (error: any) {
      console.error('Error registering shop:', error.response?.data || error);
      
      // Обработка специфичных ошибок Т-Банка
      if (error.response?.data?.ErrorCode === 'SHOP_ALREADY_EXISTS') {
        return {
          shopCode: params.shopCode,
          status: 'already_exists',
          message: 'Магазин уже зарегистрирован'
        };
      }
      
      throw new Error(`Failed to register shop: ${error.message}`);
    }
  }
  
  /**
   * Получение информации о магазине
   */
  async getShopInfo(shopCode: string) {
    try {
      const requestData = {
        TerminalKey: this.config.terminalKeyE2C,
        ShopCode: shopCode
      };
      
      const token = generateTBankToken(requestData, this.config.password);
      
      const response = await axios.post(
        `${this.config.apiUrl}GetShop`,
        { ...requestData, Token: token },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.data.Success) {
        throw new Error(response.data.ErrorCode || 'Failed to get shop info');
      }
      
      return response.data.Shop;
      
    } catch (error: any) {
      console.error('Error getting shop info:', error.response?.data || error);
      throw new Error(`Failed to get shop info: ${error.message}`);
    }
  }
  
  /**
   * Обновление информации о магазине
   */
  async updateShop(params: {
    shopCode: string;
    name?: string;
    email?: string;
    phone?: string;
    bankAccount?: string;
    bankBik?: string;
  }) {
    try {
      const requestData: any = {
        TerminalKey: this.config.terminalKeyE2C,
        ShopCode: params.shopCode
      };
      
      // Добавляем только те поля, которые нужно обновить
      if (params.name) requestData.Name = params.name;
      if (params.email) requestData.Email = params.email;
      if (params.phone) requestData.Phone = params.phone;
      if (params.bankAccount) requestData.Account = params.bankAccount;
      if (params.bankBik) requestData.BankBik = params.bankBik;
      
      const token = generateTBankToken({
        TerminalKey: requestData.TerminalKey,
        ShopCode: requestData.ShopCode
      }, this.config.password);
      
      const response = await axios.post(
        `${this.config.apiUrl}UpdateShop`,
        { ...requestData, Token: token },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.data.Success) {
        throw new Error(response.data.ErrorCode || 'Shop update failed');
      }
      
      return {
        success: true,
        message: 'Информация о магазине обновлена'
      };
      
    } catch (error: any) {
      console.error('Error updating shop:', error.response?.data || error);
      throw new Error(`Failed to update shop: ${error.message}`);
    }
  }
  
  /**
   * Создание возврата через Мультирасчеты
   */
  async createRefund(params: {
    paymentId: string;
    amount: number;
    shops: Array<{
      shopCode: string;
      amount: number;
    }>;
  }) {
    try {
      const requestData = {
        TerminalKey: this.config.terminalKeyE2C,
        PaymentId: params.paymentId,
        Amount: formatAmountForTBank(params.amount),
        
        // Распределение возврата по магазинам
        Shops: params.shops.map(shop => ({
          ShopCode: shop.shopCode,
          Amount: formatAmountForTBank(shop.amount)
        }))
      };
      
      const token = generateTBankToken({
        TerminalKey: requestData.TerminalKey,
        PaymentId: requestData.PaymentId,
        Amount: requestData.Amount
      }, this.config.password);
      
      const response = await axios.post(
        `${this.config.apiUrl}Cancel`,
        { ...requestData, Token: token },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.data.Success) {
        throw new Error(response.data.ErrorCode || 'Refund failed');
      }
      
      return {
        refundId: response.data.PaymentId,
        status: response.data.Status,
        originalPaymentId: params.paymentId
      };
      
    } catch (error: any) {
      console.error('Error creating refund:', error.response?.data || error);
      throw new Error(`Failed to create refund: ${error.message}`);
    }
  }
  
  /**
   * Получение баланса магазина
   */
  async getShopBalance(shopCode: string) {
    try {
      const requestData = {
        TerminalKey: this.config.terminalKeyE2C,
        ShopCode: shopCode
      };
      
      const token = generateTBankToken(requestData, this.config.password);
      
      const response = await axios.post(
        `${this.config.apiUrl}GetShopBalance`,
        { ...requestData, Token: token },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.data.Success) {
        throw new Error(response.data.ErrorCode || 'Failed to get balance');
      }
      
      return {
        balance: response.data.Balance / 100, // Конвертируем из копеек в рубли
        pending: response.data.Pending / 100,
        available: response.data.Available / 100
      };
      
    } catch (error: any) {
      console.error('Error getting shop balance:', error.response?.data || error);
      throw new Error(`Failed to get shop balance: ${error.message}`);
    }
  }
  
  /**
   * Проверка статуса платежа
   */
  async getPaymentStatus(paymentId: string) {
    try {
      const requestData = {
        TerminalKey: this.config.terminalKeyE2C,
        PaymentId: paymentId
      };
      
      const token = generateTBankToken(requestData, this.config.password);
      
      const response = await axios.post(
        `${this.config.apiUrl}GetState`,
        { ...requestData, Token: token },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.data.Success) {
        throw new Error(response.data.ErrorCode || 'Failed to get payment status');
      }
      
      return {
        paymentId: response.data.PaymentId,
        status: response.data.Status,
        amount: response.data.Amount / 100,
        orderId: response.data.OrderId
      };
      
    } catch (error: any) {
      console.error('Error getting payment status:', error.response?.data || error);
      throw new Error(`Failed to get payment status: ${error.message}`);
    }
  }
}

// Экспортируем singleton instance
export const tbankMultiaccountsService = new TBankMultiaccountsService();