# Инструкция по сборке APK для "Все Корты"

## Требования
1. Установите Android Studio с https://developer.android.com/studio
2. При первом запуске установите Android SDK

## Сборка APK

### 1. Откройте терминал в папке проекта:
```bash
cd /Users/bulat/sports_booking_app
```

### 2. Проверьте Flutter:
```bash
flutter doctor
```

### 3. Соберите debug APK:
```bash
flutter build apk --debug
```

### 4. Соберите release APK (меньший размер):
```bash
flutter build apk --release
```

## Где найти APK
После успешной сборки APK файл будет находиться в:
- Debug: `build/app/outputs/flutter-apk/app-debug.apk`
- Release: `build/app/outputs/flutter-apk/app-release.apk`

## Установка на телефон
1. Скопируйте APK файл на телефон
2. Разрешите установку из неизвестных источников в настройках безопасности
3. Откройте APK файл на телефоне и установите

## Альтернатива - запуск через USB
1. Включите режим разработчика на телефоне
2. Включите отладку по USB
3. Подключите телефон к компьютеру
4. Запустите: `flutter run`

## Текущая конфигурация приложения
- Название: Все Корты
- Package name: com.allcourt.app
- Версия: 1.0.0
- Firebase: настроен и готов к работе