import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/booking_model.dart';

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
    required String source,
    String? customerEmail,
  }) async {
    try {
      final bookingData = {
        'courtId': courtId,
        'courtName': courtName,
        'venueId': venueId,
        'venueName': venueName,
        'date': dateString, // Используем строковый формат для совместимости
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
        'status': 'pending',
        'paymentStatus': 'awaiting_payment',
        'paymentMethod': 'mobile_app',
        'source': source,
        'createdAt': FieldValue.serverTimestamp(),
        'createdBy': {
          'userId': 'mobile-user',
          'userName': customerName,
          'userRole': 'client'
        }
      };
      
      final docRef = await _firestore.collection('bookings').add(bookingData);
      return docRef.id;
    } catch (e) {
      print('Error creating booking: $e');
      throw e;
    }
  }
}