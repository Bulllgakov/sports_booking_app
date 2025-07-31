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
import '../services/payment_service.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'login_screen.dart';

class SimpleBookingFormScreen extends StatefulWidget {
  final String venueId;
  final String courtId;
  final DateTime date;
  final String time;
  final int duration;
  final int price;
  final int pricePerPlayer;
  final String gameType;
  final int playersCount;
  final VenueModel? venue;
  final CourtModel? court;
  final String? openGameId; // ID открытой игры для присоединения
  
  const SimpleBookingFormScreen({
    super.key,
    required this.venueId,
    required this.courtId,
    required this.date,
    required this.time,
    required this.duration,
    required this.price,
    required this.pricePerPlayer,
    required this.gameType,
    required this.playersCount,
    this.venue,
    this.court,
    this.openGameId,
  });

  @override
  State<SimpleBookingFormScreen> createState() => _SimpleBookingFormScreenState();
}

class _SimpleBookingFormScreenState extends State<SimpleBookingFormScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  void _loadUserData() {
    try {
      final authService = context.read<AuthService>();
      if (authService.isAuthenticated && authService.currentUserModel != null) {
        final user = authService.currentUserModel!;
        _nameController.text = user.displayName;
        _phoneController.text = user.phoneNumber;
      }
    } catch (e) {
      // Provider not found, skip loading user data
      debugPrint('AuthService not found: $e');
    }
  }

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

  Future<void> _handleSubmit() async {
    // Validate input
    if (_nameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Введите ваше имя')),
      );
      return;
    }
    
    if (_phoneController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Введите номер телефона')),
      );
      return;
    }

    AuthService? authService;
    try {
      authService = context.read<AuthService>();
    } catch (e) {
      // Provider not found
    }
    
    // Check authentication
    if (authService != null && !authService.isAuthenticated) {
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
        final result = await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => const LoginScreen(),
          ),
        );
        
        if (!mounted || (authService != null && !authService.isAuthenticated)) return;
      } else {
        return;
      }
    }
    
    setState(() {
      _isLoading = true;
    });
    
    try {
      final paymentService = PaymentService();
      final bookingService = BookingService();
      
      // Проверяем, включены ли платежи для клуба
      final paymentsEnabled = await paymentService.isPaymentEnabledForVenue(widget.venueId);
      if (!paymentsEnabled) {
        // Если платежи не включены, создаем бронирование без оплаты
        await _createBookingWithoutPayment();
        return;
      }
      
      String bookingId;
      String description;
      
      // Создаем бронирование в зависимости от типа
      if (widget.gameType == 'open_join' && widget.openGameId != null) {
        // Присоединение к открытой игре
        await bookingService.joinOpenGame(
          openGameId: widget.openGameId!,
          userId: authService?.currentUser?.uid ?? '',
          userName: _nameController.text.trim(),
          userPhone: _phoneController.text.trim(),
        );
        
        // Получаем ID бронирования из открытой игры
        final openGameDoc = await FirebaseFirestore.instance
            .collection('openGames')
            .doc(widget.openGameId)
            .get();
        bookingId = openGameDoc.data()?['bookingId'] ?? '';
        description = 'Присоединение к открытой игре';
      } else {
        // Создаем новое бронирование
        final endTime = _calculateEndTime(widget.time, widget.duration);
        bookingId = await bookingService.createBooking(
          courtId: widget.courtId,
          courtName: widget.court?.name ?? '',
          venueId: widget.venueId,
          venueName: widget.venue?.name ?? '',
          date: widget.date,
          dateString: _formatDate(widget.date),
          time: widget.time,
          startTime: widget.time,
          endTime: endTime,
          duration: widget.duration,
          gameType: widget.gameType,
          customerName: _nameController.text.trim(),
          customerPhone: _phoneController.text.trim(),
          price: widget.price,
          pricePerPlayer: widget.pricePerPlayer,
          playersCount: widget.playersCount,
          userId: authService?.currentUser?.uid ?? '',
        );
        
        description = widget.gameType == 'open' 
            ? 'Создание открытой игры' 
            : 'Бронирование корта';
      }
      
      // Инициируем платеж
      await paymentService.processBookingPayment(
        bookingId: bookingId,
        amount: widget.pricePerPlayer > 0 ? widget.pricePerPlayer.toDouble() : widget.price.toDouble(),
        description: description,
        userId: authService?.currentUser?.uid ?? '',
        customerEmail: _emailController.text.trim().isNotEmpty ? _emailController.text.trim() : null,
        customerPhone: _phoneController.text.trim(),
      );
      
      // После перенаправления на платежную страницу закрываем экран
      if (!mounted) return;
      Navigator.pop(context);
      
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
              widget.gameType == 'open_join' ? 'Присоединение к игре' : 'Оформление бронирования',
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
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Booking details
            Container(
              padding: const EdgeInsets.all(AppSpacing.screenPadding),
              color: AppColors.white,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Детали бронирования',
                    style: AppTextStyles.bodyBold,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _formatDate(widget.date),
                            style: AppTextStyles.body,
                          ),
                          Text(
                            '${widget.time}-${_calculateEndTime(widget.time, widget.duration)}',
                            style: AppTextStyles.bodySmall.copyWith(color: AppColors.gray),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            (widget.gameType == 'open' || widget.gameType == 'open_join') && widget.playersCount > 1
                                ? '${widget.pricePerPlayer} ₽/чел'
                                : '${widget.price} ₽',
                            style: AppTextStyles.h3.copyWith(color: AppColors.primary),
                          ),
                          if ((widget.gameType == 'open' || widget.gameType == 'open_join') && widget.playersCount > 1)
                            Text(
                              'Всего: ${widget.price} ₽',
                              style: AppTextStyles.caption.copyWith(color: AppColors.gray),
                            ),
                        ],
                      ),
                    ],
                  ),
                  if (widget.gameType == 'open' || widget.gameType == 'open_join') ...[
                    const SizedBox(height: AppSpacing.sm),
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.sm),
                      decoration: BoxDecoration(
                        color: AppColors.chipBackground,
                        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.people, size: 16, color: AppColors.primary),
                          const SizedBox(width: AppSpacing.xs),
                          Text(
                            widget.gameType == 'open_join' 
                                ? 'Присоединение к открытой игре' 
                                : 'Открытая игра • ${widget.playersCount} игрока',
                            style: AppTextStyles.caption.copyWith(color: AppColors.primaryDark),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            
            const SizedBox(height: AppSpacing.md),
            
            // Contact form
            Container(
              padding: const EdgeInsets.all(AppSpacing.screenPadding),
              color: AppColors.white,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Контактные данные',
                    style: AppTextStyles.bodyBold,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  
                  // Name field
                  TextField(
                    controller: _nameController,
                    decoration: InputDecoration(
                      labelText: 'Ваше имя',
                      filled: true,
                      fillColor: AppColors.background,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: AppSpacing.md),
                  
                  // Phone field
                  TextField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(
                      labelText: 'Номер телефона',
                      filled: true,
                      fillColor: AppColors.background,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: AppSpacing.md),
                  
                  // Email field (optional)
                  TextField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: InputDecoration(
                      labelText: 'Email (необязательно)',
                      filled: true,
                      fillColor: AppColors.background,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: AppSpacing.md),
            
            // Payment info
            Container(
              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.chipBackground,
                borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    size: 20,
                    color: AppColors.primary,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      'Бронирование будет подтверждено только после успешной оплаты',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.primaryDark,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: AppSpacing.xl),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(AppSpacing.radiusLg)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SizedBox(
          width: double.infinity,
          height: AppSpacing.buttonHeight,
          child: ElevatedButton(
            onPressed: _isLoading ? null : _handleSubmit,
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
                    'Перейти к оплате',
                    style: AppTextStyles.button.copyWith(color: AppColors.white),
                  ),
          ),
        ),
      ),
    );
  }

  Future<void> _createBookingWithoutPayment() async {
    try {
      final bookingService = BookingService();
      AuthService? authService;
      try {
        authService = context.read<AuthService>();
      } catch (e) {
        // Provider not found
      }
      
      if (widget.gameType == 'open_join' && widget.openGameId != null) {
        // Присоединение к открытой игре без оплаты
        await bookingService.joinOpenGame(
          openGameId: widget.openGameId!,
          userId: authService?.currentUser?.uid ?? '',
          userName: _nameController.text.trim(),
          userPhone: _phoneController.text.trim(),
        );
      } else {
        // Создаем бронирование без оплаты
        final endTime = _calculateEndTime(widget.time, widget.duration);
        await bookingService.createBooking(
          courtId: widget.courtId,
          courtName: widget.court?.name ?? '',
          venueId: widget.venueId,
          venueName: widget.venue?.name ?? '',
          date: widget.date,
          dateString: _formatDate(widget.date),
          time: widget.time,
          startTime: widget.time,
          endTime: endTime,
          duration: widget.duration,
          gameType: widget.gameType,
          customerName: _nameController.text.trim(),
          customerPhone: _phoneController.text.trim(),
          price: widget.price,
          pricePerPlayer: widget.pricePerPlayer,
          playersCount: widget.playersCount,
          userId: authService?.currentUser?.uid ?? '',
        );
      }
      
      if (!mounted) return;
      
      setState(() {
        _isLoading = false;
      });
      
      // Показываем успешное сообщение и закрываем экран
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Бронирование успешно создано!'),
          backgroundColor: AppColors.success,
        ),
      );
      
      Navigator.pop(context);
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
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }
}