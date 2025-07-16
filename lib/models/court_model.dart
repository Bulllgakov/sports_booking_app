import 'package:cloud_firestore/cloud_firestore.dart';
import 'venue_model.dart';

enum CourtType { indoor, outdoor }

class CourtModel {
  final String id;
  final String venueId;
  final String name;
  final SportType sport;
  final CourtType type;
  final double pricePerHour;
  final double pricePerHalfHour;
  final int minBookingDuration; // в минутах
  final int maxBookingDuration; // в минутах
  final bool isActive;

  CourtModel({
    required this.id,
    required this.venueId,
    required this.name,
    required this.sport,
    required this.type,
    required this.pricePerHour,
    required this.pricePerHalfHour,
    required this.minBookingDuration,
    required this.maxBookingDuration,
    required this.isActive,
  });

  factory CourtModel.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    return CourtModel(
      id: doc.id,
      venueId: data['venueId'] ?? '',
      name: data['name'] ?? '',
      sport: SportType.values.firstWhere(
        (e) => e.toString().split('.').last == data['sport'],
        orElse: () => SportType.tennis,
      ),
      type: CourtType.values.firstWhere(
        (e) => e.toString().split('.').last == data['type'],
        orElse: () => CourtType.outdoor,
      ),
      pricePerHour: (data['pricePerHour'] ?? 0).toDouble(),
      pricePerHalfHour: (data['pricePerHalfHour'] ?? 0).toDouble(),
      minBookingDuration: data['minBookingDuration'] ?? 30,
      maxBookingDuration: data['maxBookingDuration'] ?? 180,
      isActive: data['isActive'] ?? true,
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'venueId': venueId,
      'name': name,
      'sport': sport.toString().split('.').last,
      'type': type.toString().split('.').last,
      'pricePerHour': pricePerHour,
      'pricePerHalfHour': pricePerHalfHour,
      'minBookingDuration': minBookingDuration,
      'maxBookingDuration': maxBookingDuration,
      'isActive': isActive,
    };
  }

  double calculatePrice(int durationMinutes) {
    if (durationMinutes <= 30) {
      return pricePerHalfHour;
    }
    double hours = durationMinutes / 60;
    return pricePerHour * hours;
  }

  String get typeText {
    switch (type) {
      case CourtType.indoor:
        return 'Крытый';
      case CourtType.outdoor:
        return 'Открытый';
    }
  }
}