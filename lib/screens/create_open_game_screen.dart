import 'package:flutter/material.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';

class CreateOpenGameScreen extends StatefulWidget {
  const CreateOpenGameScreen({super.key});

  @override
  State<CreateOpenGameScreen> createState() => _CreateOpenGameScreenState();
}

class _CreateOpenGameScreenState extends State<CreateOpenGameScreen> {
  String _playerLevel = 'amateur';
  int _playersNeeded = 1;
  final _descriptionController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Создать открытую игру'),
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
                    Row(
                      children: [
                        Icon(Icons.info_outline, size: AppSpacing.iconSm, color: AppColors.info),
                        const SizedBox(width: AppSpacing.sm),
                        Text(
                          'Информация об игре',
                          style: AppTextStyles.h3,
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      'Теннисный корт "Олимп"',
                      style: AppTextStyles.body,
                    ),
                    Text(
                      '15 января, 18:00 - 19:00',
                      style: AppTextStyles.bodySmall,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'Стоимость: 2000 ₽',
                      style: AppTextStyles.body.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Уровень игры',
              style: AppTextStyles.h3,
            ),
            const SizedBox(height: AppSpacing.sm),
            _buildLevelSelector(),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Количество игроков',
              style: AppTextStyles.h3,
            ),
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                Text(
                  'Ищу еще',
                  style: AppTextStyles.body,
                ),
                const SizedBox(width: AppSpacing.md),
                Container(
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.extraLightGray),
                    borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: _playersNeeded > 1 ? () {
                          setState(() {
                            _playersNeeded--;
                          });
                        } : null,
                        icon: const Icon(Icons.remove),
                      ),
                      Text(
                        '$_playersNeeded',
                        style: AppTextStyles.h3,
                      ),
                      IconButton(
                        onPressed: _playersNeeded < 3 ? () {
                          setState(() {
                            _playersNeeded++;
                          });
                        } : null,
                        icon: const Icon(Icons.add),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Text(
                  'игроков',
                  style: AppTextStyles.body,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Описание',
              style: AppTextStyles.h3,
            ),
            const SizedBox(height: AppSpacing.sm),
            TextField(
              controller: _descriptionController,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'Расскажите о себе и что ищете в партнере по игре...',
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Card(
              color: AppColors.primaryLight,
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Разделение стоимости',
                      style: AppTextStyles.h3,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Всего игроков:',
                          style: AppTextStyles.body,
                        ),
                        Text(
                          '${_playersNeeded + 1}',
                          style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Стоимость на человека:',
                          style: AppTextStyles.body,
                        ),
                        Text(
                          '${2000 ~/ (_playersNeeded + 1)} ₽',
                          style: AppTextStyles.h3.copyWith(color: AppColors.primary),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
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
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: ElevatedButton(
          onPressed: () {},
          child: const Text('Создать игру'),
        ),
      ),
    );
  }

  Widget _buildLevelSelector() {
    return Row(
      children: [
        Expanded(
          child: _buildLevelOption(
            'beginner',
            'Начинающий',
            Icons.sentiment_satisfied,
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: _buildLevelOption(
            'amateur',
            'Любитель',
            Icons.sports_tennis,
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: _buildLevelOption(
            'pro',
            'Профи',
            Icons.emoji_events,
          ),
        ),
      ],
    );
  }

  Widget _buildLevelOption(String value, String label, IconData icon) {
    final isSelected = _playerLevel == value;
    return InkWell(
      onTap: () {
        setState(() {
          _playerLevel = value;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.white,
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.lightGray,
          ),
          borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              color: isSelected ? AppColors.white : AppColors.gray,
              size: AppSpacing.iconMd,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              label,
              style: AppTextStyles.bodySmall.copyWith(
                color: isSelected ? AppColors.white : AppColors.dark,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }
}