import 'package:cloud_firestore/cloud_firestore.dart';

enum GameType { single, double, open, training }
enum BookingStatus { pending, confirmed, cancelled }

class BookingModel {
  final String id;
  final String userId;
  final String venueId;
  final String courtId;
  final DateTime date;
  final DateTime startTime;
  final DateTime endTime;
  final GameType gameType;
  final BookingStatus status;
  final double totalPrice;
  final String? paymentId;
  final List<String> players;
  final String? qrCode;
  final DateTime createdAt;

  BookingModel({
    required this.id,
    required this.userId,
    required this.venueId,
    required this.courtId,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.gameType,
    required this.status,
    required this.totalPrice,
    this.paymentId,
    required this.players,
    this.qrCode,
    required this.createdAt,
  });

  factory BookingModel.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    return BookingModel(
      id: doc.id,
      userId: data['userId'] ?? '',
      venueId: data['venueId'] ?? '',
      courtId: data['courtId'] ?? '',
      date: (data['date'] as Timestamp).toDate(),
      startTime: (data['startTime'] as Timestamp).toDate(),
      endTime: (data['endTime'] as Timestamp).toDate(),
      gameType: GameType.values.firstWhere(
        (e) => e.toString().split('.').last == data['gameType'],
        orElse: () => GameType.single,
      ),
      status: BookingStatus.values.firstWhere(
        (e) => e.toString().split('.').last == data['status'],
        orElse: () => BookingStatus.pending,
      ),
      totalPrice: (data['totalPrice'] ?? 0).toDouble(),
      paymentId: data['paymentId'],
      players: List<String>.from(data['players'] ?? []),
      qrCode: data['qrCode'],
      createdAt: (data['createdAt'] as Timestamp).toDate(),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'userId': userId,
      'venueId': venueId,
      'courtId': courtId,
      'date': Timestamp.fromDate(date),
      'startTime': Timestamp.fromDate(startTime),
      'endTime': Timestamp.fromDate(endTime),
      'gameType': gameType.toString().split('.').last,
      'status': status.toString().split('.').last,
      'totalPrice': totalPrice,
      'paymentId': paymentId,
      'players': players,
      'qrCode': qrCode,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }

  BookingModel copyWith({
    String? id,
    String? userId,
    String? venueId,
    String? courtId,
    DateTime? date,
    DateTime? startTime,
    DateTime? endTime,
    GameType? gameType,
    BookingStatus? status,
    double? totalPrice,
    String? paymentId,
    List<String>? players,
    String? qrCode,
    DateTime? createdAt,
  }) {
    return BookingModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      venueId: venueId ?? this.venueId,
      courtId: courtId ?? this.courtId,
      date: date ?? this.date,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      gameType: gameType ?? this.gameType,
      status: status ?? this.status,
      totalPrice: totalPrice ?? this.totalPrice,
      paymentId: paymentId ?? this.paymentId,
      players: players ?? this.players,
      qrCode: qrCode ?? this.qrCode,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  String get gameTypeText {
    switch (gameType) {
      case GameType.single:
        return 'Одиночная игра';
      case GameType.double:
        return 'Парная игра';
      case GameType.open:
        return 'Открытая игра';
      case GameType.training:
        return 'Тренировка';
    }
  }

  String get statusText {
    switch (status) {
      case BookingStatus.pending:
        return 'Ожидает подтверждения';
      case BookingStatus.confirmed:
        return 'Подтверждено';
      case BookingStatus.cancelled:
        return 'Отменено';
    }
  }

  int get durationMinutes {
    return endTime.difference(startTime).inMinutes;
  }
}