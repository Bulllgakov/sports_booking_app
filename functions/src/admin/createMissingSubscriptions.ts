import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Функция для создания недостающих подписок БАЗОВЫЙ для старых клубов
 */
export const createMissingSubscriptions = functions
  .region("europe-west1")
  .https.onCall(async (data, context) => {
    try {
      // Проверяем, что это суперадмин
      const callerDoc = await admin.firestore()
        .collection("admins")
        .where("email", "==", context.auth?.token.email || "")
        .get();
      
      if (callerDoc.empty || callerDoc.docs[0].data().role !== "superadmin") {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only superadmin can run this function"
        );
      }

      // Получаем все клубы
      const venuesSnapshot = await admin.firestore()
        .collection("venues")
        .get();

      const results = [];

      for (const venueDoc of venuesSnapshot.docs) {
        const venueData = venueDoc.data();
        const venueId = venueDoc.id;
        
        // Проверяем, есть ли у клуба активная подписка
        const subQuery = await admin.firestore()
          .collection("subscriptions")
          .where("venueId", "==", venueId)
          .where("status", "in", ["active", "trial"])
          .get();

        if (subQuery.empty) {
          // Создаем подписку БАЗОВЫЙ
          const subscriptionData = {
            venueId: venueId,
            plan: "basic", // Используем новое название тарифа БАЗОВЫЙ
            status: "active",
            startDate: admin.firestore.FieldValue.serverTimestamp(),
            endDate: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            usage: {
              courtsCount: venueData.courts?.length || 0,
              bookingsThisMonth: 0,
              smsEmailsSent: 0,
              clientsCount: 0, // Добавляем счетчик клиентов
              lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            }
          };

          const newSubRef = await admin.firestore()
            .collection("subscriptions")
            .add(subscriptionData);

          results.push({
            venueId: venueId,
            venueName: venueData.name,
            courtsCount: venueData.courts?.length || 0,
            subscriptionId: newSubRef.id,
            status: "created"
          });

          console.log(`Created BASIC subscription for venue: ${venueData.name} (${venueId})`);
        } else {
          results.push({
            venueId: venueId,
            venueName: venueData.name,
            status: "already_exists"
          });
        }
      }

      return {
        success: true,
        message: `Processed ${venuesSnapshot.size} venues`,
        results: results,
        created: results.filter(r => r.status === "created").length,
        skipped: results.filter(r => r.status === "already_exists").length
      };
    } catch (error: any) {
      console.error("Error creating missing subscriptions:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to create missing subscriptions"
      );
    }
  });