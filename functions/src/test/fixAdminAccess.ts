import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const region = "europe-west1";

export const fixAdminAccess = functions
  .region(region)
  .https.onCall(async (data, _context) => {
    const {email} = data;

    if (!email) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email is required"
      );
    }

    try {
      // Check if admin exists
      const adminsSnapshot = await admin.firestore()
        .collection("admins")
        .where("email", "==", email)
        .get();

      if (!adminsSnapshot.empty) {
        return {
          success: true,
          message: "Admin already exists",
          adminId: adminsSnapshot.docs[0].id,
        };
      }

      // Check if venue exists
      const venuesSnapshot = await admin.firestore()
        .collection("venues")
        .where("email", "==", email)
        .get();

      if (venuesSnapshot.empty) {
        throw new functions.https.HttpsError(
          "not-found",
          "No venue found for this email"
        );
      }

      const venueDoc = venuesSnapshot.docs[0];
      const venueId = venueDoc.id;
      const venueData = venueDoc.data();

      // Create admin
      const adminRef = await admin.firestore().collection("admins").add({
        name: venueData.name || "Администратор",
        email: email,
        role: "admin",
        venueId: venueId,
        permissions: [
          "manage_bookings",
          "manage_courts",
          "manage_clients",
          "manage_settings",
        ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update venue status to active if it's pending
      if (venueData.status === "pending") {
        await admin.firestore().collection("venues").doc(venueId).update({
          status: "active",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return {
        success: true,
        message: "Admin created successfully",
        adminId: adminRef.id,
        venueId: venueId,
      };
    } catch (error: any) {
      console.error("Error fixing admin access:", error);
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to fix admin access"
      );
    }
  });
