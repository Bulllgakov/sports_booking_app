# Настройка Т-Банк Мультирасчеты

## Учетные данные

### Тестовое окружение
- **Terminal Key**: 1755339010178 / 1755339010178E2C
- **Token Password**: V*F&Snl4*Kud%kGR
- **Username**: All_Court_booking
- **Password**: D7SfdvJY5zq7fm=W
- **API URL**: https://rest-api-test.tinkoff.ru/v2/

### Продакшн окружение
- **Terminal Key**: 1755339010178 / 1755339010178E2C
- **Token Password**: V*F&Snl4*Kud%kGR
- **Username**: All_Court_booking
- **Password**: an9yLfvtTPSMOJe2
- **API URL**: https://securepay.tinkoff.ru/v2/

## Архитектура решения

### 1. Поток платежей через Мультирасчеты

```
Клиент → Оплата → Т-Банк Мультирасчеты → Распределение:
                                          ├── Клуб (99% при комиссии 1%)
                                          └── Платформа (1% комиссия)
```

### 2. Регистрация клуба в системе

1. Клуб заполняет реквизиты в разделе "Управление клубом" → "Реквизиты"
2. В разделе "Настройки оплаты" нажимает "Подать заявку на подключение"
3. Cloud Function `registerClubInMultiaccounts` отправляет данные в Т-Банк
4. Т-Банк регистрирует клуб как магазин (Shop) с уникальным ShopCode
5. Статус обновляется на "active" после проверки

### 3. Обработка платежей

При создании платежа:
```javascript
// Инициализация платежа с распределением средств
const payment = await tbankMultiaccountsService.initPayment({
  amount: 1000,                    // Общая сумма
  orderId: 'booking_123',
  description: 'Бронирование корта',
  customerEmail: 'client@example.com',
  successUrl: 'https://allcourt.ru/success',
  failUrl: 'https://allcourt.ru/fail',
  shops: [
    {
      shopCode: 'venue_abc123',    // ID клуба
      amount: 990,                 // 99% клубу
      name: 'Теннисный клуб Олимп'
    }
  ]
});
```

### 4. Ежедневные выплаты

Cloud Function `processDailyPayouts` запускается в 10:00 МСК:
1. Собирает все оплаченные бронирования за вчера
2. Группирует по клубам
3. Рассчитывает комиссии и вычеты
4. Т-Банк автоматически выплачивает средства клубам

### 5. Обработка возвратов

**До выплаты (тот же день):**
- Простой возврат через API
- Исключение из будущей выплаты

**После выплаты:**
- Создание долга клуба
- Автоматический вычет из следующих выплат

## API Endpoints

### Основные методы

1. **Init** - Инициализация платежа
2. **AddShop** - Регистрация магазина (клуба)
3. **GetShop** - Получение информации о магазине
4. **UpdateShop** - Обновление данных магазина
5. **Cancel** - Создание возврата
6. **GetState** - Проверка статуса платежа
7. **GetShopBalance** - Получение баланса магазина

### Webhook уведомления

Т-Банк отправляет уведомления на:
`https://allcourt.ru/api/webhooks/tbank-multiaccounts`

Типы событий:
- `payment.succeeded` - Успешный платеж
- `payment.failed` - Неудачный платеж
- `refund.succeeded` - Успешный возврат
- `shop.activated` - Магазин активирован
- `shop.rejected` - Магазин отклонен

## Развертывание

### 1. Настройка Firebase Functions

```bash
# Установка конфигурации для тестового окружения
firebase functions:config:set \
  tbank.terminal_key="1755339010178" \
  tbank.terminal_key_e2c="1755339010178E2C" \
  tbank.password="D7SfdvJY5zq7fm=W" \
  tbank.api_url="https://rest-api-test.tinkoff.ru/v2/" \
  tbank.webhook_secret="your_webhook_secret"

# Для продакшена
firebase functions:config:set \
  tbank.terminal_key="1755339010178" \
  tbank.terminal_key_e2c="1755339010178E2C" \
  tbank.password="an9yLfvtTPSMOJe2" \
  tbank.api_url="https://securepay.tinkoff.ru/v2/" \
  tbank.webhook_secret="your_webhook_secret"
```

### 2. Деплой функций

```bash
# Деплой всех функций Мультирасчетов
firebase deploy --only functions:registerClubInMultiaccounts,functions:processDailyPayouts,functions:processMultiaccountsRefund,functions:tbankMultiaccountsWebhook,functions:checkMultiaccountsStatus
```

### 3. Настройка расписания

Cloud Functions уже настроены:
- `processDailyPayouts` - ежедневно в 10:00 МСК
- `checkMultiaccountsStatus` - каждый час

## Тестирование

### 1. Тестовый платеж

```javascript
// Создание тестового платежа
const testPayment = await initBookingPayment({
  bookingId: 'test_booking_123',
  amount: 100,
  venueId: 'test_venue',
  customerEmail: 'test@example.com'
});
```

### 2. Тестовые карты

Для тестового окружения Т-Банк:
- **Успешный платеж**: 4300 0000 0000 0777
- **Отказ банка**: 4300 0000 0000 0043
- **3D-Secure**: 4300 0000 0000 0785

### 3. Проверка webhook

```bash
# Симуляция webhook от Т-Банка
curl -X POST https://allcourt.ru/api/webhooks/tbank-multiaccounts \
  -H "Content-Type: application/json" \
  -H "X-TBank-Signature: test_signature" \
  -d '{
    "event": "payment.succeeded",
    "data": {
      "paymentId": "test_payment_123",
      "bookingId": "test_booking_123",
      "amount": 10000,
      "acquiringFee": 259
    }
  }'
```

## Мониторинг

### Firebase Console

1. **Functions** → Логи выполнения
2. **Firestore** → Коллекции:
   - `payouts` - История выплат
   - `venue_debts` - Долги клубов
   - `webhook_logs` - Логи webhook
   - `audit_logs` - Аудит операций

### Метрики

- Количество успешных платежей
- Сумма выплат по дням
- Активные долги клубов
- Процент успешных транзакций

## Безопасность

1. **Подпись запросов** - Все запросы подписываются SHA-256
2. **HTTPS only** - Только защищенное соединение
3. **Webhook проверка** - Проверка подписи от Т-Банка
4. **Шифрование данных** - Sensitive данные шифруются
5. **Аудит логи** - Все операции логируются

## Поддержка

### Контакты Т-Банк
- Техподдержка: +7 (495) 648-10-00
- Email: support@tinkoff.ru
- Документация: https://www.tinkoff.ru/kassa/develop/api/

### Внутренняя поддержка
- Разработка: dev@allcourt.ru
- Мониторинг: monitoring@allcourt.ru

## Чек-лист запуска

- [ ] Настроены Firebase Functions Config
- [ ] Развернуты Cloud Functions
- [ ] Настроен webhook URL в личном кабинете Т-Банка
- [ ] Проведен тестовый платеж
- [ ] Проверена работа возвратов
- [ ] Настроен мониторинг
- [ ] Обучена команда поддержки