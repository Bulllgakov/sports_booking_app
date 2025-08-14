import 'package:flutter/material.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';
import '../models/venue_model.dart';
import '../models/court_model.dart';
import '../models/user_model.dart';
import 'simple_booking_form_screen.dart';

class OpenGameSettingsScreen extends StatefulWidget {
  final String venueId;
  final String courtId;
  final DateTime date;
  final String time;
  final int duration;
  final int price;
  final int playersCount;
  final VenueModel? venue;
  final CourtModel? court;
  
  const OpenGameSettingsScreen({
    super.key,
    required this.venueId,
    required this.courtId,
    required this.date,
    required this.time,
    required this.duration,
    required this.price,
    required this.playersCount,
    this.venue,
    this.court,
  });

  @override
  State<OpenGameSettingsScreen> createState() => _OpenGameSettingsScreenState();
}

class _OpenGameSettingsScreenState extends State<OpenGameSettingsScreen> {
  PlayerLevel selectedLevel = PlayerLevel.amateur;
  final TextEditingController _descriptionController = TextEditingController();
  
  String _calculateEndTime(String startTime, int duration) {
    final parts = startTime.split(':');
    final startHour = int.parse(parts[0]);
    final startMinute = int.parse(parts[1]);
    
    final totalMinutes = startHour * 60 + startMinute + duration;
    final endHour = totalMinutes ~/ 60;
    final endMinute = totalMinutes % 60;
    
    return '${endHour.toString().padLeft(2, '0')}:${endMinute.toString().padLeft(2, '0')}';
  }

  String _formatDate(DateTime date) {
    final months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    return '${date.day} ${months[date.month - 1]}';
  }

  void _handleContinue() {
    if (_descriptionController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Добавьте описание игры')),
      );
      return;
    }

    final pricePerPlayer = (widget.price / widget.playersCount).round();
    
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => SimpleBookingFormScreen(
          venueId: widget.venueId,
          courtId: widget.courtId,
          date: widget.date,
          time: widget.time,
          duration: widget.duration,
          price: widget.price,
          pricePerPlayer: pricePerPlayer,
          gameType: 'open',
          playersCount: widget.playersCount,
          venue: widget.venue,
          court: widget.court,
          // Передаем новые параметры для открытой игры
          openGameLevel: selectedLevel,
          openGameDescription: _descriptionController.text.trim(),
        ),
      ),
    );
  }

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
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Настройки открытой игры',
              style: AppTextStyles.h3.copyWith(color: AppColors.dark),
            ),
            if (widget.venue != null)
              Text(
                widget.venue!.name,
                style: AppTextStyles.caption.copyWith(color: AppColors.gray),
              ),
          ],
        ),
        toolbarHeight: 80,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Info card
            Container(
              padding: const EdgeInsets.all(AppSpacing.screenPadding),
              color: AppColors.white,
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${widget.court?.name ?? "Корт"}',
                            style: AppTextStyles.bodyBold,
                          ),
                          Text(
                            '${_formatDate(widget.date)} • ${widget.time}-${_calculateEndTime(widget.time, widget.duration)}',
                            style: AppTextStyles.bodySmall.copyWith(color: AppColors.gray),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '${(widget.price / widget.playersCount).round()} ₽',
                            style: AppTextStyles.h3.copyWith(color: AppColors.primary),
                          ),
                          Text(
                            'с человека',
                            style: AppTextStyles.caption.copyWith(color: AppColors.gray),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    decoration: BoxDecoration(
                      color: AppColors.chipBackground,
                      borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.groups, size: 20, color: AppColors.primary),
                        const SizedBox(width: AppSpacing.xs),
                        Text(
                          'Открытая игра на ${widget.playersCount} игроков',
                          style: AppTextStyles.bodySmall.copyWith(color: AppColors.primaryDark),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: AppSpacing.md),
            
            // Level selection
            Container(
              padding: const EdgeInsets.all(AppSpacing.screenPadding),
              color: AppColors.white,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Уровень игры',
                    style: AppTextStyles.h3,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'Выберите уровень, чтобы найти подходящих партнеров',
                    style: AppTextStyles.bodySmall.copyWith(color: AppColors.gray),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  _buildLevelSelector(),
                ],
              ),
            ),
            
            const SizedBox(height: AppSpacing.md),
            
            // Description
            Container(
              padding: const EdgeInsets.all(AppSpacing.screenPadding),
              color: AppColors.white,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Описание игры',
                    style: AppTextStyles.h3,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'Расскажите о себе и кого ищете для игры',
                    style: AppTextStyles.bodySmall.copyWith(color: AppColors.gray),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  TextField(
                    controller: _descriptionController,
                    maxLines: 4,
                    maxLength: 200,
                    decoration: InputDecoration(
                      hintText: 'Например: Играю для удовольствия, ищу партнера для парной игры. Предпочитаю играть в атакующий стиль.',
                      hintStyle: AppTextStyles.body.copyWith(color: AppColors.lightGray),
                      filled: true,
                      fillColor: AppColors.background,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                        borderSide: BorderSide(color: AppColors.extraLightGray),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                        borderSide: BorderSide(color: AppColors.extraLightGray),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                        borderSide: BorderSide(color: AppColors.primary, width: 2),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: AppSpacing.md),
            
            // Info section
            Container(
              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: const Color(0xFFF0F9FF),
                borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                border: Border.all(color: const Color(0xFFBAE6FD)),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Icon(Icons.info_outline, size: 20, color: AppColors.info),
                      const SizedBox(width: AppSpacing.sm),
                      Text(
                        'Как это работает',
                        style: AppTextStyles.bodyBold,
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  _buildInfoRow('1', 'После оплаты ваша игра появится в списке открытых'),
                  const SizedBox(height: AppSpacing.xs),
                  _buildInfoRow('2', 'Другие игроки смогут присоединиться к вашей игре'),
                  const SizedBox(height: AppSpacing.xs),
                  _buildInfoRow('3', 'Вы получите уведомление о новых участниках'),
                  const SizedBox(height: AppSpacing.xs),
                  _buildInfoRow('4', 'Встречайтесь на корте и играйте!'),
                ],
              ),
            ),
            
            const SizedBox(height: AppSpacing.xxl),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
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
        child: SizedBox(
          width: double.infinity,
          height: AppSpacing.buttonHeight,
          child: ElevatedButton(
            onPressed: _handleContinue,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              ),
            ),
            child: Text(
              'Продолжить',
              style: AppTextStyles.button.copyWith(color: AppColors.white),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLevelSelector() {
    return Row(
      children: [
        Expanded(
          child: _buildLevelOption(
            PlayerLevel.beginner,
            'Начинающий',
            Icons.sentiment_satisfied,
            'До 1 года',
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: _buildLevelOption(
            PlayerLevel.amateur,
            'Любитель',
            Icons.sports_tennis,
            '1-3 года',
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: _buildLevelOption(
            PlayerLevel.professional,
            'Профи',
            Icons.emoji_events,
            '3+ лет',
          ),
        ),
      ],
    );
  }

  Widget _buildLevelOption(PlayerLevel level, String label, IconData icon, String experience) {
    final isSelected = selectedLevel == level;
    
    return InkWell(
      onTap: () {
        setState(() {
          selectedLevel = level;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.white,
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.lightGray,
            width: isSelected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              color: isSelected ? AppColors.white : AppColors.gray,
              size: 28,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              label,
              style: AppTextStyles.bodySmallBold.copyWith(
                color: isSelected ? AppColors.white : AppColors.dark,
              ),
            ),
            Text(
              experience,
              style: AppTextStyles.tiny.copyWith(
                color: isSelected ? AppColors.white.withValues(alpha: 0.8) : AppColors.gray,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String number, String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 20,
          height: 20,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              number,
              style: AppTextStyles.caption.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Text(
            text,
            style: AppTextStyles.bodySmall.copyWith(color: AppColors.gray),
          ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }
}