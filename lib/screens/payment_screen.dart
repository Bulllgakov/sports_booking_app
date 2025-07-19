import 'package:flutter/material.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';

class PaymentScreen extends StatefulWidget {
  const PaymentScreen({super.key});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  String _selectedCard = 'card1';
  final _promoController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Оплата'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Детали бронирования',
                      style: AppTextStyles.h3,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    _buildDetailRow('Корт:', 'Теннисный корт "Олимп"'),
                    const SizedBox(height: AppSpacing.sm),
                    _buildDetailRow('Дата:', '15 января 2024'),
                    const SizedBox(height: AppSpacing.sm),
                    _buildDetailRow('Время:', '18:00 - 19:00'),
                    const SizedBox(height: AppSpacing.sm),
                    _buildDetailRow('Тип игры:', 'Открытая игра'),
                    const Divider(height: AppSpacing.lg),
                    _buildDetailRow(
                      'Итого:',
                      '500 ₽',
                      isTotal: true,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Способ оплаты',
              style: AppTextStyles.h3,
            ),
            const SizedBox(height: AppSpacing.md),
            _buildCardOption(
              id: 'card1',
              cardNumber: '**** 1234',
              cardType: 'Visa',
              icon: Icons.credit_card,
            ),
            const SizedBox(height: AppSpacing.sm),
            _buildCardOption(
              id: 'card2',
              cardNumber: '**** 5678',
              cardType: 'Mastercard',
              icon: Icons.credit_card,
            ),
            const SizedBox(height: AppSpacing.sm),
            InkWell(
              onTap: () {},
              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
              child: Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.extraLightGray),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                ),
                child: Row(
                  children: [
                    Icon(Icons.add, color: AppColors.primary),
                    const SizedBox(width: AppSpacing.md),
                    Text(
                      'Добавить новую карту',
                      style: AppTextStyles.body.copyWith(color: AppColors.primary),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Промокод',
              style: AppTextStyles.h3,
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _promoController,
                    decoration: const InputDecoration(
                      hintText: 'Введите промокод',
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                OutlinedButton(
                  onPressed: () {},
                  child: const Text('Применить'),
                ),
              ],
            ),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Icon(Icons.lock, size: AppSpacing.iconXs, color: AppColors.gray),
                const SizedBox(width: AppSpacing.xs),
                Text(
                  'Безопасная оплата',
                  style: AppTextStyles.caption,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            ElevatedButton(
              onPressed: () {},
              child: const Text('Оплатить 500 ₽'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {bool isTotal = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: isTotal ? AppTextStyles.h3 : AppTextStyles.body,
        ),
        Text(
          value,
          style: isTotal
              ? AppTextStyles.h3.copyWith(color: AppColors.primary)
              : AppTextStyles.body.copyWith(fontWeight: FontWeight.w600),
        ),
      ],
    );
  }

  Widget _buildCardOption({
    required String id,
    required String cardNumber,
    required String cardType,
    required IconData icon,
  }) {
    final isSelected = _selectedCard == id;
    return InkWell(
      onTap: () {
        setState(() {
          _selectedCard = id;
        });
      },
      borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryLight : AppColors.white,
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.extraLightGray,
            width: isSelected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
        ),
        child: Row(
          children: [
            Icon(icon, color: isSelected ? AppColors.primary : AppColors.gray),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    cardType,
                    style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600),
                  ),
                  Text(
                    cardNumber,
                    style: AppTextStyles.bodySmall,
                  ),
                ],
              ),
            ),
            Radio<String>(
              value: id,
              groupValue: _selectedCard,
              onChanged: (value) {
                setState(() {
                  _selectedCard = value!;
                });
              },
              activeColor: AppColors.primary,
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _promoController.dispose();
    super.dispose();
  }
}