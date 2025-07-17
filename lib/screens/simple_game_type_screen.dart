import 'package:flutter/material.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';
import 'payment_screen.dart';
import 'create_open_game_screen.dart';
import 'find_game_screen.dart';

class SimpleGameTypeScreen extends StatefulWidget {
  const SimpleGameTypeScreen({super.key});

  @override
  State<SimpleGameTypeScreen> createState() => _SimpleGameTypeScreenState();
}

class _SimpleGameTypeScreenState extends State<SimpleGameTypeScreen> {
  String selectedGameType = 'private';

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
        title: Text(
          'Выберите формат игры',
          style: AppTextStyles.h3.copyWith(color: AppColors.dark),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        child: Column(
          children: [
            // Private game card
            _buildGameTypeCard(
              type: 'private',
              icon: Icons.lock,
              iconColor: AppColors.primary,
              title: 'Приватная игра',
              subtitle: 'Только для вас и ваших друзей',
              tags: ['Только для вас', 'Без посторонних'],
              onTap: () {
                setState(() {
                  selectedGameType = 'private';
                });
              },
            ),
            const SizedBox(height: AppSpacing.cardPadding),
            
            // Open game card
            _buildGameTypeCard(
              type: 'open',
              icon: Icons.group,
              iconColor: AppColors.gray,
              title: 'Открытая игра',
              subtitle: 'Найдите партнёров для игры',
              tags: ['Найти партнёров', 'Разделить оплату'],
              onTap: () {
                setState(() {
                  selectedGameType = 'open';
                });
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const CreateOpenGameScreen()),
                );
              },
            ),
            const SizedBox(height: AppSpacing.cardPadding),
            
            // Find game card
            _buildGameTypeCard(
              type: 'find',
              icon: Icons.search,
              iconColor: AppColors.gray,
              title: 'Найти игру',
              subtitle: 'Присоединитесь к существующей игре',
              tags: ['12 открытых игр'],
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const FindGameScreen()),
                );
              },
            ),
            
            const Spacer(),
            
            // Continue button
            SizedBox(
              width: double.infinity,
              height: AppSpacing.buttonHeight,
              child: ElevatedButton(
                onPressed: selectedGameType == 'private' ? () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const PaymentScreen()),
                  );
                } : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  ),
                ),
                child: Text(
                  'Далее к оплате',
                  style: AppTextStyles.button.copyWith(color: AppColors.white),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildGameTypeCard({
    required String type,
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required List<String> tags,
    required VoidCallback onTap,
  }) {
    final isSelected = selectedGameType == type;
    
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.cardPadding),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          border: Border.all(
            color: isSelected ? AppColors.primary : Colors.transparent,
            width: 2,
          ),
          boxShadow: isSelected ? [
            BoxShadow(
              color: AppColors.primary.withOpacity(0.1),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ] : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.primary : AppColors.divider,
                    borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                  ),
                  child: Icon(
                    icon,
                    color: isSelected ? AppColors.white : iconColor,
                    size: 20,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Text(
                  title,
                  style: AppTextStyles.bodyBold,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            Padding(
              padding: const EdgeInsets.only(left: 40 + AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    subtitle,
                    style: AppTextStyles.bodySmall.copyWith(color: AppColors.gray),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Wrap(
                    spacing: AppSpacing.xs,
                    children: tags.map((tag) => Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.md,
                        vertical: AppSpacing.xs,
                      ),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.primaryLight : AppColors.divider,
                        borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
                      ),
                      child: Text(
                        tag,
                        style: AppTextStyles.caption.copyWith(
                          color: isSelected ? AppColors.primaryDark : AppColors.gray,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    )).toList(),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}