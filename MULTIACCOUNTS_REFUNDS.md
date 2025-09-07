# Обработка возвратов в Мультирасчетах Тбанк

## Проблематика
Когда клиент оплачивает бронирование через Мультирасчеты, деньги распределяются:
1. Комиссия платформы (например, 1%) 
2. Остаток клубу (99%)

На следующий день происходит выплата клубу. После этого могут возникнуть ситуации с возвратом.

## Сценарии возвратов

### Сценарий 1: Возврат ДО выплаты клубу (в тот же день)
**Ситуация:** Клиент отменил бронирование в день оплаты, выплата еще не произведена.

**Решение:**
```javascript
async function processRefundBeforePayout(bookingId, amount) {
  // 1. Отменяем включение бронирования в завтрашнюю выплату
  await updateBooking(bookingId, {
    'paymentDetails.multiaccountsData.excludeFromPayout': true,
    'paymentDetails.multiaccountsData.refundInitiated': new Date()
  });
  
  // 2. Делаем полный возврат через API Тбанк
  const refund = await tbankAPI.createRefund({
    paymentId: booking.paymentId,
    amount: amount, // Полная сумма
    reason: 'Отмена бронирования'
  });
  
  // 3. Возвращаем комиссию платформы в учете
  await logPlatformCommissionRefund({
    bookingId,
    commissionAmount: booking.paymentDetails.platformCommission,
    refundDate: new Date()
  });
  
  return refund;
}
```

### Сценарий 2: Возврат ПОСЛЕ выплаты клубу
**Ситуация:** Клиент отменил бронирование после того, как клуб уже получил деньги.

**Варианты решения:**

#### Вариант A: Вычет из следующих выплат (рекомендуемый)
```javascript
async function processRefundAfterPayout(bookingId, amount) {
  const booking = await getBooking(bookingId);
  const venue = await getVenue(booking.venueId);
  
  // 1. Делаем возврат клиенту с нашего счета
  const refund = await tbankAPI.createRefund({
    paymentId: booking.paymentId,
    amount: amount,
    source: 'platform_account' // Возвращаем с счета платформы
  });
  
  // 2. Создаем запись о задолженности клуба
  const debtAmount = amount - booking.paymentDetails.platformCommission;
  
  await createVenueDebt({
    venueId: venue.id,
    bookingId: bookingId,
    debtAmount: debtAmount, // Сумма без комиссии платформы
    originalAmount: amount,
    platformCommission: booking.paymentDetails.platformCommission,
    createdAt: new Date(),
    status: 'pending',
    description: `Возврат за бронирование ${booking.id}`
  });
  
  // 3. При следующей выплате автоматически вычитаем долг
  // См. processDailyPayouts ниже
  
  return refund;
}
```

#### Вариант B: Запрос средств у клуба (альтернативный)
```javascript
async function requestRefundFromVenue(bookingId, amount) {
  // 1. Создаем запрос на возврат средств от клуба
  const refundRequest = await createRefundRequest({
    venueId: venue.id,
    bookingId: bookingId,
    amount: clubAmount, // Без комиссии платформы
    status: 'pending',
    dueDate: addDays(new Date(), 3) // 3 дня на возврат
  });
  
  // 2. Отправляем уведомление клубу
  await sendRefundRequestEmail(venue, {
    bookingId,
    amount: clubAmount,
    dueDate: refundRequest.dueDate
  });
  
  // 3. Блокируем выплаты пока не вернут
  await updateVenue(venue.id, {
    'multiaccountsConfig.payoutsBlocked': true,
    'multiaccountsConfig.blockReason': 'Ожидание возврата средств'
  });
}
```

### Сценарий 3: Частичный возврат
**Ситуация:** Возврат только части суммы (например, за неиспользованные часы).

```javascript
async function processPartialRefund(bookingId, refundAmount) {
  const booking = await getBooking(bookingId);
  const originalAmount = booking.amount;
  
  // Рассчитываем пропорциональную комиссию
  const refundPercent = refundAmount / originalAmount;
  const platformCommissionRefund = booking.paymentDetails.platformCommission * refundPercent;
  const clubRefund = refundAmount - platformCommissionRefund;
  
  if (booking.paymentDetails.multiaccountsData.payoutStatus === 'completed') {
    // Создаем долг только на сумму для клуба
    await createVenueDebt({
      venueId: booking.venueId,
      bookingId: bookingId,
      debtAmount: clubRefund,
      originalRefund: refundAmount,
      platformCommissionRefund: platformCommissionRefund,
      type: 'partial_refund'
    });
  }
  
  // Делаем возврат клиенту
  await tbankAPI.createRefund({
    paymentId: booking.paymentId,
    amount: refundAmount,
    type: 'partial'
  });
}
```

## Обновленная логика ежедневных выплат

```javascript
exports.processDailyPayouts = functions.pubsub
  .schedule('0 10 * * *')
  .onRun(async (context) => {
    const yesterday = getYesterday();
    const bookings = await getBookingsForPayout(yesterday);
    
    // Группируем по клубам
    const payoutsByVenue = groupByVenue(bookings);
    
    for (const [venueId, venueBookings] of payoutsByVenue) {
      const venue = await getVenue(venueId);
      
      // Проверяем наличие долгов
      const venueDebts = await getVenueDebts(venueId, 'pending');
      const totalDebt = venueDebts.reduce((sum, d) => sum + d.debtAmount, 0);
      
      // Расчет сумм
      const totalAmount = venueBookings.reduce((sum, b) => sum + b.amount, 0);
      const platformCommission = totalAmount * (venue.platformCommission / 100);
      const grossPayoutAmount = totalAmount - platformCommission;
      
      // Вычитаем долги из выплаты
      const netPayoutAmount = Math.max(0, grossPayoutAmount - totalDebt);
      const debtCovered = Math.min(totalDebt, grossPayoutAmount);
      
      // Создаем запись о выплате
      const payoutDoc = await createPayout({
        venueId,
        venueName: venue.name,
        date: yesterday,
        bookings: venueBookings.map(b => b.id),
        totalAmount,
        platformCommission,
        grossPayoutAmount,
        debtDeducted: debtCovered,
        netPayoutAmount,
        debts: venueDebts.map(d => d.id),
        status: 'pending'
      });
      
      if (netPayoutAmount > 0) {
        // Есть что выплачивать после вычета долгов
        const tbankPayout = await tbankAPI.createPayout({
          recipientId: venue.multiaccountsConfig.recipientId,
          amount: netPayoutAmount,
          purpose: `Выплата за ${yesterday.toLocaleDateString()} с учетом возвратов`
        });
        
        // Обновляем статус долгов
        if (debtCovered > 0) {
          await markDebtsAsPaid(venueDebts, debtCovered);
        }
      } else if (grossPayoutAmount > 0) {
        // Вся выплата ушла на покрытие долгов
        await updatePayout(payoutDoc.id, {
          status: 'completed',
          note: 'Выплата полностью зачтена в счет долга'
        });
        
        // Частично покрываем долги
        await partiallyPayDebts(venueDebts, grossPayoutAmount);
      } else {
        // Нет выплаты
        await updatePayout(payoutDoc.id, {
          status: 'skipped',
          note: 'Нет средств к выплате'
        });
      }
    }
  });
```

## Уведомления при возвратах

### Уведомление клубу при вычете долга
```
Тема: Корректировка выплаты за {date}

Здравствуйте, {clubName}!

При расчете выплаты за {date} были учтены следующие возвраты:

Возвраты:
{список возвратов с суммами}
Общая сумма возвратов: {totalDebt} ₽

Расчет выплаты:
- Сумма бронирований: {totalAmount} ₽
- Комиссия платформы ({commission}%): {platformCommission} ₽
- К выплате до корректировки: {grossAmount} ₽
- Удержано за возвраты: {debtAmount} ₽
- Итого к выплате: {netAmount} ₽

Детальную информацию смотрите в личном кабинете.

С уважением,
Команда AllCourt
```

## Интерфейс для отображения долгов

### Для клуба (раздел "Выплаты")
```javascript
// Компонент VenueDebts.tsx
<Card>
  <CardHeader title="Задолженность по возвратам" />
  <CardContent>
    {debts.length > 0 ? (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Дата возврата</TableCell>
            <TableCell>Бронирование</TableCell>
            <TableCell>Сумма возврата</TableCell>
            <TableCell>К удержанию</TableCell>
            <TableCell>Статус</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {debts.map(debt => (
            <TableRow key={debt.id}>
              <TableCell>{formatDate(debt.createdAt)}</TableCell>
              <TableCell>{debt.bookingId}</TableCell>
              <TableCell>{debt.originalAmount} ₽</TableCell>
              <TableCell>{debt.debtAmount} ₽</TableCell>
              <TableCell>
                {debt.status === 'pending' && <Chip label="Ожидает" color="warning" />}
                {debt.status === 'paid' && <Chip label="Погашено" color="success" />}
                {debt.status === 'partial' && <Chip label="Частично" color="info" />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    ) : (
      <Typography>Нет задолженностей по возвратам</Typography>
    )}
    
    {totalDebt > 0 && (
      <Alert severity="warning" sx={{ mt: 2 }}>
        Общая задолженность: {totalDebt} ₽
        <br />
        Будет удержано из следующих выплат
      </Alert>
    )}
  </CardContent>
</Card>
```

### Для суперадмина (раздел "Мультирасчеты")
- Список всех активных долгов по клубам
- Возможность списать долг вручную
- История возвратов и покрытия долгов
- Статистика по возвратам

## Конфигурация возвратов

```javascript
// config/multiaccounts.js
export const REFUND_CONFIG = {
  // Автоматически вычитать долги из выплат
  AUTO_DEDUCT_DEBTS: true,
  
  // Максимальный процент выплаты для покрытия долгов
  MAX_DEBT_DEDUCTION_PERCENT: 100, // Можем удержать всю выплату
  
  // Минимальная сумма выплаты после вычета долгов
  MIN_PAYOUT_AFTER_DEBT: 0, // Можем не выплачивать, если все уйдет на долг
  
  // Срок для добровольного возврата (если используется вариант B)
  VOLUNTARY_REFUND_DAYS: 3,
  
  // Блокировать выплаты при большом долге
  BLOCK_PAYOUTS_ON_DEBT: false,
  BLOCK_PAYOUTS_DEBT_THRESHOLD: 50000, // Блокировать при долге > 50000₽
};
```

## Важные моменты

1. **Комиссия платформы при возврате**
   - При полном возврате платформа тоже возвращает свою комиссию
   - При частичном возврате комиссия возвращается пропорционально

2. **Прозрачность для клуба**
   - Клуб всегда видит детализацию вычетов
   - Получает уведомления о каждом возврате
   - Может оспорить неправомерный возврат

3. **Защита от злоупотреблений**
   - Логирование всех операций с возвратами
   - Возможность заблокировать клуб при подозрительной активности
   - Лимиты на сумму возвратов

4. **Бухгалтерский учет**
   - Все операции должны отражаться в отчетности
   - Возвраты комиссий учитываются отдельно
   - Формирование актов сверки при необходимости

## Альтернативное решение: Резервный фонд

Можно создать резервный фонд для каждого клуба:
- Удерживать дополнительно 5% от выплат в резерв
- Использовать резерв для покрытия возвратов
- Возвращать резерв при отключении Мультирасчетов

```javascript
const RESERVE_FUND_PERCENT = 5; // Дополнительно к комиссии
const MAX_RESERVE_FUND = 50000; // Максимальный размер резерва

// При выплате
const reserveDeduction = Math.min(
  amount * (RESERVE_FUND_PERCENT / 100),
  MAX_RESERVE_FUND - currentReserve
);
```