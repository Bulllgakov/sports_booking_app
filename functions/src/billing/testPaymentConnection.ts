import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

const region = "europe-west1";

interface TestPaymentConnectionRequest {
  venueId: string;
  provider: string;
  credentials: Record<string, string>;
}

export const testPaymentConnection = functions
  .region(region)
  .https.onCall(async (data: TestPaymentConnectionRequest, context) => {
    // Проверяем авторизацию
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Требуется авторизация");
    }

    const {venueId, provider, credentials} = data;

    // Проверяем права доступа через коллекцию admins
    const adminsSnapshot = await admin.firestore()
      .collection("admins")
      .where("email", "==", context.auth.token.email)
      .limit(1)
      .get();

    if (adminsSnapshot.empty) {
      throw new functions.https.HttpsError("permission-denied", "Недостаточно прав");
    }

    const adminData = adminsSnapshot.docs[0].data();
    const isAdmin = adminData.role === "admin" || adminData.role === "superadmin";
    if (!isAdmin) {
      throw new functions.https.HttpsError("permission-denied", "Недостаточно прав");
    }

    // Для админа клуба проверяем, что он тестирует свой клуб
    if (adminData.role === "admin" && adminData.venueId !== venueId) {
      throw new functions.https.HttpsError("permission-denied", "Нет доступа к этому клубу");
    }

    try {
      switch (provider) {
      case "yookassa":
        return await testYooKassa(credentials);
      case "tbank":
        return await testTBank(credentials);
      default:
        throw new functions.https.HttpsError("invalid-argument", "Неподдерживаемый провайдер");
      }
    } catch (error: any) {
      console.error("Error testing payment connection:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      return {
        success: false,
        message: error.message || "Ошибка при проверке подключения",
        error: error.toString(),
      };
    }
  });

/**
 * Test YooKassa payment connection
 * @param {Record<string, string>} credentials - YooKassa credentials
 * @return {Promise<{ success: boolean; message: string }>} Test result
 */
async function testYooKassa(credentials: Record<string, string>): Promise<{ success: boolean; message: string }> {
  const {shopId, secretKey} = credentials;

  if (!shopId || !secretKey) {
    return {
      success: false,
      message: "Не указаны Shop ID или Secret Key",
    };
  }

  try {
    // const api = new YooKassaAPI(shopId, secretKey);

    // Пробуем получить информацию о магазине
    const response = await fetch("https://api.yookassa.ru/v3/me", {
      method: "GET",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: `Подключение успешно! Магазин: ${data.account_id || shopId}`,
      };
    } else if (response.status === 401) {
      return {
        success: false,
        message: "Неверные учетные данные. Проверьте Shop ID и Secret Key",
      };
    } else {
      return {
        success: false,
        message: `Ошибка подключения: ${response.statusText}`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Ошибка сети: ${error.message}`,
    };
  }
}

/**
 * Test T-Bank payment connection
 * @param {Record<string, string>} credentials - T-Bank credentials
 * @return {Promise<{ success: boolean; message: string }>} Test result
 */
async function testTBank(credentials: Record<string, string>): Promise<{ success: boolean; message: string }> {
  const {shopId, secretKey, terminalKey} = credentials;

  if (!shopId || !secretKey || !terminalKey) {
    return {
      success: false,
      message: "Заполните все обязательные поля",
    };
  }

  try {
    // Тестовый запрос к API Т-Банка
    const response = await fetch("https://securepay.tinkoff.ru/v2/GetState", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        TerminalKey: terminalKey,
        PaymentId: "test_connection",
      }),
    });

    // Т-Банк возвращает ошибку для несуществующего платежа, но это означает, что API работает
    if (response.status === 400) {
      const data = await response.json();
      if (data.ErrorCode === "7" || data.Message?.includes("PAYMENT_NOT_FOUND")) {
        return {
          success: true,
          message: "Подключение успешно! Terminal Key корректный",
        };
      }
    }

    if (!response.ok) {
      return {
        success: false,
        message: "Ошибка подключения. Проверьте Terminal Key",
      };
    }

    return {
      success: true,
      message: "Подключение успешно установлено",
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Ошибка сети: ${error.message}`,
    };
  }
}

