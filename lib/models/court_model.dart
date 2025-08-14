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

class HolidayPricing {
  final String date; // дата в формате MM-DD (например: "03-08" для 8 марта)
  final double price;
  final String? name; // название праздника для удобства
  
  HolidayPricing({
    required this.date,
    required this.price,
    this.name,
  });
  
  factory HolidayPricing.fromMap(Map<String, dynamic> data) {
    return HolidayPricing(
      date: data['date'] ?? '',
      price: (data['price'] ?? 0).toDouble(),
      name: data['name'],
    );
  }
  
  Map<String, dynamic> toMap() {
    return {
      'date': date,
      'price': price,
      'name': name,
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
  final List<HolidayPricing>? holidayPricing;
  
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
    this.holidayPricing,
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
      holidayPricing: data['holidayPricing'] != null ?
        (data['holidayPricing'] as List<dynamic>).map(
          (item) => HolidayPricing.fromMap(item as Map<String, dynamic>)
        ).toList() : null,
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
    final allPrices = <double>[];
    
    // Добавляем цены праздничных дней
    if (holidayPricing != null) {
      for (final holiday in holidayPricing!) {
        allPrices.add(holiday.price);
      }
    }
    
    // Собираем все цены из всех дней
    if (pricing != null && pricing!.isNotEmpty) {
      for (final dayPricing in pricing!.values) {
        allPrices.add(dayPricing.basePrice);
        
        // Добавляем цены из интервалов
        for (final interval in dayPricing.intervals) {
          allPrices.add(interval.price);
        }
      }
    }
    
    // Добавляем legacy цены
    if (priceWeekday != null) allPrices.add(priceWeekday!);
    if (priceWeekend != null) allPrices.add(priceWeekend!);
    
    if (allPrices.isNotEmpty) {
      final minPrice = allPrices.reduce((a, b) => a < b ? a : b);
      final maxPrice = allPrices.reduce((a, b) => a > b ? a : b);
      
      return PriceRange(
        min: minPrice,
        max: maxPrice,
        display: minPrice == maxPrice ? '${minPrice.toInt()}₽' : 'от ${minPrice.toInt()}₽',
      );
    }
    
    // Fallback на дефолтные цены
    return PriceRange(
      min: 1900,
      max: 2400,
      display: 'от 1900₽',
    );
  }

  double calculatePrice(int durationMinutes, DateTime dateTime) {
    // Разбиваем бронирование на часовые слоты и суммируем их цены
    double totalPrice = 0;
    int remainingMinutes = durationMinutes;
    DateTime currentTime = dateTime;
    
    while (remainingMinutes > 0) {
      // Определяем продолжительность текущего слота (не более часа и не более оставшихся минут)
      final minutesUntilNextHour = 60 - currentTime.minute;
      final slotDuration = remainingMinutes < minutesUntilNextHour ? remainingMinutes : minutesUntilNextHour;
      final slotHours = slotDuration / 60;
      
      // Вычисляем цену для текущего слота
      double slotPrice = 0;
      
      // Сначала проверяем праздничные дни - они имеют наивысший приоритет
      if (holidayPricing != null) {
        final month = currentTime.month.toString().padLeft(2, '0');
        final day = currentTime.day.toString().padLeft(2, '0');
        final dateStr = '$month-$day';
        
        for (final holiday in holidayPricing!) {
          if (holiday.date == dateStr) {
            slotPrice = holiday.price * slotHours;
            break;
          }
        }
      }
      
      // Если не праздник, проверяем обычные цены
      if (slotPrice == 0) {
        final weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        final dayName = weekdays[currentTime.weekday % 7];
        
        // Проверяем новую систему цен
        if (pricing != null && pricing!.containsKey(dayName)) {
          final dayPricing = pricing![dayName]!;
          double hourlyPrice = dayPricing.basePrice;
          
          // Проверяем интервалы
          final currentHour = currentTime.hour;
          for (final interval in dayPricing.intervals) {
            final fromHour = int.parse(interval.from.split(':')[0]);
            final toHour = int.parse(interval.to.split(':')[0]);
            if (currentHour >= fromHour && currentHour < toHour) {
              hourlyPrice = interval.price;
              break;
            }
          }
          slotPrice = hourlyPrice * slotHours;
        } else {
          // Fallback на старую систему
          final isWeekend = currentTime.weekday == DateTime.saturday || currentTime.weekday == DateTime.sunday;
          slotPrice = (isWeekend ? (priceWeekend ?? 2400) : (priceWeekday ?? 1900)) * slotHours;
        }
      }
      
      totalPrice += slotPrice;
      
      // Переходим к следующему слоту
      remainingMinutes -= slotDuration;
      currentTime = currentTime.add(Duration(minutes: slotDuration));
    }
    
    return totalPrice;
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