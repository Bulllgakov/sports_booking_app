import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../models/booking_model.dart';
import '../models/court_model.dart';
import '../utils/pricing_utils.dart';
import 'firestore_service.dart';
import 'payment_service.dart';

class BookingService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  
  Future<List<BookingModel>> getBookingsForDateAndCourt(
    DateTime date, 
    String courtId,
  ) async {
    try {
      // Создаем начало и конец дня
      final startOfDay = DateTime(date.year, date.month, date.day);
      final endOfDay = DateTime(date.year, date.month, date.day, 23, 59, 59);
      
      // Получаем ВСЕ бронирования для даты и корта, затем фильтруем на клиенте
      final snapshot = await _firestore
          .collection('bookings')
          .where('courtId', isEqualTo: courtId)
          .where('date', isGreaterThanOrEqualTo: Timestamp.fromDate(startOfDay))
          .where('date', isLessThanOrEqualTo: Timestamp.fromDate(endOfDay))
          .get();
      
      // Применяем ту же логику фильтрации, что и в веб-версии
      return snapshot.docs
          .map((doc) => BookingModel.fromFirestore(doc))
          .where((booking) {
            final status = booking.status;
            final paymentStatus = booking.paymentStatus ?? 'awaiting_payment';
            
            return (
              status != 'cancelled' && 
              paymentStatus != 'cancelled' && 
              paymentStatus != 'refunded' &&
              paymentStatus != 'error' &&
              (
                status == 'confirmed' || 
                status == 'pending' ||
                paymentStatus == 'paid' || 
                paymentStatus == 'online_payment' ||
                paymentStatus == 'awaiting_payment'
              )
            );
          })
          .toList();
    } catch (e) {
      print('Error loading bookings: $e');
      return [];
    }
  }
  
  Future<String> createBooking({
    required String courtId,
    required String courtName,
    required String venueId,
    required String venueName,
    required DateTime date,
    required String dateString,
    required String time,
    required String startTime,
    required String endTime,
    required int duration,
    required String gameType,
    required String customerName,
    required String customerPhone,
    required int price,
    required int pricePerPlayer,
    required int playersCount,
    required String userId,
    String? customerEmail,
    String? openGameLevel, // Новый параметр для уровня игры
    String? openGameDescription, // Новый параметр для описания игры
  }) async {
    try {
      // Получаем информацию о площадке для проверки рабочих часов
      final venueDoc = await _firestore.collection('venues').doc(venueId).get();
      if (!venueDoc.exists) {
        throw Exception('Площадка не найдена');
      }
      
      final venueData = venueDoc.data()!;
      final workingHours = venueData['workingHours'] as Map<String, dynamic>?;
      
      // Проверяем рабочие часы
      if (workingHours != null) {
        final isWithinHours = PricingUtils.isWithinWorkingHours(
          date: date,
          startTime: startTime,
          durationMinutes: duration,
          workingHours: workingHours,
        );
        
        if (!isWithinHours) {
          throw Exception('Выбранное время выходит за рамки рабочих часов площадки');
        }
      }
      
      // Проверяем, что время в будущем
      if (!PricingUtils.isTimeInFuture(date, startTime)) {
        throw Exception('Нельзя забронировать прошедшее время');
      }
      
      // Получаем информацию о корте для расчета цены
      final courtDoc = await _firestore.collection('courts').doc(courtId).get();
      if (!courtDoc.exists) {
        throw Exception('Корт не найден');
      }
      
      final courtData = courtDoc.data()!;
      
      // Рассчитываем цену с учетом временных интервалов и праздников
      final calculatedPrice = PricingUtils.calculateCourtPrice(
        date: date,
        startTime: startTime,
        durationMinutes: duration,
        pricing: courtData['pricing'] as Map<String, dynamic>?,
        holidayPricing: courtData['holidayPricing'] as List<dynamic>?,
        priceWeekday: courtData['priceWeekday'] as int?,
        priceWeekend: courtData['priceWeekend'] as int? ?? courtData['pricePerHour'] as int?,
      );
      
      // ВАЖНО: Проверяем доступность слота перед созданием бронирования
      final existingBookings = await getBookingsForDateAndCourt(date, courtId);
      
      // Проверяем пересечение времени с существующими бронированиями
      for (final booking in existingBookings) {
        // Парсим время существующего бронирования
        final bookingStartParts = booking.startTimeStr?.split(':') ?? ['0', '0'];
        final bookingEndParts = booking.endTimeStr?.split(':') ?? ['0', '0'];
        final bookingStartTime = DateTime(date.year, date.month, date.day, 
          int.parse(bookingStartParts[0]), int.parse(bookingStartParts[1]));
        final bookingEndTime = DateTime(date.year, date.month, date.day,
          int.parse(bookingEndParts[0]), int.parse(bookingEndParts[1]));
        
        // Парсим запрашиваемое время
        final requestedStartParts = startTime.split(':');
        final requestedEndParts = endTime.split(':');
        final requestedStartTime = DateTime(date.year, date.month, date.day,
          int.parse(requestedStartParts[0]), int.parse(requestedStartParts[1]));
        final requestedEndTime = DateTime(date.year, date.month, date.day,
          int.parse(requestedEndParts[0]), int.parse(requestedEndParts[1]));
        
        // Проверяем пересечение временных интервалов
        if ((requestedStartTime.isAfter(bookingStartTime) && requestedStartTime.isBefore(bookingEndTime)) ||
            (requestedEndTime.isAfter(bookingStartTime) && requestedEndTime.isBefore(bookingEndTime)) ||
            (requestedStartTime.isBefore(bookingStartTime) && requestedEndTime.isAfter(bookingEndTime)) ||
            (requestedStartTime.isAtSameMomentAs(bookingStartTime))) {
          throw Exception('К сожалению, выбранное время уже занято. Пожалуйста, выберите другое время.');
        }
      }
      
      // Используем рассчитанную цену вместо переданной
      final finalPrice = gameType == 'open' ? price : calculatedPrice;
      
      // Расчет цены за час
      final pricePerHour = duration > 0 ? (finalPrice / (duration / 60)).round() : finalPrice;
      
      // Проверка лимитов перед созданием бронирования (только для мобильного приложения)
      try {
        final functions = FirebaseFunctions.instanceFor(region: 'europe-west1');
        final validateBooking = functions.httpsCallable('validateBookingRequest');
        
        final result = await validateBooking.call({
          'phoneNumber': customerPhone,
          'venueId': venueId,
          'source': 'mobile', // Указываем что это мобильное приложение
        });
      } catch (e) {
        print('Validation error: $e');
        // Парсим сообщение об ошибке
        if (e is FirebaseFunctionsException) {
          throw Exception(e.message ?? 'Не удалось создать бронирование');
        }
        throw Exception('Не удалось создать бронирование. Попробуйте позже.');
      }
      
      final bookingData = {
        'courtId': courtId,
        'courtName': courtName,
        'venueId': venueId,
        'venueName': venueName,
        'date': Timestamp.fromDate(date), // Сохраняем как Timestamp для совместимости
        'time': time, // Для обратной совместимости
        'startTime': startTime,
        'endTime': endTime,
        'duration': duration,
        'gameType': gameType,
        'customerName': customerName,
        'customerPhone': customerPhone,
        'customerEmail': customerEmail ?? '',
        'clientName': customerName, // Для совместимости с веб-версией
        'clientPhone': customerPhone,
        'price': pricePerHour, // Цена за час для совместимости с веб-версией
        'amount': finalPrice, // Общая сумма
        'pricePerPlayer': pricePerPlayer,
        'playersCount': playersCount,
        'userId': userId,
        'status': 'pending',
        'paymentStatus': 'awaiting_payment',
        'paymentMethod': 'online', // Изменено на 'online' для клиентских бронирований
        'source': 'mobile_app',
        'paymentUrl': null, // Будет заполнено после создания платежа
        'paymentHistory': [], // История изменений платежа
        'createdAt': FieldValue.serverTimestamp(),
        'createdBy': {
          'userId': userId,
          'userName': customerName,
          'userRole': 'client'
        }
      };
      
      // Add players list for open games
      if (gameType == 'open') {
        bookingData['players'] = [customerPhone]; // Initialize with creator's phone
      }
      
      final docRef = await _firestore.collection('bookings').add(bookingData);
      
      // Create open game if it's an open game type
      if (gameType == 'open') {
        try {
          await FirestoreService.createOpenGame(
            organizerId: userId.isNotEmpty ? userId : customerPhone, // Use userId or phone as fallback
            bookingId: docRef.id,
            playerLevel: openGameLevel ?? 'amateur', // Use provided level or default
            playersNeeded: playersCount,
            pricePerPlayer: pricePerPlayer.toDouble(),
            description: openGameDescription ?? 'Открытая игра в $venueName', // Use provided description or default
          );
        } catch (e) {
          print('Error creating open game: $e');
          // Don't throw here - booking is already created
        }
      }
      
      // Инициализируем платеж автоматически для всех клиентских бронирований
      try {
        final paymentService = PaymentService();
        final paymentUrl = await paymentService.initializePayment(
          bookingId: docRef.id,
          venueId: venueId,
        );
        
        if (paymentUrl != null) {
          print('Платеж инициализирован, URL: $paymentUrl');
          // Можно вернуть URL платежа вместе с ID бронирования
          // или открыть его сразу
          await paymentService.openPaymentUrl(paymentUrl);
        }
      } catch (e) {
        print('Ошибка при инициализации платежа: $e');
        // Не прерываем процесс - бронирование уже создано
      }
      
      return docRef.id;
    } catch (e) {
      print('Error creating booking: $e');
      throw e;
    }
  }
  
  Future<void> joinOpenGame({
    required String openGameId,
    required String userId,
    required String userName,
    required String userPhone,
  }) async {
    try {
      // Join the open game
      await FirestoreService.joinOpenGame(openGameId, userId);
      
      // Get the open game details
      final gameDoc = await _firestore.collection('openGames').doc(openGameId).get();
      if (!gameDoc.exists) throw Exception('Open game not found');
      
      final gameData = gameDoc.data()!;
      final bookingId = gameData['bookingId'] as String;
      
      // Update the booking to add the new player
      final bookingDoc = await _firestore.collection('bookings').doc(bookingId).get();
      if (!bookingDoc.exists) throw Exception('Booking not found');
      
      final bookingData = bookingDoc.data()!;
      final players = List<String>.from(bookingData['players'] ?? []);
      
      if (!players.contains(userPhone)) {
        players.add(userPhone);
        await _firestore.collection('bookings').doc(bookingId).update({
          'players': players,
        });
      }
    } catch (e) {
      print('Error joining open game: $e');
      throw e;
    }
  }
}