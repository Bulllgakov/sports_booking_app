import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

const db = admin.firestore();

/**
 * Cloud Function для обработки возвратов в системе Мультирасчетов
 * Вызывается при отмене бронирования
 */
export const processMultiaccountsRefund = functions.https.onCall(async (data, context) => {
  // Проверяем авторизацию
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Требуется авторизация');
  }

  const { bookingId, amount, reason } = data;

  if (!bookingId || !amount) {
    throw new functions.https.HttpsError('invalid-argument', 'Не указан ID бронирования или сумма');
  }

  try {
    // Получаем данные бронирования
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    
    if (!bookingDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Бронирование не найдено');
    }

    const booking = bookingDoc.data()!;
    
    // Проверяем, что платеж был через Мультирасчеты
    if (booking.paymentDetails?.paymentType !== 'multiaccounts') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Бронирование не оплачено через Мультирасчеты'
      );
    }

    // Получаем данные клуба
    const venueDoc = await db.collection('venues').doc(booking.venueId).get();
    
    if (!venueDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Клуб не найден');
    }

    const venueData = venueDoc.data()!;
    
    // Проверяем, была ли уже произведена выплата
    const isPayoutCompleted = booking.paymentDetails?.multiaccountsData?.includedInPayout || false;
    const payoutId = booking.paymentDetails?.multiaccountsData?.payoutId;
    
    console.log(`Обработка возврата для бронирования ${bookingId}`);
    console.log(`Выплата произведена: ${isPayoutCompleted}, ID выплаты: ${payoutId}`);
    
    if (!isPayoutCompleted) {
      // Сценарий 1: Возврат ДО выплаты клубу
      console.log('Возврат ДО выплаты - простая отмена');
      
      // Исключаем бронирование из будущей выплаты
      await bookingDoc.ref.update({
        'paymentDetails.multiaccountsData.excludeFromPayout': true,
        'paymentDetails.multiaccountsData.refundInitiated': admin.firestore.FieldValue.serverTimestamp(),
        'paymentDetails.multiaccountsData.refundReason': reason || 'Отмена бронирования',
        'paymentStatus': 'refunded',
        'status': 'cancelled'
      });
      
      // Делаем полный возврат через API Тбанк
      const refundId = await sendRefundToTbank(
        booking.paymentDetails.tbankPaymentId,
        amount,
        reason || 'Отмена бронирования'
      );
      
      // Обновляем статус возврата
      await bookingDoc.ref.update({
        'paymentDetails.refundId': refundId,
        'paymentDetails.refundedAt': admin.firestore.FieldValue.serverTimestamp(),
        'paymentDetails.refundAmount': amount
      });
      
      // Логируем возврат комиссии платформы
      const platformCommission = amount * ((venueData.platformCommission || 1) / 100);
      await logPlatformCommissionRefund(bookingId, platformCommission);
      
      console.log(`Возврат до выплаты успешно обработан: ${refundId}`);
      
    } else {
      // Сценарий 2: Возврат ПОСЛЕ выплаты клубу
      console.log('Возврат ПОСЛЕ выплаты - создание долга');
      
      // Делаем возврат клиенту с нашего счета
      const refundId = await sendRefundToTbank(
        booking.paymentDetails.tbankPaymentId,
        amount,
        reason || 'Отмена бронирования'
      );
      
      // Рассчитываем сумму долга (без комиссии платформы)
      const platformCommission = amount * ((venueData.platformCommission || 1) / 100);
      const debtAmount = amount - platformCommission;
      
      // Создаем запись о задолженности клуба
      const debtRef = await db.collection('venue_debts').add({
        venueId: booking.venueId,
        venueName: venueData.name,
        bookingId: bookingId,
        payoutId: payoutId,
        debtAmount: debtAmount,
        originalRefundAmount: amount,
        platformCommission: platformCommission,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'pending',
        description: `Возврат за бронирование от ${booking.date?.toDate().toLocaleDateString('ru-RU')}`,
        customerName: booking.customerName,
        refundReason: reason || 'Отмена бронирования'
      });
      
      console.log(`Создан долг клуба: ${debtRef.id}, сумма: ${debtAmount}₽`);
      
      // Обновляем статус бронирования
      await bookingDoc.ref.update({
        'paymentStatus': 'refunded',
        'status': 'cancelled',
        'paymentDetails.refundId': refundId,
        'paymentDetails.refundedAt': admin.firestore.FieldValue.serverTimestamp(),
        'paymentDetails.refundAmount': amount,
        'paymentDetails.multiaccountsData.debtCreated': true,
        'paymentDetails.multiaccountsData.debtId': debtRef.id
      });
      
      // Отправляем уведомление клубу о долге
      await sendDebtNotification(
        venueData.financeEmail,
        venueData.name,
        debtAmount,
        booking
      );
    }
    
    // Логируем событие возврата
    await db.collection('audit_logs').add({
      type: 'multiaccounts_refund',
      bookingId: bookingId,
      venueId: booking.venueId,
      amount: amount,
      refundType: isPayoutCompleted ? 'after_payout' : 'before_payout',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      initiatedBy: context.auth.uid,
      reason: reason
    });
    
    return {
      success: true,
      message: 'Возврат успешно обработан',
      refundType: isPayoutCompleted ? 'after_payout' : 'before_payout'
    };
    
  } catch (error: any) {
    console.error('Ошибка при обработке возврата:', error);
    
    if (error.code) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Произошла ошибка при обработке возврата'
    );
  }
});

/**
 * Отправка возврата через Тбанк API
 */
async function sendRefundToTbank(
  paymentId: string,
  amount: number,
  reason: string
): Promise<string> {
  const TBANK_API_URL = functions.config().tbank?.api_url || 'https://api.tbank.ru/v1/multiaccounts';
  const TBANK_API_KEY = functions.config().tbank?.api_key || 'test_key';
  
  const payload = {
    paymentId: paymentId,
    amount: amount,
    currency: 'RUB',
    reason: reason
  };
  
  if (TBANK_API_KEY === 'test_key') {
    // Тестовый режим
    console.log('Тестовый режим: имитация возврата', payload);
    return `test_refund_${Date.now()}`;
  }
  
  // Боевой режим
  const response = await axios.post(
    `${TBANK_API_URL}/refunds`,
    payload,
    {
      headers: {
        'Authorization': `Bearer ${TBANK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data.refundId;
}

/**
 * Логирование возврата комиссии платформы
 */
async function logPlatformCommissionRefund(
  bookingId: string,
  commissionAmount: number
) {
  await db.collection('platform_commission_refunds').add({
    bookingId: bookingId,
    commissionAmount: commissionAmount,
    refundedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Отправка уведомления о долге
 */
async function sendDebtNotification(
  email: string,
  venueName: string,
  debtAmount: number,
  booking: any
) {
  console.log(`Отправка уведомления о долге на ${email}`);
  
  const emailContent = `
    Здравствуйте!
    
    Информируем вас о создании задолженности по возврату средств.
    
    Детали:
    ========================
    Клуб: ${venueName}
    Бронирование: ${booking.customerName} на ${booking.date?.toDate().toLocaleDateString('ru-RU')}
    Сумма возврата клиенту: ${booking.amount} ₽
    Сумма к удержанию из выплат: ${debtAmount.toFixed(2)} ₽
    
    Эта сумма будет автоматически удержана из следующих выплат.
    
    Если у вас есть вопросы, свяжитесь с нашей службой поддержки.
    
    С уважением,
    Команда AllCourt
  `;
  
  // TODO: Интегрировать с email сервисом
  return true;
}

/**
 * Cloud Function для обработки частичных возвратов
 */
export const processPartialRefund = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Требуется авторизация');
  }

  const { bookingId, refundAmount, reason } = data;

  if (!bookingId || !refundAmount) {
    throw new functions.https.HttpsError('invalid-argument', 'Не указаны обязательные параметры');
  }

  try {
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    
    if (!bookingDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Бронирование не найдено');
    }

    const booking = bookingDoc.data()!;
    const originalAmount = booking.amount;
    
    if (refundAmount > originalAmount) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Сумма возврата превышает сумму бронирования'
      );
    }
    
    // Получаем данные клуба
    const venueDoc = await db.collection('venues').doc(booking.venueId).get();
    const venueData = venueDoc.data()!;
    
    // Рассчитываем пропорциональную комиссию
    const refundPercent = refundAmount / originalAmount;
    const platformCommissionRefund = (booking.amount * ((venueData.platformCommission || 1) / 100)) * refundPercent;
    const clubRefund = refundAmount - platformCommissionRefund;
    
    const isPayoutCompleted = booking.paymentDetails?.multiaccountsData?.includedInPayout || false;
    
    if (isPayoutCompleted) {
      // Создаем долг только на сумму для клуба
      await db.collection('venue_debts').add({
        venueId: booking.venueId,
        venueName: venueData.name,
        bookingId: bookingId,
        debtAmount: clubRefund,
        originalRefundAmount: refundAmount,
        platformCommissionRefund: platformCommissionRefund,
        type: 'partial_refund',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'pending',
        reason: reason || 'Частичный возврат'
      });
    }
    
    // Делаем возврат клиенту
    const refundId = await sendRefundToTbank(
      booking.paymentDetails.tbankPaymentId,
      refundAmount,
      reason || 'Частичный возврат'
    );
    
    // Обновляем статус бронирования
    await bookingDoc.ref.update({
      'paymentDetails.partialRefund': true,
      'paymentDetails.partialRefundAmount': refundAmount,
      'paymentDetails.partialRefundId': refundId,
      'paymentDetails.partialRefundAt': admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      refundId: refundId,
      refundAmount: refundAmount
    };
    
  } catch (error: any) {
    console.error('Ошибка при частичном возврате:', error);
    throw new functions.https.HttpsError('internal', 'Ошибка при обработке частичного возврата');
  }
});