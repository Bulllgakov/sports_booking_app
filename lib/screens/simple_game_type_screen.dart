import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';
import '../models/venue_model.dart';
import '../models/court_model.dart';
import '../services/auth_service.dart';
import '../services/booking_service.dart';
import 'login_screen.dart';
import 'payment_screen.dart';

class SimpleGameTypeScreen extends StatefulWidget {
  final String venueId;
  final String courtId;
  final DateTime date;
  final String time;
  final int duration;
  final int price;
  final VenueModel? venue;
  final CourtModel? court;
  
  const SimpleGameTypeScreen({
    super.key,
    required this.venueId,
    required this.courtId,
    required this.date,
    required this.time,
    required this.duration,
    required this.price,
    this.venue,
    this.court,
  });

  @override
  State<SimpleGameTypeScreen> createState() => _SimpleGameTypeScreenState();
}

class _SimpleGameTypeScreenState extends State<SimpleGameTypeScreen> {
  String selectedGameType = 'private';
  int selectedPlayersCount = 2; // Default to 2 players for open games
  bool _isLoading = false;

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

  Future<void> _handleContinue() async {
    final authService = context.read<AuthService>();
    
    // Проверяем авторизацию
    if (!authService.isAuthenticated) {
      // Показываем диалог с предложением авторизоваться
      final shouldLogin = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Требуется авторизация'),
          content: const Text('Для бронирования корта необходимо войти в приложение'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Отмена'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Войти'),
            ),
          ],
        ),
      );
      
      if (shouldLogin == true && mounted) {
        // Переходим на экран авторизации
        final result = await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => const LoginScreen(),
          ),
        );
        
        // Если пользователь не авторизовался, выходим
        if (!mounted || !authService.isAuthenticated) return;
      } else {
        return;
      }
    }
    
    // Пользователь авторизован, создаем бронирование
    setState(() {
      _isLoading = true;
    });
    
    try {
      final user = authService.currentUserModel;
      if (user == null) {
        throw Exception('Не удалось загрузить данные пользователя');
      }
      
      // Форматируем дату в строковый формат для совместимости
      final dateString = DateFormat('yyyy-MM-dd').format(widget.date);
      
      // Calculate price per player for open games
      final totalPrice = widget.price;
      final pricePerPlayer = selectedGameType == 'open' 
          ? totalPrice / selectedPlayersCount 
          : totalPrice;
      
      // Создаем бронирование
      final bookingId = await BookingService().createBooking(
        courtId: widget.courtId,
        courtName: widget.court?.name ?? '',
        venueId: widget.venueId,
        venueName: widget.venue?.name ?? '',
        date: widget.date,
        dateString: dateString,
        time: widget.time,
        startTime: widget.time,
        endTime: _calculateEndTime(widget.time, widget.duration),
        duration: widget.duration,
        gameType: selectedGameType,
        customerName: user.displayName,
        customerPhone: user.phoneNumber,
        price: totalPrice,
        pricePerPlayer: pricePerPlayer,
        playersCount: selectedGameType == 'open' ? selectedPlayersCount : 1,
        source: 'mobile_app',
      );
      
      if (!mounted) return;
      
      // Показываем сообщение об успешном создании
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Бронирование успешно создано!'),
          backgroundColor: AppColors.success,
        ),
      );
      
      // Переходим на главный экран (или экран с деталями бронирования)
      Navigator.of(context).popUntil((route) => route.isFirst);
      
    } catch (e) {
      if (!mounted) return;
      
      setState(() {
        _isLoading = false;
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Ошибка: ${e.toString()}'),
          backgroundColor: AppColors.error,
        ),
      );
    }
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
              'Выберите формат игры',
              style: AppTextStyles.h3.copyWith(color: AppColors.dark),
            ),
            if (widget.venue != null && widget.court != null)
              Text(
                '${widget.venue!.name} • ${widget.court!.name}',
                style: AppTextStyles.caption.copyWith(color: AppColors.gray),
              ),
          ],
        ),
        toolbarHeight: 80,
      ),
      body: Column(
        children: [
          // Info section
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
                          _formatDate(widget.date),
                          style: AppTextStyles.bodyBold,
                        ),
                        Text(
                          '${widget.time}-${_calculateEndTime(widget.time, widget.duration)} • ${widget.duration ~/ 60} ${widget.duration == 60 ? 'час' : 'часа'}',
                          style: AppTextStyles.bodySmall.copyWith(color: AppColors.gray),
                        ),
                      ],
                    ),
                    Text(
                      '${widget.price} ₽',
                      style: AppTextStyles.h2.copyWith(color: AppColors.primary),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          // Game type selection
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.screenPadding),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Выберите тип игры',
                    style: AppTextStyles.bodyBold,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  
                  // Private game card
                  _buildGameTypeCard(
                    type: 'private',
                    icon: Icons.lock_outline,
                    title: 'Приватная игра',
                    subtitle: 'Только для вас и ваших друзей',
                    description: 'Забронируйте корт для своей компании',
                  ),
                  
                  const SizedBox(height: AppSpacing.md),
                  
                  // Open game card
                  _buildGameTypeCard(
                    type: 'open',
                    icon: Icons.people_outline,
                    title: 'Открытая игра',
                    subtitle: 'Найдите партнёров для игры',
                    description: 'Присоединитесь к другим игрокам или создайте свою игру',
                  ),
                  
                  // Players count selector for open games
                  if (selectedGameType == 'open') ...[
                    const SizedBox(height: AppSpacing.xl),
                    Text(
                      'Количество игроков',
                      style: AppTextStyles.bodyBold,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        Expanded(
                          child: _buildPlayersCountOption(2),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: _buildPlayersCountOption(4),
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
                          Icon(
                            Icons.info_outline,
                            size: 16,
                            color: AppColors.primary,
                          ),
                          const SizedBox(width: AppSpacing.xs),
                          Expanded(
                            child: Text(
                              'Стоимость игры будет разделена на $selectedPlayersCount игроков: ${(widget.price / selectedPlayersCount).round()} ₽ с человека',
                              style: AppTextStyles.caption.copyWith(
                                color: AppColors.primaryDark,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  
                  const Spacer(),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(AppSpacing.radiusLg)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SizedBox(
          width: double.infinity,
          height: AppSpacing.buttonHeight,
          child: ElevatedButton(
            onPressed: _isLoading ? null : _handleContinue,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              ),
            ),
            child: _isLoading
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      color: AppColors.white,
                      strokeWidth: 2,
                    ),
                  )
                : Text(
                    'Забронировать',
                    style: AppTextStyles.button.copyWith(color: AppColors.white),
                  ),
          ),
        ),
      ),
    );
  }
  
  Widget _buildPlayersCountOption(int count) {
    final isSelected = selectedPlayersCount == count;
    
    return GestureDetector(
      onTap: () {
        setState(() {
          selectedPlayersCount = count;
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(
          vertical: AppSpacing.md,
          horizontal: AppSpacing.cardPadding,
        ),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.white,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.extraLightGray,
            width: 2,
          ),
        ),
        child: Column(
          children: [
            Icon(
              count == 2 ? Icons.people : Icons.groups,
              size: 32,
              color: isSelected ? AppColors.white : AppColors.primary,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              '$count игрока',
              style: AppTextStyles.bodyBold.copyWith(
                color: isSelected ? AppColors.white : AppColors.dark,
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
    required String title,
    required String subtitle,
    required String description,
  }) {
    final isSelected = selectedGameType == type;
    
    return GestureDetector(
      onTap: () {
        setState(() {
          selectedGameType = type;
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(AppSpacing.cardPadding),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryLight : AppColors.white,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.extraLightGray,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected ? [
            BoxShadow(
              color: AppColors.primary.withOpacity(0.1),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ] : [],
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : AppColors.background,
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
              ),
              child: Icon(
                icon,
                color: isSelected ? AppColors.white : AppColors.gray,
                size: 24,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTextStyles.bodyBold.copyWith(
                      color: isSelected ? AppColors.primary : AppColors.dark,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: AppTextStyles.bodySmall.copyWith(color: AppColors.gray),
                  ),
                  if (isSelected) ...[
                    const SizedBox(height: 8),
                    Text(
                      description,
                      style: AppTextStyles.caption.copyWith(color: AppColors.gray),
                    ),
                  ],
                ],
              ),
            ),
            if (isSelected)
              Icon(
                Icons.check_circle,
                color: AppColors.primary,
                size: 24,
              ),
          ],
        ),
      ),
    );
  }
}