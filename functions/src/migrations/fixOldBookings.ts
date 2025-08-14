import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Миграция для исправления старых бронирований:
 * 1. Добавляет поле createdAt если его нет (используя дату бронирования как fallback)
 * 2. Исправляет старые названия способов оплаты на новые
 */

// Маппинг старых названий способов оплаты на новые
const paymentMethodMapping: Record<string, string> = {
  // Старые названия -> новые названия
  "cash_payment": "cash",
  "card_payment": "card_on_site",
  "bank_transfer": "transfer",
  "online_payment": "online",
  "sberbank": "sberbank_card",
  "tbank": "tbank_card",
  "vtb": "vtb_card",
  // Добавим возможные варианты на русском
  "наличные": "cash",
  "карта": "card_on_site",
  "перевод": "transfer",
  "онлайн": "online",
  // Если способ оплаты уже правильный, оставляем как есть
  "cash": "cash",
  "card_on_site": "card_on_site",
  "transfer": "transfer",
  "online": "online",
  "sberbank_card": "sberbank_card",
  "tbank_card": "tbank_card",
  "vtb_card": "vtb_card",
};

export const fixOldBookings = functions
  .region("europe-west1")
  .https.onRequest(async (req, res) => {
    // Проверяем метод запроса
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const db = admin.firestore();
    let batch = db.batch();
    let updatedCount = 0;
    let processedCount = 0;
    const updates: Array<{id: string; updates: any}> = [];

    try {
      console.log("Starting migration of old bookings...");
      // Получаем все бронирования
      const bookingsSnapshot = await db.collection("bookings").get();
      console.log(`Found ${bookingsSnapshot.size} bookings total`);

      for (const doc of bookingsSnapshot.docs) {
        const data = doc.data();
        processedCount++;
        const updateData: any = {};
        let needsUpdate = false;

        // 1. Проверяем и добавляем createdAt если его нет
        if (!data.createdAt) {
          // Используем дату бронирования как fallback
          if (data.date) {
            updateData.createdAt = data.date;
            console.log(`Adding createdAt to booking ${doc.id} using booking date`);
          } else {
            // Если нет и даты бронирования, используем текущую дату минус 30 дней
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            updateData.createdAt = admin.firestore.Timestamp.fromDate(thirtyDaysAgo);
            console.log(`Adding createdAt to booking ${doc.id} using 30 days ago`);
          }
          needsUpdate = true;
        }

        // 2. Проверяем и исправляем способ оплаты
        if (data.paymentMethod) {
          const currentMethod = data.paymentMethod.toLowerCase();
          const newMethod = paymentMethodMapping[currentMethod];
          if (newMethod && newMethod !== data.paymentMethod) {
            updateData.paymentMethod = newMethod;
            console.log(`Updating payment method for booking ${doc.id}: ${data.paymentMethod} -> ${newMethod}`);
            needsUpdate = true;
          } else if (!newMethod) {
            // Если способ оплаты неизвестный, логируем предупреждение
            console.warn(`Unknown payment method for booking ${doc.id}: ${data.paymentMethod}`);
          }
        }

        // 3. Дополнительно: проверяем формат полей customerName/clientName
        if (data.clientName && !data.customerName) {
          updateData.customerName = data.clientName;
          needsUpdate = true;
        }
        if (data.clientPhone && !data.customerPhone) {
          updateData.customerPhone = data.clientPhone;
          needsUpdate = true;
        }

        // 4. Проверяем наличие поля paymentStatus
        if (!data.paymentStatus && data.status) {
          // Устанавливаем paymentStatus на основе status
          if (data.status === "confirmed") {
            updateData.paymentStatus = "paid";
          } else if (data.status === "cancelled") {
            updateData.paymentStatus = "cancelled";
          } else {
            updateData.paymentStatus = "awaiting_payment";
          }
          needsUpdate = true;
        }

        // Если есть изменения, добавляем в batch
        if (needsUpdate) {
          batch.update(doc.ref, updateData);
          updates.push({id: doc.id, updates: updateData});
          updatedCount++;
          // Firebase позволяет максимум 500 операций в одном batch
          if (updatedCount % 500 === 0) {
            await batch.commit();
            console.log("Committed batch of 500 updates");
            // Создаем новый batch для следующих операций
            batch = db.batch();
          }
        }
      }

      // Коммитим оставшиеся изменения
      if (updatedCount % 500 !== 0) {
        await batch.commit();
      }

      console.log(`Migration completed: ${updatedCount} bookings updated out of ${processedCount} processed`);

      res.json({
        success: true,
        message: `Successfully updated ${updatedCount} bookings out of ${processedCount} total`,
        updatedCount,
        processedCount,
        sampleUpdates: updates.slice(0, 10), // Показываем первые 10 обновлений для проверки
      });
    } catch (error) {
      console.error("Error during migration:", error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        updatedCount,
        processedCount,
      });
    }
  });

/**
 * Функция для проверки бронирований без createdAt или с неправильными способами оплаты
 */
export const checkOldBookings = functions
  .region("europe-west1")
  .https.onRequest(async (req, res) => {
    const db = admin.firestore();

    try {
      const bookingsSnapshot = await db.collection("bookings").get();
      const issues = {
        missingCreatedAt: [] as string[],
        oldPaymentMethods: [] as {id: string; method: string}[],
        missingPaymentStatus: [] as string[],
        totalBookings: bookingsSnapshot.size,
      };

      for (const doc of bookingsSnapshot.docs) {
        const data = doc.data();

        // Проверяем createdAt
        if (!data.createdAt) {
          issues.missingCreatedAt.push(doc.id);
        }

        // Проверяем способы оплаты
        if (data.paymentMethod) {
          const currentMethod = data.paymentMethod;
          const validMethods = [
            "cash", "card_on_site", "transfer", "online",
            "sberbank_card", "tbank_card", "vtb_card",
          ];
          if (!validMethods.includes(currentMethod)) {
            issues.oldPaymentMethods.push({id: doc.id, method: currentMethod});
          }
        }

        // Проверяем paymentStatus
        if (!data.paymentStatus) {
          issues.missingPaymentStatus.push(doc.id);
        }
      }

      res.json({
        success: true,
        issues,
        summary: {
          totalBookings: issues.totalBookings,
          missingCreatedAt: issues.missingCreatedAt.length,
          oldPaymentMethods: issues.oldPaymentMethods.length,
          missingPaymentStatus: issues.missingPaymentStatus.length,
        },
      });
    } catch (error) {
      console.error("Error checking bookings:", error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });
