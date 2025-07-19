import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user_model.dart';
import '../models/venue_model.dart';
import '../models/court_model.dart';
import '../models/booking_model.dart';
import '../models/open_game_model.dart';
import '../models/payment_model.dart';

class FirestoreService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Collections
  static const String _usersCollection = 'users';
  static const String _venuesCollection = 'venues';
  // static const String _courtsCollection = 'courts'; // Больше не используется - корты теперь в подколлекции venues/{venueId}/courts
  static const String _bookingsCollection = 'bookings';
  static const String _openGamesCollection = 'openGames';
  static const String _paymentsCollection = 'payments';

  // User operations
  static Future<void> createUser(UserModel user) async {
    await _firestore.collection(_usersCollection).doc(user.uid).set(user.toFirestore());
  }

  static Future<UserModel?> getUser(String uid) async {
    final doc = await _firestore.collection(_usersCollection).doc(uid).get();
    if (doc.exists) {
      return UserModel.fromFirestore(doc);
    }
    return null;
  }

  static Future<void> updateUser(UserModel user) async {
    await _firestore.collection(_usersCollection).doc(user.uid).update(user.toFirestore());
  }

  // Venue operations
  static Future<List<VenueModel>> getVenues({
    GeoPoint? center,
    double? radiusKm,
    SportType? sport,
  }) async {
    Query query = _firestore.collection(_venuesCollection);

    if (sport != null) {
      query = query.where('sports', arrayContains: sport.toString().split('.').last);
    }

    final querySnapshot = await query.get();
    return querySnapshot.docs.map((doc) => VenueModel.fromFirestore(doc)).toList();
  }

  static Future<VenueModel?> getVenue(String venueId) async {
    final doc = await _firestore.collection(_venuesCollection).doc(venueId).get();
    if (doc.exists) {
      return VenueModel.fromFirestore(doc);
    }
    return null;
  }

  // Court operations
  static Future<List<CourtModel>> getCourtsByVenue(String venueId) async {
    final querySnapshot = await _firestore
        .collection(_venuesCollection)
        .doc(venueId)
        .collection('courts')
        .where('isActive', isEqualTo: true)
        .get();

    return querySnapshot.docs.map((doc) => CourtModel.fromFirestore(doc)).toList();
  }

  static Future<CourtModel?> getCourt(String courtId) async {
    // Нужно найти корт в любом клубе
    final venuesSnapshot = await _firestore.collection(_venuesCollection).get();
    
    for (final venueDoc in venuesSnapshot.docs) {
      final courtDoc = await _firestore
          .collection(_venuesCollection)
          .doc(venueDoc.id)
          .collection('courts')
          .doc(courtId)
          .get();
          
      if (courtDoc.exists) {
        return CourtModel.fromFirestore(courtDoc);
      }
    }
    return null;
  }

  // Booking operations
  static Future<String> createBooking(BookingModel booking) async {
    final docRef = await _firestore.collection(_bookingsCollection).add(booking.toFirestore());
    return docRef.id;
  }

  static Future<List<BookingModel>> getUserBookings(String userId) async {
    final querySnapshot = await _firestore
        .collection(_bookingsCollection)
        .where('userId', isEqualTo: userId)
        .orderBy('createdAt', descending: true)
        .get();

    return querySnapshot.docs.map((doc) => BookingModel.fromFirestore(doc)).toList();
  }

  static Future<List<BookingModel>> getUpcomingBookings(String userId) async {
    final now = DateTime.now();
    final querySnapshot = await _firestore
        .collection(_bookingsCollection)
        .where('userId', isEqualTo: userId)
        .where('startTime', isGreaterThan: Timestamp.fromDate(now))
        .where('status', isEqualTo: 'confirmed')
        .orderBy('startTime')
        .get();

    return querySnapshot.docs.map((doc) => BookingModel.fromFirestore(doc)).toList();
  }

  static Future<BookingModel?> getBooking(String bookingId) async {
    final doc = await _firestore.collection(_bookingsCollection).doc(bookingId).get();
    if (doc.exists) {
      return BookingModel.fromFirestore(doc);
    }
    return null;
  }

  static Future<void> updateBookingStatus(String bookingId, BookingStatus status) async {
    await _firestore.collection(_bookingsCollection).doc(bookingId).update({
      'status': status.toString().split('.').last,
    });
  }

  static Future<void> cancelBooking(String bookingId) async {
    await updateBookingStatus(bookingId, BookingStatus.cancelled);
  }

  // Check if time slot is available
  static Future<bool> isTimeSlotAvailable({
    required String courtId,
    required DateTime startTime,
    required DateTime endTime,
  }) async {
    final querySnapshot = await _firestore
        .collection(_bookingsCollection)
        .where('courtId', isEqualTo: courtId)
        .where('status', whereIn: ['pending', 'confirmed'])
        .get();

    for (final doc in querySnapshot.docs) {
      final booking = BookingModel.fromFirestore(doc);
      
      // Check for overlap
      if (startTime.isBefore(booking.endTime) && endTime.isAfter(booking.startTime)) {
        return false;
      }
    }
    return true;
  }

  // Open Game operations
  static Future<String> createOpenGame(OpenGameModel openGame) async {
    final docRef = await _firestore.collection(_openGamesCollection).add(openGame.toFirestore());
    return docRef.id;
  }

  static Future<List<OpenGameModel>> getOpenGames({
    PlayerLevel? playerLevel,
    GeoPoint? center,
    double? radiusKm,
  }) async {
    Query query = _firestore.collection(_openGamesCollection)
        .where('status', isEqualTo: 'open');

    if (playerLevel != null) {
      query = query.where('playerLevel', isEqualTo: playerLevel.toString().split('.').last);
    }

    final querySnapshot = await query.get();
    return querySnapshot.docs.map((doc) => OpenGameModel.fromFirestore(doc)).toList();
  }

  static Future<void> joinOpenGame(String gameId, String playerId) async {
    final docRef = _firestore.collection(_openGamesCollection).doc(gameId);
    
    await _firestore.runTransaction((transaction) async {
      final snapshot = await transaction.get(docRef);
      final game = OpenGameModel.fromFirestore(snapshot);
      
      if (!game.playersJoined.contains(playerId) && !game.isFull) {
        final updatedPlayers = [...game.playersJoined, playerId];
        final newStatus = updatedPlayers.length >= game.playersNeeded 
            ? OpenGameStatus.full 
            : OpenGameStatus.open;
        
        transaction.update(docRef, {
          'playersJoined': updatedPlayers,
          'status': newStatus.toString().split('.').last,
        });
      }
    });
  }

  static Future<void> leaveOpenGame(String gameId, String playerId) async {
    final docRef = _firestore.collection(_openGamesCollection).doc(gameId);
    
    await _firestore.runTransaction((transaction) async {
      final snapshot = await transaction.get(docRef);
      final game = OpenGameModel.fromFirestore(snapshot);
      
      if (game.playersJoined.contains(playerId)) {
        final updatedPlayers = game.playersJoined.where((id) => id != playerId).toList();
        
        transaction.update(docRef, {
          'playersJoined': updatedPlayers,
          'status': OpenGameStatus.open.toString().split('.').last,
        });
      }
    });
  }

  // Payment operations
  static Future<String> createPayment(PaymentModel payment) async {
    final docRef = await _firestore.collection(_paymentsCollection).add(payment.toFirestore());
    return docRef.id;
  }

  static Future<List<PaymentModel>> getUserPayments(String userId) async {
    final querySnapshot = await _firestore
        .collection(_paymentsCollection)
        .where('userId', isEqualTo: userId)
        .orderBy('createdAt', descending: true)
        .get();

    return querySnapshot.docs.map((doc) => PaymentModel.fromFirestore(doc)).toList();
  }

  static Future<void> updatePaymentStatus(String paymentId, PaymentStatus status) async {
    await _firestore.collection(_paymentsCollection).doc(paymentId).update({
      'status': status.toString().split('.').last,
    });
  }

  // Search and filters
  static Future<List<VenueModel>> searchVenues(String searchQuery) async {
    final querySnapshot = await _firestore
        .collection(_venuesCollection)
        .where('name', isGreaterThanOrEqualTo: searchQuery)
        .where('name', isLessThan: '${searchQuery}z')
        .get();

    return querySnapshot.docs.map((doc) => VenueModel.fromFirestore(doc)).toList();
  }

  // Get venue bookings for availability check
  static Future<List<BookingModel>> getVenueBookings({
    required String venueId,
    required DateTime date,
  }) async {
    final startOfDay = DateTime(date.year, date.month, date.day);
    final endOfDay = DateTime(date.year, date.month, date.day, 23, 59, 59);

    final querySnapshot = await _firestore
        .collection(_bookingsCollection)
        .where('venueId', isEqualTo: venueId)
        .where('date', isGreaterThanOrEqualTo: Timestamp.fromDate(startOfDay))
        .where('date', isLessThanOrEqualTo: Timestamp.fromDate(endOfDay))
        .where('status', whereIn: ['pending', 'confirmed'])
        .get();

    return querySnapshot.docs.map((doc) => BookingModel.fromFirestore(doc)).toList();
  }
}