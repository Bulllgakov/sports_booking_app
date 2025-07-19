import 'package:flutter/material.dart';
import '../models/booking_model.dart';
import '../services/firestore_service.dart';

class BookingsProvider extends ChangeNotifier {
  List<BookingModel> _userBookings = [];
  List<BookingModel> get userBookings => _userBookings;

  List<BookingModel> _upcomingBookings = [];
  List<BookingModel> get upcomingBookings => _upcomingBookings;

  BookingModel? _selectedBooking;
  BookingModel? get selectedBooking => _selectedBooking;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  // Current booking creation state
  String? _selectedVenueId;
  String? _selectedCourtId;
  DateTime? _selectedDate;
  DateTime? _selectedStartTime;
  DateTime? _selectedEndTime;
  GameType? _selectedGameType;
  double? _totalPrice;

  // Getters for booking creation
  String? get selectedVenueId => _selectedVenueId;
  String? get selectedCourtId => _selectedCourtId;
  DateTime? get selectedDate => _selectedDate;
  DateTime? get selectedStartTime => _selectedStartTime;
  DateTime? get selectedEndTime => _selectedEndTime;
  GameType? get selectedGameType => _selectedGameType;
  double? get totalPrice => _totalPrice;

  // Load user bookings
  Future<void> loadUserBookings(String userId) async {
    _setLoading(true);
    _setError(null);

    try {
      _userBookings = await FirestoreService.getUserBookings(userId);
      notifyListeners();
    } catch (e) {
      _setError('Ошибка загрузки бронирований: $e');
    } finally {
      _setLoading(false);
    }
  }

  // Load upcoming bookings
  Future<void> loadUpcomingBookings(String userId) async {
    _setLoading(true);
    _setError(null);

    try {
      _upcomingBookings = await FirestoreService.getUpcomingBookings(userId);
      notifyListeners();
    } catch (e) {
      _setError('Ошибка загрузки предстоящих бронирований: $e');
    } finally {
      _setLoading(false);
    }
  }

  // Create new booking
  Future<bool> createBooking({
    required String userId,
    required String venueId,
    required String courtId,
    required DateTime date,
    required DateTime startTime,
    required DateTime endTime,
    required GameType gameType,
    required double totalPrice,
    List<String>? players,
  }) async {
    _setLoading(true);
    _setError(null);

    try {
      final booking = BookingModel(
        id: '', // Will be set by Firestore
        userId: userId,
        venueId: venueId,
        courtId: courtId,
        date: date,
        startTime: startTime,
        endTime: endTime,
        gameType: gameType,
        status: BookingStatus.pending,
        totalPrice: totalPrice,
        players: players ?? [userId],
        createdAt: DateTime.now(),
      );

      await FirestoreService.createBooking(booking);
      
      // Reload bookings
      await loadUserBookings(userId);
      await loadUpcomingBookings(userId);
      
      return true;
    } catch (e) {
      _setError('Ошибка создания бронирования: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Cancel booking
  Future<bool> cancelBooking(String bookingId, String userId) async {
    _setLoading(true);
    _setError(null);

    try {
      await FirestoreService.cancelBooking(bookingId);
      
      // Reload bookings
      await loadUserBookings(userId);
      await loadUpcomingBookings(userId);
      
      return true;
    } catch (e) {
      _setError('Ошибка отмены бронирования: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Update booking status
  Future<void> updateBookingStatus(String bookingId, BookingStatus status) async {
    try {
      await FirestoreService.updateBookingStatus(bookingId, status);
      
      // Update local booking if it exists
      final index = _userBookings.indexWhere((b) => b.id == bookingId);
      if (index != -1) {
        _userBookings[index] = _userBookings[index].copyWith(status: status);
        notifyListeners();
      }
    } catch (e) {
      _setError('Ошибка обновления статуса: $e');
    }
  }

  // Booking creation flow methods
  void setSelectedVenue(String venueId) {
    _selectedVenueId = venueId;
    _selectedCourtId = null;
    notifyListeners();
  }

  void setSelectedCourt(String courtId) {
    _selectedCourtId = courtId;
    notifyListeners();
  }

  void setSelectedDate(DateTime date) {
    _selectedDate = date;
    notifyListeners();
  }

  void setSelectedTime(DateTime startTime, DateTime endTime) {
    _selectedStartTime = startTime;
    _selectedEndTime = endTime;
    _calculatePrice();
    notifyListeners();
  }

  void setSelectedGameType(GameType gameType) {
    _selectedGameType = gameType;
    notifyListeners();
  }

  void setTotalPrice(double price) {
    _totalPrice = price;
    notifyListeners();
  }

  // Calculate price based on duration
  void _calculatePrice() {
    if (_selectedStartTime != null && _selectedEndTime != null) {
      final duration = _selectedEndTime!.difference(_selectedStartTime!);
      final hours = duration.inMinutes / 60.0;
      
      // Base price calculation (should be based on court pricing)
      _totalPrice = hours * 2000; // Default 2000 rub per hour
    }
  }

  // Clear booking creation state
  void clearBookingState() {
    _selectedVenueId = null;
    _selectedCourtId = null;
    _selectedDate = null;
    _selectedStartTime = null;
    _selectedEndTime = null;
    _selectedGameType = null;
    _totalPrice = null;
    notifyListeners();
  }

  // Select booking for details
  void selectBooking(BookingModel booking) {
    _selectedBooking = booking;
    notifyListeners();
  }

  // Clear selected booking
  void clearSelectedBooking() {
    _selectedBooking = null;
    notifyListeners();
  }

  // Get bookings by status
  List<BookingModel> getBookingsByStatus(BookingStatus status) {
    return _userBookings.where((booking) => booking.status == status).toList();
  }

  // Get upcoming bookings (next 7 days)
  List<BookingModel> getUpcomingBookingsThisWeek() {
    final now = DateTime.now();
    final nextWeek = now.add(const Duration(days: 7));
    
    return _upcomingBookings.where((booking) =>
        booking.startTime.isAfter(now) &&
        booking.startTime.isBefore(nextWeek)).toList();
  }

  // Helper methods
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String? error) {
    _error = error;
    notifyListeners();
  }

  // Check if booking creation is ready
  bool get isBookingReady {
    return _selectedVenueId != null &&
           _selectedCourtId != null &&
           _selectedDate != null &&
           _selectedStartTime != null &&
           _selectedEndTime != null &&
           _selectedGameType != null;
  }
}