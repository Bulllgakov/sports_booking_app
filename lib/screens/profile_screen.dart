import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';
import '../services/auth_service.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.lg),
                color: AppColors.white,
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 50,
                      backgroundColor: AppColors.primary,
                      child: Text(
                        'АИ',
                        style: AppTextStyles.h1.copyWith(color: AppColors.white),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Text(
                      'Александр Иванов',
                      style: AppTextStyles.h2,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      '+7 (999) 123-45-67',
                      style: AppTextStyles.bodySmall,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.md,
                        vertical: AppSpacing.sm,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
                      ),
                      child: Text(
                        'Уровень: Любитель',
                        style: AppTextStyles.body.copyWith(
                          color: AppColors.primaryDark,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Container(
                color: AppColors.white,
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildStatItem('Игр сыграно', '42'),
                    Container(
                      width: 1,
                      height: 40,
                      color: AppColors.extraLightGray,
                    ),
                    _buildStatItem('Часов на корте', '84'),
                    Container(
                      width: 1,
                      height: 40,
                      color: AppColors.extraLightGray,
                    ),
                    _buildStatItem('Партнеров', '18'),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              _buildMenuSection(
                title: 'Настройки профиля',
                items: [
                  _buildMenuItem(
                    icon: Icons.person_outline,
                    title: 'Личные данные',
                    onTap: () {},
                  ),
                  _buildMenuItem(
                    icon: Icons.sports_tennis,
                    title: 'Спортивные предпочтения',
                    onTap: () {},
                  ),
                  _buildMenuItem(
                    icon: Icons.notifications_outlined,
                    title: 'Уведомления',
                    onTap: () {},
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              _buildMenuSection(
                title: 'Платежи',
                items: [
                  _buildMenuItem(
                    icon: Icons.credit_card,
                    title: 'Способы оплаты',
                    onTap: () {},
                  ),
                  _buildMenuItem(
                    icon: Icons.history,
                    title: 'История платежей',
                    onTap: () {},
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              _buildMenuSection(
                title: 'Поддержка',
                items: [
                  _buildMenuItem(
                    icon: Icons.help_outline,
                    title: 'Помощь',
                    onTap: () {},
                  ),
                  _buildMenuItem(
                    icon: Icons.info_outline,
                    title: 'О приложении',
                    onTap: () {},
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                child: OutlinedButton(
                  onPressed: () async {
                    final authService = context.read<AuthService>();
                    await authService.signOut();
                    if (context.mounted) {
                      context.go('/login');
                    }
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.error,
                    side: const BorderSide(color: AppColors.error),
                  ),
                  child: const Text('Выйти из аккаунта'),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: AppTextStyles.h2.copyWith(color: AppColors.primary),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          label,
          style: AppTextStyles.caption,
        ),
      ],
    );
  }

  Widget _buildMenuSection({
    required String title,
    required List<Widget> items,
  }) {
    return Container(
      color: AppColors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.md,
              AppSpacing.md,
              AppSpacing.sm,
            ),
            child: Text(
              title,
              style: AppTextStyles.caption.copyWith(
                color: AppColors.gray,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ...items,
        ],
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.md,
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: AppColors.gray,
              size: AppSpacing.iconMd,
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Text(
                title,
                style: AppTextStyles.body,
              ),
            ),
            Icon(
              Icons.arrow_forward_ios,
              color: AppColors.lightGray,
              size: AppSpacing.iconSm,
            ),
          ],
        ),
      ),
    );
  }
}