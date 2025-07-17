import 'package:flutter/material.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';

class SimpleMyBookingsScreen extends StatefulWidget {
  const SimpleMyBookingsScreen({super.key});

  @override
  State<SimpleMyBookingsScreen> createState() => _SimpleMyBookingsScreenState();
}

class _SimpleMyBookingsScreenState extends State<SimpleMyBookingsScreen> {
  String selectedTab = 'upcoming';
  
  final List<Map<String, dynamic>> bookings = [
    {
      'venue': 'Теннис Клуб "Олимп"',
      'court': 'Корт №3 • Хард',
      'date': '16 янв, Вт',
      'time': '14:00 - 15:00',
      'type': 'Приватная',
      'status': 'Подтверждено',
      'statusColor': AppColors.primaryLight,
      'statusTextColor': AppColors.primaryDark,
      'borderColor': AppColors.primary,
    },
    {
      'venue': 'Спорткомплекс "Динамо"',
      'court': 'Корт №1 • Грунт',
      'date': '18 янв, Чт',
      'time': '18:00 - 20:00',
      'type': 'Открытая игра',
      'players': '3 из 4',
      'status': 'Открытая игра',
      'statusColor': const Color(0xFFDBEAFE),
      'statusTextColor': const Color(0xFF1E40AF),
      'borderColor': AppColors.info,
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(AppSpacing.headerPadding),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Мои бронирования',
                    style: AppTextStyles.h1,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'Управляйте вашими играми',
                    style: AppTextStyles.body.copyWith(color: AppColors.gray),
                  ),
                ],
              ),
            ),
            
            // Tabs
            SizedBox(
              height: AppSpacing.chipHeight,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
                children: [
                  _buildTab('upcoming', 'Предстоящие'),
                  const SizedBox(width: AppSpacing.sm),
                  _buildTab('past', 'Прошедшие'),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            
            // Bookings list
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
                itemCount: bookings.length,
                itemBuilder: (context, index) {
                  final booking = bookings[index];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.xl),
                    child: _buildBookingCard(booking),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildTab(String value, String label) {
    final isSelected = selectedTab == value;
    
    return GestureDetector(
      onTap: () {
        setState(() {
          selectedTab = value;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.xl,
          vertical: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.white,
          borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.extraLightGray,
            width: 1,
          ),
        ),
        child: Text(
          label,
          style: AppTextStyles.tinyBold.copyWith(
            color: isSelected ? AppColors.white : AppColors.dark,
          ),
        ),
      ),
    );
  }
  
  Widget _buildBookingCard(Map<String, dynamic> booking) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 5,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Left border indicator
          Container(
            width: 4,
            height: 140,
            decoration: BoxDecoration(
              color: booking['borderColor'],
              borderRadius: const BorderRadius.horizontal(
                left: Radius.circular(AppSpacing.radiusMd),
              ),
            ),
          ),
          // Content
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.cardPadding),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            booking['venue'],
                            style: AppTextStyles.bodySmallBold,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            booking['court'],
                            style: AppTextStyles.tiny.copyWith(color: AppColors.gray),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.sm,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: booking['statusColor'],
                          borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
                        ),
                        child: Text(
                          booking['status'],
                          style: AppTextStyles.caption.copyWith(
                            color: booking['statusTextColor'],
                            fontWeight: FontWeight.w600,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  
                  // Details
                  Row(
                    children: [
                      _buildDetail('Дата', booking['date']),
                      const SizedBox(width: AppSpacing.lg),
                      _buildDetail('Время', booking['time']),
                      const SizedBox(width: AppSpacing.lg),
                      _buildDetail(
                        'Тип', 
                        booking['type'],
                        extra: booking['players'],
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  
                  // Actions
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {},
                          style: OutlinedButton.styleFrom(
                            backgroundColor: AppColors.divider,
                            side: BorderSide.none,
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.lg,
                              vertical: AppSpacing.sm,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                            ),
                          ),
                          child: Text(
                            booking['type'] == 'Приватная' ? 'Отменить' : 'Покинуть',
                            style: AppTextStyles.tinyBold.copyWith(color: AppColors.dark),
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {},
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.primary),
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.lg,
                              vertical: AppSpacing.sm,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                            ),
                          ),
                          child: Text(
                            booking['type'] == 'Приватная' ? 'Детали' : 'Игроки',
                            style: AppTextStyles.tinyBold.copyWith(color: AppColors.primary),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildDetail(String label, String value, {String? extra}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTextStyles.caption.copyWith(color: AppColors.gray),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: AppTextStyles.bodySmallBold,
        ),
        if (extra != null) ...[
          Text(
            extra,
            style: AppTextStyles.caption.copyWith(color: AppColors.gray),
          ),
        ],
      ],
    );
  }
}