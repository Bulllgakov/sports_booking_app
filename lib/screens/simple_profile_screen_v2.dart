import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';
import '../services/auth_service.dart';
import '../widgets/primary_button.dart';
import 'login_screen.dart';

class SimpleProfileScreenV2 extends StatefulWidget {
  const SimpleProfileScreenV2({super.key});

  @override
  State<SimpleProfileScreenV2> createState() => _SimpleProfileScreenV2State();
}

class _SimpleProfileScreenV2State extends State<SimpleProfileScreenV2> {
  int _totalBookings = 0;
  int _completedBookings = 0;
  bool _isLoadingStats = true;

  @override
  void initState() {
    super.initState();
    _loadUserStats();
  }

  Future<void> _loadUserStats() async {
    try {
      final authService = context.read<AuthService>();
      if (authService.isAuthenticated && authService.currentUser != null) {
        // Загружаем статистику бронирований пользователя
        final bookingsQuery = await FirebaseFirestore.instance
            .collection('bookings')
            .where('userId', isEqualTo: authService.currentUser!.uid)
            .get();

        setState(() {
          _totalBookings = bookingsQuery.docs.length;
          _completedBookings = bookingsQuery.docs
              .where((doc) => doc.data()['status'] == 'confirmed')
              .length;
          _isLoadingStats = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading user stats: $e');
      setState(() {
        _isLoadingStats = false;
      });
    }
  }

  String _getInitials(String? name) {
    if (name == null || name.isEmpty) return '?';
    final parts = name.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.substring(0, 1).toUpperCase();
  }

  Future<void> _handleLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Выход из аккаунта'),
        content: const Text('Вы уверены, что хотите выйти?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Отмена'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              'Выйти',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final authService = context.read<AuthService>();
      await authService.signOut();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthService>(
      builder: (context, authService, child) {
        final user = authService.currentUserModel;
        final userName = user?.displayName ?? 'Пользователь';
        final phoneNumber = user?.phoneNumber ?? authService.currentUser?.phoneNumber ?? '';
        
        return Scaffold(
          backgroundColor: AppColors.background,
          body: SafeArea(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  // Header
                  Padding(
                    padding: const EdgeInsets.all(AppSpacing.headerPadding),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            'Профиль',
                            style: AppTextStyles.h1,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          'Ваша статистика и настройки',
                          style: AppTextStyles.body.copyWith(color: AppColors.gray),
                        ),
                      ],
                    ),
                  ),
              
                  // Profile info
                  Column(
                    children: [
                      // Avatar
                      Container(
                        width: 80,
                        height: 80,
                        decoration: const BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            _getInitials(userName),
                            style: AppTextStyles.h1.copyWith(
                              color: AppColors.white,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Text(
                        userName.isEmpty ? 'Пользователь' : userName,
                        style: AppTextStyles.h2,
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        phoneNumber,
                        style: AppTextStyles.bodySmall.copyWith(color: AppColors.gray),
                      ),
                    ],
                  ),
              const SizedBox(height: AppSpacing.xl),
              
                  // Stats
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
                    child: _isLoadingStats
                        ? const Center(
                            child: Padding(
                              padding: EdgeInsets.all(AppSpacing.xl),
                              child: CircularProgressIndicator(),
                            ),
                          )
                        : Row(
                            children: [
                              Expanded(
                                child: _buildStatCard(
                                  _totalBookings.toString(),
                                  'Бронирований',
                                ),
                              ),
                              const SizedBox(width: AppSpacing.sm),
                              Expanded(
                                child: _buildStatCard(
                                  _completedBookings.toString(),
                                  'Завершено',
                                ),
                              ),
                              const SizedBox(width: AppSpacing.sm),
                              Expanded(
                                child: _buildStatCard(
                                  authService.isAuthenticated ? '✓' : '✗',
                                  'Авторизован',
                                ),
                              ),
                            ],
                          ),
                  ),
              const SizedBox(height: AppSpacing.xl),
              
                  // Menu items
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
                    child: Column(
                      children: [
                        _buildMenuItem(
                          icon: Icons.person_outline,
                          title: 'Личные данные',
                          subtitle: userName.isEmpty ? 'Не указаны' : 'Заполнены',
                          onTap: () {
                            // TODO: Открыть экран редактирования профиля
                          },
                        ),
                        const SizedBox(height: AppSpacing.cardPadding),
                        _buildMenuItem(
                          icon: Icons.history,
                          title: 'История бронирований',
                          subtitle: '$_totalBookings бронирований',
                          onTap: () {
                            // Переход на вкладку "Мои бронирования"
                            DefaultTabController.of(context)?.animateTo(2);
                          },
                        ),
                        const SizedBox(height: AppSpacing.cardPadding),
                        _buildMenuItem(
                          icon: Icons.notifications_outlined,
                          title: 'Уведомления',
                          subtitle: 'Включены',
                          onTap: () {
                            // TODO: Настройки уведомлений
                          },
                        ),
                        const SizedBox(height: AppSpacing.cardPadding),
                        _buildMenuItem(
                          icon: Icons.help_outline,
                          title: 'Помощь и поддержка',
                          onTap: () {
                            // TODO: Экран помощи
                          },
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        // Кнопка выхода
                        PrimaryButton(
                          text: 'Выйти из аккаунта',
                          onPressed: _handleLogout,
                          variant: 'outline',
                          icon: Icons.logout,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
  
  Widget _buildStatCard(String value, String label) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: AppTextStyles.h3.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            label,
            style: AppTextStyles.caption.copyWith(color: AppColors.gray),
          ),
        ],
      ),
    );
  }
  
  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.cardPadding),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
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
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTextStyles.body,
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.gray,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: AppColors.lightGray,
              size: AppSpacing.iconMd,
            ),
          ],
        ),
      ),
    );
  }
}