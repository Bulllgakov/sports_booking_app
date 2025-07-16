# 🔥 Настройка Firebase для Sports Booking App

## Шаг 1: Предварительные требования

✅ **Firebase CLI установлен** (версия 14.10.1)

## Шаг 2: Аутентификация Firebase

### 2.1 Вход в Firebase
```bash
firebase login
```

**Что произойдет:**
1. Откроется браузер с Google аутентификацией
2. Войдите в свой Google аккаунт
3. Дайте разрешение Firebase CLI
4. Вернитесь в терминал

### 2.2 Проверка аутентификации
```bash
./check_firebase_auth.sh
```

Или вручную:
```bash
firebase projects:list
```

Должен показать ваш проект `sports-booking-app`.

## Шаг 3: Создание Firebase проекта (уже выполнено)

✅ **Проект создан в Firebase Console**
- Название: `sports-booking-app`
- Регион: Europe
- Сервисы включены: Authentication, Firestore, Storage

## Шаг 4: Инициализация Firebase в проекте

```bash
cd /Users/bulat/sports_booking_app
firebase init
```

**Выберите следующие сервисы:**
- ✅ Firestore: Configure security rules and indexes files for Firestore
- ✅ Functions: Configure a Cloud Functions directory and its files
- ✅ Hosting: Configure files for Firebase Hosting
- ✅ Storage: Configure a security rules file for Cloud Storage

**Настройки:**
- Project: `sports-booking-app` (созданный проект)
- Firestore rules: `firestore.rules` (по умолчанию)
- Firestore indexes: `firestore.indexes.json` (по умолчанию)
- Functions language: `TypeScript`
- Functions directory: `functions`
- Public directory: `build/web`

## Шаг 5: Настройка Flutter Firebase

```bash
# Установка FlutterFire CLI
dart pub global activate flutterfire_cli

# Настройка Firebase для Flutter
flutterfire configure --project=sports-booking-app
```

**Выберите платформы:**
- ✅ Android
- ✅ iOS
- ✅ Web

## Шаг 6: Включение сервисов в Firebase Console (уже выполнено)

### 5.1 Authentication
1. Перейдите в Authentication → Sign-in method
2. Включите **Phone** authentication
3. Настройте test phone numbers (опционально):
   - +7 123 456 7890 → 123456

### 5.2 Firestore Database
1. Перейдите в Firestore Database
2. Нажмите "Create database"
3. Выберите "Start in test mode" (пока для разработки)
4. Выберите регион: europe-west1

### 5.3 Storage
1. Перейдите в Storage
2. Нажмите "Get started"
3. Выберите тестовый режим
4. Выберите регион: europe-west1

## Шаг 7: Обновление кода приложения

После выполнения `flutterfire configure` обновите `main.dart`:

1. Раскомментируйте import firebase_options.dart в строке 10
2. Раскомментируйте блок инициализации Firebase в строках 16-18

Готовый код будет выглядеть так:

```dart
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'core/navigation/app_router.dart';
import 'core/theme/app_theme.dart';
import 'services/auth_service.dart';
import 'providers/venues_provider.dart';
import 'providers/bookings_provider.dart';
import 'providers/open_games_provider.dart';
import 'firebase_options.dart'; // Раскомментировать эту строку

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Раскомментировать следующие строки:
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  runApp(const SportsBookingApp());
}
```

## Шаг 8: Добавление тестовых данных

Создайте коллекции в Firestore с тестовыми данными:

### venues (коллекция)
```json
{
  "name": "Теннисный корт Олимп",
  "address": "ул. Спортивная, 15",
  "location": {
    "_latitude": 55.7558,
    "_longitude": 37.6176
  },
  "photos": ["https://example.com/court1.jpg"],
  "rating": 4.8,
  "sports": ["tennis"],
  "amenities": ["shower", "parking", "cafe"],
  "workingHours": {
    "monday": "07:00-23:00",
    "tuesday": "07:00-23:00"
  },
  "description": "Профессиональный теннисный корт"
}
```

### courts (коллекция)
```json
{
  "venueId": "venue_id_here",
  "name": "Корт №1",
  "sport": "tennis",
  "type": "outdoor",
  "pricePerHour": 2000,
  "pricePerHalfHour": 1000,
  "minBookingDuration": 30,
  "maxBookingDuration": 180,
  "isActive": true
}
```

## Шаг 9: Настройка правил безопасности

### Firestore Rules (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Anyone can read venues and courts
    match /venues/{document} {
      allow read: if true;
      allow write: if false; // Only admins can write
    }
    
    match /courts/{document} {
      allow read: if true;
      allow write: if false; // Only admins can write
    }
    
    // Users can read/write their own bookings
    match /bookings/{document} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Open games are readable by all, writable by authenticated users
    match /openGames/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Шаг 10: Запуск и тестирование

```bash
# Запуск приложения
flutter run

# Развертывание функций (когда будут готовы)
firebase deploy --only functions

# Развертывание правил
firebase deploy --only firestore:rules
```

## 🎯 Результат

После выполнения всех шагов у вас будет:

- ✅ Настроенный Firebase проект
- ✅ Инициализированное Flutter приложение с Firebase
- ✅ Включенные сервисы (Auth, Firestore, Storage)
- ✅ Тестовые данные в Firestore
- ✅ Работающая аутентификация
- ✅ Настроенные правила безопасности

## 🔧 Troubleshooting

### Если не работает на iOS:
```bash
cd ios
pod install
```

### Если ошибки с зависимостями:
```bash
flutter clean
flutter pub get
```

### Для проверки подключения:
```bash
firebase projects:list
```

---

**После настройки приложение будет полностью функциональным!**