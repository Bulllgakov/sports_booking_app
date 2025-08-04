import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const region = "europe-west1";

/**
 * Облачная функция для обработки возврата от пользователя мобильного приложения
 */
export const processUserRefund = functions
  .region(region)
  .https.onRequest(async (req, res) => {
    // Разрешаем CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const {bookingId, reason, userId} = req.body;

      if (!bookingId || !reason) {
        res.status(400).json({
          success: false,
          error: "bookingId и reason обязательны",
        });
        return;
      }

      const db = admin.firestore();

      // Получаем данные бронирования
      const bookingDoc = await db.collection("bookings").doc(bookingId).get();

      if (!bookingDoc.exists) {
        res.status(404).json({
          success: false,
          error: "Бронирование не найдено",
        });
        return;
      }

      const booking = bookingDoc.data()!;

      // Проверяем, что пользователь имеет право отменять это бронирование
      if (userId && booking.userId !== userId) {
        res.status(403).json({
          success: false,
          error: "У вас нет прав для отмены этого бронирования",
        });
        return;
      }

      // Проверяем, не был ли уже сделан возврат
      if (booking.paymentStatus === "refunded" || booking.status === "cancelled") {
        res.status(400).json({
          success: false,
          error: "Бронирование уже отменено или возврат уже выполнен",
        });
        return;
      }

      // Для онлайн оплаты проверяем 12-часовое ограничение
      if (booking.paymentMethod === "online" && booking.paymentStatus === "paid") {
        const bookingDate = booking.date.toDate ? booking.date.toDate() : new Date(booking.date);
        const startTime = booking.startTime || booking.time || "00:00";
        const [hours, minutes] = startTime.split(":").map(Number);

        const bookingDateTime = new Date(
          bookingDate.getFullYear(),
          bookingDate.getMonth(),
          bookingDate.getDate(),
          hours,
          minutes || 0
        );

        const now = new Date();
        const hoursUntilGame = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilGame < 12) {
          const hoursLeft = Math.floor(hoursUntilGame);
          res.status(400).json({
            success: false,
            error: `Отмена невозможна менее чем за 12 часов до игры. Осталось ${hoursLeft} ч.`,
          });
          return;
        }
      }

      // Для онлайн оплаты создаем возврат
      if (booking.paymentStatus === "paid" && booking.paymentMethod === "online") {
        // Получаем данные клуба для настроек платежной системы
        const venueDoc = await db.collection("venues").doc(booking.venueId).get();

        if (!venueDoc.exists) {
          res.status(404).json({
            success: false,
            error: "Клуб не найден",
          });
          return;
        }

        const venue = venueDoc.data()!;
        const paymentProvider = venue.paymentProvider;

        if (paymentProvider === "yookassa" && booking.paymentId) {
          // Импортируем функцию создания возврата
          const {createRefund} = await import("../utils/yookassa");

          try {
            const refundResult = await createRefund(
              venue.paymentCredentials.shopId,
              venue.paymentCredentials.secretKey,
              booking.paymentId,
              booking.amount || booking.price,
              reason
            );

            if (refundResult.success) {
              // Обновляем статус бронирования
              await db.collection("bookings").doc(bookingId).update({
                refundStatus: "processing",
                refundId: refundResult.refundId,
                refundRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
                refundReason: reason,
                paymentHistory: admin.firestore.FieldValue.arrayUnion({
                  timestamp: new Date().toISOString(),
                  action: "refund_requested",
                  userId: userId || "user",
                  userName: "Мобильное приложение",
                  note: `Запрос на возврат: ${reason}`,
                }),
              });

              res.status(200).json({
                success: true,
                message: "Запрос на возврат отправлен",
                refundId: refundResult.refundId,
              });
            } else {
              throw new Error(refundResult.error || "Ошибка создания возврата");
            }
          } catch (error: any) {
            console.error("Error creating refund:", error);
            res.status(500).json({
              success: false,
              error: error.message || "Ошибка при создании возврата",
            });
          }
        } else if (paymentProvider === "tbank" && booking.paymentId) {
          // Импортируем функцию создания возврата для T-Bank
          const {processTBankRefund} = await import("../utils/tbank");

          try {
            const refundResult = await processTBankRefund(
              venue.paymentCredentials.terminalKey,
              venue.paymentCredentials.password,
              booking.paymentId,
              booking.amount || booking.price // Функция сама умножит на 100
            );

            if (refundResult.success) {
              // Обновляем статус бронирования
              await db.collection("bookings").doc(bookingId).update({
                refundStatus: "processing",
                refundId: refundResult.refundId,
                refundRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
                refundReason: reason,
                paymentHistory: admin.firestore.FieldValue.arrayUnion({
                  timestamp: new Date().toISOString(),
                  action: "refund_requested",
                  userId: userId || "user",
                  userName: "Мобильное приложение",
                  note: `Запрос на возврат: ${reason}`,
                }),
              });

              res.status(200).json({
                success: true,
                message: "Запрос на возврат отправлен",
                refundId: refundResult.refundId,
              });
            } else {
              throw new Error(refundResult.error || "Ошибка создания возврата");
            }
          } catch (error: any) {
            console.error("Error creating T-Bank refund:", error);
            res.status(500).json({
              success: false,
              error: error.message || "Ошибка при создании возврата",
            });
          }
        } else {
          res.status(400).json({
            success: false,
            error: "Платежная система не поддерживает автоматические возвраты",
          });
        }
      } else {
        // Для других способов оплаты просто отменяем бронирование
        await db.collection("bookings").doc(bookingId).update({
          status: "cancelled",
          paymentStatus: booking.paymentStatus === "paid" ? "refunded" : "cancelled",
          cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
          cancelReason: reason,
          cancelledBy: {
            userId: userId || "user",
            userName: "Мобильное приложение",
          },
          paymentHistory: admin.firestore.FieldValue.arrayUnion({
            timestamp: new Date().toISOString(),
            action: "cancelled",
            userId: userId || "user",
            userName: "Мобильное приложение",
            note: `Отменено: ${reason}`,
          }),
        });

        res.status(200).json({
          success: true,
          message: "Бронирование отменено",
        });
      }
    } catch (error: any) {
      console.error("Error processing user refund:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Внутренняя ошибка сервера",
      });
    }
  });
