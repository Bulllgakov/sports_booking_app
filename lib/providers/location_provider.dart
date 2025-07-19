import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../services/location_service.dart';

class LocationProvider extends ChangeNotifier {
  final LocationService _locationService = LocationService();
  
  Position? _currentPosition;
  String? _currentCity;
  bool _isLoading = false;
  String? _error;
  bool _hasLocationPermission = false;
  
  Position? get currentPosition => _currentPosition;
  String? get currentCity => _currentCity;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasLocationPermission => _hasLocationPermission;
  
  // Initialize location
  Future<void> initializeLocation() async {
    _setLoading(true);
    _setError(null);
    
    try {
      // Check and request permission
      final permission = await _locationService.requestLocationPermission();
      _hasLocationPermission = permission == LocationPermission.always || 
                               permission == LocationPermission.whileInUse;
      
      if (_hasLocationPermission) {
        // Get current position
        final position = await _locationService.getCurrentPosition();
        
        if (position != null) {
          _currentPosition = position;
          
          // Get city name
          final city = await _locationService.getCityFromCoordinates(
            position.latitude, 
            position.longitude
          );
          _currentCity = city ?? 'Неизвестно';
        } else {
          _setError('Не удалось определить местоположение');
        }
      } else {
        _setError('Нет разрешения на использование геолокации');
      }
    } catch (e) {
      _setError('Ошибка при определении местоположения: $e');
    } finally {
      _setLoading(false);
      notifyListeners();
    }
  }
  
  // Update current position
  Future<void> updatePosition() async {
    if (!_hasLocationPermission) {
      await initializeLocation();
      return;
    }
    
    _setLoading(true);
    
    try {
      final position = await _locationService.getCurrentPosition();
      
      if (position != null) {
        _currentPosition = position;
        
        // Update city if position changed significantly (more than 1km)
        if (_currentPosition == null || 
            _locationService.calculateDistance(
              _currentPosition!.latitude,
              _currentPosition!.longitude,
              position.latitude,
              position.longitude
            ) > 1.0) {
          final city = await _locationService.getCityFromCoordinates(
            position.latitude, 
            position.longitude
          );
          _currentCity = city ?? _currentCity;
        }
      }
    } catch (e) {
      _setError('Ошибка обновления местоположения: $e');
    } finally {
      _setLoading(false);
      notifyListeners();
    }
  }
  
  // Get current location - alias for compatibility
  Future<Position?> getCurrentLocation() async {
    if (_currentPosition == null) {
      await updatePosition();
    }
    return _currentPosition;
  }
  
  // Calculate distance to venue
  double? calculateDistanceToVenue(double? venueLat, double? venueLon) {
    if (_currentPosition == null || venueLat == null || venueLon == null) {
      return null;
    }
    
    return _locationService.calculateDistance(
      _currentPosition!.latitude,
      _currentPosition!.longitude,
      venueLat,
      venueLon,
    );
  }
  
  // Format distance for display
  String formatDistance(double? distance) {
    if (distance == null) return '';
    return _locationService.formatDistance(distance);
  }
  
  // Open app settings
  Future<void> openAppSettings() async {
    await _locationService.openAppSettings();
  }
  
  // Helper methods
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }
  
  void _setError(String? error) {
    _error = error;
    if (error != null) {
      debugPrint('LocationProvider Error: $error');
    }
    notifyListeners();
  }
}