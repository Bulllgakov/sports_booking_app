import 'package:flutter/material.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';

class CourtDetailScreen extends StatelessWidget {
  const CourtDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 250,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: AppColors.extraLightGray,
                child: const Center(
                  child: Icon(
                    Icons.sports_tennis,
                    size: 80,
                    color: AppColors.lightGray,
                  ),
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Теннисный корт "Олимп"',
                    style: AppTextStyles.h1,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    children: [
                      Icon(Icons.location_on, size: AppSpacing.iconSm, color: AppColors.gray),
                      const SizedBox(width: AppSpacing.xs),
                      Expanded(
                        child: Text(
                          'ул. Спортивная, 15',
                          style: AppTextStyles.body,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    children: [
                      Icon(Icons.star, size: AppSpacing.iconSm, color: AppColors.warning),
                      const SizedBox(width: AppSpacing.xs),
                      Text('4.8', style: AppTextStyles.body),
                      const SizedBox(width: AppSpacing.xs),
                      Text('(127 отзывов)', style: AppTextStyles.bodySmall),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Text(
                    'Описание',
                    style: AppTextStyles.h3,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'Профессиональный теннисный корт с покрытием хард. Идеально подходит для игроков любого уровня. Корт оборудован освещением для вечерних игр.',
                    style: AppTextStyles.body,
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Text(
                    'Удобства',
                    style: AppTextStyles.h3,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Wrap(
                    spacing: AppSpacing.sm,
                    runSpacing: AppSpacing.sm,
                    children: [
                      _buildAmenityChip(Icons.shower, 'Душ'),
                      _buildAmenityChip(Icons.local_parking, 'Парковка'),
                      _buildAmenityChip(Icons.local_cafe, 'Кафе'),
                      _buildAmenityChip(Icons.wifi, 'Wi-Fi'),
                      _buildAmenityChip(Icons.lightbulb, 'Освещение'),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Text(
                    'Расписание и цены',
                    style: AppTextStyles.h3,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: Column(
                        children: [
                          _buildPriceRow('Будни 07:00 - 17:00', '1500 ₽/час'),
                          const Divider(),
                          _buildPriceRow('Будни 17:00 - 23:00', '2000 ₽/час'),
                          const Divider(),
                          _buildPriceRow('Выходные', '2500 ₽/час'),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: ElevatedButton(
          onPressed: () {},
          child: const Text('Забронировать'),
        ),
      ),
    );
  }

  Widget _buildAmenityChip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: AppColors.primaryLight,
        borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: AppSpacing.iconXs, color: AppColors.primaryDark),
          const SizedBox(width: AppSpacing.xs),
          Text(label, style: AppTextStyles.bodySmall.copyWith(color: AppColors.primaryDark)),
        ],
      ),
    );
  }

  Widget _buildPriceRow(String time, String price) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(time, style: AppTextStyles.body),
        Text(
          price,
          style: AppTextStyles.body.copyWith(
            color: AppColors.primary,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}