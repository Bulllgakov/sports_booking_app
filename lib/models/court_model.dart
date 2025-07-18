import 'package:cloud_firestore/cloud_firestore.dart';

enum CourtType { indoor, outdoor }

class CourtModel {
  final String id;
  final String venueId;
  final String name;
  final String type; // 'tennis', 'padel', 'badminton'
  final String courtType; // 'indoor' or 'outdoor'
  final double priceWeekday;
  final double priceWeekend;
  
  // Computed property for backward compatibility
  double get pricePerHour => priceWeekday;
  final String status; // 'active', 'inactive', 'maintenance'
  final DateTime? createdAt;

  CourtModel({
    required this.id,
    required this.venueId,
    required this.name,
    required this.type,
    required this.courtType,
    required this.priceWeekday,
    required this.priceWeekend,
    required this.status,
    this.createdAt,
  });

  factory CourtModel.fromMap(Map<String, dynamic> data) {
    return CourtModel(
      id: data['id'] ?? '',
      venueId: data['venueId'] ?? '',
      name: data['name'] ?? '',
      type: data['type'] ?? 'padel',
      courtType: data['courtType'] ?? 'indoor',
      priceWeekday: (data['priceWeekday'] ?? 1900).toDouble(),
      priceWeekend: (data['priceWeekend'] ?? 2400).toDouble(),
      status: data['status'] ?? 'active',
      createdAt: data['createdAt']?.toDate(),
    );
  }
  
  factory CourtModel.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    data['id'] = doc.id;
    return CourtModel.fromMap(data);
  }

  Map<String, dynamic> toFirestore() {
    return {
      'venueId': venueId,
      'name': name,
      'type': type,
      'courtType': courtType,
      'priceWeekday': priceWeekday,
      'priceWeekend': priceWeekend,
      'status': status,
      'createdAt': createdAt ?? FieldValue.serverTimestamp(),
    };
  }

  double calculatePrice(int durationMinutes, bool isWeekend) {
    double hours = durationMinutes / 60;
    return isWeekend ? priceWeekend * hours : priceWeekday * hours;
  }
  
  String get sportLabel {
    switch (type) {
      case 'tennis':
        return 'Теннис';
      case 'padel':
        return 'Падел';
      case 'badminton':
        return 'Бадминтон';
      default:
        return type;
    }
  }

  String get courtTypeText {
    switch (courtType) {
      case 'indoor':
        return 'Крытый';
      case 'outdoor':
        return 'Открытый';
      default:
        return courtType;
    }
  }
  
  bool get isActive => status == 'active';
}