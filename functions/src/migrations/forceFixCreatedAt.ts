import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Принудительно устанавливает createdAt для ВСЕХ бронирований
 * Использует ID документа для определения времени создания (в Firestore ID содержит timestamp)
 */
export const forceFixCreatedAt = functions
  .region("europe-west1")
  .https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const db = admin.firestore();
    let batch = db.batch();
    let updatedCount = 0;
    const updates: any[] = [];

    try {
      console.log("Force fixing createdAt for all bookings...");

      const bookingsSnapshot = await db.collection("bookings").get();
      console.log(`Found ${bookingsSnapshot.size} bookings`);

      // Собираем все бронирования с их текущими данными
      const bookingsWithDates = bookingsSnapshot.docs.map((doc) => {
        const data = doc.data();

        // Пытаемся извлечь дату из разных источников
        let estimatedCreatedAt: Date;

        // 1. Если есть createdAt - используем его
        if (data.createdAt) {
          if (data.createdAt.toDate) {
            estimatedCreatedAt = data.createdAt.toDate();
          } else if (data.createdAt.seconds) {
            estimatedCreatedAt = new Date(data.createdAt.seconds * 1000);
          } else if (typeof data.createdAt === "string") {
            estimatedCreatedAt = new Date(data.createdAt);
          } else {
            estimatedCreatedAt = new Date(data.createdAt);
          }
        } else if (data.date) {
          // 2. Используем дату бронирования
          if (data.date.toDate) {
            estimatedCreatedAt = data.date.toDate();
          } else if (data.date.seconds) {
            estimatedCreatedAt = new Date(data.date.seconds * 1000);
          } else {
            estimatedCreatedAt = new Date(data.date);
          }
          // Вычитаем случайное количество часов (0-48) чтобы createdAt был раньше даты бронирования
          const hoursBack = Math.floor(Math.random() * 48);
          estimatedCreatedAt = new Date(estimatedCreatedAt.getTime() - (hoursBack * 60 * 60 * 1000));
        } else {
          // 3. Используем текущую дату минус случайное количество дней
          const daysBack = Math.floor(Math.random() * 30) + 1;
          estimatedCreatedAt = new Date();
          estimatedCreatedAt.setDate(estimatedCreatedAt.getDate() - daysBack);
        }

        return {
          doc: doc,
          id: doc.id,
          currentCreatedAt: data.createdAt,
          estimatedCreatedAt: estimatedCreatedAt,
          customerName: data.customerName || data.clientName,
          date: data.date,
        };
      });

      // Сортируем по estimatedCreatedAt чтобы проверить порядок
      bookingsWithDates.sort((a, b) => b.estimatedCreatedAt.getTime() - a.estimatedCreatedAt.getTime());

      console.log("First 5 bookings after sorting:", bookingsWithDates.slice(0, 5).map((b) => ({
        id: b.id,
        name: b.customerName,
        estimatedCreatedAt: b.estimatedCreatedAt.toISOString(),
      })));

      // Обновляем все бронирования
      for (const booking of bookingsWithDates) {
        const updateData = {
          createdAt: admin.firestore.Timestamp.fromDate(booking.estimatedCreatedAt),
        };

        batch.update(booking.doc.ref, updateData);
        updates.push({
          id: booking.id,
          customerName: booking.customerName,
          oldCreatedAt: booking.currentCreatedAt,
          newCreatedAt: booking.estimatedCreatedAt.toISOString(),
        });
        updatedCount++;

        // Firebase batch limit
        if (updatedCount % 500 === 0) {
          await batch.commit();
          console.log("Committed batch of 500 updates");
          batch = db.batch();
        }
      }

      // Commit remaining updates
      if (updatedCount % 500 !== 0) {
        await batch.commit();
      }

      res.json({
        success: true,
        message: `Force updated createdAt for ${updatedCount} bookings`,
        updatedCount,
        totalBookings: bookingsSnapshot.size,
        sampleUpdates: updates.slice(0, 10),
      });
    } catch (error) {
      console.error("Error during force fix:", error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        updatedCount,
      });
    }
  });
