# 📋 TODO: Задачи для завершения MVP "Все Корты"

## 🚨 Критические задачи (Блокируют запуск)

### 1. Геолокация и карты (5-7 дней)
- [ ] Добавить зависимости в pubspec.yaml:
  ```yaml
  geolocator: ^13.0.2
  geocoding: ^3.0.1
  yandex_mapkit: ^4.1.0
  permission_handler: ^11.3.1
  ```
- [ ] Создать `lib/screens/map_screen.dart`
- [ ] Создать `lib/core/services/location_service.dart`
- [ ] Создать `lib/core/services/map_service.dart`
- [ ] Реализовать секцию "Рядом с вами" в home_screen
- [ ] Добавить определение и отображение города пользователя
- [ ] Настроить Яндекс MapKit API ключи
- [ ] Добавить поле `city` в VenueModel и UserModel
- [ ] Обновить Firebase rules для геолокации

### 2. Платежная система Т-Касса (4-5 дней)
- [ ] Создать аккаунт Т-Касса Мультирасчеты
- [ ] Получить API ключи (publicKey, secretKey)
- [ ] Создать Cloud Functions для платежей:
  - [ ] `createPayment`
  - [ ] `confirmPayment`
  - [ ] `processWebhook`
  - [ ] `refundPayment`
- [ ] Обновить payment_screen.dart с реальной интеграцией
- [ ] Добавить поля в модели для платежей
- [ ] Настроить webhook endpoints
- [ ] Реализовать автоматическое распределение (95.5% клубу)

### 3. Cloud Functions базовые (3-4 дня)
```bash
cd /Users/bulat/sports_booking_app
firebase init functions
# Выбрать TypeScript
```
- [ ] Создать функции для бронирований:
  - [ ] `createBooking`
  - [ ] `cancelBooking`
  - [ ] `checkSlotAvailability`
- [ ] Создать функции для открытых игр:
  - [ ] `joinOpenGame`
  - [ ] `leaveOpenGame`
  - [ ] `notifyGameParticipants`
- [ ] Настроить scheduled функции:
  - [ ] `dailyBookingReminders`
  - [ ] `cleanupExpiredBookings`

### 4. Обновление моделей данных (1-2 дня)
- [ ] VenueModel:
  ```dart
  String? city;
  Map<String, dynamic>? logo;
  bool paymentEnabled;
  String? paymentRecipientId;
  double commissionPercent;
  ```
- [ ] UserModel:
  ```dart
  Map<String, dynamic>? location;
  int gamesPlayed;
  int hoursOnCourt;
  List<String> favoriteVenues;
  String? fcmToken;
  ```
- [ ] BookingModel:
  ```dart
  String? qrCode;
  String source; // 'app' или 'admin'
  ```
- [ ] Обновить Firestore сервисы

## 🎯 Важные задачи (Нужны для полноценной работы)

### 5. Логотип и брендирование (2-3 дня)
- [ ] Создать логотип "Все Корты" в SVG
- [ ] Создать `lib/widgets/logo/allcourts_logo.dart`
- [ ] Добавить зависимости:
  ```yaml
  flutter_svg: ^2.0.10
  flutter_launcher_icons: ^0.14.2
  ```
- [ ] Сгенерировать иконки приложения
- [ ] Добавить функционал загрузки логотипов клубов в админке
- [ ] Создать Cloud Function `processVenueLogo`

### 6. Доработка админ-панели (5-7 дней)
- [ ] Создать страницу Финансы (`Finance.tsx`)
- [ ] Создать страницу Маркетинг (`Marketing.tsx`)
- [ ] Создать страницу Настройки (`Settings.tsx`)
- [ ] Добавить компонент загрузки логотипа (`LogoUploader.tsx`)
- [ ] Реализовать настройку получателя платежей
- [ ] Добавить экспорт в Excel:
  ```bash
  npm install xlsx react-hook-form qrcode recharts
  ```
- [ ] Создать календарный вид бронирований
- [ ] Добавить генерацию QR-кодов

### 7. Push-уведомления (2-3 дня)
- [ ] Настроить Firebase Cloud Messaging
- [ ] Добавить запрос разрешений в приложении
- [ ] Создать функции отправки уведомлений
- [ ] Реализовать напоминания о бронированиях
- [ ] Добавить in-app уведомления

### 8. QR-коды для бронирований (1-2 дня)
- [ ] Добавить `qr_flutter: ^4.1.0`
- [ ] Генерировать QR при создании бронирования
- [ ] Отображать QR в my_bookings_screen
- [ ] Добавить сканер QR в админке (опционально)

## 📦 Дополнительные улучшения

### 9. Анимации и полировка UI (2-3 дня)
- [ ] Добавить `flutter_animate: ^4.5.0`
- [ ] Добавить `shimmer: ^3.0.0`
- [ ] Анимировать переходы между экранами
- [ ] Добавить скелетоны загрузки
- [ ] Полировка UI компонентов

### 10. Оптимизация и тестирование (3-4 дня)
- [ ] Настроить правила безопасности Firestore
- [ ] Оптимизировать запросы к базе
- [ ] Добавить кеширование изображений
- [ ] Написать unit тесты для критических функций
- [ ] Провести тестирование на iOS и Android

### 11. Подготовка к релизу (2-3 дня)
- [ ] Настроить GitHub Actions для CI/CD
- [ ] Подготовить сборки для App Store и Google Play
- [ ] Создать landing page на allcourt.ru
- [ ] Подготовить документацию для клубов
- [ ] Настроить аналитику (Firebase Analytics)

## 🔧 Команды для начала работы

```bash
# 1. Обновить зависимости Flutter
cd /Users/bulat/sports_booking_app
flutter pub add geolocator geocoding yandex_mapkit permission_handler qr_flutter flutter_svg google_fonts shimmer flutter_animate

# 2. Создать Cloud Functions
firebase init functions
cd functions
npm install

# 3. Обновить зависимости React
npm install xlsx react-hook-form qrcode recharts react-big-calendar

# 4. Запустить в режиме разработки
# Terminal 1: Flutter
flutter run

# Terminal 2: Admin panel
npm run dev:admin

# Terminal 3: Functions emulator (когда будут готовы)
cd functions && npm run serve
```

## 📊 Оценка времени

| Блок задач | Время | Приоритет |
|------------|-------|-----------|
| Геолокация и карты | 5-7 дней | Критический |
| Платежная система | 4-5 дней | Критический |
| Cloud Functions | 3-4 дня | Критический |
| Модели данных | 1-2 дня | Критический |
| Брендирование | 2-3 дня | Высокий |
| Админ-панель | 5-7 дней | Высокий |
| Push-уведомления | 2-3 дня | Средний |
| QR-коды | 1-2 дня | Средний |
| **ИТОГО MVP** | **~25-30 дней** | - |

## ✅ Критерии готовности MVP

1. [ ] Пользователь может найти ближайшие корты
2. [ ] Пользователь может забронировать корт
3. [ ] Пользователь может оплатить бронирование
4. [ ] Пользователь может создать/найти открытую игру
5. [ ] Администратор может управлять клубом
6. [ ] Платежи автоматически распределяются
7. [ ] Работают push-уведомления
8. [ ] QR-код для входа на корт

---

*Создано: 16 июля 2025*