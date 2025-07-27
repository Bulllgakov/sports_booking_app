import 'package:flutter/material.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';

class GameTypeScreen extends StatelessWidget {
  const GameTypeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Выбор типа игры'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Как вы хотите играть?',
              style: AppTextStyles.h2,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Выберите подходящий формат игры',
              style: AppTextStyles.bodySmall,
            ),
            const SizedBox(height: AppSpacing.lg),
            _buildGameTypeCard(
              context,
              icon: Icons.person,
              title: 'Одиночная игра',
              description: 'Забронировать корт для себя',
              color: AppColors.primary,
            ),
            const SizedBox(height: AppSpacing.md),
            _buildGameTypeCard(
              context,
              icon: Icons.people,
              title: 'Парная игра',
              description: 'Играть с друзьями в паре',
              color: AppColors.info,
            ),
            const SizedBox(height: AppSpacing.md),
            _buildGameTypeCard(
              context,
              icon: Icons.group_add,
              title: 'Открытая игра',
              description: 'Найти партнеров для игры и разделить стоимость',
              color: AppColors.success,
              badge: 'Популярно',
            ),
            const SizedBox(height: AppSpacing.md),
            _buildGameTypeCard(
              context,
              icon: Icons.sports,
              title: 'Тренировка',
              description: 'Индивидуальное занятие с тренером',
              color: AppColors.warning,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGameTypeCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String description,
    required Color color,
    String? badge,
  }) {
    return InkWell(
      onTap: () {},
      borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.white,
          border: Border.all(color: AppColors.extraLightGray),
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
              ),
              child: Icon(
                icon,
                color: color,
                size: AppSpacing.iconLg,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        title,
                        style: AppTextStyles.h3,
                      ),
                      if (badge != null) ...[
                        const SizedBox(width: AppSpacing.sm),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.sm,
                            vertical: AppSpacing.xs,
                          ),
                          decoration: BoxDecoration(
                            color: color.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
                          ),
                          child: Text(
                            badge,
                            style: AppTextStyles.caption.copyWith(
                              color: color,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    description,
                    style: AppTextStyles.bodySmall,
                  ),
                ],
              ),
            ),
            Icon(
              Icons.arrow_forward_ios,
              size: AppSpacing.iconSm,
              color: AppColors.lightGray,
            ),
          ],
        ),
      ),
    );
  }
}