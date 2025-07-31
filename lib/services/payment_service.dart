import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:url_launcher/url_launcher.dart';

class PaymentService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseFunctions _functions = FirebaseFunctions.instanceFor(region: 'europe-west1');

  Future<Map<String, dynamic>> initBookingPayment({
    required String bookingId,
    required double amount,
    required String description,
    required String returnUrl,
    required String userId,
    String? customerEmail,
    String? customerPhone,
  }) async {
    try {
      final callable = _functions.httpsCallable('initBookingPayment');
      final result = await callable.call({
        'bookingId': bookingId,
        'amount': amount,
        'description': description,
        'returnUrl': returnUrl,
        'userId': userId,
        'customerEmail': customerEmail,
        'customerPhone': customerPhone,
      });

      return result.data as Map<String, dynamic>;
    } catch (e) {
      print('Error initializing payment: $e');
      throw e;
    }
  }

  Future<void> processBookingPayment({
    required String bookingId,
    required double amount,
    required String description,
    required String userId,
    String? customerEmail,
    String? customerPhone,
  }) async {
    try {
      // Генерируем URL для возврата
      final returnUrl = 'https://allcourt.ru/payment-success?bookingId=$bookingId';

      // Инициализируем платеж
      final paymentData = await initBookingPayment(
        bookingId: bookingId,
        amount: amount,
        description: description,
        returnUrl: returnUrl,
        userId: userId,
        customerEmail: customerEmail,
        customerPhone: customerPhone,
      );

      if (paymentData['success'] == true && paymentData['paymentUrl'] != null) {
        // Открываем браузер с платежной страницей
        final url = Uri.parse(paymentData['paymentUrl']);
        if (await canLaunchUrl(url)) {
          await launchUrl(url, mode: LaunchMode.externalApplication);
        } else {
          throw Exception('Не удалось открыть страницу оплаты');
        }
      } else {
        throw Exception(paymentData['error'] ?? 'Ошибка инициализации платежа');
      }
    } catch (e) {
      print('Error processing payment: $e');
      throw e;
    }
  }

  // Проверка статуса платежа
  Future<String> checkPaymentStatus(String bookingId) async {
    try {
      final doc = await _firestore.collection('bookings').doc(bookingId).get();
      if (!doc.exists) {
        throw Exception('Бронирование не найдено');
      }
      
      final data = doc.data()!;
      return data['paymentStatus'] ?? 'pending';
    } catch (e) {
      print('Error checking payment status: $e');
      throw e;
    }
  }

  // Получение истории платежей пользователя
  Future<List<Map<String, dynamic>>> getUserPayments(String userId) async {
    try {
      final snapshot = await _firestore
          .collection('payments')
          .where('userId', isEqualTo: userId)
          .orderBy('createdAt', descending: true)
          .get();

      return snapshot.docs.map((doc) {
        final data = doc.data();
        data['id'] = doc.id;
        return data;
      }).toList();
    } catch (e) {
      print('Error getting user payments: $e');
      return [];
    }
  }

  // Проверка, включены ли платежи для клуба
  Future<bool> isPaymentEnabledForVenue(String venueId) async {
    try {
      final doc = await _firestore.collection('venues').doc(venueId).get();
      if (!doc.exists) return false;
      
      final data = doc.data()!;
      return data['paymentEnabled'] == true && 
             data['paymentProvider'] != null &&
             data['paymentCredentials'] != null;
    } catch (e) {
      print('Error checking venue payment status: $e');
      return false;
    }
  }
}