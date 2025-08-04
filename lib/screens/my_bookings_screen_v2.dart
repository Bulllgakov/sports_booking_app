import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import 'dart:convert';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';
import 'phone_auth_screen.dart';

class MyBookingsScreenV2 extends StatefulWidget {
  const MyBookingsScreenV2({super.key});

  @override
  State<MyBookingsScreenV2> createState() => _MyBookingsScreenV2State();
}

class _MyBookingsScreenV2State extends State<MyBookingsScreenV2> {
  String selectedTab = 'upcoming';
  String? _userId;
  String? _userPhone;
  String? _userName;
  bool _isLoading = true;
  List<Map<String, dynamic>> _bookings = [];
  
  @override
  void initState() {
    super.initState();
    _checkAuthAndLoadBookings();
  }
  
  Future<void> _checkAuthAndLoadBookings() async {
    // Проверяем сохраненную сессию
    final prefs = await SharedPreferences.getInstance();
    final userId = prefs.getString('userId');
    final userPhone = prefs.getString('userPhone');
    final userName = prefs.getString('userName');
    
    if (userId != null && userPhone != null) {
      setState(() {
        _userId = userId;
        _userPhone = userPhone;
        _userName = userName;
      });
      await _loadBookings();
    } else {
      // Показываем экран авторизации
      if (mounted) {
        final result = await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => const PhoneAuthScreen(isModal: true),
          ),
        );
        
        if (result != null && result is Map) {
          setState(() {
            _userId = result['userId'];
            _userPhone = result['phone'];
            _userName = result['name'];
          });
          
          // Сохраняем сессию
          await prefs.setString('userId', _userId!);
          await prefs.setString('userPhone', _userPhone!);
          await prefs.setString('userName', _userName!);
          
          await _loadBookings();
        } else {
          // Пользователь отменил авторизацию
          Navigator.pop(context);
        }
      }
    }
  }
  
  Future<void> _loadBookings() async {
    setState(() {
      _isLoading = true;
    });
    
    try {
      // Загружаем бронирования пользователя
      final now = DateTime.now();
      final query = FirebaseFirestore.instance
          .collection('bookings')
          .where('userId', isEqualTo: _userId)
          .orderBy('date', descending: false);
      
      final snapshot = await query.get();
      
      final bookings = <Map<String, dynamic>>[];
      
      for (final doc in snapshot.docs) {
        final data = doc.data();
        data['id'] = doc.id;
        
        // Парсим дату
        DateTime date;
        if (data['date'] is Timestamp) {
          date = (data['date'] as Timestamp).toDate();
        } else {
          continue;
        }
        
        // Фильтруем по вкладке
        if (selectedTab == 'upcoming') {
          if (date.isAfter(now.subtract(const Duration(days: 1)))) {
            bookings.add(data);
          }
        } else {
          if (date.isBefore(now)) {
            bookings.add(data);
          }
        }
      }
      
      // Загружаем информацию о клубах
      for (final booking in bookings) {
        if (booking['venueId'] != null) {
          final venueDoc = await FirebaseFirestore.instance
              .collection('venues')
              .doc(booking['venueId'])
              .get();
          
          if (venueDoc.exists) {
            booking['venue'] = venueDoc.data();
          }
        }
      }
      
      setState(() {
        _bookings = bookings;
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading bookings: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }
  
  Future<void> _cancelBooking(Map<String, dynamic> booking) async {
    // Проверяем возможность отмены
    final now = DateTime.now();
    DateTime bookingDateTime;
    
    if (booking['date'] is Timestamp) {
      bookingDateTime = (booking['date'] as Timestamp).toDate();
    } else {
      bookingDateTime = booking['date'];
    }
    
    // Парсим время начала
    final startTime = booking['startTime'] ?? booking['time'] ?? '00:00';
    final timeParts = startTime.split(':');
    bookingDateTime = DateTime(
      bookingDateTime.year,
      bookingDateTime.month,
      bookingDateTime.day,
      int.parse(timeParts[0]),
      timeParts.length > 1 ? int.parse(timeParts[1]) : 0,
    );
    
    final hoursUntilGame = bookingDateTime.difference(now).inHours;
    
    // Для онлайн оплаты проверяем 12-часовое ограничение
    if (booking['paymentMethod'] == 'online' && booking['paymentStatus'] == 'paid') {
      if (hoursUntilGame < 12) {
        await showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Отмена невозможна'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Отмена бронирования с возвратом средств возможна не позднее чем за 12 часов до начала игры.',
                  style: AppTextStyles.body,
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.error.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.timer_off, color: AppColors.error, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'До игры осталось: ${hoursUntilGame} ч.',
                          style: AppTextStyles.bodyBold.copyWith(color: AppColors.error),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Для отмены свяжитесь с администратором клуба:',
                  style: AppTextStyles.caption.copyWith(color: AppColors.gray),
                ),
                if (booking['venue'] != null && booking['venue']['phone'] != null) ...[
                  const SizedBox(height: 8),
                  InkWell(
                    onTap: () {
                      final phone = booking['venue']['phone'];
                      launchUrl(Uri.parse('tel:$phone'));
                    },
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.phone, color: AppColors.primary, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            booking['venue']['phone'],
                            style: AppTextStyles.bodyBold.copyWith(color: AppColors.primary),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Понятно'),
              ),
            ],
          ),
        );
        return;
      }
    }
    
    // Для других способов оплаты показываем информацию о необходимости звонка
    if (booking['paymentMethod'] != 'online') {
      await showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Отмена через администратора'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Оплата была произведена напрямую в клуб. Отмена и возврат возможны только через администратора клуба.',
                style: AppTextStyles.body,
              ),
              const SizedBox(height: 16),
              Text(
                'Свяжитесь с клубом в рабочее время:',
                style: AppTextStyles.bodyBold,
              ),
              const SizedBox(height: 12),
              if (booking['venue'] != null) ...[
                if (booking['venue']['name'] != null) ...[
                  Text(
                    booking['venue']['name'],
                    style: AppTextStyles.bodyBold,
                  ),
                  const SizedBox(height: 4),
                ],
                if (booking['venue']['workingHours'] != null) ...[
                  Text(
                    'Время работы: ${booking['venue']['workingHours']}',
                    style: AppTextStyles.caption.copyWith(color: AppColors.gray),
                  ),
                  const SizedBox(height: 8),
                ],
                if (booking['venue']['phone'] != null) ...[
                  InkWell(
                    onTap: () {
                      final phone = booking['venue']['phone'];
                      launchUrl(Uri.parse('tel:$phone'));
                    },
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.phone, color: AppColors.primary, size: 24),
                          const SizedBox(width: 8),
                          Text(
                            booking['venue']['phone'],
                            style: AppTextStyles.h3.copyWith(color: AppColors.primary),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Закрыть'),
            ),
          ],
        ),
      );
      return;
    }
    
    // Диалог подтверждения отмены для онлайн оплаты
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Отменить бронирование?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${booking['venueName'] ?? 'Клуб'}'),
            Text('${booking['courtName'] ?? 'Корт'}'),
            const SizedBox(height: 8),
            Text('${_formatDate(booking['date'])}'),
            Text('${booking['startTime']} - ${booking['endTime']}'),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.success.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.check_circle, color: AppColors.success, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'Отмена доступна',
                        style: AppTextStyles.bodyBold.copyWith(color: AppColors.success),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'До игры более 12 часов (${hoursUntilGame} ч.)',
                    style: AppTextStyles.caption.copyWith(color: AppColors.gray),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Возврат средств будет произведен автоматически в течение 3-5 дней',
                    style: AppTextStyles.caption.copyWith(color: AppColors.gray),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Нет'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
            ),
            child: const Text('Отменить бронирование'),
          ),
        ],
      ),
    );
    
    if (confirmed != true) return;
    
    try {
      // Показываем индикатор загрузки
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(),
        ),
      );
      
      // Проверяем тип оплаты
      if (booking['paymentStatus'] == 'paid' && booking['paymentMethod'] == 'online') {
        // Для онлайн оплаты вызываем облачную функцию возврата
        final response = await http.post(
          Uri.parse('https://europe-west1-sports-booking-app-1d7e5.cloudfunctions.net/processBookingRefund'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $_userId', // Временно используем userId как токен
          },
          body: json.encode({
            'bookingId': booking['id'],
            'reason': 'Отмена пользователем через мобильное приложение',
          }),
        );
        
        if (response.statusCode == 200) {
          Navigator.pop(context); // Закрываем индикатор
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Запрос на возврат отправлен. Средства вернутся в течение 3-5 дней.'),
              backgroundColor: AppColors.success,
            ),
          );
        } else {
          throw Exception('Ошибка при создании возврата');
        }
      } else {
        // Для остальных случаев просто отменяем бронирование
        await FirebaseFirestore.instance
            .collection('bookings')
            .doc(booking['id'])
            .update({
          'status': 'cancelled',
          'paymentStatus': booking['paymentStatus'] == 'paid' ? 'refunded' : 'cancelled',
          'cancelledAt': FieldValue.serverTimestamp(),
          'cancelReason': 'Отменено пользователем',
          'cancelledBy': {
            'userId': _userId,
            'userName': _userName,
            'userPhone': _userPhone,
          },
        });
        
        Navigator.pop(context); // Закрываем индикатор
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Бронирование отменено'),
            backgroundColor: AppColors.success,
          ),
        );
      }
      
      // Перезагружаем список
      await _loadBookings();
    } catch (e) {
      Navigator.pop(context); // Закрываем индикатор
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Ошибка при отмене: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }
  
  String _formatDate(dynamic date) {
    DateTime dateTime;
    if (date is Timestamp) {
      dateTime = date.toDate();
    } else if (date is DateTime) {
      dateTime = date;
    } else {
      return '';
    }
    
    const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 
                   'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    
    return '${dateTime.day} ${months[dateTime.month - 1]}, ${weekDays[dateTime.weekday - 1]}';
  }
  
  Color _getStatusColor(String? status, String? paymentStatus) {
    if (status == 'cancelled') return AppColors.error;
    if (paymentStatus == 'refunded') return const Color(0xFF8B5CF6);
    if (paymentStatus == 'paid') return AppColors.success;
    if (paymentStatus == 'awaiting_payment') return AppColors.warning;
    return AppColors.gray;
  }
  
  String _getStatusText(String? status, String? paymentStatus) {
    if (status == 'cancelled') return 'Отменено';
    if (paymentStatus == 'refunded') return 'Возврат';
    if (paymentStatus == 'paid') return 'Оплачено';
    if (paymentStatus == 'awaiting_payment') return 'Ожидает оплаты';
    return 'Подтверждено';
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }
    
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(AppSpacing.headerPadding),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Мои бронирования',
                    style: AppTextStyles.h1,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    _userName != null ? 'Привет, $_userName!' : 'Управляйте вашими играми',
                    style: AppTextStyles.body.copyWith(color: AppColors.gray),
                  ),
                ],
              ),
            ),
            
            // Tabs
            SizedBox(
              height: AppSpacing.chipHeight,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
                children: [
                  _buildTab('upcoming', 'Предстоящие'),
                  const SizedBox(width: AppSpacing.sm),
                  _buildTab('past', 'Прошедшие'),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            
            // Bookings list
            Expanded(
              child: _bookings.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.calendar_today,
                            size: 64,
                            color: AppColors.gray.withOpacity(0.3),
                          ),
                          const SizedBox(height: AppSpacing.md),
                          Text(
                            selectedTab == 'upcoming' 
                                ? 'Нет предстоящих бронирований'
                                : 'Нет прошедших бронирований',
                            style: AppTextStyles.body.copyWith(color: AppColors.gray),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadBookings,
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
                        itemCount: _bookings.length,
                        itemBuilder: (context, index) {
                          final booking = _bookings[index];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: AppSpacing.xl),
                            child: _buildBookingCard(booking),
                          );
                        },
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildTab(String value, String label) {
    final isSelected = selectedTab == value;
    
    return GestureDetector(
      onTap: () {
        setState(() {
          selectedTab = value;
        });
        _loadBookings();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.xl,
          vertical: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.white,
          borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.extraLightGray,
            width: 1,
          ),
        ),
        child: Text(
          label,
          style: AppTextStyles.tinyBold.copyWith(
            color: isSelected ? AppColors.white : AppColors.dark,
          ),
        ),
      ),
    );
  }
  
  Widget _buildBookingCard(Map<String, dynamic> booking) {
    final statusColor = _getStatusColor(booking['status'], booking['paymentStatus']);
    final statusText = _getStatusText(booking['status'], booking['paymentStatus']);
    final isUpcoming = selectedTab == 'upcoming';
    
    // Вычисляем время до игры
    DateTime bookingDateTime;
    if (booking['date'] is Timestamp) {
      bookingDateTime = (booking['date'] as Timestamp).toDate();
    } else {
      bookingDateTime = booking['date'];
    }
    
    final startTime = booking['startTime'] ?? booking['time'] ?? '00:00';
    final timeParts = startTime.split(':');
    bookingDateTime = DateTime(
      bookingDateTime.year,
      bookingDateTime.month,
      bookingDateTime.day,
      int.parse(timeParts[0]),
      timeParts.length > 1 ? int.parse(timeParts[1]) : 0,
    );
    
    final hoursUntilGame = bookingDateTime.difference(DateTime.now()).inHours;
    final canCancelOnline = booking['paymentMethod'] == 'online' && 
                            booking['paymentStatus'] == 'paid' && 
                            hoursUntilGame >= 12;
    final canCancel = isUpcoming && 
                      booking['status'] != 'cancelled' && 
                      booking['paymentStatus'] != 'refunded';
    
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 5,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Left border indicator
          Container(
            width: 4,
            height: 160,
            decoration: BoxDecoration(
              color: statusColor,
              borderRadius: const BorderRadius.horizontal(
                left: Radius.circular(AppSpacing.radiusMd),
              ),
            ),
          ),
          // Content
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.cardPadding),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              booking['venueName'] ?? 'Клуб',
                              style: AppTextStyles.bodySmallBold,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              booking['courtName'] ?? 'Корт',
                              style: AppTextStyles.tiny.copyWith(color: AppColors.gray),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.sm,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: statusColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
                        ),
                        child: Text(
                          statusText,
                          style: AppTextStyles.caption.copyWith(
                            color: statusColor,
                            fontWeight: FontWeight.w600,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  
                  // Details
                  Row(
                    children: [
                      _buildDetail('Дата', _formatDate(booking['date'])),
                      const SizedBox(width: AppSpacing.lg),
                      _buildDetail(
                        'Время', 
                        '${booking['startTime'] ?? booking['time']} - ${booking['endTime'] ?? ''}',
                      ),
                    ],
                  ),
                  
                  if (booking['amount'] != null) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        _buildDetail('Сумма', '${booking['amount']} ₽'),
                        if (booking['paymentMethod'] != null) ...[
                          const SizedBox(width: AppSpacing.lg),
                          _buildDetail('Способ оплаты', _getPaymentMethodText(booking['paymentMethod'])),
                        ],
                      ],
                    ),
                  ],
                  
                  const SizedBox(height: AppSpacing.md),
                  
                  // Actions and cancellation info
                  if (canCancel) ...[
                    // Показываем информацию о возможности отмены
                    if (booking['paymentMethod'] == 'online' && booking['paymentStatus'] == 'paid') ...[
                      Container(
                        padding: const EdgeInsets.all(8),
                        margin: const EdgeInsets.only(bottom: 8),
                        decoration: BoxDecoration(
                          color: canCancelOnline 
                              ? AppColors.success.withOpacity(0.1)
                              : AppColors.warning.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              canCancelOnline ? Icons.check_circle : Icons.timer,
                              size: 16,
                              color: canCancelOnline ? AppColors.success : AppColors.warning,
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                canCancelOnline 
                                    ? 'Отмена доступна (осталось ${hoursUntilGame} ч.)'
                                    : 'Отмена недоступна (менее 12 ч. до игры)',
                                style: AppTextStyles.caption.copyWith(
                                  color: canCancelOnline ? AppColors.success : AppColors.warning,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => _cancelBooking(booking),
                            style: OutlinedButton.styleFrom(
                              backgroundColor: booking['paymentMethod'] == 'online' && canCancelOnline
                                  ? AppColors.error.withOpacity(0.1)
                                  : AppColors.gray.withOpacity(0.1),
                              side: BorderSide(
                                color: booking['paymentMethod'] == 'online' && canCancelOnline
                                    ? AppColors.error
                                    : AppColors.gray,
                              ),
                              padding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.lg,
                                vertical: AppSpacing.sm,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                if (booking['paymentMethod'] != 'online') ...[
                                  Icon(
                                    Icons.phone,
                                    size: 16,
                                    color: AppColors.gray,
                                  ),
                                  const SizedBox(width: 4),
                                ],
                                Text(
                                  booking['paymentMethod'] == 'online'
                                      ? (canCancelOnline ? 'Отменить и вернуть' : 'Информация об отмене')
                                      : 'Отменить через клуб',
                                  style: AppTextStyles.tinyBold.copyWith(
                                    color: booking['paymentMethod'] == 'online' && canCancelOnline
                                        ? AppColors.error
                                        : AppColors.gray,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildDetail(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTextStyles.caption.copyWith(color: AppColors.gray),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: AppTextStyles.bodySmallBold,
        ),
      ],
    );
  }
  
  String _getPaymentMethodText(String method) {
    switch (method) {
      case 'online': return 'Онлайн';
      case 'cash': return 'Наличные';
      case 'card_on_site': return 'Карта на месте';
      case 'mobile_app': return 'Приложение';
      default: return method;
    }
  }
}