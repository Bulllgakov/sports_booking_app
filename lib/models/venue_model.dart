import 'package:cloud_firestore/cloud_firestore.dart';

enum SportType { tennis, padel, badminton }
enum AmenityType { showers, parking, cafe, proshop, lockers }

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
  final String description;
  final String? organizationType;
  final String? inn;
  final String? bankAccount;
  final bool paymentEnabled;
  final String? status;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  
  // Runtime calculated field (not stored in Firebase)
  double? distance;

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
      id: data['id'] ?? '',
      name: data['name'] ?? '',
      address: data['address'] ?? '',
      phone: data['phone'],
      city: data['city'] ?? 'Москва',
      location: data['location'] is GeoPoint ? data['location'] : 
               (data['location'] is Map && data['location']['latitude'] != null && data['location']['longitude'] != null
                ? GeoPoint(data['location']['latitude'], data['location']['longitude'])
                : null),
      photos: List<String>.from(data['photos'] ?? []),
      logoUrl: data['logoUrl'],
      rating: (data['rating'] ?? 4.5).toDouble(),
      amenities: List<String>.from(data['amenities'] ?? []),
      workingHours: Map<String, String>.from(data['workingHours'] ?? {
        'weekday': '07:00-23:00',
        'weekend': '08:00-22:00'
      }),
      description: data['description'] ?? '',
      organizationType: data['organizationType'],
      inn: data['inn'],
      bankAccount: data['bankAccount'],
      paymentEnabled: data['paymentEnabled'] ?? false,
      status: data['status'] ?? 'active',
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