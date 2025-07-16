# sports_booking_app - Полное техническое задание для Claude Code

## 🏗️ Архитектура системы

```
┌─────────────────────┐     ┌─────────────────────┐
│   КЛИЕНТЫ           │     │   КЛУБЫ             │
│                     │     │                     │
│ 📱 Mobile App Only  │     │ 💻 Web Admin Only   │
│   (Flutter)         │     │   (React/Vue)       │
│                     │     │                     │
│ ✅ iOS              │     │ ✅ Chrome/Safari    │
│ ✅ Android          │     │ ✅ Desktop/Tablet   │
│ ❌ НЕТ Web версии   │     │ ❌ НЕТ Mobile App   │
└──────────┬──────────┘     └──────────┬──────────┘
           │                            │
           └────────────┬───────────────┘
                        │
                  ┌─────▼─────┐
                  │ FIREBASE  │
                  │           │
                  │ • Auth    │
                  │ • Store   │
                  │ • Storage │
                  │ • FCM     │
                  └─────┬─────┘
                        │
                  ┌─────▼─────┐
                  │  Т-КАССА  │
                  │Мультирасчеты│
                  │           │
                  │ Платеж 1000₽│
                  │     ↓      │
                  │ 850₽→Клуб  │
                  │ 150₽→Сервис│
                  └───────────┘
```

## 📋 Общая информация

**Название проекта:** sports_booking_app  
**Описание:** Мобильное приложение для бронирования спортивных кортов (теннис, падел, бадминтон) с функцией поиска партнеров для игры  

### ⚠️ ВАЖНО: Разделение платформ
- **Клиенты:** ТОЛЬКО мобильное приложение (iOS/Android на Flutter)
- **Клубы:** ТОЛЬКО веб админ-панель
- **Веб-версии для клиентов НЕТ** - бронирование возможно только через приложение
- Клиент обязан скачать приложение для бронирования кортов

### 💰 Платежная система и локализация
- **Основная платежная система:** Т-Касса с Мультирасчетами (Тинькофф)
- **Автоматическое распределение платежей** между клубами и платформой
- **Валюта:** Российский рубль (₽)
- **Язык интерфейса:** Русский (с возможностью добавления других языков)
- **Форматы:** Даты в формате ДД.ММ.ГГГГ, время 24ч

### 💸 Модель платежей (централизованная с автоматическим распределением)

#### Как работает Т-Касса Мультирасчеты:
1. **Клиент оплачивает бронирование** через приложение
2. **Автоматическое распределение:**
   - 85-90% → на счет клуба (мгновенно)
   - 10-15% → комиссия платформы
3. **Поддержка разных получателей:**
   - Клубы (юрлица и ИП)
   - Самозанятые тренеры
   - Физлица (для открытых игр)
4. **Безопасная сделка:**
   - Холдирование до подтверждения
   - Автоматические возвраты при отмене

### Технологический стек
**Клиентское приложение:**
- **Платформы:** iOS, Android (Flutter)  
- **Backend:** Firebase (Firestore, Auth, Cloud Functions)
- **Платежи:** Т-Касса с Мультирасчетами (Тинькофф)
- **Уведомления:** Firebase Cloud Messaging

**Админ-панель для клубов:**
- **Платформа:** Веб-приложение (React.js/Vue.js)
- **Hosting:** Firebase Hosting
- **Backend:** Тот же Firebase проект  

## 🎨 Дизайн-система (УЖЕ ГОТОВА)

### Цветовая палитра
```dart
class AppColors {
  static const Color primary = Color(0xFF00D632);        // Основной зеленый
  static const Color primaryLight = Color(0xFFD1FAE5);   // Светло-зеленый
  static const Color primaryDark = Color(0xFF065F46);    // Темно-зеленый
  
  static const Color dark = Color(0xFF1A1F36);          // Основной темный
  static const Color gray = Color(0xFF6B7280);          // Серый
  static const Color lightGray = Color(0xFF9CA3AF);     // Светло-серый
  static const Color extraLightGray = Color(0xFFE5E7EB); // Очень светло-серый
  static const Color background = Color(0xFFF8F9FA);     // Фон
  static const Color white = Color(0xFFFFFFFF);         // Белый
}
```

### Типографика
```dart
class AppTextStyles {
  static const TextStyle h1 = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w700,
    color: AppColors.dark,
  );
  
  static const TextStyle h2 = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w700,
    color: AppColors.dark,
  );
  
  static const TextStyle body = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    color: AppColors.dark,
  );
}
```

## 📂 Структура проекта

```
sports_booking_app/
├── lib/
│   ├── core/
│   │   └── theme/
│   │       ├── colors.dart      # Цветовая палитра
│   │       ├── text_styles.dart # Стили текста
│   │       └── spacing.dart     # Размеры и отступы
│   ├── screens/
│   │   ├── home_screen.dart          # Главный экран
│   │   ├── court_detail_screen.dart  # Детали корта
│   │   ├── time_selection_screen.dart # Выбор времени
│   │   ├── game_type_screen.dart     # Выбор типа игры
│   │   ├── create_open_game_screen.dart # Создание открытой игры
│   │   ├── find_game_screen.dart     # Поиск игр
│   │   ├── payment_screen.dart       # Оплата
│   │   ├── my_bookings_screen.dart   # Мои бронирования
│   │   └── profile_screen.dart       # Профиль
│   └── main.dart                # Точка входа
```

## 📱 Мобильное приложение (ТОЛЬКО для клиентов, НЕТ веб-версии)

### Экраны приложения (9 экранов)

### 1. home_screen.dart - Главный экран
- Приветствие: "Привет, [Имя]! Найдём корт для игры?"
- Кнопка уведомлений (справа вверху)
- Строка поиска
- Фильтры: вид спорта, расстояние, цена
- Список кортов (карточки с тенью)
- Быстрые действия внизу

**Onboarding при первом запуске:**
- Экран 1: "Добро пожаловать! Бронируйте корты в один клик"
- Экран 2: "Находите партнёров для игры"
- Экран 3: "Начните с регистрации по номеру телефона"

### 2. court_detail_screen.dart - Детали корта
- Фотогалерея
- Название, адрес, рейтинг
- Описание
- Удобства (иконки)
- Расписание и цены
- Кнопка "Забронировать"

### 3. time_selection_screen.dart - Выбор времени
- Календарь
- Сетка времени (слоты по 30 мин)
- Цветовая индикация: зеленый - свободно, серый - занято
- Выбор длительности
- Итоговая цена

### 4. game_type_screen.dart - Выбор типа игры
- Одиночная игра
- Парная игра
- Открытая игра (найти партнеров)
- Тренировка

### 5. create_open_game_screen.dart - Создание открытой игры
- Уровень игры (начинающий/любитель/профи)
- Количество игроков
- Описание
- Разделение стоимости

### 6. find_game_screen.dart - Поиск игр
- Список открытых игр
- Фильтры по уровню и времени
- Карточки с организатором, временем, стоимостью

### 7. payment_screen.dart - Оплата
- Детали бронирования
- Выбор способа оплаты:
  - Банковская карта
  - Т-Pay (Тинькофф)
  - SberPay
  - СБП (Система быстрых платежей)
  - Google Pay / Apple Pay
- Сохраненные карты
- Добавление новой карты
- Промокод
- Информация о распределении:
  - Сумма клубу: X руб
  - Комиссия сервиса: Y руб
- Кнопка "Оплатить"

### 8. my_bookings_screen.dart - Мои бронирования
- Вкладки: Предстоящие / История
- QR-код для входа
- Информация о бронировании
- Кнопка отмены

### 9. profile_screen.dart - Профиль
- Фото и имя
- Уровень игры
- Статистика
- Настройки
- Способы оплаты
- Выход

## 🔥 Firebase структура

### Разделение аутентификации
- **Клиенты:** Firebase Auth с телефоном (SMS)
- **Админы клубов:** Firebase Auth с email/паролем
- Разные коллекции для хранения профилей (users/ и admins/)
- Клиенты не имеют доступа к админским коллекциям

### Firestore коллекции:
```
users/
  - uid
  - displayName
  - phoneNumber
  - photoURL
  - playerLevel (beginner, amateur, pro)
  - gamesPlayed
  - hoursOnCourt
  - favoriteVenues[]
  - fcmToken
  - platform (iOS/Android)
  - appVersion
  - installedAt
  - lastActiveAt
  - createdAt

venues/
  - name
  - address
  - location (GeoPoint)
  - photos[]
  - rating
  - sports[] (tennis, padel, badminton)
  - amenities[] (shower, parking, cafe)
  - workingHours{}
  - description
  - paymentEnabled (boolean)
  - paymentRecipientId (ID получателя в Т-Касса)
  - commissionPercent (процент клубу: 85-90)

courts/
  - venueId
  - name
  - sport
  - type (indoor/outdoor)
  - pricePerHour
  - pricePerHalfHour
  - minBookingDuration
  - maxBookingDuration
  - isActive

bookings/
  - userId
  - venueId
  - courtId
  - date
  - startTime
  - endTime
  - gameType (single, double, open, training)
  - status (pending, confirmed, cancelled)
  - totalPrice
  - paymentId
  - players[] (for open games)
  - qrCode
  - source (app/admin) // источник создания
  - createdAt

openGames/
  - organizerId
  - bookingId
  - playerLevel
  - playersNeeded
  - playersJoined[]
  - description
  - pricePerPlayer
  - status (open, full, completed)
  - paymentStatus {
      organizerPaid: boolean,
      playersPayments: [], // массив платежей участников
      refunds: [] // массив возвратов
    }

payments/
  - userId
  - bookingId
  - amount
  - currency
  - status
  - paymentMethod
  - tkassaPaymentId
  - splitDetails {
      venueAmount: number,
      platformFee: number,
      venuePercent: number
    }
  - createdAt
```

### Правила безопасности Firestore
```javascript
// Клиенты могут читать только публичную информацию
match /venues/{venue} {
  allow read: if request.auth != null;
}

// Админы могут управлять только своим клубом
match /venues/{venue} {
  allow write: if request.auth != null && 
    exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.venueId == venue;
}

// Клиенты не имеют доступа к админским коллекциям
match /admins/{document=**} {
  allow read, write: if false;
}
```

### Cloud Functions:
```javascript
// Бронирование
exports.createBooking
exports.cancelBooking
exports.checkSlotAvailability

// Открытые игры
exports.joinOpenGame
exports.leaveOpenGame
exports.notifyGameParticipants

// Платежи (Т-Касса Мультирасчеты)
exports.createPayment // Создание платежа с автораспределением
exports.confirmPayment // Подтверждение платежа
exports.processWebhook // Обработка webhook от Т-Касса
exports.refundPayment // Автоматический возврат с распределением
exports.updateSplitRules // Обновление правил распределения

// Уведомления
exports.sendBookingReminder
exports.sendGameNotification

// Scheduled
exports.dailyBookingReminders
exports.cleanupExpiredBookings
```

## 🚀 Команды для начала разработки

```bash
# 1. Создание проекта
flutter create sports_booking_app --org com.sportsapp
cd sports_booking_app

# 2. Установка Firebase CLI
npm install -g firebase-tools
firebase login

# 3. Инициализация Firebase
firebase init
# Выбрать: Firestore, Functions, Hosting, Storage

# 4. Настройка Flutter Firebase
flutterfire configure

# 5. Добавление зависимостей
flutter pub add firebase_core
flutter pub add firebase_auth
flutter pub add cloud_firestore
flutter pub add firebase_storage
flutter pub add firebase_messaging
flutter pub add provider
flutter pub add go_router
flutter pub add intl
flutter pub add cached_network_image
flutter pub add table_calendar
flutter pub add qr_flutter
flutter pub add flutter_svg
flutter pub add google_fonts
flutter pub add shimmer
flutter pub add flutter_animate
# Пакет для Т-Касса пока в разработке, использовать WebView или API

# 6. Настройка iOS (в папке ios/)
pod install

# Настройка для Т-Касса iOS:
# - Добавить URL Scheme: tkassa-{your-app-id}
# - Настроить App Transport Security
# - Добавить в Info.plist разрешения для T-Pay

# 7. Настройка Android
# - Минимальная версия SDK: 21
# - Добавить в AndroidManifest.xml:
#   - Intent filters для возврата из T-Pay
#   - Разрешения для интернета

# 7. Запуск проекта
flutter run

# 8. Настройка Т-Касса Мультирасчеты
# - Зарегистрироваться на tbank.ru/kassa/
# - Подключить тариф "Мультирасчеты"
# - Получить API ключи (publicKey, secretKey)
# - Настроить вебхуки для уведомлений
# - Настроить правила распределения платежей
# 
# Тестовые карты Т-Касса:
# - 4111 1111 1111 1111 - успешный платеж
# - 4000 0000 0000 0002 - отклонение платежа
# - 3530 1113 3330 0000 - JCB карта
```

## 📋 Порядок разработки

### Этап 1: Базовая настройка (3-4 дня)
1. Создать проект Flutter
2. Настроить Firebase
3. Создать файлы дизайн-системы:
   - `lib/core/theme/colors.dart`
   - `lib/core/theme/text_styles.dart`
   - `lib/core/theme/spacing.dart`
4. Базовая навигация с go_router

### Этап 2: Аутентификация (3-4 дня)
1. Firebase Auth с телефоном
2. SMS верификация
3. Экран создания профиля
4. Сохранение в Firestore

### Этап 3: Главная и поиск (1 неделя)
1. home_screen.dart
2. Компонент CourtCard
3. court_detail_screen.dart
4. Поиск и фильтры

### Этап 4: Бронирование (1 неделя)
1. time_selection_screen.dart
2. game_type_screen.dart
3. Логика проверки доступности
4. Создание бронирования

### Этап 5: Открытые игры (1 неделя)
1. create_open_game_screen.dart
2. find_game_screen.dart
3. Присоединение к играм
4. Уведомления участникам

### Этап 6: Платежи (5-6 дней)
1. payment_screen.dart
2. Интеграция Т-Касса Мультирасчеты
3. Настройка автоматического распределения
4. Тестирование split-платежей
5. Холдирование и возвраты

### Этап 7: Профиль и бронирования (3-4 дня)
1. my_bookings_screen.dart
2. profile_screen.dart
3. QR-коды
4. История

### Этап 8: Уведомления (3-4 дня)
1. FCM настройка
2. Push-уведомления
3. In-app уведомления
4. Напоминания

## 🎯 Ключевые функции

1. **Два режима бронирования:**
   - Обычное бронирование
   - Открытые игры с поиском партнеров

2. **Уровни игроков:**
   - Начинающий
   - Любитель
   - Профессионал

3. **Социальные функции:**
   - Поиск партнеров по уровню
   - Чат в открытых играх
   - Рейтинги и отзывы

4. **Удобная оплата:**
   - Сохранение карт
   - Автоматическое разделение стоимости
   - Возврат при отмене

## 🎨 UI компоненты для создания

```dart
// Основная кнопка
class PrimaryButton extends StatelessWidget {
  final String text;
  final VoidCallback onPressed;
  
  const PrimaryButton({
    required this.text,
    required this.onPressed,
  });
  
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(8),
          child: Center(
            child: Text(
              text,
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// Карточка корта
Widget _buildCourtCard({
  required String name,
  required String address,
  required String price,
}) {
  return Container(
    margin: EdgeInsets.only(bottom: 16),
    padding: EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: AppColors.white,
      borderRadius: BorderRadius.circular(12),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withOpacity(0.05),
          blurRadius: 5,
          offset: Offset(0, 2),
        ),
      ],
    ),
    child: Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(name, style: AppTextStyles.body.copyWith(
              fontWeight: FontWeight.w700,
            )),
            Text(price, style: AppTextStyles.body.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.w700,
            )),
          ],
        ),
        // Остальное содержимое
      ],
    ),
  );
}
```

## 📝 Важные моменты

1. **Нет веб-версии для клиентов** - только мобильное приложение
2. **Т-Касса Мультирасчеты** - автоматическое распределение платежей между клубами и платформой
3. **Начни с простого** - сначала базовая функциональность, потом усложняй
4. **Используй готовую дизайн-систему** - цвета и стили уже определены
5. **Тестируй на обеих платформах** - iOS и Android
6. **Следи за производительностью** - кешируй изображения, оптимизируй запросы
7. **Безопасность Firestore** - настрой правила доступа
8. **Разделение ролей** - клиенты и админы не пересекаются
9. **Прозрачность платежей** - клиент видит, сколько идет клубу и платформе

## 💼 Веб админ-панель (ТОЛЬКО для клубов, НЕ для клиентов)

### ⚠️ Разделение доступа
- Админ-панель доступна ТОЛЬКО сотрудникам клубов
- Клиенты НЕ МОГУТ войти в админ-панель
- У клиентов и админов разные системы аутентификации
- Клиенты бронируют ТОЛЬКО через мобильное приложение

### Технологический стек админки
- **Frontend:** React.js или Vue.js
- **Hosting:** Firebase Hosting
- **Auth:** Firebase Auth (отдельные аккаунты для админов)
- **Database:** Тот же Firestore
- **UI:** Material-UI или Ant Design

### Роли пользователей админки
1. **Суперадмин** - управление всеми клубами (для владельцев платформы)
2. **Админ клуба** - полный доступ к своему клубу
3. **Менеджер** - ограниченный доступ (только бронирования)

### Экраны админ-панели

#### 1. Авторизация
- Вход по email/паролю
- Двухфакторная аутентификация
- Восстановление пароля

#### 2. Dashboard (Главная)
- Статистика за сегодня/неделю/месяц
- График загрузки кортов
- Доходы
- Последние бронирования
- Количество активных клиентов (скачавших приложение)
- QR-код и ссылки для скачивания приложения
- Быстрые действия

#### 3. Управление клубом
- Информация о клубе (название, адрес, описание)
- Загрузка фотографий
- Расписание работы
- Контактная информация
- Удобства (душ, парковка, кафе)
- **Настройка получателя платежей:**
  - Тип организации (ООО/ИП/Самозанятый)
  - Банковские реквизиты
  - Процент получения (85-90%)
  - Статус верификации
- Промо-материалы (постеры с QR для скачивания приложения)
- Инструкции для клиентов по установке приложения

#### 4. Управление кортами
- Список кортов
- Добавление/редактирование корта
- Типы спорта для каждого корта
- Настройка цен (будни/выходные, часы пик)
- Временное закрытие корта
- Расписание обслуживания

#### 5. Управление бронированиями
- Календарный вид всех бронирований
- Фильтры по корту/дате/статусу
- Создание бронирования вручную (для клиентов без приложения - с пометкой)
- **Платежи при ручном бронировании:**
  - Наличная оплата в клубе
  - Перевод на счет клуба
  - Пометка "оплачено вне системы"
- Отмена бронирования
- Блокировка времени (турниры, обслуживание)
- Статистика источников бронирований (приложение/админка)
- Экспорт в Excel

#### 6. Управление ценами
- Базовые цены за час
- Динамическое ценообразование
- Скидки и промокоды
- Абонементы
- Праздничные тарифы
- Корпоративные тарифы
- **Налоговые настройки:**
  - НДС (для ООО/ИП)
  - УСН настройки
  - Автоматический расчет налогов для самозанятых
- B2B платежи (счета для юрлиц)

#### 7. Клиенты
- База всех клиентов клуба (только те, кто скачал приложение)
- Поиск по имени/телефону
- История бронирований клиента
- Дата установки приложения
- Последняя активность
- Черный список
- Постоянные клиенты (VIP)
- Отправка push-уведомлений через приложение
- Экспорт базы

#### 8. Финансы
- Доходы по периодам (с учетом автораспределения)
- Статистика по кортам
- Отчеты для бухгалтерии
- История выплат от Т-Касса
- Детализация по каждой транзакции:
  - Общая сумма платежа
  - Сумма клубу
  - Комиссия платформы
  - Комиссия Т-Касса
- Возвраты и отмены
- Выгрузка для 1С
- Акты сверки

#### 9. Маркетинг
- Создание промокодов
- Push-уведомления клиентам (через приложение)
- Email рассылки с призывом скачать приложение
- QR-коды для скачивания приложения
- Специальные предложения
- Анализ эффективности
- Статистика установок приложения

#### 10. Настройки
- Пользователи админки
- Роли и права доступа
- Интеграции:
  - Т-Касса Мультирасчеты (настройка получателя)
  - SMS-провайдер
  - Email-сервис
- Правила распределения платежей:
  - Процент клубу (85-90%)
  - Минимальная комиссия платформы
- Банковские реквизиты клуба
- Уведомления админам

### Функциональные требования админки

#### Работа с клиентами без приложения
- Возможность создать бронирование вручную
- Регистрация клиента по телефону в админке
- Отправка SMS с ссылкой на скачивание приложения
- Отслеживание конверсии в установки

#### Управление расписанием
- Drag & drop для перемещения бронирований
- Массовое создание слотов
- Повторяющиеся бронирования
- Блокировка на техобслуживание

#### Аналитика и отчеты
- Загрузка по дням недели и часам
- Популярные время бронирования
- Средний чек
- Коэффициент отмен
- Экспорт отчетов в PDF/Excel

#### Интеграции
- Синхронизация с бухгалтерией
- SMS-шлюзы для уведомлений
- Email-сервисы
- Т-Касса Мультирасчеты для автоматического распределения платежей
- Генерация QR-кодов для скачивания приложения
- Ссылки на App Store и Google Play

### Промо-материалы для клубов
- Готовые постеры с QR-кодом для печати
- Наклейки "Забронируйте через приложение"
- Инструкции для администраторов
- Шаблоны email для клиентов
- Тексты SMS с ссылками на магазины приложений

### Процесс подключения клуба к платежам:
1. **Регистрация клуба в админке**
2. **Заполнение данных получателя:**
   - Для ООО/ИП: ИНН, расчетный счет
   - Для самозанятых: ИНН, привязка к "Мой налог"
   - Для физлиц: паспортные данные
3. **Верификация в Т-Касса** (1-2 дня)
4. **Настройка процента распределения** (85-90% клубу)
5. **Тестовый платеж**
6. **Активация приема платежей**

### Сценарии использования

#### Клиент с приложением:
1. Скачивает приложение → Регистрируется → Бронирует → Приходит с QR-кодом

#### Клиент без приложения (в клубе):
1. Администратор создает бронирование в админке
2. Регистрирует клиента по телефону
3. Отправляет SMS с ссылкой на приложение
4. Для следующего визита клиент уже использует приложение

#### Промо-кампания клуба:
1. Размещает QR-коды в клубе
2. Раздает флаеры с инструкцией
3. Отправляет email существующим клиентам
4. Предлагает скидку за первое бронирование через приложение

#### Особенности платежей для открытых игр:
1. **Организатор создает игру** и оплачивает полную стоимость
2. **Присоединяющиеся игроки** оплачивают свою часть
3. **Автоматическое распределение:**
   - Возврат организатору его доли
   - Оплата клубу полной суммы
   - Удержание комиссии платформы
4. **При отмене игры** - автоматический возврат всем участникам

### Дизайн админки
- Минималистичный интерфейс
- Адаптивный дизайн (работа с планшета)
- Темная/светлая тема
- Быстрая навигация
- Графики и визуализация данных

### База данных для админки

```
admins/
  - uid
  - email
  - name
  - role (superadmin, admin, manager)
  - venueId (null for superadmin)
  - permissions[]
  - lastLogin
  - twoFactorEnabled
  - paymentVerification {
      status: (pending, verified, rejected),
      verifiedAt: timestamp,
      rejectReason: string
    }

venueSettings/
  - venueId
  - pricing{
      weekday: {},
      weekend: {},
      peakHours: []
    }
  - bookingRules{
      minAdvanceBooking: hours,
      maxAdvanceBooking: days,
      cancellationDeadline: hours
    }
  - paymentSettings{
      tkassaAccountId: string,
      splitPercent: number, // процент клубу (85-90%)
      accountType: string, // company/individual/selfemployed
      paymentMethods: [], // enabled payment methods
    }
  - notificationSettings{}

promocodes/
  - code
  - venueId
  - discount (percent or fixed)
  - validFrom
  - validUntil
  - usageLimit
  - usedCount
  - conditions{}

venuePromoMaterials/
  - venueId
  - appStoreLink
  - playStoreLink
  - qrCodeUrl
  - posterTemplates[]
  - instructionText

analytics/
  - venueId
  - date
  - bookingsCount
  - bookingsFromApp // через приложение
  - bookingsFromAdmin // через админку
  - revenue
  - averageBookingDuration
  - popularTimeSlots[]
  - cancellationRate
  - newAppInstalls // новые установки
  - activeUsers // активные пользователи
```

### Примерный интерфейс админки

```javascript
// Структура React компонентов
src/
├── components/
│   ├── Layout/
│   │   ├── Sidebar.js
│   │   ├── Header.js
│   │   └── Footer.js
│   ├── Dashboard/
│   │   ├── StatsCards.js
│   │   ├── RevenueChart.js
│   │   └── BookingsTable.js
│   ├── Courts/
│   │   ├── CourtsList.js
│   │   ├── CourtForm.js
│   │   └── PricingTable.js
│   └── Bookings/
│       ├── Calendar.js
│       ├── BookingModal.js
│       └── BookingsList.js
├── pages/
│   ├── Login.js
│   ├── Dashboard.js
│   ├── Courts.js
│   ├── Bookings.js
│   ├── Customers.js
│   ├── Finance.js
│   └── Settings.js
└── services/
    ├── firebase.js
    ├── auth.js
    └── api.js
```

### Команды для создания админки

```bash
# Создание React приложения
npx create-react-app admin-panel
cd admin-panel

# Установка зависимостей
npm install firebase
npm install react-router-dom
npm install @mui/material @emotion/react @emotion/styled
npm install recharts
npm install react-big-calendar
npm install xlsx
npm install react-hook-form

# Или с Vue.js
npm create vue@latest admin-panel
cd admin-panel
npm install firebase
npm install vue-router
npm install vuetify
npm install vue-chartjs chart.js
npm install @vuepic/vue-datepicker
```

## 🔗 Полезные ссылки

- [FlutterFire документация](https://firebase.flutter.dev/)
- [Flutter packages](https://pub.dev/)
- [Firebase Console](https://console.firebase.google.com/)
- [Т-Касса документация](https://www.tbank.ru/kassa/dev/docs/)
- [Т-Касса Мультирасчеты](https://www.tbank.ru/kassa/industries/marketplace/)
- [Material-UI](https://mui.com/)
- [React Big Calendar](https://github.com/jquense/react-big-calendar)

---

## 🔒 Безопасность и разделение доступа

### Аутентификация:
- **Клиенты**: только через SMS (Firebase Phone Auth)
- **Админы**: только email/пароль + 2FA

### Разделение данных:
- Клиенты видят только публичную информацию о клубах
- Админы видят только данные своего клуба
- Суперадмин видит все данные (для поддержки)

### API endpoints:
- `/api/client/*` - только для мобильного приложения
- `/api/admin/*` - только для веб-админки
- Разные middleware для проверки токенов

## 🏗️ Архитектура решения

**Два независимых приложения:**
1. **Мобильное приложение (Flutter)** - для конечных клиентов
   - Только iOS и Android
   - Нет веб-версии
   - Вход через SMS
   
2. **Веб админ-панель (React/Vue)** - для сотрудников клубов
   - Только веб-версия
   - Нет мобильного приложения
   - Вход через email/пароль

**Общий backend (Firebase)** - единая база данных и API

### 💰 Бизнес-модель платформы

#### Источники дохода:
1. **Комиссия с бронирований** (10-15% с каждого платежа)
2. **Абонентская плата** для премиум функций админки
3. **Дополнительные услуги:**
   - Продвижение в топ списка
   - Расширенная аналитика
   - Интеграции с CRM
   - Брендирование приложения

#### Распределение комиссии:
- **Клуб получает:** 85-90% от платежа
- **Платформа получает:** 10-15%
- **Т-Касса комиссия:** 2% (оплачивает платформа)

### 💰 Преимущества Т-Касса Мультирасчеты для спортивных клубов:
- **Автоматическое распределение платежей** (сплитование)
- **Мгновенные выплаты** клубам и тренерам
- **Поддержка всех типов получателей** (ООО, ИП, самозанятые, физлица)
- **Низкие комиссии** (от 2%)
- **Холдирование платежей** для безопасных сделок
- **СБП с минимальной комиссией** (0.4-0.7%)
- **Подробная отчетность** по каждому платежу
- **API для автоматизации**
- **Поддержка на русском языке**

### Тестирование платежей с Мультирасчетами:
1. **Создать тестовый клуб** в админке
2. **Настроить тестового получателя** в Т-Касса
3. **Проверить сценарии:**
   - Обычное бронирование (100% → клуб минус комиссия)
   - Открытая игра (множественные платежи)
   - Отмена и возврат
   - Частичный возврат
4. **Проверить отчеты** в админке
5. **Webhook уведомления**

---

**Это полное ТЗ для разработки sports_booking_app с клиентским приложением и админ-панелью. Используй его как руководство при работе в Claude Code. Удачи в разработке!**