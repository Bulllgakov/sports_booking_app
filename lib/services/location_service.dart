import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class LocationService {
  static const double defaultLatitude = 55.7558; // Moscow
  static const double defaultLongitude = 37.6173;
  
  // Check if location services are enabled
  Future<bool> isLocationServiceEnabled() async {
    return await Geolocator.isLocationServiceEnabled();
  }
  
  // Request location permission
  Future<LocationPermission> requestLocationPermission() async {
    LocationPermission permission = await Geolocator.checkPermission();
    
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    
    return permission;
  }
  
  // Get current position
  Future<Position?> getCurrentPosition() async {
    try {
      // Check if location services are enabled
      bool serviceEnabled = await isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint('Location services are disabled.');
        return null;
      }
      
      // Check permission
      LocationPermission permission = await requestLocationPermission();
      
      if (permission == LocationPermission.denied) {
        debugPrint('Location permissions are denied');
        return null;
      }
      
      if (permission == LocationPermission.deniedForever) {
        debugPrint('Location permissions are permanently denied');
        return null;
      }
      
      // Get current position
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );
    } catch (e) {
      debugPrint('Error getting location: $e');
      return null;
    }
  }
  
  // Get city name from coordinates
  Future<String?> getCityFromCoordinates(double latitude, double longitude) async {
    try {
      List<Placemark> placemarks = await placemarkFromCoordinates(
        latitude,
        longitude,
      );
      
      if (placemarks.isNotEmpty) {
        Placemark place = placemarks[0];
        return place.locality ?? place.administrativeArea ?? 'Неизвестно';
      }
    } catch (e) {
      debugPrint('Error getting city name: $e');
    }
    return null;
  }
  
  // Calculate distance between two points in kilometers
  double calculateDistance(
    double startLatitude,
    double startLongitude,
    double endLatitude,
    double endLongitude,
  ) {
    return Geolocator.distanceBetween(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    ) / 1000; // Convert to kilometers
  }
  
  // Convert Position to GeoPoint for Firebase
  GeoPoint positionToGeoPoint(Position position) {
    return GeoPoint(position.latitude, position.longitude);
  }
  
  // Get venues sorted by distance
  Future<List<Map<String, dynamic>>> getVenuesSortedByDistance(
    List<Map<String, dynamic>> venues,
    Position userPosition,
  ) async {
    // Calculate distance for each venue
    for (var venue in venues) {
      if (venue['location'] != null && venue['location'] is GeoPoint) {
        GeoPoint venueLocation = venue['location'];
        double distance = calculateDistance(
          userPosition.latitude,
          userPosition.longitude,
          venueLocation.latitude,
          venueLocation.longitude,
        );
        venue['distance'] = distance;
      } else {
        venue['distance'] = double.infinity;
      }
    }
    
    // Sort by distance
    venues.sort((a, b) => a['distance'].compareTo(b['distance']));
    
    return venues;
  }
  
  // Open app settings if permission denied forever
  Future<void> openAppSettings() async {
    await openAppSettings();
  }
  
  // Show location permission dialog
  Future<bool> showLocationPermissionDialog(BuildContext context) async {
    return await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Разрешить доступ к геолокации?'),
          content: const Text(
            'Приложению нужен доступ к вашему местоположению, чтобы показать ближайшие спортивные клубы.',
          ),
          actions: <Widget>[
            TextButton(
              child: const Text('Отмена'),
              onPressed: () => Navigator.of(context).pop(false),
            ),
            TextButton(
              child: const Text('Разрешить'),
              onPressed: () => Navigator.of(context).pop(true),
            ),
          ],
        );
      },
    ) ?? false;
  }
  
  // Format distance for display
  String formatDistance(double distance) {
    if (distance < 1) {
      return '${(distance * 1000).toInt()} м';
    } else {
      return '${distance.toStringAsFixed(1)} км';
    }
  }
}