import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface VenueData {
  id: string;
  name: string;
  [key: string]: any;
}

interface CourtData {
  id: string;
  name: string;
  type: string;
  pricePerHour?: number;
  priceWeekday?: number;
  [key: string]: any;
}

export const createTestOpenGames = functions
  .region("europe-west1")
  .https.onRequest(async (request, response) => {
    try {
      const db = admin.firestore();

      // Используем SmartPadel для тестов
      const venueId = "sL4XrpuUw988P1Gq89Bt"; // SmartPadel
      const venueDoc = await db.collection("venues").doc(venueId).get();

      if (!venueDoc.exists) {
        response.status(404).send("SmartPadel venue not found");
        return;
      }

      const venue = {id: venueDoc.id, ...venueDoc.data()} as VenueData;

      // Получаем корты SmartPadel
      const courtsSnapshot = await db.collection("venues").doc(venueId)
        .collection("courts")
        .where("status", "==", "active")
        .get();

      if (courtsSnapshot.empty) {
        response.status(404).send("No active courts found for SmartPadel");
        return;
      }

      const courts: CourtData[] = [];
      courtsSnapshot.forEach((doc) => {
        courts.push({id: doc.id, ...doc.data()} as CourtData);
      });

      // Даты с 15 по 30 августа 2025
      const dates = [];
      for (let day = 15; day <= 30; day++) {
        dates.push(new Date(2025, 7, day)); // 7 = август
      }

      const times = ["10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
      const levels = ["любой", "начинающий", "средний", "продвинутый"];
      const names = ["Александр", "Дмитрий", "Михаил", "Сергей", "Андрей", "Елена", "Ольга", "Иван", "Петр", "Анна"];

      const batch = db.batch();
      const createdGames: any[] = [];

      // Создаем 10 тестовых игр
      for (let i = 0; i < 10; i++) {
        const court = courts[Math.floor(Math.random() * courts.length)];
        const date = dates[Math.floor(Math.random() * dates.length)];
        const time = times[Math.floor(Math.random() * times.length)];

        // Рассчитываем цену
        const pricePerHour = court.pricePerHour || court.priceWeekday || 2000;
        const duration = 60; // 1 час
        const totalPrice = pricePerHour;
        const maxPlayers = court.type === "padel" ? 4 : court.type === "tennis" ? 4 : 6;
        const pricePerPlayer = Math.round(totalPrice / maxPlayers);

        // Случайное количество текущих игроков (от 1 до maxPlayers-1)
        const currentPlayers = 1 + Math.floor(Math.random() * (maxPlayers - 1));

        const players = [];
        const organizerName = names[Math.floor(Math.random() * names.length)];

        // Добавляем организатора
        players.push({
          id: "test-user-" + i,
          name: organizerName,
          status: "confirmed",
          joinedAt: new Date(),
        });

        // Добавляем остальных игроков
        for (let j = 1; j < currentPlayers; j++) {
          players.push({
            id: "test-player-" + i + "-" + j,
            name: names[Math.floor(Math.random() * names.length)],
            status: "confirmed",
            joinedAt: new Date(),
          });
        }

        const gameData = {
          venueId: venue.id,
          venueName: venue.name,
          courtId: court.id,
          courtName: court.name,
          sport: court.type,
          date: admin.firestore.Timestamp.fromDate(date),
          dateString: formatDateString(date),
          time: time,
          duration: duration,
          maxPlayers: maxPlayers,
          currentPlayers: currentPlayers,
          totalPrice: totalPrice,
          pricePerPlayer: pricePerPlayer,
          level: levels[Math.floor(Math.random() * levels.length)],
          description: `Ищем игроков для ${
            court.type === "padel" ? "падела" :
              court.type === "tennis" ? "тенниса" : "бадминтона"
          }`,
          organizer: {
            id: "test-user-" + i,
            name: organizerName,
            phone: "+7 (999) 123-45-67",
          },
          players: players,
          status: "active",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = db.collection("openGames").doc();
        batch.set(docRef, gameData);

        createdGames.push({
          court: gameData.courtName,
          date: gameData.dateString,
          time: gameData.time,
          players: `${gameData.currentPlayers}/${gameData.maxPlayers}`,
        });
      }

      await batch.commit();

      response.json({
        success: true,
        message: `Successfully created ${createdGames.length} test open games`,
        games: createdGames,
      });
    } catch (error) {
      console.error("Error creating test games:", error);
      response.status(500).json({error: error instanceof Error ? error.message : "Unknown error"});
    }
  });

/**
 * Format date string in Russian
 * @param {Date} date - The date to format
 * @return {string} Formatted date string
 */
function formatDateString(date: Date): string {
  const months = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
  ];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}
