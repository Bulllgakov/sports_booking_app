# 🔧 Исправление ошибки сборки APK

## Проблема
Сборка APK завершается с ошибкой из-за неправильной настройки Firebase и несоответствия package name.

## Решение

### Шаг 1: Настройте Firebase для Android

1. Откройте https://console.firebase.google.com
2. Выберите ваш проект Firebase
3. Нажмите на иконку Android (Добавить приложение)
4. Введите package name: `com.allcourt.app`
5. Скачайте `google-services.json`
6. Поместите файл в папку `/android/app/`

### Шаг 2: Исправьте package name

Выполните эти команды для исправления несоответствия:

```bash
cd /Users/bulat/sports_booking_app

# Исправляем MainActivity.kt
sed -i '' 's/com.example.sports_booking_app/com.allcourt.app/g' android/app/src/main/kotlin/com/example/sports_booking_app/MainActivity.kt

# Переименовываем папки
mv android/app/src/main/kotlin/com/example android/app/src/main/kotlin/com/allcourt
mv android/app/src/main/kotlin/com/allcourt/sports_booking_app android/app/src/main/kotlin/com/allcourt/app
```

### Шаг 3: Переконфигурируйте Firebase

```bash
# Установите FlutterFire CLI если еще не установлен
dart pub global activate flutterfire_cli

# Переконфигурируйте Firebase
flutterfire configure
```

Выберите:
- Ваш Firebase проект
- Платформы: Android и iOS
- Package name должен быть: com.allcourt.app

### Шаг 4: Обновите build.gradle

Откройте `/android/app/build.gradle.kts` и добавьте в секцию plugins:

```kotlin
plugins {
    id("com.android.application")
    id("kotlin-android")
    id("com.google.gms.google-services") // Добавьте эту строку
    id("dev.flutter.flutter-gradle-plugin")
}
```

### Шаг 5: Коммит и пуш изменений

```bash
git add .
git commit -m "Fix: Настройка Firebase и исправление package name для сборки APK"
git push
```

### Шаг 6: Проверьте сборку

1. Откройте https://github.com/Bulllgakov/sports_booking_app/actions
2. Сборка должна запуститься автоматически
3. Дождитесь успешного завершения

## Альтернативное решение (быстрое)

Если нужно срочно получить APK без Firebase:

1. Закомментируйте Firebase в `main.dart`:
```dart
// await Firebase.initializeApp(
//   options: DefaultFirebaseOptions.currentPlatform,
// );
```

2. Создайте простой APK без Firebase:
```bash
flutter build apk --debug --no-tree-shake-icons
```

## Проверка локально

Перед пушем можно проверить сборку локально:
```bash
flutter clean
flutter pub get
flutter build apk --debug
```

Если локально собирается успешно, то и на GitHub Actions тоже соберется.