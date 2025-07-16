import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/venue_model.dart';
import '../models/court_model.dart';
import '../models/booking_model.dart';
import '../services/firestore_service.dart';

class VenuesProvider extends ChangeNotifier {
  List<VenueModel> _venues = [];
  List<VenueModel> get venues => _venues;

  List<CourtModel> _courts = [];
  List<CourtModel> get courts => _courts;

  VenueModel? _selectedVenue;
  VenueModel? get selectedVenue => _selectedVenue;

  CourtModel? _selectedCourt;
  CourtModel? get selectedCourt => _selectedCourt;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  // Search and filter properties
  String _searchQuery = '';
  String get searchQuery => _searchQuery;

  SportType? _selectedSport;
  SportType? get selectedSport => _selectedSport;

  double _maxDistance = 10.0; // km
  double get maxDistance => _maxDistance;

  GeoPoint? _userLocation;
  GeoPoint? get userLocation => _userLocation;

  // Load venues
  Future<void> loadVenues() async {
    _setLoading(true);
    _setError(null);

    try {
      _venues = await FirestoreService.getVenues(
        center: _userLocation,
        radiusKm: _maxDistance,
        sport: _selectedSport,
      );
      notifyListeners();
    } catch (e) {
      _setError('Ошибка загрузки кортов: $e');
    } finally {
      _setLoading(false);
    }
  }

  // Search venues
  Future<void> searchVenues(String query) async {
    _searchQuery = query;
    
    if (query.isEmpty) {
      await loadVenues();
      return;
    }

    _setLoading(true);
    _setError(null);

    try {
      _venues = await FirestoreService.searchVenues(query);
      notifyListeners();
    } catch (e) {
      _setError('Ошибка поиска: $e');
    } finally {
      _setLoading(false);
    }
  }

  // Set filters
  void setSportFilter(SportType? sport) {
    _selectedSport = sport;
    loadVenues();
  }

  void setMaxDistance(double distance) {
    _maxDistance = distance;
    loadVenues();
  }

  void setUserLocation(GeoPoint location) {
    _userLocation = location;
    loadVenues();
  }

  // Select venue and load courts
  Future<void> selectVenue(VenueModel venue) async {
    _selectedVenue = venue;
    _selectedCourt = null;
    notifyListeners();

    await loadCourts(venue.id);
  }

  // Load courts for venue
  Future<void> loadCourts(String venueId) async {
    _setLoading(true);
    _setError(null);

    try {
      _courts = await FirestoreService.getCourtsByVenue(venueId);
      notifyListeners();
    } catch (e) {
      _setError('Ошибка загрузки кортов: $e');
    } finally {
      _setLoading(false);
    }
  }

  // Select court
  void selectCourt(CourtModel court) {
    _selectedCourt = court;
    notifyListeners();
  }

  // Check availability for a court
  Future<bool> checkAvailability({
    required String courtId,
    required DateTime startTime,
    required DateTime endTime,
  }) async {
    try {
      return await FirestoreService.isTimeSlotAvailable(
        courtId: courtId,
        startTime: startTime,
        endTime: endTime,
      );
    } catch (e) {
      _setError('Ошибка проверки доступности: $e');
      return false;
    }
  }

  // Get venue bookings for a specific date
  Future<List<BookingModel>> getVenueBookings({
    required String venueId,
    required DateTime date,
  }) async {
    try {
      return await FirestoreService.getVenueBookings(
        venueId: venueId,
        date: date,
      );
    } catch (e) {
      _setError('Ошибка загрузки бронирований: $e');
      return [];
    }
  }

  // Clear selection
  void clearSelection() {
    _selectedVenue = null;
    _selectedCourt = null;
    _courts.clear();
    notifyListeners();
  }

  // Clear filters
  void clearFilters() {
    _searchQuery = '';
    _selectedSport = null;
    _maxDistance = 10.0;
    loadVenues();
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

  // Get filtered venues based on current filters
  List<VenueModel> get filteredVenues {
    List<VenueModel> filtered = List.from(_venues);

    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((venue) =>
          venue.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          venue.address.toLowerCase().contains(_searchQuery.toLowerCase())).toList();
    }

    if (_selectedSport != null) {
      filtered = filtered.where((venue) =>
          venue.sports.contains(_selectedSport)).toList();
    }

    return filtered;
  }
}