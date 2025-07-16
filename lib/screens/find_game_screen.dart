import 'package:flutter/material.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';

class FindGameScreen extends StatelessWidget {
  const FindGameScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Найти игру'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            color: AppColors.primaryLight,
            child: Row(
              children: [
                Icon(Icons.location_on, size: AppSpacing.iconSm, color: AppColors.primaryDark),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  'Игры в радиусе 5 км',
                  style: AppTextStyles.body.copyWith(color: AppColors.primaryDark),
                ),
                const Spacer(),
                TextButton(
                  onPressed: () {},
                  child: const Text('Изменить'),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(AppSpacing.md),
              itemCount: 5,
              itemBuilder: (context, index) {
                return _buildGameCard(index);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGameCard(int index) {
    final isAlmostFull = index == 1;
    final isFull = index == 3;
    
    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      child: InkWell(
        onTap: !isFull ? () {} : null,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Теннис - ${index % 2 == 0 ? 'Одиночная' : 'Парная'} игра',
                          style: AppTextStyles.h3,
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          'Корт "Олимп"',
                          style: AppTextStyles.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  _buildStatusBadge(isAlmostFull, isFull),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Icon(Icons.calendar_today, size: AppSpacing.iconXs, color: AppColors.gray),
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    '${15 + index} января, ${18 + index}:00',
                    style: AppTextStyles.bodySmall,
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Icon(Icons.access_time, size: AppSpacing.iconXs, color: AppColors.gray),
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    '1 час',
                    style: AppTextStyles.bodySmall,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              const Divider(),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: AppColors.primary,
                    child: Text(
                      'И',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Иван К.',
                          style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600),
                        ),
                        Text(
                          index % 3 == 0 ? 'Начинающий' : index % 3 == 1 ? 'Любитель' : 'Профи',
                          style: AppTextStyles.caption,
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '${isFull ? 4 : isAlmostFull ? 3 : 2}/4 игроков',
                        style: AppTextStyles.bodySmall,
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        '${2000 ~/ 4} ₽/чел',
                        style: AppTextStyles.body.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(bool isAlmostFull, bool isFull) {
    if (isFull) {
      return Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: AppSpacing.xs,
        ),
        decoration: BoxDecoration(
          color: AppColors.gray.withOpacity(0.1),
          borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
        ),
        child: Text(
          'Полная',
          style: AppTextStyles.caption.copyWith(
            color: AppColors.gray,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    } else if (isAlmostFull) {
      return Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: AppSpacing.xs,
        ),
        decoration: BoxDecoration(
          color: AppColors.warning.withOpacity(0.1),
          borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
        ),
        child: Text(
          '1 место',
          style: AppTextStyles.caption.copyWith(
            color: AppColors.warning,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    } else {
      return Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: AppSpacing.xs,
        ),
        decoration: BoxDecoration(
          color: AppColors.success.withOpacity(0.1),
          borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
        ),
        child: Text(
          'Открыта',
          style: AppTextStyles.caption.copyWith(
            color: AppColors.success,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }
  }
}