import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/theme/colors.dart';
import '../core/theme/spacing.dart';
import '../core/theme/text_styles.dart';
import '../services/booking_service.dart';
import '../services/payment_service.dart';
import 'payment_error_screen.dart';

class PaymentProcessingScreen extends StatefulWidget {
  final Map<String, dynamic> paymentData;

  const PaymentProcessingScreen({
    super.key,
    required this.paymentData,
  });

  @override
  State<PaymentProcessingScreen> createState() => _PaymentProcessingScreenState();
}

class _PaymentProcessingScreenState extends State<PaymentProcessingScreen> {
  bool _isProcessing = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _processPayment();
  }

  Future<void> _processPayment() async {
    try {
      final bookingService = BookingService();
      final paymentService = PaymentService();
      
      String bookingId;
      String description;
      
      // Создаем бронирование в зависимости от типа
      if (widget.paymentData['gameType'] == 'open_join' && widget.paymentData['openGameId'] != null) {
        // Присоединение к открытой игре
        await bookingService.joinOpenGame(
          openGameId: widget.paymentData['openGameId'],
          userId: widget.paymentData['userId'],
          userName: widget.paymentData['customerName'],
          userPhone: widget.paymentData['customerPhone'],
        );
        
        // Получаем ID бронирования из открытой игры
        final openGameDoc = await FirebaseFirestore.instance
            .collection('openGames')
            .doc(widget.paymentData['openGameId'])
            .get();
        bookingId = openGameDoc.data()?['bookingId'] ?? '';
        description = 'Присоединение к открытой игре';
      } else {
        // Создаем новое бронирование
        bookingId = await bookingService.createBooking(
          courtId: widget.paymentData['courtId'],
          courtName: widget.paymentData['courtName'],
          venueId: widget.paymentData['venueId'],
          venueName: widget.paymentData['venueName'],
          date: DateTime.parse(widget.paymentData['date']),
          dateString: widget.paymentData['dateString'],
          time: widget.paymentData['time'],
          startTime: widget.paymentData['startTime'],
          endTime: widget.paymentData['endTime'],
          duration: widget.paymentData['duration'],
          gameType: widget.paymentData['gameType'],
          customerName: widget.paymentData['customerName'],
          customerPhone: widget.paymentData['customerPhone'],
          price: widget.paymentData['price'],
          pricePerPlayer: widget.paymentData['pricePerPlayer'],
          playersCount: widget.paymentData['playersCount'],
          userId: widget.paymentData['userId'],
          customerEmail: widget.paymentData['customerEmail'],
        );
        
        description = widget.paymentData['gameType'] == 'open' 
            ? 'Создание открытой игры' 
            : 'Бронирование корта';
      }
      
      // Генерируем URL для возврата с результатом платежа
      final successUrl = 'https://allcourt.ru/payment-result?bookingId=$bookingId&status=success';
      final failUrl = 'https://allcourt.ru/payment-result?bookingId=$bookingId&status=failed';
      
      // Инициируем платеж
      await paymentService.processBookingPayment(
        bookingId: bookingId,
        amount: widget.paymentData['pricePerPlayer'] > 0 
            ? widget.paymentData['pricePerPlayer'].toDouble() 
            : widget.paymentData['price'].toDouble(),
        description: description,
        userId: widget.paymentData['userId'],
        customerEmail: widget.paymentData['customerEmail'],
        customerPhone: widget.paymentData['customerPhone'],
      );
      
      // Ждем результата платежа
      _waitForPaymentResult(bookingId);
      
    } catch (e) {
      if (!mounted) return;
      
      setState(() {
        _error = e.toString();
        _isProcessing = false;
      });
    }
  }

  void _waitForPaymentResult(String bookingId) {
    // Подписываемся на изменения статуса бронирования
    FirebaseFirestore.instance
        .collection('bookings')
        .doc(bookingId)
        .snapshots()
        .listen((snapshot) {
      if (!mounted) return;
      
      if (!snapshot.exists) {
        // Бронирование было удалено - платеж не прошел
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => PaymentErrorScreen(
              venueId: widget.paymentData['venueId'],
              bookingId: bookingId,
            ),
          ),
        );
      } else {
        final data = snapshot.data();
        if (data?['paymentStatus'] == 'paid') {
          // Платеж прошел успешно
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Бронирование успешно оплачено!'),
              backgroundColor: AppColors.success,
            ),
          );
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.screenPadding),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (_isProcessing) ...[
                  const CircularProgressIndicator(
                    color: AppColors.primary,
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  Text(
                    'Обработка платежа...',
                    style: AppTextStyles.h3,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    'Пожалуйста, не закрывайте приложение',
                    style: AppTextStyles.body.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ] else if (_error != null) ...[
                  Container(
                    width: 80,
                    height: 80,
                    decoration: const BoxDecoration(
                      color: AppColors.error,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.close,
                      size: 40,
                      color: AppColors.white,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  Text(
                    'Ошибка',
                    style: AppTextStyles.h2,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    _error!,
                    style: AppTextStyles.body.copyWith(
                      color: AppColors.textSecondary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  SizedBox(
                    width: double.infinity,
                    height: AppSpacing.buttonHeight,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                        ),
                      ),
                      child: Text(
                        'Вернуться',
                        style: AppTextStyles.button.copyWith(color: AppColors.white),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}