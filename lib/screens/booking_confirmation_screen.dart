import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../core/theme/colors.dart';
import '../core/theme/spacing.dart';
import '../core/theme/text_styles.dart';

class BookingConfirmationScreen extends StatelessWidget {
  final String bookingId;

  const BookingConfirmationScreen({
    super.key,
    required this.bookingId,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: FutureBuilder<DocumentSnapshot>(
          future: FirebaseFirestore.instance
              .collection('bookings')
              .doc(bookingId)
              .get(),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(
                child: CircularProgressIndicator(
                  color: AppColors.primary,
                ),
              );
            }

            if (!snapshot.hasData || !snapshot.data!.exists) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.error_outline,
                      size: 80,
                      color: AppColors.error,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Text(
                      'Бронирование не найдено',
                      style: AppTextStyles.h3,
                    ),
                    const SizedBox(height: AppSpacing.xl),
                    ElevatedButton(
                      onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
                      child: const Text('На главную'),
                    ),
                  ],
                ),
              );
            }

            final booking = snapshot.data!.data() as Map<String, dynamic>;

            return Column(
              children: [
                // Success header
                Container(
                  width: double.infinity,
                  color: AppColors.success,
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
                          Icons.check,
                          size: 40,
                          color: AppColors.success,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Text(
                        'Бронирование подтверждено!',
                        style: AppTextStyles.h2.copyWith(color: AppColors.white),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'Ваша оплата прошла успешно',
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
                      children: [
                        // Booking details
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
                                'Детали бронирования',
                                style: AppTextStyles.bodyBold,
                              ),
                              const SizedBox(height: AppSpacing.md),
                              
                              _buildDetailRow('Клуб', booking['venueName'] ?? ''),
                              const SizedBox(height: AppSpacing.sm),
                              _buildDetailRow('Корт', booking['courtName'] ?? ''),
                              const SizedBox(height: AppSpacing.sm),
                              _buildDetailRow('Дата', booking['dateString'] ?? ''),
                              const SizedBox(height: AppSpacing.sm),
                              _buildDetailRow('Время', '${booking['startTime']} - ${booking['endTime']}'),
                              
                              if (booking['gameType'] == 'open') ...[
                                const SizedBox(height: AppSpacing.sm),
                                _buildDetailRow(
                                  'Тип игры',
                                  'Открытая игра • ${booking['playersCount']} игрока',
                                ),
                              ],
                              
                              Container(
                                margin: const EdgeInsets.only(top: AppSpacing.md),
                                padding: const EdgeInsets.only(top: AppSpacing.md),
                                decoration: const BoxDecoration(
                                  border: Border(
                                    top: BorderSide(color: AppColors.divider),
                                  ),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'Сумма оплаты',
                                      style: AppTextStyles.body.copyWith(
                                        color: AppColors.textSecondary,
                                      ),
                                    ),
                                    Text(
                                      booking['pricePerPlayer'] != null && booking['gameType'] == 'open'
                                          ? '${booking['pricePerPlayer']} ₽'
                                          : '${booking['price']} ₽',
                                      style: AppTextStyles.h3.copyWith(
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        
                        const SizedBox(height: AppSpacing.md),
                        
                        // Contact info
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
                                'Контактные данные',
                                style: AppTextStyles.bodyBold,
                              ),
                              const SizedBox(height: AppSpacing.md),
                              
                              _buildDetailRow('Имя', booking['customerName'] ?? ''),
                              const SizedBox(height: AppSpacing.sm),
                              _buildDetailRow('Телефон', booking['customerPhone'] ?? ''),
                            ],
                          ),
                        ),
                        
                        const SizedBox(height: AppSpacing.md),
                        
                        // Info message
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: AppColors.primaryLight,
                            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                          ),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.info_outline,
                                size: 20,
                                color: AppColors.primary,
                              ),
                              const SizedBox(width: AppSpacing.sm),
                              Expanded(
                                child: Text(
                                  'Информация о бронировании отправлена на ваш номер телефона. Пожалуйста, приходите за 10 минут до начала игры.',
                                  style: AppTextStyles.caption.copyWith(
                                    color: AppColors.primaryDark,
                                  ),
                                ),
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
                            'На главную',
                            style: AppTextStyles.button.copyWith(color: AppColors.white),
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      SizedBox(
                        width: double.infinity,
                        height: AppSpacing.buttonHeight,
                        child: OutlinedButton(
                          onPressed: () {
                            Navigator.of(context).pushNamedAndRemoveUntil(
                              '/my-bookings',
                              (route) => route.isFirst,
                            );
                          },
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.primary),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                            ),
                          ),
                          child: Text(
                            'Мои бронирования',
                            style: AppTextStyles.button.copyWith(color: AppColors.primary),
                          ),
                        ),
                      ),
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

  Widget _buildDetailRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: AppTextStyles.body.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
        Text(
          value,
          style: AppTextStyles.bodyBold,
        ),
      ],
    );
  }
}