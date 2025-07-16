import 'package:cloud_firestore/cloud_firestore.dart';

enum PlayerLevel { beginner, intermediate, advanced, professional }

class UserModel {
  final String uid;
  final String displayName;
  final String phoneNumber;
  final String? photoURL;
  final PlayerLevel playerLevel;
  final int gamesPlayed;
  final int hoursOnCourt;
  final List<String> favoriteVenues;
  final String? fcmToken;
  final DateTime createdAt;

  UserModel({
    required this.uid,
    required this.displayName,
    required this.phoneNumber,
    this.photoURL,
    required this.playerLevel,
    required this.gamesPlayed,
    required this.hoursOnCourt,
    required this.favoriteVenues,
    this.fcmToken,
    required this.createdAt,
  });

  factory UserModel.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    return UserModel(
      uid: doc.id,
      displayName: data['displayName'] ?? '',
      phoneNumber: data['phoneNumber'] ?? '',
      photoURL: data['photoURL'],
      playerLevel: PlayerLevel.values.firstWhere(
        (e) => e.toString().split('.').last == data['playerLevel'],
        orElse: () => PlayerLevel.beginner,
      ),
      gamesPlayed: data['gamesPlayed'] ?? 0,
      hoursOnCourt: data['hoursOnCourt'] ?? 0,
      favoriteVenues: List<String>.from(data['favoriteVenues'] ?? []),
      fcmToken: data['fcmToken'],
      createdAt: (data['createdAt'] as Timestamp).toDate(),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'displayName': displayName,
      'phoneNumber': phoneNumber,
      'photoURL': photoURL,
      'playerLevel': playerLevel.toString().split('.').last,
      'gamesPlayed': gamesPlayed,
      'hoursOnCourt': hoursOnCourt,
      'favoriteVenues': favoriteVenues,
      'fcmToken': fcmToken,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }

  UserModel copyWith({
    String? uid,
    String? displayName,
    String? phoneNumber,
    String? photoURL,
    PlayerLevel? playerLevel,
    int? gamesPlayed,
    int? hoursOnCourt,
    List<String>? favoriteVenues,
    String? fcmToken,
    DateTime? createdAt,
  }) {
    return UserModel(
      uid: uid ?? this.uid,
      displayName: displayName ?? this.displayName,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      photoURL: photoURL ?? this.photoURL,
      playerLevel: playerLevel ?? this.playerLevel,
      gamesPlayed: gamesPlayed ?? this.gamesPlayed,
      hoursOnCourt: hoursOnCourt ?? this.hoursOnCourt,
      favoriteVenues: favoriteVenues ?? this.favoriteVenues,
      fcmToken: fcmToken ?? this.fcmToken,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  String get playerLevelText {
    switch (playerLevel) {
      case PlayerLevel.beginner:
        return 'Начинающий';
      case PlayerLevel.intermediate:
        return 'Средний';
      case PlayerLevel.advanced:
        return 'Продвинутый';
      case PlayerLevel.professional:
        return 'Профессионал';
    }
  }
}