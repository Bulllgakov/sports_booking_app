import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

const db = admin.firestore();
const region = 'europe-west1';

/**
 * Cloud Function для ежедневной обработки выплат клубам
 * Запускается каждый день в 10:00 МСК
 * Использует статический IP через VPC коннектор
 */
export const processDailyPayouts = functions
  .region(region)
  .runWith({
    vpcConnector: 'firebase-connector',
    vpcConnectorEgressSettings: 'ALL_TRAFFIC'
  })
  .pubsub
  .schedule('0 10 * * *')
  .timeZone('Europe/Moscow')
  .onRun(async (context) => {
    console.log('Начало обработки ежедневных выплат...');
    
    const yesterday = getYesterday();
    const startOfDay = new Date(yesterday);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(yesterday);
    endOfDay.setHours(23, 59, 59, 999);
    
    try {
      // Получаем все клубы с активными Мультирасчетами
      const activeVenues = await db.collection('venues')
        .where('paymentType', '==', 'multiaccounts')
        .where('multiaccountsConfig.status', '==', 'active')
        .get();
      
      console.log(`Найдено ${activeVenues.size} клубов с активными Мультирасчетами`);
      
      for (const venueDoc of activeVenues.docs) {
        const venueData = venueDoc.data();
        const venueId = venueDoc.id;
        
        try {
          await processVenuePayout(venueId, venueData, startOfDay, endOfDay);
        } catch (error) {
          console.error(`Ошибка при обработке выплаты для клуба ${venueData.name}:`, error);
        }
      }
      
      console.log('Обработка ежедневных выплат завершена');
      
    } catch (error) {
      console.error('Критическая ошибка при обработке выплат:', error);
      throw error;
    }
  });

/**
 * Обработка выплаты для конкретного клуба
 */
async function processVenuePayout(
  venueId: string,
  venueData: any,
  startOfDay: Date,
  endOfDay: Date
) {
  console.log(`Обработка выплаты для клуба: ${venueData.name}`);
  
  // 1. Получаем все оплаченные бронирования за вчера
  const bookingsSnapshot = await db.collection('bookings')
    .where('venueId', '==', venueId)
    .where('paymentStatus', '==', 'paid')
    .where('paymentDetails.paymentType', '==', 'multiaccounts')
    .where('paymentDetails.paidAt', '>=', startOfDay)
    .where('paymentDetails.paidAt', '<=', endOfDay)
    .where('paymentDetails.multiaccountsData.includedInPayout', '==', false)
    .get();
  
  if (bookingsSnapshot.empty) {
    console.log(`Нет новых оплаченных бронирований для клуба ${venueData.name}`);
    return;
  }
  
  console.log(`Найдено ${bookingsSnapshot.size} бронирований для выплаты`);
  
  // 2. Рассчитываем суммы
  let totalGrossAmount = 0; // Общая сумма от клиентов
  let totalPlatformFee = 0; // Комиссия платформы
  let totalAcquiringFee = 0; // Эквайринг и касса
  const bookingIds: string[] = [];
  const bookingDetails: any[] = [];
  
  // Получаем проценты комиссий
  const platformCommissionPercent = venueData.platformCommissionPercent || 1.0;
  const acquiringCommissionPercent = venueData.acquiringCommissionPercent || 2.6;
  
  bookingsSnapshot.forEach(doc => {
    const booking = doc.data();
    const amount = booking.amount || 0;
    const platformFee = amount * (platformCommissionPercent / 100);
    const acquiringFee = amount * (acquiringCommissionPercent / 100);
    
    totalGrossAmount += amount;
    totalPlatformFee += platformFee;
    totalAcquiringFee += acquiringFee;
    bookingIds.push(doc.id);
    
    bookingDetails.push({
      bookingId: doc.id,
      amount: amount,
      platformFee: platformFee,
      acquiringFee: acquiringFee,
      customerName: booking.customerName,
      date: booking.date,
      courtName: booking.courtName
    });
  });
  
  // 3. Проверяем наличие долгов по возвратам
  const debtsSnapshot = await db.collection('venue_debts')
    .where('venueId', '==', venueId)
    .where('status', '==', 'pending')
    .get();
  
  let totalDebt = 0;
  const debtIds: string[] = [];
  
  debtsSnapshot.forEach(doc => {
    const debt = doc.data();
    totalDebt += debt.debtAmount || 0;
    debtIds.push(doc.id);
  });
  
  // 4. Проверяем необходимость вычета подписки
  let subscriptionFee = 0;
  const venueSubscription = await getVenueSubscription(venueId);
  
  if (venueSubscription && shouldDeductSubscription(venueSubscription)) {
    subscriptionFee = calculateSubscriptionFee(venueSubscription, venueData);
    console.log(`Вычет подписки: ${subscriptionFee}₽ (${venueSubscription.plan})`);
  }
  
  // 5. Рассчитываем итоговую сумму к выплате
  const totalCommission = totalPlatformFee + totalAcquiringFee;
  const grossPayoutAmount = totalGrossAmount - totalCommission;
  const netPayoutAmount = Math.max(0, grossPayoutAmount - totalDebt - subscriptionFee);
  const debtCovered = Math.min(totalDebt, grossPayoutAmount);
  const subscriptionCovered = Math.min(subscriptionFee, grossPayoutAmount - debtCovered);
  
  console.log('Расчет выплаты:');
  console.log(`  Общая сумма от клиентов: ${totalGrossAmount}₽`);
  console.log(`  Комиссия платформы AllCourt (${platformCommissionPercent}%): ${totalPlatformFee.toFixed(2)}₽`);
  console.log(`  Эквайринг и онлайн-касса (${acquiringCommissionPercent}%): ${totalAcquiringFee.toFixed(2)}₽`);
  console.log(`  Общая комиссия: ${totalCommission.toFixed(2)}₽`);
  console.log(`  К выплате до вычетов: ${grossPayoutAmount}₽`);
  console.log(`  Вычет долгов: ${debtCovered}₽`);
  console.log(`  Вычет подписки: ${subscriptionCovered}₽`);
  console.log(`  Итого к выплате: ${netPayoutAmount}₽`);
  
  // 6. Создаем запись о выплате
  const payoutData = {
    venueId: venueId,
    venueName: venueData.name,
    date: getYesterday(),
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
    
    // Бронирования
    bookings: bookingIds,
    bookingsCount: bookingIds.length,
    bookingDetails: bookingDetails,
    
    // Финансовые показатели
    totalGrossAmount: totalGrossAmount,
    platformFee: totalPlatformFee,
    platformCommissionPercent: platformCommissionPercent,
    acquiringFee: totalAcquiringFee,
    acquiringCommissionPercent: acquiringCommissionPercent,
    totalCommission: totalCommission,
    grossPayoutAmount: grossPayoutAmount,
    
    // Вычеты
    debtDeducted: debtCovered,
    debts: debtIds,
    subscriptionFeeDeducted: subscriptionCovered,
    subscriptionPlan: venueSubscription?.plan || null,
    
    // Итоговая сумма
    netPayoutAmount: netPayoutAmount,
    
    // Статус
    status: netPayoutAmount > 0 ? 'pending' : 'no_payout',
    tbankPayoutId: null,
    error: null
  };
  
  const payoutRef = await db.collection('payouts').add(payoutData);
  console.log(`Создана запись о выплате: ${payoutRef.id}`);
  
  // 7. Если есть сумма к выплате, отправляем через Тбанк API
  if (netPayoutAmount > 0) {
    try {
      const tbankPayoutId = await sendPayoutToTbank(
        venueData.multiaccountsConfig.recipientId,
        netPayoutAmount,
        venueData.name,
        payoutRef.id
      );
      
      // Обновляем статус выплаты
      await payoutRef.update({
        status: 'completed',
        tbankPayoutId: tbankPayoutId,
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Выплата отправлена через Тбанк: ${tbankPayoutId}`);
      
    } catch (error: any) {
      console.error('Ошибка при отправке выплаты через Тбанк:', error);
      
      await payoutRef.update({
        status: 'failed',
        error: error.message
      });
      
      throw error;
    }
  }
  
  // 8. Обновляем статусы
  // Помечаем бронирования как включенные в выплату
  const batch = db.batch();
  
  for (const bookingId of bookingIds) {
    const bookingRef = db.collection('bookings').doc(bookingId);
    batch.update(bookingRef, {
      'paymentDetails.multiaccountsData.includedInPayout': true,
      'paymentDetails.multiaccountsData.payoutId': payoutRef.id,
      'paymentDetails.multiaccountsData.payoutDate': admin.firestore.FieldValue.serverTimestamp()
    });
  }
  
  // Обновляем статус долгов
  if (debtCovered > 0) {
    let remainingDebtToCover = debtCovered;
    
    for (const debtId of debtIds) {
      if (remainingDebtToCover <= 0) break;
      
      const debtRef = db.collection('venue_debts').doc(debtId);
      const debtDoc = await debtRef.get();
      const debtAmount = debtDoc.data()?.debtAmount || 0;
      
      if (debtAmount <= remainingDebtToCover) {
        // Долг полностью покрыт
        batch.update(debtRef, {
          status: 'paid',
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          payoutId: payoutRef.id
        });
        remainingDebtToCover -= debtAmount;
      } else {
        // Долг частично покрыт
        batch.update(debtRef, {
          status: 'partial',
          paidAmount: remainingDebtToCover,
          remainingAmount: debtAmount - remainingDebtToCover,
          lastPayoutId: payoutRef.id
        });
        remainingDebtToCover = 0;
      }
    }
  }
  
  // Обновляем статус подписки если была оплачена
  if (subscriptionCovered > 0 && venueSubscription) {
    await updateSubscriptionPaymentStatus(venueId, subscriptionCovered, payoutRef.id);
  }
  
  await batch.commit();
  
  // 9. Отправляем уведомление клубу
  await sendPayoutNotification(
    venueData.financeEmail,
    venueData.name,
    payoutData
  );
  
  console.log(`Выплата для клуба ${venueData.name} успешно обработана`);
}

/**
 * Отправка выплаты через Тбанк API
 */
async function sendPayoutToTbank(
  recipientId: string,
  amount: number,
  venueName: string,
  payoutId: string
): Promise<string> {
  const TBANK_API_URL = functions.config().tbank?.api_url || 'https://api.tbank.ru/v1/multiaccounts';
  const TBANK_API_KEY = functions.config().tbank?.api_key || 'test_key';
  
  const payload = {
    recipientId: recipientId,
    amount: amount,
    currency: 'RUB',
    purpose: `Выплата за бронирования ${getYesterday().toLocaleDateString('ru-RU')}`,
    payoutReference: payoutId,
    metadata: {
      venueName: venueName,
      payoutId: payoutId,
      date: getYesterday().toISOString()
    }
  };
  
  if (TBANK_API_KEY === 'test_key') {
    // Тестовый режим
    console.log('Тестовый режим: имитация отправки выплаты', payload);
    return `test_payout_${Date.now()}`;
  }
  
  // Боевой режим
  const response = await axios.post(
    `${TBANK_API_URL}/payouts`,
    payload,
    {
      headers: {
        'Authorization': `Bearer ${TBANK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data.payoutId;
}

/**
 * Получение информации о подписке клуба
 */
async function getVenueSubscription(venueId: string) {
  const subscriptionDoc = await db.collection('subscriptions')
    .where('venueId', '==', venueId)
    .where('status', '==', 'active')
    .limit(1)
    .get();
  
  if (subscriptionDoc.empty) {
    return null;
  }
  
  return subscriptionDoc.docs[0].data();
}

/**
 * Проверка необходимости вычета подписки
 */
function shouldDeductSubscription(subscription: any): boolean {
  // Вычитаем подписку только для платных тарифов (CRM и ПРОФИ)
  if (subscription.plan === 'БАЗОВЫЙ') {
    return false;
  }
  
  // Проверяем, не была ли подписка уже оплачена в этом месяце
  const lastPaymentDate = subscription.lastPaymentDate?.toDate();
  if (lastPaymentDate) {
    const now = new Date();
    if (lastPaymentDate.getMonth() === now.getMonth() && 
        lastPaymentDate.getFullYear() === now.getFullYear()) {
      return false; // Уже оплачена в этом месяце
    }
  }
  
  return true;
}

/**
 * Расчет стоимости подписки
 */
function calculateSubscriptionFee(subscription: any, venueData: any): number {
  const courtsCount = venueData.courtsCount || 1;
  
  switch (subscription.plan) {
    case 'CRM':
      return 990 * courtsCount;
    case 'ПРОФИ':
      return 1990 * courtsCount;
    default:
      return 0;
  }
}

/**
 * Обновление статуса оплаты подписки
 */
async function updateSubscriptionPaymentStatus(
  venueId: string,
  amount: number,
  payoutId: string
) {
  const subscriptionSnapshot = await db.collection('subscriptions')
    .where('venueId', '==', venueId)
    .where('status', '==', 'active')
    .limit(1)
    .get();
  
  if (!subscriptionSnapshot.empty) {
    const subscriptionRef = subscriptionSnapshot.docs[0].ref;
    await subscriptionRef.update({
      lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
      lastPaymentAmount: amount,
      lastPayoutId: payoutId
    });
  }
}

/**
 * Отправка уведомления о выплате
 */
async function sendPayoutNotification(
  email: string,
  venueName: string,
  payoutData: any
) {
  console.log(`Отправка уведомления о выплате на ${email}`);
  
  const emailContent = `
    Здравствуйте!
    
    Выплата за ${payoutData.date.toLocaleDateString('ru-RU')} обработана.
    
    Детали выплаты:
    ========================
    Количество бронирований: ${payoutData.bookingsCount}
    Общая сумма от клиентов: ${payoutData.totalGrossAmount.toFixed(2)} ₽
    
    Удержано:
    - Комиссия платформы AllCourt (${payoutData.platformCommissionPercent}%): ${payoutData.platformFee.toFixed(2)} ₽
    - Эквайринг и онлайн-касса (${payoutData.acquiringCommissionPercent}%): ${payoutData.acquiringFee.toFixed(2)} ₽
    ${payoutData.debtDeducted > 0 ? `- Возвраты: ${payoutData.debtDeducted.toFixed(2)} ₽` : ''}
    ${payoutData.subscriptionFeeDeducted > 0 ? `- Подписка (${payoutData.subscriptionPlan}): ${payoutData.subscriptionFeeDeducted.toFixed(2)} ₽` : ''}
    
    К выплате: ${payoutData.netPayoutAmount.toFixed(2)} ₽
    ========================
    
    ${payoutData.netPayoutAmount > 0 
      ? 'Средства будут зачислены на ваш расчетный счет в течение дня.'
      : 'Сумма к выплате полностью покрыла задолженности.'}
    
    Подробную информацию вы можете посмотреть в разделе "Финансы" → "Выплаты" в админ-панели.
    
    С уважением,
    Команда AllCourt
  `;
  
  // TODO: Интегрировать с email сервисом
  return true;
}

/**
 * Получение вчерашней даты
 */
function getYesterday(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return yesterday;
}