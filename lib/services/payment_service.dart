import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:url_launcher/url_launcher.dart';

class PaymentService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseFunctions _functions = FirebaseFunctions.instance;
  
  /// Инициализирует платеж для бронирования
  Future<String?> initializePayment({
    required String bookingId,
    required String venueId,
  }) async {
    try {
      // Получаем данные о площадке для проверки настроек платежей
      final venueDoc = await _firestore.collection('venues').doc(venueId).get();
      if (!venueDoc.exists) {
        throw Exception('Площадка не найдена');
      }
      
      final venueData = venueDoc.data()!;
      
      // Проверяем, включены ли платежи
      if (venueData['paymentEnabled'] != true) {
        print('Платежи не включены для этой площадки');
        return null;
      }
      
      // Вызываем Cloud Function для создания платежа
      final callable = _functions.httpsCallable('initializePayment');
      final result = await callable.call({
        'bookingId': bookingId,
        'venueId': venueId,
      });
      
      final data = result.data as Map<String, dynamic>;
      
      if (data['success'] == true && data['paymentUrl'] != null) {
        final paymentUrl = data['paymentUrl'] as String;
        
        // Обновляем бронирование с URL платежа
        await _firestore.collection('bookings').doc(bookingId).update({
          'paymentUrl': paymentUrl,
          'paymentId': data['paymentId'],
          'paymentHistory': FieldValue.arrayUnion([{
            'timestamp': Timestamp.now(),
            'action': 'payment_initialized',
            'paymentUrl': paymentUrl,
            'paymentId': data['paymentId'],
          }]),
        });
        
        return paymentUrl;
      }
      
      throw Exception(data['error'] ?? 'Не удалось создать платеж');
    } catch (e) {
      print('Ошибка при инициализации платежа: $e');
      rethrow;
    }
  }
  
  /// Открывает страницу оплаты в браузере
  Future<void> openPaymentUrl(String paymentUrl) async {
    final uri = Uri.parse(paymentUrl);
    if (await canLaunchUrl(uri)) {
      await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );
    } else {
      throw Exception('Не удалось открыть страницу оплаты');
    }
  }
  
  /// Проверяет статус платежа
  Future<Map<String, dynamic>> checkPaymentStatus(String bookingId) async {
    try {
      final bookingDoc = await _firestore.collection('bookings').doc(bookingId).get();
      if (!bookingDoc.exists) {
        throw Exception('Бронирование не найдено');
      }
      
      final bookingData = bookingDoc.data()!;
      
      return {
        'paymentStatus': bookingData['paymentStatus'],
        'status': bookingData['status'],
        'paymentUrl': bookingData['paymentUrl'],
      };
    } catch (e) {
      print('Ошибка при проверке статуса платежа: $e');
      rethrow;
    }
  }
  
  /// Отменяет платеж и бронирование
  Future<void> cancelPayment(String bookingId) async {
    try {
      await _firestore.collection('bookings').doc(bookingId).update({
        'status': 'cancelled',
        'paymentStatus': 'cancelled',
        'paymentHistory': FieldValue.arrayUnion([{
          'timestamp': Timestamp.now(),
          'action': 'payment_cancelled',
        }]),
      });
    } catch (e) {
      print('Ошибка при отмене платежа: $e');
      rethrow;
    }
  }
  
  /// Проверяет, включены ли платежи для площадки
  Future<bool> isPaymentEnabledForVenue(String venueId) async {
    try {
      final venueDoc = await _firestore.collection('venues').doc(venueId).get();
      if (!venueDoc.exists) {
        return false;
      }
      
      final venueData = venueDoc.data()!;
      return venueData['paymentEnabled'] == true;
    } catch (e) {
      print('Ошибка при проверке настроек платежей: $e');
      return false;
    }
  }
  
  /// Обрабатывает платеж для бронирования
  Future<Map<String, dynamic>> processBookingPayment(Map<String, dynamic> paymentData) async {
    try {
      final callable = _functions.httpsCallable('initBookingPayment');
      final result = await callable.call(paymentData);
      return result.data as Map<String, dynamic>;
    } catch (e) {
      print('Ошибка при обработке платежа: $e');
      rethrow;
    }
  }
}