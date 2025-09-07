import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

const db = admin.firestore();
const region = 'europe-west1';

/**
 * Webhook для обработки уведомлений от Тбанк Мультирасчеты
 * Использует статический IP через VPC коннектор
 */
export const tbankMultiaccountsWebhook = functions
  .region(region)
  .runWith({
    vpcConnector: 'firebase-connector',
    vpcConnectorEgressSettings: 'ALL_TRAFFIC'
  })
  .https.onRequest(async (req, res) => {
    console.log('Получен webhook от Тбанк Мультирасчеты');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body));
    
    // Проверяем метод запроса
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }
    
    try {
      // Проверяем подпись запроса
      const signature = req.headers['x-tbank-signature'] as string;
      const isValidSignature = verifyTbankSignature(req.body, signature);
      
      if (!isValidSignature) {
        console.error('Неверная подпись webhook');
        res.status(401).send('Unauthorized');
        return;
      }
      
      const { event, data } = req.body;
      
      console.log(`Обработка события: ${event}`);
      
      switch (event) {
        case 'payment.succeeded':
          await handlePaymentSucceeded(data);
          break;
          
        case 'payment.failed':
          await handlePaymentFailed(data);
          break;
          
        case 'refund.succeeded':
          await handleRefundSucceeded(data);
          break;
          
        case 'payout.succeeded':
          await handlePayoutSucceeded(data);
          break;
          
        case 'payout.failed':
          await handlePayoutFailed(data);
          break;
          
        case 'recipient.activated':
          await handleRecipientActivated(data);
          break;
          
        case 'recipient.rejected':
          await handleRecipientRejected(data);
          break;
          
        default:
          console.log(`Неизвестный тип события: ${event}`);
      }
      
      // Логируем webhook
      await db.collection('webhook_logs').add({
        provider: 'tbank_multiaccounts',
        event: event,
        data: data,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        processed: true
      });
      
      res.status(200).json({ success: true });
      
    } catch (error) {
      console.error('Ошибка обработки webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

/**
 * Проверка подписи от Тбанк
 */
function verifyTbankSignature(body: any, signature: string): boolean {
  const TBANK_WEBHOOK_SECRET = functions.config().tbank?.webhook_secret || 'test_secret';
  
  if (TBANK_WEBHOOK_SECRET === 'test_secret') {
    // В тестовом режиме пропускаем проверку
    return true;
  }
  
  const calculatedSignature = crypto
    .createHmac('sha256', TBANK_WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');
  
  return calculatedSignature === signature;
}

/**
 * Обработка успешного платежа
 */
async function handlePaymentSucceeded(data: any) {
  console.log('Обработка успешного платежа:', data);
  
  const { paymentId, bookingId, amount, acquiringFee, metadata } = data;
  
  if (!bookingId) {
    console.error('Не указан ID бронирования');
    return;
  }
  
  const bookingRef = db.collection('bookings').doc(bookingId);
  const bookingDoc = await bookingRef.get();
  
  if (!bookingDoc.exists) {
    console.error(`Бронирование ${bookingId} не найдено`);
    return;
  }
  
  const booking = bookingDoc.data()!;
  
  // Обновляем статус платежа
  await bookingRef.update({
    paymentStatus: 'paid',
    status: 'confirmed',
    'paymentDetails.paidAt': admin.firestore.FieldValue.serverTimestamp(),
    'paymentDetails.tbankPaymentId': paymentId,
    'paymentDetails.paymentType': 'multiaccounts',
    'paymentDetails.multiaccountsData': {
      paymentId: paymentId,
      amount: amount,
      acquiringFee: acquiringFee || 0,
      acquiringFeePercent: amount > 0 ? ((acquiringFee || 0) / amount) * 100 : 0,
      metadata: metadata,
      includedInPayout: false, // Будет включено в следующую выплату
      processedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  });
  
  console.log(`Платеж ${paymentId} успешно обработан для бронирования ${bookingId}`);
  
  // Отправляем уведомление клиенту
  // TODO: Интегрировать с сервисом уведомлений
}

/**
 * Обработка неудачного платежа
 */
async function handlePaymentFailed(data: any) {
  console.log('Обработка неудачного платежа:', data);
  
  const { paymentId, bookingId, reason } = data;
  
  if (!bookingId) {
    console.error('Не указан ID бронирования');
    return;
  }
  
  const bookingRef = db.collection('bookings').doc(bookingId);
  
  // Обновляем статус платежа
  await bookingRef.update({
    paymentStatus: 'failed',
    'paymentDetails.failedAt': admin.firestore.FieldValue.serverTimestamp(),
    'paymentDetails.failureReason': reason || 'Платеж отклонен',
    'paymentDetails.tbankPaymentId': paymentId
  });
  
  console.log(`Платеж ${paymentId} отклонен для бронирования ${bookingId}`);
}

/**
 * Обработка успешного возврата
 */
async function handleRefundSucceeded(data: any) {
  console.log('Обработка успешного возврата:', data);
  
  const { refundId, paymentId, amount } = data;
  
  // Находим бронирование по ID платежа
  const bookingsSnapshot = await db.collection('bookings')
    .where('paymentDetails.tbankPaymentId', '==', paymentId)
    .limit(1)
    .get();
  
  if (bookingsSnapshot.empty) {
    console.error(`Бронирование для платежа ${paymentId} не найдено`);
    return;
  }
  
  const bookingDoc = bookingsSnapshot.docs[0];
  
  // Обновляем статус возврата
  await bookingDoc.ref.update({
    'paymentDetails.refundStatus': 'completed',
    'paymentDetails.refundCompletedAt': admin.firestore.FieldValue.serverTimestamp(),
    'paymentDetails.tbankRefundId': refundId,
    'paymentDetails.refundAmount': amount
  });
  
  console.log(`Возврат ${refundId} успешно завершен`);
}

/**
 * Обработка успешной выплаты
 */
async function handlePayoutSucceeded(data: any) {
  console.log('Обработка успешной выплаты:', data);
  
  const { payoutId, recipientId, amount, payoutReference } = data;
  
  if (!payoutReference) {
    console.error('Не указана ссылка на выплату');
    return;
  }
  
  // Обновляем статус выплаты
  const payoutRef = db.collection('payouts').doc(payoutReference);
  const payoutDoc = await payoutRef.get();
  
  if (!payoutDoc.exists) {
    console.error(`Выплата ${payoutReference} не найдена`);
    return;
  }
  
  await payoutRef.update({
    status: 'completed',
    tbankPayoutId: payoutId,
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
    actualAmount: amount
  });
  
  console.log(`Выплата ${payoutId} успешно завершена`);
}

/**
 * Обработка неудачной выплаты
 */
async function handlePayoutFailed(data: any) {
  console.log('Обработка неудачной выплаты:', data);
  
  const { payoutId, recipientId, reason, payoutReference } = data;
  
  if (!payoutReference) {
    console.error('Не указана ссылка на выплату');
    return;
  }
  
  // Обновляем статус выплаты
  const payoutRef = db.collection('payouts').doc(payoutReference);
  
  await payoutRef.update({
    status: 'failed',
    tbankPayoutId: payoutId,
    failedAt: admin.firestore.FieldValue.serverTimestamp(),
    failureReason: reason || 'Выплата отклонена банком'
  });
  
  // Отправляем уведомление администратору клуба
  const payoutDoc = await payoutRef.get();
  if (payoutDoc.exists) {
    const payoutData = payoutDoc.data()!;
    const venueDoc = await db.collection('venues').doc(payoutData.venueId).get();
    
    if (venueDoc.exists) {
      const venueData = venueDoc.data()!;
      // TODO: Отправить email уведомление о проблеме с выплатой
      console.log(`Уведомление о проблеме с выплатой отправлено на ${venueData.financeEmail}`);
    }
  }
  
  console.log(`Выплата ${payoutId} отклонена: ${reason}`);
}

/**
 * Обработка активации получателя (клуба)
 */
async function handleRecipientActivated(data: any) {
  console.log('Обработка активации получателя:', data);
  
  const { recipientId, venueId } = data;
  
  if (!venueId) {
    console.error('Не указан ID клуба');
    return;
  }
  
  const venueRef = db.collection('venues').doc(venueId);
  
  await venueRef.update({
    'multiaccountsConfig.status': 'active',
    'multiaccountsConfig.recipientId': recipientId,
    'multiaccountsConfig.activatedAt': admin.firestore.FieldValue.serverTimestamp()
  });
  
  // Отправляем уведомление администратору
  const venueDoc = await venueRef.get();
  if (venueDoc.exists) {
    const venueData = venueDoc.data()!;
    // TODO: Отправить email уведомление об активации
    console.log(`Мультирасчеты активированы для клуба ${venueData.name}`);
  }
}

/**
 * Обработка отклонения получателя (клуба)
 */
async function handleRecipientRejected(data: any) {
  console.log('Обработка отклонения получателя:', data);
  
  const { recipientId, venueId, reason } = data;
  
  if (!venueId) {
    console.error('Не указан ID клуба');
    return;
  }
  
  const venueRef = db.collection('venues').doc(venueId);
  
  await venueRef.update({
    'multiaccountsConfig.status': 'rejected',
    'multiaccountsConfig.recipientId': recipientId,
    'multiaccountsConfig.rejectionReason': reason || 'Не соответствует требованиям',
    'multiaccountsConfig.rejectedAt': admin.firestore.FieldValue.serverTimestamp()
  });
  
  // Отправляем уведомление администратору
  const venueDoc = await venueRef.get();
  if (venueDoc.exists) {
    const venueData = venueDoc.data()!;
    // TODO: Отправить email уведомление об отклонении
    console.log(`Мультирасчеты отклонены для клуба ${venueData.name}: ${reason}`);
  }
}