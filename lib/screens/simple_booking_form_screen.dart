import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';
import '../models/venue_model.dart';
import '../models/court_model.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../services/booking_service.dart';
import '../services/payment_service.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'login_screen.dart';
import 'payment_processing_screen.dart';

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
  final PlayerLevel? openGameLevel; // Уровень для открытой игры
  final String? openGameDescription; // Описание для открытой игры
  
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
    this.openGameLevel,
    this.openGameDescription,
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
    _phoneController.text = '+7';
    _loadUserData();
  }

  void _loadUserData() {
    try {
      final authService = context.read<AuthService>();
      if (authService.isAuthenticated) {
        // Заполняем телефон из Firebase Auth если есть
        if (authService.currentUser?.phoneNumber != null && 
            authService.currentUser!.phoneNumber!.isNotEmpty) {
          _phoneController.text = authService.currentUser!.phoneNumber!;
        }
        
        // Заполняем имя из UserModel если есть
        if (authService.currentUserModel != null) {
          final user = authService.currentUserModel!;
          if (user.displayName.isNotEmpty) {
            _nameController.text = user.displayName;
          }
          // Если в UserModel есть телефон, используем его (приоритет)
          if (user.phoneNumber.isNotEmpty) {
            _phoneController.text = user.phoneNumber;
          }
        }
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

    // Получаем AuthService для передачи userId
    AuthService? authService;
    try {
      authService = context.read<AuthService>();
    } catch (e) {
      // Provider not found
    }
    
    // На этом этапе пользователь уже должен быть авторизован,
    // так как проверка происходит в SimpleGameTypeScreen
    
    setState(() {
      _isLoading = true;
    });
    
    try {
      final paymentService = PaymentService();
      final bookingService = BookingService();
      
      // Проверяем, включены ли платежи для клуба
      final paymentsEnabled = await paymentService.isPaymentEnabledForVenue(widget.venueId);
      if (!paymentsEnabled) {
        // Если платежи не включены, показываем сообщение
        setState(() {
          _isLoading = false;
        });
        
        // Получаем информацию о клубе для телефона
        final venueDoc = await FirebaseFirestore.instance
            .collection('venues')
            .doc(widget.venueId)
            .get();
        
        final venueData = venueDoc.data();
        final phoneNumber = venueData?['phone'] ?? 'не указан';
        
        if (!mounted) return;
        
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Онлайн оплата недоступна'),
            content: Text(
              'К сожалению, клуб "${widget.venue?.name ?? "Клуб"}" пока не подключил онлайн оплату.\n\n'
              'Пожалуйста, позвоните по телефону клуба для бронирования:\n$phoneNumber'
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Закрыть'),
              ),
            ],
          ),
        );
        return;
      }
      
      // Сохраняем имя пользователя в профиль, если оно было введено и отсутствует
      if (authService != null && 
          authService.isAuthenticated && 
          authService.currentUserModel != null &&
          authService.currentUserModel!.displayName.isEmpty &&
          _nameController.text.trim().isNotEmpty) {
        try {
          final updatedUser = authService.currentUserModel!.copyWith(
            displayName: _nameController.text.trim(),
          );
          await authService.updateUserProfile(updatedUser);
        } catch (e) {
          // Не критично, продолжаем бронирование
          debugPrint('Failed to update user profile: $e');
        }
      }
      
      // Платежи включены - переходим к оплате без создания бронирования
      // Сохраняем данные для передачи на страницу оплаты
      final paymentData = {
        'venueId': widget.venueId,
        'venueName': widget.venue?.name ?? '',
        'courtId': widget.courtId,
        'courtName': widget.court?.name ?? '',
        'date': widget.date.toIso8601String(),
        'dateString': _formatDate(widget.date),
        'time': widget.time,
        'startTime': widget.time,
        'endTime': _calculateEndTime(widget.time, widget.duration),
        'duration': widget.duration,
        'gameType': widget.gameType,
        'customerName': _nameController.text.trim(),
        'customerPhone': _phoneController.text.trim(),
        'customerEmail': _emailController.text.trim().isNotEmpty ? _emailController.text.trim() : null,
        'price': widget.price,
        'pricePerPlayer': widget.pricePerPlayer,
        'playersCount': widget.playersCount,
        'userId': authService?.currentUser?.uid ?? '',
        'openGameId': widget.openGameId,
      };
      
      // Переходим на страницу оплаты с данными
      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => PaymentProcessingScreen(
            paymentData: paymentData,
          ),
        ),
      );
      
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
              'Оплата бронирования',
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
                  // Корт
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Корт:',
                        style: AppTextStyles.body,
                      ),
                      Text(
                        widget.court?.name ?? '',
                        style: AppTextStyles.bodyBold,
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  // Дата
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Дата:',
                        style: AppTextStyles.body,
                      ),
                      Text(
                        _formatDate(widget.date),
                        style: AppTextStyles.bodyBold,
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  // Время
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Время:',
                        style: AppTextStyles.body,
                      ),
                      Text(
                        '${widget.time} - ${_calculateEndTime(widget.time, widget.duration)}',
                        style: AppTextStyles.bodyBold,
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  // Тип игры
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Тип игры:',
                        style: AppTextStyles.body,
                      ),
                      Text(
                        widget.gameType == 'open' ? 'Открытая игра' : 
                        widget.gameType == 'open_join' ? 'Присоединение к игре' : 
                        'Приватная игра',
                        style: AppTextStyles.bodyBold,
                      ),
                    ],
                  ),
                  Container(
                    margin: const EdgeInsets.only(top: AppSpacing.md),
                    padding: const EdgeInsets.only(top: AppSpacing.md),
                    decoration: const BoxDecoration(
                      border: Border(
                        top: BorderSide(color: AppColors.divider),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Итого:',
                          style: AppTextStyles.body,
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
                      'Бронирование будет подтверждено только после успешной оплаты, у вас будет 10 мин на оплату. Возврат по бронированию осуществляется не позже 12 часов до игры в мобильном приложении',
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
          customerEmail: _emailController.text.trim().isNotEmpty ? _emailController.text.trim() : null,
          openGameLevel: widget.openGameLevel?.toString().split('.').last,
          openGameDescription: widget.openGameDescription,
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