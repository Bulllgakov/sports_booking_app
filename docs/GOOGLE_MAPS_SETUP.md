# 🗺️ Настройка Google Maps для приложения "Все Корты"

## 📋 Шаги по настройке

### 1. Получение API ключа Google Maps

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите следующие API:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Places API (опционально для поиска)
   - Directions API (для маршрутов)

4. Создайте API ключ:
   - Перейдите в "APIs & Services" > "Credentials"
   - Нажмите "Create Credentials" > "API Key"
   - Ограничьте ключ для Android и iOS приложений

### 2. Настройка для Android

Обновите файл `/android/app/src/main/AndroidManifest.xml`:

```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="ВАШ_API_КЛЮЧ_ЗДЕСЬ"/>
```

### 3. Настройка для iOS

Обновите файл `/ios/Runner/AppDelegate.swift`:

```swift
GMSServices.provideAPIKey("ВАШ_API_КЛЮЧ_ЗДЕСЬ")
```

### 4. Ограничения API ключа

Для production рекомендуется ограничить ключи:

**Android:**
- Package name: `com.allcourt.sports_booking_app`
- SHA-1 fingerprint вашего signing certificate

**iOS:**
- Bundle ID: `com.allcourt.sportsBookingApp`

### 5. Тестирование

После настройки:
```bash
flutter clean
flutter pub get
flutter run
```

## 🔒 Безопасность

- Никогда не коммитьте API ключи в репозиторий
- Используйте разные ключи для development и production
- Настройте квоты использования в Google Cloud Console

## 💰 Стоимость

Google Maps предоставляет $200 бесплатных кредитов ежемесячно:
- Map loads: 28,500 бесплатно в месяц
- Directions API: 40,000 запросов бесплатно
- Places API: различные лимиты

## 🚨 Важно

Без API ключа карты будут показывать watermark "For development purposes only" и могут не работать корректно.

---

*Документация создана: 18 июля 2025*