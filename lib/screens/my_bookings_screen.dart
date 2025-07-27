import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';

class MyBookingsScreen extends StatefulWidget {
  const MyBookingsScreen({super.key});

  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Мои бронирования'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.gray,
          indicatorColor: AppColors.primary,
          tabs: const [
            Tab(text: 'Предстоящие'),
            Tab(text: 'История'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildUpcomingBookings(),
          _buildHistoryBookings(),
        ],
      ),
    );
  }

  Widget _buildUpcomingBookings() {
    return ListView.builder(
      padding: const EdgeInsets.all(AppSpacing.md),
      itemCount: 3,
      itemBuilder: (context, index) {
        return Card(
          margin: const EdgeInsets.only(bottom: AppSpacing.md),
          child: InkWell(
            onTap: () => _showBookingDetails(context),
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
                          color: AppColors.success.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
                        ),
                        child: Text(
                          'Подтверждено',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.success,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.qr_code),
                        onPressed: () => _showQRCode(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'Теннисный корт "Олимп"',
                    style: AppTextStyles.h3,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    index == 0 ? 'Открытая игра' : 'Одиночная игра',
                    style: AppTextStyles.bodySmall,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Row(
                    children: [
                      Icon(Icons.calendar_today, size: AppSpacing.iconXs, color: AppColors.gray),
                      const SizedBox(width: AppSpacing.xs),
                      Text(
                        '${15 + index} января 2024',
                        style: AppTextStyles.bodySmall,
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Icon(Icons.access_time, size: AppSpacing.iconXs, color: AppColors.gray),
                      const SizedBox(width: AppSpacing.xs),
                      Text(
                        '${18 + index}:00 - ${19 + index}:00',
                        style: AppTextStyles.bodySmall,
                      ),
                    ],
                  ),
                  if (index == 0) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        Icon(Icons.group, size: AppSpacing.iconXs, color: AppColors.gray),
                        const SizedBox(width: AppSpacing.xs),
                        Text(
                          '3/4 игроков',
                          style: AppTextStyles.bodySmall,
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: AppSpacing.md),
                  const Divider(),
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      TextButton(
                        onPressed: () {},
                        style: TextButton.styleFrom(
                          foregroundColor: AppColors.error,
                        ),
                        child: const Text('Отменить'),
                      ),
                      Text(
                        index == 0 ? '500 ₽' : '2000 ₽',
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
      },
    );
  }

  Widget _buildHistoryBookings() {
    return ListView.builder(
      padding: const EdgeInsets.all(AppSpacing.md),
      itemCount: 5,
      itemBuilder: (context, index) {
        final isCancelled = index == 2;
        return Card(
          margin: const EdgeInsets.only(bottom: AppSpacing.md),
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
                        color: isCancelled
                            ? AppColors.error.withOpacity(0.1)
                            : AppColors.gray.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
                      ),
                      child: Text(
                        isCancelled ? 'Отменено' : 'Завершено',
                        style: AppTextStyles.caption.copyWith(
                          color: isCancelled ? AppColors.error : AppColors.gray,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    if (!isCancelled)
                      TextButton(
                        onPressed: () {},
                        child: const Text('Повторить'),
                      ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'Корт "Спортивный ${index + 1}"',
                  style: AppTextStyles.h3,
                ),
                const SizedBox(height: AppSpacing.xs),
                Row(
                  children: [
                    Text(
                      '${1 + index} декабря 2023',
                      style: AppTextStyles.bodySmall,
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Text(
                      '${17 + index}:00 - ${18 + index}:00',
                      style: AppTextStyles.bodySmall,
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showBookingDetails(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppSpacing.radiusLg),
        ),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Детали бронирования',
                style: AppTextStyles.h2,
              ),
              const SizedBox(height: AppSpacing.lg),
              _buildInfoRow('Номер брони:', '#12345'),
              const SizedBox(height: AppSpacing.sm),
              _buildInfoRow('Корт:', 'Теннисный корт "Олимп"'),
              const SizedBox(height: AppSpacing.sm),
              _buildInfoRow('Адрес:', 'ул. Спортивная, 15'),
              const SizedBox(height: AppSpacing.sm),
              _buildInfoRow('Дата:', '15 января 2024'),
              const SizedBox(height: AppSpacing.sm),
              _buildInfoRow('Время:', '18:00 - 19:00'),
              const SizedBox(height: AppSpacing.sm),
              _buildInfoRow('Тип игры:', 'Открытая игра'),
              const SizedBox(height: AppSpacing.sm),
              _buildInfoRow('Стоимость:', '500 ₽'),
              const SizedBox(height: AppSpacing.lg),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Закрыть'),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showQRCode(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          ),
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'QR-код для входа',
                  style: AppTextStyles.h2,
                ),
                const SizedBox(height: AppSpacing.lg),
                QrImageView(
                  data: 'BOOKING-12345',
                  version: QrVersions.auto,
                  size: 200,
                ),
                const SizedBox(height: AppSpacing.lg),
                Text(
                  'Покажите этот код на входе',
                  style: AppTextStyles.bodySmall,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppSpacing.lg),
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Закрыть'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: AppTextStyles.bodySmall),
        Text(value, style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600)),
      ],
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
}