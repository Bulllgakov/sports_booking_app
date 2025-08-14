import * as admin from "firebase-admin";

interface BookingLimitConfig {
  maxUnpaidBookingsPerPhone: number // Макс. неоплаченных бронирований с одного телефона за 24 часа
  maxCancellationsPerDay: number // Макс. отмен за день
  blockDurationHours: number // Длительность блокировки при превышении лимитов
}

const DEFAULT_LIMITS: BookingLimitConfig = {
  maxUnpaidBookingsPerPhone: 3, // Максимум 3 неоплаченных бронирования за 24 часа
  maxCancellationsPerDay: 5, // Максимум 5 отмен за день
  blockDurationHours: 24, // Блокировка на 24 часа
};

export async function checkBookingLimits(
  phoneNumber: string,
  _venueId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();
  const dayAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 24 * 60 * 60 * 1000);

  // Нормализуем номер телефона
  const normalizedPhone = phoneNumber.replace(/\D/g, "");

  try {
    // 1. Проверка блокировки
    const blockedRef = db.collection("blocked_users").doc(normalizedPhone);
    const blockedDoc = await blockedRef.get();

    if (blockedDoc.exists) {
      const blockedData = blockedDoc.data();
      const blockedUntil = blockedData?.blockedUntil as admin.firestore.Timestamp;

      if (blockedUntil && blockedUntil.toMillis() > now.toMillis()) {
        const hoursLeft = Math.ceil((blockedUntil.toMillis() - now.toMillis()) / (1000 * 60 * 60));
        return {
          allowed: false,
          reason: `Вы временно заблокированы. Попробуйте через ${hoursLeft} час(ов)`,
        };
      }
    }

    // 2. Проверка неоплаченных бронирований за последние 24 часа
    const unpaidBookings = await db.collection("bookings")
      .where("customerPhone", "==", normalizedPhone)
      .where("paymentStatus", "in", ["awaiting_payment"])
      .where("status", "!=", "cancelled")
      .where("createdAt", ">", dayAgo)
      .get();

    if (unpaidBookings.size >= DEFAULT_LIMITS.maxUnpaidBookingsPerPhone) {
      return {
        allowed: false,
        reason: `У вас уже есть ${DEFAULT_LIMITS.maxUnpaidBookingsPerPhone} ` +
          "неоплаченных бронирования за последние 24 часа. " +
          "Пожалуйста, оплатите или отмените их перед созданием нового",
      };
    }

    // 3. Проверка количества отмен за последние 24 часа
    const cancelledBookings = await db.collection("bookings")
      .where("customerPhone", "==", normalizedPhone)
      .where("status", "==", "cancelled")
      .where("cancelledAt", ">", dayAgo)
      .where("cancelledBy", "==", "customer")
      .get();

    if (cancelledBookings.size >= DEFAULT_LIMITS.maxCancellationsPerDay) {
      // Блокируем пользователя на 24 часа
      const blockedUntil = admin.firestore.Timestamp.fromMillis(
        now.toMillis() + DEFAULT_LIMITS.blockDurationHours * 60 * 60 * 1000
      );

      await blockedRef.set({
        phoneNumber: normalizedPhone,
        blockedAt: now,
        blockedUntil: blockedUntil,
        reason: "Превышен лимит отмен бронирований",
        cancellationsCount: cancelledBookings.size,
      });

      return {
        allowed: false,
        reason: `Вы превысили лимит отмен (${DEFAULT_LIMITS.maxCancellationsPerDay} за день). Попробуйте завтра`,
      };
    }

    // Все проверки пройдены
    return {allowed: true};
  } catch (error) {
    console.error("Error checking booking limits:", error);
    // В случае ошибки разрешаем бронирование, чтобы не блокировать клиентов
    return {allowed: true};
  }
}

// Функция для записи активности бронирования (для аналитики)
export async function logBookingActivity(
  phoneNumber: string,
  action: "created" | "cancelled" | "paid" | "blocked",
  bookingId: string,
  ipAddress?: string
) {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  try {
    await db.collection("booking_activity").add({
      phoneNumber: phoneNumber.replace(/\D/g, ""),
      action,
      bookingId,
      ipAddress,
      timestamp: now,
    });
  } catch (error) {
    console.error("Error logging booking activity:", error);
  }
}
