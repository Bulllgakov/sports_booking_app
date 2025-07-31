import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class CreateTestOpenGames {
  static Future<void> createGames() async {
    final db = FirebaseFirestore.instance;
    final auth = FirebaseAuth.instance;
    
    try {
      // Получаем текущего пользователя
      final currentUser = auth.currentUser;
      if (currentUser == null) {
        print('User not authenticated');
        return;
      }
      
      // Получаем первые 3 клуба
      final venuesSnapshot = await db.collection('venues').limit(3).get();
      if (venuesSnapshot.docs.isEmpty) {
        print('No venues found. Please create venues first.');
        return;
      }
      
      final today = DateTime.now();
      final batch = db.batch();
      int gameCount = 0;
      
      // Создаем игры для каждого клуба
      for (var venueDoc in venuesSnapshot.docs) {
        final venueData = venueDoc.data();
        final venueId = venueDoc.id;
        final venueName = venueData['name'] ?? 'Клуб';
        
        // Получаем корты для клуба
        final courtsSnapshot = await db.collection('courts')
            .where('venueId', isEqualTo: venueId)
            .limit(3)
            .get();
            
        if (courtsSnapshot.docs.isEmpty) continue;
        
        // Создаем по несколько игр для каждого корта
        for (var courtDoc in courtsSnapshot.docs) {
          final courtData = courtDoc.data();
          final courtId = courtDoc.id;
          final courtName = courtData['name'] ?? 'Корт';
          final sport = courtData['sport'] ?? 'tennis';
          
          // Игра на завтра
          if (gameCount < 3) {
            final game1Ref = db.collection('openGames').doc();
            batch.set(game1Ref, {
              'venueId': venueId,
              'venueName': venueName,
              'courtId': courtId,
              'courtName': courtName,
              'sport': sport,
              'date': Timestamp.fromDate(today.add(Duration(days: 1))),
              'time': '19:00',
              'duration': 120,
              'organizerId': 'test_user_${gameCount + 1}',
              'organizerName': 'Игрок ${gameCount + 1}',
              'organizerPhone': '+7 (900) ${100 + gameCount}-${45 + gameCount}-${67 + gameCount}',
              'playerLevel': gameCount % 3 == 0 ? 'beginner' : (gameCount % 3 == 1 ? 'intermediate' : 'advanced'),
              'playersTotal': sport == 'tennis' ? 4 : (sport == 'football' ? 10 : 6),
              'playersOccupied': sport == 'tennis' ? 2 : (sport == 'football' ? 6 : 3),
              'pricePerPlayer': 500 + (gameCount * 100),
              'description': _getGameDescription(sport, gameCount),
              'status': 'active',
              'bookingId': 'booking_test_${DateTime.now().millisecondsSinceEpoch}_${gameCount}',
              'createdAt': FieldValue.serverTimestamp(),
              'updatedAt': FieldValue.serverTimestamp(),
            });
            gameCount++;
          }
          
          // Игра через 3 дня
          if (gameCount < 6) {
            final game2Ref = db.collection('openGames').doc();
            batch.set(game2Ref, {
              'venueId': venueId,
              'venueName': venueName,
              'courtId': courtId,
              'courtName': courtName,
              'sport': sport,
              'date': Timestamp.fromDate(today.add(Duration(days: 3))),
              'time': '18:00',
              'duration': 90,
              'organizerId': 'test_user_${gameCount + 1}',
              'organizerName': 'Игрок ${gameCount + 1}',
              'organizerPhone': '+7 (900) ${200 + gameCount}-${55 + gameCount}-${77 + gameCount}',
              'playerLevel': gameCount % 3 == 0 ? 'intermediate' : (gameCount % 3 == 1 ? 'advanced' : 'beginner'),
              'playersTotal': sport == 'tennis' ? 2 : (sport == 'football' ? 14 : 8),
              'playersOccupied': 1,
              'pricePerPlayer': 600 + (gameCount * 50),
              'description': _getGameDescription(sport, gameCount),
              'status': 'active',
              'bookingId': 'booking_test_${DateTime.now().millisecondsSinceEpoch}_${gameCount}',
              'createdAt': FieldValue.serverTimestamp(),
              'updatedAt': FieldValue.serverTimestamp(),
            });
            gameCount++;
          }
          
          // Игра через неделю
          if (gameCount < 10) {
            final game3Ref = db.collection('openGames').doc();
            batch.set(game3Ref, {
              'venueId': venueId,
              'venueName': venueName,
              'courtId': courtId,
              'courtName': courtName,
              'sport': sport,
              'date': Timestamp.fromDate(today.add(Duration(days: 7))),
              'time': '20:00',
              'duration': 120,
              'organizerId': 'test_user_${gameCount + 1}',
              'organizerName': 'Игрок ${gameCount + 1}',
              'organizerPhone': '+7 (900) ${300 + gameCount}-${65 + gameCount}-${87 + gameCount}',
              'playerLevel': 'intermediate',
              'playersTotal': sport == 'tennis' ? 4 : (sport == 'football' ? 12 : 6),
              'playersOccupied': 2,
              'pricePerPlayer': 700 + (gameCount * 75),
              'description': _getGameDescription(sport, gameCount),
              'status': 'active',
              'bookingId': 'booking_test_${DateTime.now().millisecondsSinceEpoch}_${gameCount}',
              'createdAt': FieldValue.serverTimestamp(),
              'updatedAt': FieldValue.serverTimestamp(),
            });
            gameCount++;
          }
          
          if (gameCount >= 10) break;
        }
        
        if (gameCount >= 10) break;
      }
      
      // Выполняем batch операцию
      await batch.commit();
      print('Successfully created $gameCount test open games!');
      
    } catch (e) {
      print('Error creating test games: $e');
      throw e;
    }
  }
  
  static String _getGameDescription(String sport, int index) {
    final descriptions = {
      'tennis': [
        'Играем парный теннис 2х2. Ищем партнеров среднего уровня.',
        'Одиночная игра. Ищу соперника для интересной партии.',
        'Тренировочная игра. Отработка подач и ударов.',
      ],
      'football': [
        'Собираем команды 5х5. Манишки есть, форма любая.',
        'Дружеский матч 7х7. Нужны еще игроки.',
        'Вечерний футбол. Играем на искусственном поле.',
      ],
      'basketball': [
        'Стритбол 3х3. Играем до 21 очка.',
        'Классический баскетбол 5х5. Нужны игроки.',
        'Тренировочная игра. Отработка бросков.',
      ],
      'volleyball': [
        'Играем 6х6. Нужны игроки с опытом.',
        'Пляжный волейбол 2х2. Ищем пару.',
        'Любительский волейбол. Главное - хорошее настроение!',
      ],
      'badminton': [
        'Парная игра 2х2. Воланы будут.',
        'Одиночная игра. Ищу достойного соперника.',
        'Утренний бадминтон. Начинаем день с активности!',
      ],
    };
    
    final sportDescriptions = descriptions[sport] ?? descriptions['tennis']!;
    return sportDescriptions[index % sportDescriptions.length];
  }
}