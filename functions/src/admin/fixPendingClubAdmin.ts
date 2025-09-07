import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Функция для исправления прав администратора для pending клубов
 */
export const fixPendingClubAdmin = functions
  .region("europe-west1")
  .https.onCall(async (data, context) => {
    try {
      const { venueId } = data;
      
      if (!venueId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "venueId is required"
        );
      }

      // Ищем администратора для указанного клуба
      const adminsSnapshot = await admin.firestore()
        .collection("admins")
        .where("venueId", "==", venueId)
        .where("role", "==", "admin")
        .get();

      if (adminsSnapshot.empty) {
        throw new functions.https.HttpsError(
          "not-found",
          `No admin found for venue ${venueId}`
        );
      }

      // Обновляем права для каждого администратора
      const updatePromises = adminsSnapshot.docs.map(async (doc) => {
        const adminData = doc.data();
        console.log(`Updating permissions for admin: ${doc.id}`);
        console.log("Current permissions:", adminData.permissions);
        
        const fullPermissions = [
          "manage_bookings",
          "manage_courts",
          "manage_club",
          "manage_finance",
          "view_reports",
          "create_bookings",
          "manage_admins"
        ];
        
        await doc.ref.update({
          permissions: fullPermissions,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return {
          adminId: doc.id,
          email: adminData.email,
          oldPermissions: adminData.permissions,
          newPermissions: fullPermissions
        };
      });

      const results = await Promise.all(updatePromises);
      
      return {
        success: true,
        message: `Successfully updated permissions for ${results.length} admin(s)`,
        admins: results
      };
    } catch (error: any) {
      console.error("Error fixing pending club admin:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to fix admin permissions"
      );
    }
  });
