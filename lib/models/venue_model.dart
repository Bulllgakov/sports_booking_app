import 'package:cloud_firestore/cloud_firestore.dart';
import 'court_model.dart';

enum SportType { tennis, padel, badminton }
enum AmenityType { showers, parking, cafe, proshop, lockers }

// Helper function to parse workingHours safely
Map<String, String> _parseWorkingHours(dynamic data) {
  if (data == null) {
    return {
      'weekday': '07:00-23:00',
      'weekend': '08:00-22:00'
    };
  }
  
  if (data is Map) {
    final Map<String, String> result = {};
    data.forEach((key, value) {
      result[key.toString()] = value.toString();
    });
    return result;
  }
  
  return {
    'weekday': '07:00-23:00',
    'weekend': '08:00-22:00'
  };
}

// Helper function to parse bookingDurations safely
Map<int, bool> _parseBookingDurations(dynamic data) {
  if (data == null) {
    return {
      60: true,
      90: true,
      120: true
    };
  }
  
  if (data is Map) {
    final Map<int, bool> result = {};
    data.forEach((key, value) {
      final intKey = int.tryParse(key.toString());
      if (intKey != null) {
        result[intKey] = value == true;
      }
    });
    return result.isEmpty ? {60: true, 90: true, 120: true} : result;
  }
  
  return {
    60: true,
    90: true,
    120: true
  };
}

class VenueModel {
  final String id;
  final String name;
  final String address;
  final String? phone;
  final String? city;
  final GeoPoint? location;
  final List<String> photos;
  final String? logoUrl;
  final double rating;
  final List<String> amenities;
  final Map<String, String> workingHours;
  final Map<int, bool> bookingDurations;
  final int bookingSlotInterval; // 30 или 60 минут
  final String description;
  final String? organizationType;
  final String? inn;
  final String? bankAccount;
  final bool paymentEnabled;
  final String? status;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  
  // Runtime calculated fields (not stored in Firebase)
  double? distance;
  List<CourtModel> courts = [];

  VenueModel({
    required this.id,
    required this.name,
    required this.address,
    this.phone,
    this.city,
    this.location,
    required this.photos,
    this.logoUrl,
    required this.rating,
    required this.amenities,
    required this.workingHours,
    required this.bookingDurations,
    this.bookingSlotInterval = 30,
    required this.description,
    this.organizationType,
    this.inn,
    this.bankAccount,
    this.paymentEnabled = false,
    this.status = 'active',
    this.createdAt,
    this.updatedAt,
    this.distance,
  });

  factory VenueModel.fromMap(Map<String, dynamic> data) {
    return VenueModel(
      id: data['id']?.toString() ?? '',
      name: data['name']?.toString() ?? '',
      address: data['address']?.toString() ?? '',
      phone: data['phone']?.toString(),
      city: data['city']?.toString() ?? 'Москва',
      location: data['location'] is GeoPoint ? data['location'] : 
               (data['location'] is Map && data['location']['latitude'] != null && data['location']['longitude'] != null
                ? GeoPoint(data['location']['latitude'], data['location']['longitude'])
                : null),
      photos: List<String>.from(data['photos'] ?? []),
      logoUrl: data['logoUrl']?.toString(),
      rating: (data['rating'] ?? 4.5).toDouble(),
      amenities: List<String>.from(data['amenities'] ?? []),
      workingHours: _parseWorkingHours(data['workingHours']),
      bookingDurations: _parseBookingDurations(data['bookingDurations']),
      bookingSlotInterval: data['bookingSlotInterval'] ?? 30,
      description: data['description']?.toString() ?? '',',
      organizationType: data['organizationType']?.toString(),
      inn: data['inn']?.toString(),
      bankAccount: data['bankAccount']?.toString(),
      paymentEnabled: data['paymentEnabled'] ?? false,
      status: data['status']?.toString() ?? 'active',
      createdAt: data['createdAt']?.toDate(),
      updatedAt: data['updatedAt']?.toDate(),
    );
  }
  
  factory VenueModel.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    data['id'] = doc.id;
    return VenueModel.fromMap(data);
  }

  Map<String, dynamic> toFirestore() {
    return {
      'name': name,
      'address': address,
      'phone': phone,
      'city': city,
      'location': location,
      'photos': photos,
      'logoUrl': logoUrl,
      'rating': rating,
      'amenities': amenities,
      'workingHours': workingHours,
      'bookingDurations': bookingDurations,
      'bookingSlotInterval': bookingSlotInterval,
      'description': description,
      'organizationType': organizationType,
      'inn': inn,
      'bankAccount': bankAccount,
      'paymentEnabled': paymentEnabled,
      'status': status,
      'createdAt': createdAt ?? FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }

  String getSportName(SportType sport) {
    switch (sport) {
      case SportType.tennis:
        return 'Теннис';
      case SportType.padel:
        return 'Падел';
      case SportType.badminton:
        return 'Бадминтон';
    }
  }

  String getAmenityName(String amenity) {
    switch (amenity) {
      case 'showers':
        return 'Душевые';
      case 'parking':
        return 'Парковка';
      case 'cafe':
        return 'Кафе';
      case 'proshop':
        return 'Pro Shop';
      case 'lockers':
        return 'Раздевалки';
      default:
        return amenity;
    }
  }
}