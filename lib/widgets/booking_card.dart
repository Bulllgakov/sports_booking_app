import 'package:flutter/material.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';

class BookingCard extends StatelessWidget {
  final String venueName;
  final String gameType;
  final DateTime date;
  final String time;
  final String status;
  final String price;
  final VoidCallback? onTap;
  final VoidCallback? onCancel;
  final VoidCallback? onShowQR;
  final Color? statusColor;

  const BookingCard({
    super.key,
    required this.venueName,
    required this.gameType,
    required this.date,
    required this.time,
    required this.status,
    required this.price,
    this.onTap,
    this.onCancel,
    this.onShowQR,
    this.statusColor,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                      vertical: AppSpacing.xs,
                    ),
                    decoration: BoxDecoration(
                      color: (statusColor ?? AppColors.success).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
                    ),
                    child: Text(
                      status,
                      style: AppTextStyles.caption.copyWith(
                        color: statusColor ?? AppColors.success,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  if (onShowQR != null)
                    IconButton(
                      icon: const Icon(Icons.qr_code),
                      onPressed: onShowQR,
                      color: AppColors.primary,
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                venueName,
                style: AppTextStyles.h3,
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                gameType,
                style: AppTextStyles.bodySmall,
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Icon(
                    Icons.calendar_today,
                    size: AppSpacing.iconXs,
                    color: AppColors.gray,
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    '${date.day}.${date.month.toString().padLeft(2, '0')}.${date.year}',
                    style: AppTextStyles.bodySmall,
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Icon(
                    Icons.access_time,
                    size: AppSpacing.iconXs,
                    color: AppColors.gray,
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    time,
                    style: AppTextStyles.bodySmall,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              const Divider(),
              const SizedBox(height: AppSpacing.sm),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  if (onCancel != null)
                    TextButton(
                      onPressed: onCancel,
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.error,
                      ),
                      child: const Text('Отменить'),
                    )
                  else
                    const SizedBox.shrink(),
                  Text(
                    price,
                    style: AppTextStyles.body.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}