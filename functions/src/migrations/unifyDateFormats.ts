import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Миграция для приведения всех дат к единому формату Firebase Timestamp
 * Конвертирует строковые даты в Timestamp
 */
export const unifyDateFormats = functions
  .region("europe-west1")
  .https.onRequest(async (req, res) => {
    // Проверяем метод запроса
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const db = admin.firestore();

    try {
      console.log("🔄 Начинаем унификацию форматов дат...");

      // Получаем все бронирования
      const bookingsSnapshot = await db.collection("bookings").get();
      console.log(`Всего бронирований: ${bookingsSnapshot.size}`);

      const stats = {
        total: 0,
        stringDates: 0,
        timestampDates: 0,
        converted: 0,
        errors: [] as Array<{id: string; date: any; error: string}>,
      };

      const batch = db.batch();
      let batchCount = 0;
      const maxBatchSize = 450;

      for (const doc of bookingsSnapshot.docs) {
        const booking = doc.data();
        stats.total++;

        // Проверяем формат даты
        if (typeof booking.date === "string") {
          stats.stringDates++;

          try {
            // Конвертируем строку в Date, затем в Timestamp
            // Добавляем время чтобы избежать проблем с часовыми поясами
            const dateObj = new Date(booking.date + "T00:00:00");

            if (isNaN(dateObj.getTime())) {
              stats.errors.push({
                id: doc.id,
                date: booking.date,
                error: "Invalid date string",
              });
              continue;
            }

            const timestamp = admin.firestore.Timestamp.fromDate(dateObj);

            batch.update(doc.ref, {
              date: timestamp,
              dateString: booking.date, // Сохраняем оригинальную строку для истории
              dateUnified: true,
              dateUnifiedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            stats.converted++;
            batchCount++;

            console.log(`✅ Конвертировано: ${doc.id} | ${booking.date} → Timestamp`);

            // Если достигли лимита batch, выполняем и создаем новый
            if (batchCount >= maxBatchSize) {
              await batch.commit();
              console.log(`Обновлено ${batchCount} записей`);
              batchCount = 0;
            }
          } catch (error) {
            stats.errors.push({
              id: doc.id,
              date: booking.date,
              error: (error as Error).message || String(error),
            });
            console.error(`❌ Ошибка конвертации для ${doc.id}:`, error);
          }
        } else if (booking.date?.toDate || booking.date?.seconds) {
          // Уже в формате Timestamp
          stats.timestampDates++;
        }
      }

      // Выполняем оставшиеся обновления
      if (batchCount > 0) {
        await batch.commit();
        console.log(`Обновлено последние ${batchCount} записей`);
      }

      // Формируем ответ
      const response = {
        success: true,
        message: "Унификация форматов дат завершена",
        stats: {
          total: stats.total,
          stringDates: stats.stringDates,
          timestampDates: stats.timestampDates,
          converted: stats.converted,
          errors: stats.errors.length,
        },
        errors: stats.errors,
      };

      console.log("✅ Миграция завершена:", response);
      res.json(response);
    } catch (error) {
      console.error("❌ Ошибка при унификации дат:", error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });
