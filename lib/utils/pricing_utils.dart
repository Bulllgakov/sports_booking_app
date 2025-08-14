import 'package:intl/intl.dart';

class PricingUtils {
  /// Рассчитывает цену корта с учетом временных интервалов и праздников
  static int calculateCourtPrice({
    required DateTime date,
    required String startTime,
    required int durationMinutes,
    Map<String, dynamic>? pricing,
    List<dynamic>? holidayPricing,
    int? priceWeekday,
    int? priceWeekend,
  }) {
    // Проверяем праздничные дни (приоритет 1)
    if (holidayPricing != null && holidayPricing.isNotEmpty) {
      final dateStr = DateFormat('MM-dd').format(date);
      
      for (final holiday in holidayPricing) {
        if (holiday['date'] == dateStr && holiday['price'] != null) {
          // Праздничная цена за час
          final pricePerHour = holiday['price'] as int;
          return (pricePerHour * durationMinutes / 60).round();
        }
      }
    }
    
    // Проверяем временные интервалы (приоритет 2)
    if (pricing != null && pricing['intervals'] != null) {
      final intervals = pricing['intervals'] as List<dynamic>;
      
      if (intervals.isNotEmpty) {
        // Парсим время начала
        final timeParts = startTime.split(':');
        final startHour = int.parse(timeParts[0]);
        final startMinute = int.parse(timeParts[1]);
        final startTotalMinutes = startHour * 60 + startMinute;
        final endTotalMinutes = startTotalMinutes + durationMinutes;
        
        int totalPrice = 0;
        int currentMinute = startTotalMinutes;
        
        while (currentMinute < endTotalMinutes) {
          // Находим интервал для текущей минуты
          int? intervalPrice;
          
          for (final interval in intervals) {
            final fromParts = interval['from'].toString().split(':');
            final toParts = interval['to'].toString().split(':');
            
            final fromMinutes = int.parse(fromParts[0]) * 60 + int.parse(fromParts[1]);
            final toMinutes = int.parse(toParts[0]) * 60 + int.parse(toParts[1]);
            
            // Проверяем попадание в интервал
            if (currentMinute >= fromMinutes && currentMinute < toMinutes) {
              intervalPrice = interval['price'] as int?;
              break;
            }
          }
          
          // Если нашли цену интервала, используем её
          if (intervalPrice != null) {
            // Считаем сколько минут в этом интервале
            int minutesInInterval = 1;
            int nextMinute = currentMinute + 1;
            
            // Проверяем, сколько минут подряд имеют такую же цену
            while (nextMinute < endTotalMinutes) {
              bool samePrice = false;
              
              for (final interval in intervals) {
                final fromParts = interval['from'].toString().split(':');
                final toParts = interval['to'].toString().split(':');
                
                final fromMinutes = int.parse(fromParts[0]) * 60 + int.parse(fromParts[1]);
                final toMinutes = int.parse(toParts[0]) * 60 + int.parse(toParts[1]);
                
                if (nextMinute >= fromMinutes && nextMinute < toMinutes) {
                  if ((interval['price'] as int?) == intervalPrice) {
                    samePrice = true;
                    break;
                  }
                }
              }
              
              if (samePrice) {
                minutesInInterval++;
                nextMinute++;
              } else {
                break;
              }
            }
            
            // Добавляем стоимость за эти минуты
            totalPrice += (intervalPrice * minutesInInterval / 60).round();
            currentMinute += minutesInInterval;
          } else {
            // Используем базовую цену
            final basePrice = _getBasePrice(date, priceWeekday, priceWeekend);
            totalPrice += (basePrice / 60).round();
            currentMinute++;
          }
        }
        
        return totalPrice;
      }
    }
    
    // Базовая цена (приоритет 3)
    final basePrice = _getBasePrice(date, priceWeekday, priceWeekend);
    return (basePrice * durationMinutes / 60).round();
  }
  
  /// Получает базовую цену в зависимости от дня недели
  static int _getBasePrice(DateTime date, int? priceWeekday, int? priceWeekend) {
    final isWeekend = date.weekday == DateTime.saturday || date.weekday == DateTime.sunday;
    
    if (isWeekend && priceWeekend != null) {
      return priceWeekend;
    } else if (!isWeekend && priceWeekday != null) {
      return priceWeekday;
    }
    
    // Если цены не заданы, возвращаем дефолтную
    return priceWeekend ?? priceWeekday ?? 2000;
  }
  
  /// Проверяет, попадает ли время в рабочие часы
  static bool isWithinWorkingHours({
    required DateTime date,
    required String startTime,
    required int durationMinutes,
    required Map<String, dynamic> workingHours,
  }) {
    final days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    final dayOfWeek = days[date.weekday == 7 ? 0 : date.weekday];
    
    if (!workingHours.containsKey(dayOfWeek)) {
      return false;
    }
    
    final hours = workingHours[dayOfWeek] as Map<String, dynamic>?;
    if (hours == null || hours['open'] == null || hours['close'] == null) {
      return false;
    }
    
    final openTime = hours['open'] as String;
    final closeTime = hours['close'] as String;
    
    // Парсим время
    final startParts = startTime.split(':');
    final startMinutes = int.parse(startParts[0]) * 60 + int.parse(startParts[1]);
    final endMinutes = startMinutes + durationMinutes;
    
    final openParts = openTime.split(':');
    final openMinutes = int.parse(openParts[0]) * 60 + int.parse(openParts[1]);
    
    final closeParts = closeTime.split(':');
    final closeMinutes = int.parse(closeParts[0]) * 60 + int.parse(closeParts[1]);
    
    // Проверяем, что время начала не раньше открытия и время окончания не позже закрытия
    return startMinutes >= openMinutes && endMinutes <= closeMinutes;
  }
  
  /// Проверяет, не прошло ли время для бронирования
  static bool isTimeInFuture(DateTime date, String startTime) {
    final now = DateTime.now();
    final timeParts = startTime.split(':');
    final bookingDateTime = DateTime(
      date.year,
      date.month,
      date.day,
      int.parse(timeParts[0]),
      int.parse(timeParts[1]),
    );
    
    return bookingDateTime.isAfter(now);
  }
}