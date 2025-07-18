# 🎯 Реализация системы подписок "Все Корты"

## ✅ Что сделано

### 1. Модель данных подписок
- Создан файл типов `src/types/subscription.ts` с определением:
  - Тарифных планов (Старт, Стандарт, Профи, Премиум)
  - Лимитов и возможностей каждого тарифа
  - Структуры данных подписки клуба

### 2. Страница управления подпиской
- Создана страница `src/pages/admin/Subscription.tsx`:
  - Отображение текущего тарифа
  - Мониторинг использования ресурсов (корты, бронирования, уведомления)
  - Визуализация доступных тарифов с возможностью обновления
  - История платежей за подписку
  - Функция отмены подписки

### 3. Страница настроек эквайринга
- Создана страница `src/pages/admin/PaymentSettings.tsx`:
  - Пошаговая настройка эквайринга
  - Поддержка провайдеров: Т-Банк, Сбербанк, ЮKassa, Тинькофф
  - Безопасное хранение учетных данных
  - Тестовый режим для проверки
  - Проверка подключения

### 4. Обновление навигации
- Добавлены новые пункты меню в `src/layouts/AdminLayout.tsx`:
  - "Подписка" - для управления тарифным планом
  - "Настройки оплаты" - для настройки эквайринга
- Обновлены маршруты в `src/App.tsx`

### 5. Обновление страницы управления клубом
- В `src/pages/admin/ClubManagement.tsx`:
  - Убрана старая секция платежей
  - Добавлена кнопка перехода к настройкам эквайринга

### 6. Скрипты для инициализации
- `scripts/init-subscription-plans.cjs` - создание тарифных планов в Firebase
- `scripts/update-venues-payment-fields.cjs` - добавление полей платежей к клубам

## 📋 Структура данных в Firebase

### Коллекция `subscription_plans`
```javascript
{
  id: 'start' | 'standard' | 'pro',
  name: string,
  price: number,
  currency: 'RUB',
  interval: 'month',
  active: boolean,
  limits: {
    maxCourts: number,
    maxBookingsPerMonth: number,
    smsEmailNotifications: number,
    // ...другие лимиты
  },
  features: string[]
}
```

### Коллекция `subscriptions`
```javascript
{
  venueId: string,
  plan: 'start' | 'standard' | 'pro' | 'premium',
  status: 'active' | 'inactive' | 'trial' | 'expired',
  startDate: Timestamp,
  endDate: Timestamp | null,
  trialEndDate: Timestamp | null,
  usage: {
    courtsCount: number,
    bookingsThisMonth: number,
    smsEmailsSent: number,
    lastUpdated: Timestamp
  },
  paymentMethod: {
    type: 'card' | 'invoice',
    last4: string
  },
  nextBillingDate: Timestamp,
  cancelledAt: Timestamp | null
}
```

### Обновленные поля в `venues`
```javascript
{
  // Новые поля для эквайринга
  paymentEnabled: boolean,
  paymentTestMode: boolean,
  paymentProvider: string,
  paymentCredentials: object, // зашифрованные данные
  paymentUpdatedAt: Timestamp,
  
  // Старые поля (для совместимости)
  commissionPercent: 0, // теперь всегда 0
  paymentRecipientId: string
}
```

## 🚀 Развертывание

1. Админка развернута на Firebase Hosting: https://sports-booking-app-1d7e5.web.app
2. Новые страницы доступны по путям:
   - `/admin/subscription` - управление подпиской
   - `/admin/payment-settings` - настройки эквайринга

## 🔜 Следующие шаги

1. **Cloud Functions для подписок**:
   - `checkSubscriptionLimits` - проверка лимитов перед операциями
   - `updateSubscriptionUsage` - обновление счетчиков использования
   - `processSubscriptionPayment` - обработка платежей за подписку
   - `sendSubscriptionNotifications` - уведомления об истечении

2. **Интеграция с платежными системами**:
   - Реальная интеграция с API эквайринга
   - Шифрование учетных данных
   - Webhook для обработки платежей

3. **Ограничения по тарифам**:
   - Блокировка функций при превышении лимитов
   - Предупреждения о приближении к лимитам
   - Автоматическое обновление счетчиков

4. **Биллинг и инвойсы**:
   - Автоматическое выставление счетов
   - История транзакций
   - Документы для бухгалтерии

## 💡 Примечания

- Система готова к использованию в тестовом режиме
- Все новые клубы автоматически получают бесплатный тариф "Старт"
- Платежи клубов идут напрямую через их эквайринг
- Платформа получает доход только от подписок

---

*Обновлено: 18 июля 2025*