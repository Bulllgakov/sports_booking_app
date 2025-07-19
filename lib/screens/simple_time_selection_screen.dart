import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';
import '../models/venue_model.dart';
import '../models/court_model.dart';
import '../models/booking_model.dart';
import '../services/venue_service.dart';
import '../services/booking_service.dart';
import 'simple_game_type_screen.dart';

class SimpleTimeSelectionScreen extends StatefulWidget {
  final String venueId;
  final String courtId;
  final VenueModel? venue;
  final CourtModel? court;
  
  const SimpleTimeSelectionScreen({
    super.key,
    required this.venueId,
    required this.courtId,
    this.venue,
    this.court,
  });

  @override
  State<SimpleTimeSelectionScreen> createState() => _SimpleTimeSelectionScreenState();
}

class _SimpleTimeSelectionScreenState extends State<SimpleTimeSelectionScreen> {
  int selectedDateIndex = 0;
  String? selectedTimeSlot;
  int selectedDuration = 60; // в минутах
  
  final VenueService _venueService = VenueService();
  final BookingService _bookingService = BookingService();
  
  VenueModel? venue;
  CourtModel? court;
  List<Map<String, dynamic>> timeSlots = [];
  bool isLoading = true;
  
  List<DateTime> dates = [];
  List<int> availableDurations = [60, 90, 120];
  
  @override
  void initState() {
    super.initState();
    _initializeDates();
    _loadData();
  }
  
  void _initializeDates() {
    // Генерируем даты на неделю вперед
    final today = DateTime.now();
    dates = List.generate(7, (index) => today.add(Duration(days: index)));
  }
  
  Future<void> _loadData() async {
    setState(() => isLoading = true);
    
    try {
      // Загружаем данные клуба и корта если не переданы
      if (widget.venue == null) {
        final venueDoc = await FirebaseFirestore.instance
            .collection('venues')
            .doc(widget.venueId)
            .get();
        venue = VenueModel.fromFirestore(venueDoc);
      } else {
        venue = widget.venue;
      }
      
      if (widget.court == null) {
        final courtDoc = await FirebaseFirestore.instance
            .collection('venues')
            .doc(widget.venueId)
            .collection('courts')
            .doc(widget.courtId)
            .get();
        court = CourtModel.fromFirestore(courtDoc);
      } else {
        court = widget.court;
      }
      
      // Устанавливаем доступные длительности
      if (venue != null && venue!.bookingDurations.isNotEmpty) {
        availableDurations = venue!.bookingDurations.entries
            .where((e) => e.value)
            .map((e) => e.key)
            .toList()
          ..sort();
        
        // Устанавливаем первую доступную длительность
        if (availableDurations.isNotEmpty) {
          selectedDuration = availableDurations.first;
        }
      }
      
      // Загружаем временные слоты
      await _loadTimeSlots();
    } catch (e) {
      print('Error loading data: $e');
    } finally {
      setState(() => isLoading = false);
    }
  }
  
  Future<void> _loadTimeSlots() async {
    if (venue == null || court == null) return;
    
    final selectedDate = dates[selectedDateIndex];
    final isWeekend = selectedDate.weekday == DateTime.saturday || 
                      selectedDate.weekday == DateTime.sunday;
    
    // Получаем режим работы
    final workingHoursStr = venue!.workingHours[isWeekend ? 'weekend' : 'weekday'] ?? 
                           (isWeekend ? '08:00-22:00' : '07:00-23:00');
    
    // Парсим время работы
    final parts = workingHoursStr.split('-');
    final openTime = _parseTime(parts[0]);
    final closeTime = _parseTime(parts[1]);
    
    // Загружаем существующие бронирования
    final bookings = await _bookingService.getBookingsForDateAndCourt(
      selectedDate,
      widget.courtId,
    );
    
    // Генерируем слоты
    final slots = <Map<String, dynamic>>[];
    var currentTime = DateTime(
      selectedDate.year,
      selectedDate.month,
      selectedDate.day,
      openTime.hour,
      openTime.minute,
    );
    
    final endTime = DateTime(
      selectedDate.year,
      selectedDate.month,
      selectedDate.day,
      closeTime.hour,
      closeTime.minute,
    );
    
    while (currentTime.isBefore(endTime)) {
      // Проверяем, что слот + длительность не выходит за время закрытия
      final slotEndTime = currentTime.add(Duration(minutes: selectedDuration));
      if (slotEndTime.isAfter(endTime)) {
        break;
      }
      
      final timeStr = DateFormat('HH:mm').format(currentTime);
      
      // Проверяем доступность с учетом длительности
      bool isAvailable = true;
      
      // Проверяем все часовые слоты в течение длительности бронирования
      DateTime checkTime = currentTime;
      while (checkTime.isBefore(slotEndTime)) {
        final checkTimeStr = DateFormat('HH:mm').format(checkTime);
        // Проверяем бронирования для каждого часа
        if (bookings.any((b) => b.time == checkTimeStr || b.startTimeStr == checkTimeStr)) {
          isAvailable = false;
          break;
        }
        checkTime = checkTime.add(const Duration(hours: 1));
      }
      
      // Пропускаем прошедшее время для сегодня
      if (selectedDate.day == DateTime.now().day && 
          currentTime.isBefore(DateTime.now())) {
        isAvailable = false;
      }
      
      // Рассчитываем цену
      final price = _calculatePrice(currentTime, isWeekend);
      
      slots.add({
        'time': timeStr,
        'price': price,
        'status': isAvailable ? 'available' : 'busy',
      });
      
      // Переходим к следующему слоту с интервалом равным длительности
      currentTime = currentTime.add(Duration(minutes: selectedDuration));
    }
    
    setState(() {
      timeSlots = slots;
    });
  }
  
  DateTime _parseTime(String timeStr) {
    final parts = timeStr.trim().split(':');
    return DateTime(2000, 1, 1, int.parse(parts[0]), int.parse(parts[1]));
  }
  
  int _calculatePrice(DateTime time, bool isWeekend) {
    if (court == null) return 0;
    
    final basePrice = isWeekend 
        ? (court!.priceWeekend ?? court!.pricePerHour ?? 0)
        : (court!.priceWeekday ?? court!.pricePerHour ?? 0);
    
    // Применяем множитель для вечернего времени
    if (time.hour >= 18 && time.hour < 21) {
      return (basePrice * 1.2 * selectedDuration / 60).round();
    } else if (time.hour >= 21 || time.hour < 7) {
      return (basePrice * 0.8 * selectedDuration / 60).round();
    }
    
    return (basePrice * selectedDuration / 60).round();
  }
  
  String _calculateEndTime(String startTime, int duration) {
    final parts = startTime.split(':');
    final startHour = int.parse(parts[0]);
    final startMinute = int.parse(parts[1]);
    
    final totalMinutes = startHour * 60 + startMinute + duration;
    final endHour = totalMinutes ~/ 60;
    final endMinute = totalMinutes % 60;
    
    return '${endHour.toString().padLeft(2, '0')}:${endMinute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return Scaffold(
        body: Center(
          child: CircularProgressIndicator(
            color: AppColors.primary,
          ),
        ),
      );
    }
    
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.white,
        elevation: 0,
        leading: Container(
          margin: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppColors.divider,
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: const Icon(Icons.arrow_back, color: AppColors.dark),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Выберите время',
              style: AppTextStyles.h3.copyWith(color: AppColors.dark),
            ),
            if (venue != null && court != null)
              Text(
                '${venue!.name} • ${court!.name}',
                style: AppTextStyles.caption.copyWith(color: AppColors.gray),
              ),
          ],
        ),
        toolbarHeight: 80,
      ),
      body: Column(
        children: [
          // Date selector
          Container(
            height: 90,
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
              itemCount: dates.length,
              itemBuilder: (context, index) {
                final isSelected = selectedDateIndex == index;
                final date = dates[index];
                final dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
                
                return Padding(
                  padding: const EdgeInsets.only(right: AppSpacing.sm),
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        selectedDateIndex = index;
                        selectedTimeSlot = null;
                      });
                      _loadTimeSlots();
                    },
                    child: Container(
                      width: 60,
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.primary : AppColors.white,
                        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                        border: Border.all(
                          color: isSelected ? AppColors.primary : AppColors.extraLightGray,
                          width: 2,
                        ),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            dayNames[date.weekday % 7],
                            style: AppTextStyles.caption.copyWith(
                              color: isSelected ? AppColors.white : AppColors.gray,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            date.day.toString(),
                            style: AppTextStyles.bodyBold.copyWith(
                              color: isSelected ? AppColors.white : AppColors.dark,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          
          // Duration selector
          if (availableDurations.length > 1) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Длительность игры',
                  style: AppTextStyles.bodyBold,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Container(
              height: 50,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: availableDurations.length,
                itemBuilder: (context, index) {
                  final duration = availableDurations[index];
                  final isSelected = selectedDuration == duration;
                  
                  return Padding(
                    padding: const EdgeInsets.only(right: AppSpacing.sm),
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          selectedDuration = duration;
                          selectedTimeSlot = null;
                        });
                        _loadTimeSlots();
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.lg,
                          vertical: AppSpacing.sm,
                        ),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.primary : AppColors.white,
                          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                          border: Border.all(
                            color: isSelected ? AppColors.primary : AppColors.extraLightGray,
                            width: 2,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            duration == 60 ? '1 час' : 
                            duration == 90 ? '1.5 часа' : 
                            '2 часа',
                            style: AppTextStyles.bodyBold.copyWith(
                              color: isSelected ? AppColors.white : AppColors.dark,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
          ],
          // Section title
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Доступное время',
                style: AppTextStyles.bodyBold,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          // Time slots grid
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
              child: GridView.builder(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                  childAspectRatio: 2.2,
                ),
                itemCount: timeSlots.length,
                itemBuilder: (context, index) {
                  final slot = timeSlots[index];
                  final isSelected = selectedTimeSlot == slot['time'];
                  final isBusy = slot['status'] == 'busy';
                  
                  return GestureDetector(
                    onTap: isBusy ? null : () {
                      setState(() {
                        selectedTimeSlot = slot['time'];
                      });
                    },
                    child: Container(
                      decoration: BoxDecoration(
                        color: isSelected 
                            ? AppColors.primary 
                            : isBusy 
                                ? AppColors.busy 
                                : AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                        border: Border.all(
                          color: isSelected 
                              ? AppColors.primary 
                              : isBusy 
                                  ? AppColors.busy 
                                  : AppColors.available,
                          width: 2,
                        ),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            slot['time'],
                            style: AppTextStyles.bodyBold.copyWith(
                              color: isSelected 
                                  ? AppColors.white 
                                  : isBusy 
                                      ? AppColors.busyText 
                                      : AppColors.dark,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            isBusy 
                                ? 'Занято' 
                                : isSelected 
                                    ? 'Выбрано' 
                                    : '${slot['price']}₽',
                            style: AppTextStyles.caption.copyWith(
                              color: isSelected 
                                  ? AppColors.white 
                                  : isBusy 
                                      ? AppColors.busyText 
                                      : AppColors.primaryDark,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(AppSpacing.radiusLg)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (selectedTimeSlot != null) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${DateFormat('d MMMM', 'ru').format(dates[selectedDateIndex])}, '
                    '$selectedTimeSlot-${_calculateEndTime(selectedTimeSlot!, selectedDuration)}',
                    style: AppTextStyles.bodySmall.copyWith(color: AppColors.gray),
                  ),
                  Text(
                    '${timeSlots.firstWhere((s) => s['time'] == selectedTimeSlot)['price']} ₽',
                    style: AppTextStyles.h2,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
            ],
            SizedBox(
              width: double.infinity,
              height: AppSpacing.buttonHeight,
              child: ElevatedButton(
                onPressed: selectedTimeSlot != null ? () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => SimpleGameTypeScreen(
                        venueId: widget.venueId,
                        courtId: widget.courtId,
                        date: dates[selectedDateIndex],
                        time: selectedTimeSlot!,
                        duration: selectedDuration,
                        price: timeSlots.firstWhere((s) => s['time'] == selectedTimeSlot)['price'],
                        venue: venue,
                        court: court,
                      ),
                    ),
                  );
                } : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  ),
                ),
                child: Text(
                  'Далее',
                  style: AppTextStyles.button.copyWith(color: AppColors.white),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}