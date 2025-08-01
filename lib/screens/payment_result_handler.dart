import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../core/theme/colors.dart';
import '../core/theme/spacing.dart';
import '../core/theme/text_styles.dart';
import 'payment_error_screen.dart';

class PaymentResultHandler extends StatefulWidget {
  final Uri uri;

  const PaymentResultHandler({
    super.key,
    required this.uri,
  });

  @override
  State<PaymentResultHandler> createState() => _PaymentResultHandlerState();
}

class _PaymentResultHandlerState extends State<PaymentResultHandler> {
  bool _isProcessing = true;

  @override
  void initState() {
    super.initState();
    _handlePaymentResult();
  }

  Future<void> _handlePaymentResult() async {
    // Parse URL parameters
    final paymentId = widget.uri.queryParameters['paymentId'];
    final bookingId = widget.uri.queryParameters['orderId'] ?? 
                     widget.uri.queryParameters['OrderId'];
    final status = widget.uri.queryParameters['status'] ?? 
                  widget.uri.queryParameters['Status'];
    
    if (bookingId == null) {
      Navigator.pop(context);
      return;
    }

    try {
      // Get booking
      final bookingDoc = await FirebaseFirestore.instance
          .collection('bookings')
          .doc(bookingId)
          .get();
      
      if (!bookingDoc.exists) {
        Navigator.pop(context);
        return;
      }

      final booking = bookingDoc.data()!;
      final venueId = booking['venueId'];

      // Check payment status
      final isSuccess = status == 'success' || 
                       status == 'CONFIRMED' || 
                       status == 'succeeded';
      
      if (isSuccess) {
        // Update booking status
        await FirebaseFirestore.instance
            .collection('bookings')
            .doc(bookingId)
            .update({
          'status': 'confirmed',
          'paymentStatus': 'paid',
          'paymentId': paymentId,
          'paidAt': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        });
        
        // Navigate back to home with success message
        if (!mounted) return;
        Navigator.popUntil(context, (route) => route.isFirst);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Бронирование успешно оплачено!'),
            backgroundColor: AppColors.success,
          ),
        );
      } else {
        // Payment failed - delete the booking
        await FirebaseFirestore.instance
            .collection('bookings')
            .doc(bookingId)
            .delete();
        
        // Navigate to error screen
        if (!mounted) return;
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => PaymentErrorScreen(
              venueId: venueId,
              bookingId: bookingId,
              errorMessage: 'Платеж не был завершен успешно',
            ),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(
                color: AppColors.primary,
              ),
              const SizedBox(height: AppSpacing.xl),
              Text(
                'Обработка результата платежа...',
                style: AppTextStyles.body,
              ),
            ],
          ),
        ),
      ),
    );
  }
}