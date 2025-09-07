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
    // Парсим время начала
    final timeParts = startTime.split(':');
    final startHour = int.parse(timeParts[0]);
    final startMinute = int.parse(timeParts[1]);
    
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
    
    // Получаем день недели для pricing
    final days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    final dayOfWeek = days[date.weekday == 7 ? 0 : date.weekday];
    
    // Проверяем новую систему pricing с интервалами
    if (pricing != null && pricing[dayOfWeek] != null) {
      final dayPricing = pricing[dayOfWeek] as Map<String, dynamic>;
      final basePrice = dayPricing['basePrice'] as int? ?? 2000;
      final intervals = dayPricing['intervals'] as List<dynamic>?;
      
      // Разбиваем бронирование на слоты и суммируем цены
      int totalPrice = 0;
      int currentHour = startHour;
      int currentMinute = startMinute;
      int remainingMinutes = durationMinutes;
      
      while (remainingMinutes > 0) {
        // Определяем продолжительность текущего слота (не более часа и не более оставшихся минут)
        final slotDuration = (60 - currentMinute).clamp(0, remainingMinutes);
        final slotHours = slotDuration / 60;
        
        // Определяем цену для текущего слота
        int slotPrice = basePrice;
        
        // Проверяем специальные интервалы
        if (intervals != null && intervals.isNotEmpty) {
          final currentTimeInMinutes = currentHour * 60 + currentMinute;
          
          for (final interval in intervals) {
            final fromParts = interval['from'].toString().split(':');
            final toParts = interval['to'].toString().split(':');
            
            final fromHour = int.parse(fromParts[0]);
            final fromMinute = fromParts.length > 1 ? int.parse(fromParts[1]) : 0;
            final toHour = int.parse(toParts[0]);
            final toMinute = toParts.length > 1 ? int.parse(toParts[1]) : 0;
            
            final intervalStartTime = fromHour * 60 + fromMinute;
            int intervalEndTime = toHour * 60 + toMinute;
            
            // Если конец 00:00 или 24:00, это полночь
            if (intervalEndTime == 0) {
              intervalEndTime = 24 * 60;
            }
            
            // Проверяем, попадает ли текущее время в интервал
            if (currentTimeInMinutes >= intervalStartTime && currentTimeInMinutes < intervalEndTime) {
              slotPrice = interval['price'] as int? ?? basePrice;
              break;
            }
          }
        }
        
        totalPrice += (slotPrice * slotHours).round();
        
        // Переходим к следующему слоту
        remainingMinutes -= slotDuration;
        currentMinute += slotDuration;
        if (currentMinute >= 60) {
          currentHour += currentMinute ~/ 60;
          currentMinute = currentMinute % 60;
        }
      }
      
      return totalPrice;
    }
    
    // Используем старую систему с priceWeekday/priceWeekend
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