import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/theme/colors.dart';
import '../core/theme/spacing.dart';
import '../core/theme/text_styles.dart';

class PaymentErrorScreen extends StatelessWidget {
  final String venueId;
  final String? bookingId;
  final String? errorMessage;

  const PaymentErrorScreen({
    super.key,
    required this.venueId,
    this.bookingId,
    this.errorMessage,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: FutureBuilder<DocumentSnapshot>(
          future: FirebaseFirestore.instance
              .collection('venues')
              .doc(venueId)
              .get(),
          builder: (context, snapshot) {
            String? venuePhone;
            String? venueName;
            
            if (snapshot.hasData && snapshot.data!.exists) {
              final venueData = snapshot.data!.data() as Map<String, dynamic>;
              venuePhone = venueData['phone'];
              venueName = venueData['name'];
            }

            return Column(
              children: [
                // Error header
                Container(
                  width: double.infinity,
                  color: AppColors.error,
                  padding: const EdgeInsets.all(AppSpacing.xl),
                  child: Column(
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: const BoxDecoration(
                          color: AppColors.white,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.close,
                          size: 40,
                          color: AppColors.error,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Text(
                        'Ошибка оплаты',
                        style: AppTextStyles.h2.copyWith(color: AppColors.white),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'Платеж не был завершен успешно',
                        style: AppTextStyles.body.copyWith(
                          color: AppColors.white.withValues(alpha: 0.9),
                        ),
                      ),
                    ],
                  ),
                ),
                
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(AppSpacing.screenPadding),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // What happened
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.screenPadding),
                          decoration: BoxDecoration(
                            color: AppColors.white,
                            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Что произошло?',
                                style: AppTextStyles.bodyBold,
                              ),
                              const SizedBox(height: AppSpacing.md),
                              Text(
                                'Без успешной оплаты бронирование не может быть подтверждено. '
                                'Это может произойти по следующим причинам:',
                                style: AppTextStyles.body.copyWith(
                                  color: AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.md),
                              _buildErrorReason('Недостаточно средств на карте'),
                              _buildErrorReason('Превышен лимит по карте'),
                              _buildErrorReason('Платеж был отменен'),
                              _buildErrorReason('Технические проблемы с платежной системой'),
                            ],
                          ),
                        ),
                        
                        const SizedBox(height: AppSpacing.md),
                        
                        // What to do next
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.screenPadding),
                          decoration: BoxDecoration(
                            color: AppColors.white,
                            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Что делать дальше?',
                                style: AppTextStyles.bodyBold,
                              ),
                              const SizedBox(height: AppSpacing.md),
                              
                              // Option 1
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 32,
                                    height: 32,
                                    decoration: BoxDecoration(
                                      color: AppColors.primaryLight,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Center(
                                      child: Text(
                                        '1',
                                        style: TextStyle(
                                          color: AppColors.primary,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: AppSpacing.md),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Попробуйте забронировать снова',
                                          style: AppTextStyles.bodyBold,
                                        ),
                                        const SizedBox(height: AppSpacing.xs),
                                        Text(
                                          'Проверьте баланс карты и повторите попытку бронирования',
                                          style: AppTextStyles.bodySmall.copyWith(
                                            color: AppColors.textSecondary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              
                              const SizedBox(height: AppSpacing.md),
                              
                              // Option 2
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 32,
                                    height: 32,
                                    decoration: BoxDecoration(
                                      color: AppColors.primaryLight,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Center(
                                      child: Text(
                                        '2',
                                        style: TextStyle(
                                          color: AppColors.primary,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: AppSpacing.md),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Свяжитесь с администратором',
                                          style: AppTextStyles.bodyBold,
                                        ),
                                        const SizedBox(height: AppSpacing.xs),
                                        Text(
                                          'Позвоните в клуб для бронирования по телефону',
                                          style: AppTextStyles.bodySmall.copyWith(
                                            color: AppColors.textSecondary,
                                          ),
                                        ),
                                        if (venuePhone != null) ...[
                                          const SizedBox(height: AppSpacing.sm),
                                          InkWell(
                                            onTap: () async {
                                              final uri = Uri.parse('tel:$venuePhone');
                                              if (await canLaunchUrl(uri)) {
                                                await launchUrl(uri);
                                              }
                                            },
                                            child: Container(
                                              padding: const EdgeInsets.symmetric(
                                                horizontal: AppSpacing.md,
                                                vertical: AppSpacing.sm,
                                              ),
                                              decoration: BoxDecoration(
                                                color: AppColors.primaryLight,
                                                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                                              ),
                                              child: Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  const Icon(
                                                    Icons.phone,
                                                    size: 16,
                                                    color: AppColors.primary,
                                                  ),
                                                  const SizedBox(width: AppSpacing.xs),
                                                  Text(
                                                    venuePhone,
                                                    style: AppTextStyles.body.copyWith(
                                                      color: AppColors.primary,
                                                      fontWeight: FontWeight.w600,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                
                // Bottom buttons
                Container(
                  padding: const EdgeInsets.all(AppSpacing.screenPadding),
                  decoration: BoxDecoration(
                    color: AppColors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.1),
                        blurRadius: 10,
                        offset: const Offset(0, -2),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      SizedBox(
                        width: double.infinity,
                        height: AppSpacing.buttonHeight,
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.of(context).popUntil((route) => route.isFirst);
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                            ),
                          ),
                          child: Text(
                            'Попробовать снова',
                            style: AppTextStyles.button.copyWith(color: AppColors.white),
                          ),
                        ),
                      ),
                      if (venuePhone != null) ...[
                        const SizedBox(height: AppSpacing.md),
                        SizedBox(
                          width: double.infinity,
                          height: AppSpacing.buttonHeight,
                          child: OutlinedButton(
                            onPressed: () async {
                              final uri = Uri.parse('tel:$venuePhone');
                              if (await canLaunchUrl(uri)) {
                                await launchUrl(uri);
                              }
                            },
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: AppColors.primary),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(
                                  Icons.phone,
                                  color: AppColors.primary,
                                  size: 20,
                                ),
                                const SizedBox(width: AppSpacing.xs),
                                Text(
                                  'Позвонить в клуб',
                                  style: AppTextStyles.button.copyWith(color: AppColors.primary),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildErrorReason(String reason) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '• ',
            style: AppTextStyles.body.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          Expanded(
            child: Text(
              reason,
              style: AppTextStyles.body.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}