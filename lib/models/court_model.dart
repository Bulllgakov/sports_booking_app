import 'package:cloud_firestore/cloud_firestore.dart';

enum CourtType { indoor, outdoor }

class PriceRange {
  final double min;
  final double max;
  final String display;

  PriceRange({
    required this.min,
    required this.max,
    required this.display,
  });
}

class PriceInterval {
  final String from;
  final String to;
  final double price;
  
  PriceInterval({
    required this.from,
    required this.to,
    required this.price,
  });
  
  factory PriceInterval.fromMap(Map<String, dynamic> data) {
    return PriceInterval(
      from: data['from'] ?? '09:00',
      to: data['to'] ?? '11:00',
      price: (data['price'] ?? 0).toDouble(),
    );
  }
  
  Map<String, dynamic> toMap() {
    return {
      'from': from,
      'to': to,
      'price': price,
    };
  }
}

class DayPricing {
  final double basePrice;
  final List<PriceInterval> intervals;
  
  DayPricing({
    required this.basePrice,
    required this.intervals,
  });
  
  factory DayPricing.fromMap(Map<String, dynamic> data) {
    return DayPricing(
      basePrice: (data['basePrice'] ?? 0).toDouble(),
      intervals: (data['intervals'] as List<dynamic>?)
          ?.map((i) => PriceInterval.fromMap(i as Map<String, dynamic>))
          .toList() ?? [],
    );
  }
  
  Map<String, dynamic> toMap() {
    return {
      'basePrice': basePrice,
      'intervals': intervals.map((i) => i.toMap()).toList(),
    };
  }
}

class CourtModel {
  final String id;
  final String venueId;
  final String name;
  final String type; // 'tennis', 'padel', 'badminton'
  final String courtType; // 'indoor' or 'outdoor'
  final double? priceWeekday;
  final double? priceWeekend;
  final Map<String, DayPricing>? pricing;
  
  // Computed property for backward compatibility
  double get pricePerHour => priceWeekday ?? 1900;
  final String status; // 'active', 'inactive', 'maintenance'
  final DateTime? createdAt;

  CourtModel({
    required this.id,
    required this.venueId,
    required this.name,
    required this.type,
    required this.courtType,
    this.priceWeekday,
    this.priceWeekend,
    this.pricing,
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
      priceWeekday: data['priceWeekday']?.toDouble(),
      priceWeekend: data['priceWeekend']?.toDouble(),
      pricing: data['pricing'] != null ? 
        (data['pricing'] as Map<String, dynamic>).map(
          (key, value) => MapEntry(key, DayPricing.fromMap(value as Map<String, dynamic>))
        ) : null,
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
      if (priceWeekday != null) 'priceWeekday': priceWeekday,
      if (priceWeekend != null) 'priceWeekend': priceWeekend,
      if (pricing != null) 'pricing': pricing!.map((key, value) => MapEntry(key, value.toMap())),
      'status': status,
      'createdAt': createdAt ?? FieldValue.serverTimestamp(),
    };
  }

  // Метод для получения диапазона цен
  PriceRange getPriceRange() {
    if (pricing != null && pricing!.isNotEmpty) {
      final allPrices = <double>[];
      
      // Собираем все цены из всех дней
      for (final dayPricing in pricing!.values) {
        allPrices.add(dayPricing.basePrice);
        
        // Добавляем цены из интервалов
        for (final interval in dayPricing.intervals) {
          allPrices.add(interval.price);
        }
      }
      
      if (allPrices.isNotEmpty) {
        final minPrice = allPrices.reduce((a, b) => a < b ? a : b);
        final maxPrice = allPrices.reduce((a, b) => a > b ? a : b);
        
        return PriceRange(
          min: minPrice,
          max: maxPrice,
          display: minPrice == maxPrice ? '${minPrice.toInt()}₽' : 'от ${minPrice.toInt()}₽',
        );
      }
    }
    
    // Fallback на старую систему
    final price = priceWeekday ?? priceWeekend ?? 1900;
    return PriceRange(
      min: price,
      max: price,
      display: '${price.toInt()}₽',
    );
  }

  double calculatePrice(int durationMinutes, DateTime dateTime) {
    double hours = durationMinutes / 60;
    final weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    final dayName = weekdays[dateTime.weekday % 7];
    
    // Проверяем новую систему цен
    if (pricing != null && pricing!.containsKey(dayName)) {
      final dayPricing = pricing![dayName]!;
      double hourlyPrice = dayPricing.basePrice;
      
      // Проверяем интервалы
      final currentHour = dateTime.hour;
      for (final interval in dayPricing.intervals) {
        final fromHour = int.parse(interval.from.split(':')[0]);
        final toHour = int.parse(interval.to.split(':')[0]);
        if (currentHour >= fromHour && currentHour < toHour) {
          hourlyPrice = interval.price;
          break;
        }
      }
      return hourlyPrice * hours;
    }
    
    // Fallback на старую систему
    final isWeekend = dateTime.weekday == DateTime.saturday || dateTime.weekday == DateTime.sunday;
    return isWeekend ? (priceWeekend ?? 2400) * hours : (priceWeekday ?? 1900) * hours;
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