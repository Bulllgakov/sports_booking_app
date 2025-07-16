import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';
import '../widgets/primary_button.dart';
import '../widgets/custom_text_field.dart';
import '../services/auth_service.dart';
import '../models/user_model.dart';

class ProfileSetupScreen extends StatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  State<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends State<ProfileSetupScreen> {
  final TextEditingController _nameController = TextEditingController();
  PlayerLevel _selectedLevel = PlayerLevel.beginner;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (_nameController.text.trim().isEmpty) {
      setState(() {
        _errorMessage = 'Введите ваше имя';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final authService = context.read<AuthService>();
      
      await authService.createUserProfile(
        displayName: _nameController.text.trim(),
        playerLevel: _selectedLevel,
      );

      if (mounted) {
        context.go('/');
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Произошла ошибка: $e';
      });
    }
  }

  String _getLevelTitle(PlayerLevel level) {
    switch (level) {
      case PlayerLevel.beginner:
        return 'Новичок';
      case PlayerLevel.intermediate:
        return 'Средний';
      case PlayerLevel.advanced:
        return 'Продвинутый';
      case PlayerLevel.professional:
        return 'Профессионал';
    }
  }

  String _getLevelDescription(PlayerLevel level) {
    switch (level) {
      case PlayerLevel.beginner:
        return 'Только начинаю изучать игру';
      case PlayerLevel.intermediate:
        return 'Играю несколько месяцев/лет';
      case PlayerLevel.advanced:
        return 'Имею хороший опыт игры';
      case PlayerLevel.professional:
        return 'Участвую в турнирах';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: AppSpacing.xl),
              
              Icon(
                Icons.person_add,
                size: 80,
                color: AppColors.primary,
              ),
              const SizedBox(height: AppSpacing.lg),
              
              Text(
                'Настройка профиля',
                style: AppTextStyles.h1,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.sm),
              
              Text(
                'Расскажите о себе, чтобы мы могли подобрать подходящих партнеров',
                style: AppTextStyles.body.copyWith(
                  color: AppColors.lightGray,
                ),
                textAlign: TextAlign.center,
              ),
              
              const SizedBox(height: AppSpacing.xl),
              
              // Name input
              Text(
                'Как вас зовут?',
                style: AppTextStyles.h3,
              ),
              const SizedBox(height: AppSpacing.sm),
              
              CustomTextField(
                controller: _nameController,
                hint: 'Введите ваше имя',
                prefixIcon: const Icon(Icons.person),
                enabled: !_isLoading,
              ),
              
              const SizedBox(height: AppSpacing.xl),
              
              // Player level selection
              Text(
                'Выберите ваш уровень игры',
                style: AppTextStyles.h3,
              ),
              const SizedBox(height: AppSpacing.md),
              
              ...PlayerLevel.values.map((level) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: RadioListTile<PlayerLevel>(
                    value: level,
                    groupValue: _selectedLevel,
                    onChanged: _isLoading ? null : (value) {
                      setState(() {
                        _selectedLevel = value!;
                      });
                    },
                    title: Text(
                      _getLevelTitle(level),
                      style: AppTextStyles.body,
                    ),
                    subtitle: Text(
                      _getLevelDescription(level),
                      style: AppTextStyles.bodySmall.copyWith(
                        color: AppColors.lightGray,
                      ),
                    ),
                    activeColor: AppColors.primary,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                    ),
                    tileColor: AppColors.white,
                  ),
                );
              }).toList(),
              
              if (_errorMessage != null) ...[
                const SizedBox(height: AppSpacing.md),
                Text(
                  _errorMessage!,
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.error,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
              
              const Spacer(),
              
              // Save button
              PrimaryButton(
                text: 'Сохранить профиль',
                onPressed: _isLoading ? null : _saveProfile,
                isLoading: _isLoading,
              ),
              
              const SizedBox(height: AppSpacing.md),
            ],
          ),
        ),
      ),
    );
  }
}