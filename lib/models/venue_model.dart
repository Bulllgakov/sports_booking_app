import 'package:cloud_firestore/cloud_firestore.dart';

enum SportType { tennis, padel, badminton }
enum AmenityType { shower, parking, cafe, wifi, lighting }

class VenueModel {
  final String id;
  final String name;
  final String address;
  final GeoPoint location;
  final List<String> photos;
  final double rating;
  final List<SportType> sports;
  final List<AmenityType> amenities;
  final Map<String, String> workingHours;
  final String description;

  VenueModel({
    required this.id,
    required this.name,
    required this.address,
    required this.location,
    required this.photos,
    required this.rating,
    required this.sports,
    required this.amenities,
    required this.workingHours,
    required this.description,
  });

  factory VenueModel.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    return VenueModel(
      id: doc.id,
      name: data['name'] ?? '',
      address: data['address'] ?? '',
      location: data['location'] ?? const GeoPoint(0, 0),
      photos: List<String>.from(data['photos'] ?? []),
      rating: (data['rating'] ?? 0).toDouble(),
      sports: (data['sports'] as List<dynamic>?)
              ?.map((sport) => SportType.values.firstWhere(
                    (e) => e.toString().split('.').last == sport,
                    orElse: () => SportType.tennis,
                  ))
              .toList() ??
          [],
      amenities: (data['amenities'] as List<dynamic>?)
              ?.map((amenity) => AmenityType.values.firstWhere(
                    (e) => e.toString().split('.').last == amenity,
                    orElse: () => AmenityType.wifi,
                  ))
              .toList() ??
          [],
      workingHours: Map<String, String>.from(data['workingHours'] ?? {}),
      description: data['description'] ?? '',
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'name': name,
      'address': address,
      'location': location,
      'photos': photos,
      'rating': rating,
      'sports': sports.map((sport) => sport.toString().split('.').last).toList(),
      'amenities': amenities.map((amenity) => amenity.toString().split('.').last).toList(),
      'workingHours': workingHours,
      'description': description,
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

  String getAmenityName(AmenityType amenity) {
    switch (amenity) {
      case AmenityType.shower:
        return 'Душ';
      case AmenityType.parking:
        return 'Парковка';
      case AmenityType.cafe:
        return 'Кафе';
      case AmenityType.wifi:
        return 'Wi-Fi';
      case AmenityType.lighting:
        return 'Освещение';
    }
  }
}