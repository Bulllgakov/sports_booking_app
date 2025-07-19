import 'package:flutter/material.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';
import 'simple_game_type_screen.dart';

class SimpleTimeSelectionScreen extends StatefulWidget {
  const SimpleTimeSelectionScreen({super.key});

  @override
  State<SimpleTimeSelectionScreen> createState() => _SimpleTimeSelectionScreenState();
}

class _SimpleTimeSelectionScreenState extends State<SimpleTimeSelectionScreen> {
  int selectedDateIndex = 1; // Tuesday is selected by default
  String? selectedTimeSlot = '14:00';
  
  final List<Map<String, String>> dates = [
    {'day': 'Пн', 'date': '15'},
    {'day': 'Вт', 'date': '16'},
    {'day': 'Ср', 'date': '17'},
    {'day': 'Чт', 'date': '18'},
  ];
  
  final List<Map<String, dynamic>> timeSlots = [
    {'time': '07:00', 'price': null, 'status': 'busy'},
    {'time': '08:00', 'price': null, 'status': 'busy'},
    {'time': '09:00', 'price': 1500, 'status': 'available'},
    {'time': '10:00', 'price': 1500, 'status': 'available'},
    {'time': '11:00', 'price': 1500, 'status': 'available'},
    {'time': '12:00', 'price': null, 'status': 'busy'},
    {'time': '14:00', 'price': 1500, 'status': 'selected'},
    {'time': '15:00', 'price': 1800, 'status': 'available'},
    {'time': '16:00', 'price': 2000, 'status': 'available'},
  ];

  @override
  Widget build(BuildContext context) {
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
            Text(
              'Теннис Клуб "Олимп" • Корт №3',
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
                return Padding(
                  padding: const EdgeInsets.only(right: AppSpacing.sm),
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        selectedDateIndex = index;
                      });
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
                            dates[index]['day']!,
                            style: AppTextStyles.caption.copyWith(
                              color: isSelected ? AppColors.white : AppColors.gray,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            dates[index]['date']!,
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
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '16 января, 14:00-15:00',
                  style: AppTextStyles.bodySmall.copyWith(color: AppColors.gray),
                ),
                Text(
                  '1500 ₽',
                  style: AppTextStyles.h2,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            SizedBox(
              width: double.infinity,
              height: AppSpacing.buttonHeight,
              child: ElevatedButton(
                onPressed: selectedTimeSlot != null ? () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const SimpleGameTypeScreen()),
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