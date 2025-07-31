import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/booking_model.dart';
import 'firestore_service.dart';

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
      
      final snapshot = await _firestore
          .collection('bookings')
          .where('courtId', isEqualTo: courtId)
          .where('date', isGreaterThanOrEqualTo: Timestamp.fromDate(startOfDay))
          .where('date', isLessThanOrEqualTo: Timestamp.fromDate(endOfDay))
          .where('status', whereIn: ['confirmed', 'pending'])
          .get();
      
      return snapshot.docs
          .map((doc) => BookingModel.fromFirestore(doc))
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
  }) async {
    try {
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
        'price': price,
        'amount': price, // Для совместимости с админской версией
        'pricePerPlayer': pricePerPlayer,
        'playersCount': playersCount,
        'userId': userId,
        'status': 'pending',
        'paymentStatus': 'awaiting_payment',
        'paymentMethod': 'mobile_app',
        'source': 'mobile_app',
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
            playerLevel: 'amateur', // Default level, should be passed from UI
            playersNeeded: playersCount,
            pricePerPlayer: pricePerPlayer.toDouble(),
            description: 'Открытая игра в $venueName',
          );
        } catch (e) {
          print('Error creating open game: $e');
          // Don't throw here - booking is already created
        }
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