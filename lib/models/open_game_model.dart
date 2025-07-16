import 'package:cloud_firestore/cloud_firestore.dart';
import 'user_model.dart';

enum OpenGameStatus { open, full, completed }

class OpenGameModel {
  final String id;
  final String organizerId;
  final String bookingId;
  final PlayerLevel playerLevel;
  final int playersNeeded;
  final List<String> playersJoined;
  final String description;
  final double pricePerPlayer;
  final OpenGameStatus status;

  OpenGameModel({
    required this.id,
    required this.organizerId,
    required this.bookingId,
    required this.playerLevel,
    required this.playersNeeded,
    required this.playersJoined,
    required this.description,
    required this.pricePerPlayer,
    required this.status,
  });

  factory OpenGameModel.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    return OpenGameModel(
      id: doc.id,
      organizerId: data['organizerId'] ?? '',
      bookingId: data['bookingId'] ?? '',
      playerLevel: PlayerLevel.values.firstWhere(
        (e) => e.toString().split('.').last == data['playerLevel'],
        orElse: () => PlayerLevel.beginner,
      ),
      playersNeeded: data['playersNeeded'] ?? 1,
      playersJoined: List<String>.from(data['playersJoined'] ?? []),
      description: data['description'] ?? '',
      pricePerPlayer: (data['pricePerPlayer'] ?? 0).toDouble(),
      status: OpenGameStatus.values.firstWhere(
        (e) => e.toString().split('.').last == data['status'],
        orElse: () => OpenGameStatus.open,
      ),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'organizerId': organizerId,
      'bookingId': bookingId,
      'playerLevel': playerLevel.toString().split('.').last,
      'playersNeeded': playersNeeded,
      'playersJoined': playersJoined,
      'description': description,
      'pricePerPlayer': pricePerPlayer,
      'status': status.toString().split('.').last,
    };
  }

  OpenGameModel copyWith({
    String? id,
    String? organizerId,
    String? bookingId,
    PlayerLevel? playerLevel,
    int? playersNeeded,
    List<String>? playersJoined,
    String? description,
    double? pricePerPlayer,
    OpenGameStatus? status,
  }) {
    return OpenGameModel(
      id: id ?? this.id,
      organizerId: organizerId ?? this.organizerId,
      bookingId: bookingId ?? this.bookingId,
      playerLevel: playerLevel ?? this.playerLevel,
      playersNeeded: playersNeeded ?? this.playersNeeded,
      playersJoined: playersJoined ?? this.playersJoined,
      description: description ?? this.description,
      pricePerPlayer: pricePerPlayer ?? this.pricePerPlayer,
      status: status ?? this.status,
    );
  }

  int get spotsAvailable => playersNeeded - playersJoined.length;
  
  bool get isFull => spotsAvailable == 0;

  String get statusText {
    switch (status) {
      case OpenGameStatus.open:
        return 'Открыта';
      case OpenGameStatus.full:
        return 'Заполнена';
      case OpenGameStatus.completed:
        return 'Завершена';
    }
  }
}