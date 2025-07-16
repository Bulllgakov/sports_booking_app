#!/bin/bash

echo "🔍 Проверка локальной сборки APK"
echo "================================"

# Проверяем Flutter
echo "📱 Flutter версия:"
flutter --version

# Чистим проект
echo -e "\n🧹 Очистка проекта..."
flutter clean

# Получаем зависимости
echo -e "\n📦 Получение зависимостей..."
flutter pub get

# Пробуем собрать APK с подробным выводом
echo -e "\n🔨 Сборка Debug APK..."
flutter build apk --debug --verbose

# Если не получилось, пробуем без Firebase
if [ $? -ne 0 ]; then
    echo -e "\n❌ Сборка с Firebase не удалась"
    echo "🔧 Пробуем временное решение без Firebase..."
    
    # Создаем временный main.dart без Firebase
    cp lib/main.dart lib/main_backup.dart
    
    cat > lib/main_temp.dart << 'EOF'
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/booking_provider.dart';
import 'providers/venue_provider.dart';
import 'router/app_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Временно отключаем Firebase для тестовой сборки
  // await Firebase.initializeApp(
  //   options: DefaultFirebaseOptions.currentPlatform,
  // );
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => VenueProvider()),
        ChangeNotifierProvider(create: (_) => BookingProvider()),
      ],
      child: MaterialApp.router(
        title: 'Все Корты',
        theme: AppTheme.lightTheme,
        routerConfig: AppRouter.router,
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}
EOF
    
    mv lib/main.dart lib/main_with_firebase.dart
    mv lib/main_temp.dart lib/main.dart
    
    echo "🔨 Сборка без Firebase..."
    flutter build apk --debug --no-tree-shake-icons
    
    # Восстанавливаем оригинальный файл
    mv lib/main.dart lib/main_temp.dart
    mv lib/main_with_firebase.dart lib/main.dart
    
    if [ $? -eq 0 ]; then
        echo -e "\n✅ Сборка без Firebase успешна!"
        echo "📍 APK находится в: build/app/outputs/flutter-apk/app-debug.apk"
        echo -e "\n⚠️  Проблема в конфигурации Firebase"
    fi
fi

echo -e "\n📋 Проверка конфигурации:"
echo "- Package name: com.allcourt.app"
echo "- Min SDK: 21"
echo "- Target SDK: $(grep targetSdk android/app/build.gradle.kts | cut -d'=' -f2 | xargs)"

# Проверяем наличие файлов
echo -e "\n📂 Проверка файлов:"
[ -f "android/app/google-services.json" ] && echo "✅ google-services.json найден" || echo "❌ google-services.json НЕ найден"
[ -f "lib/firebase_options.dart" ] && echo "✅ firebase_options.dart найден" || echo "❌ firebase_options.dart НЕ найден"

echo -e "\n🔧 Возможные решения:"
echo "1. Запустите: flutterfire configure"
echo "2. Проверьте Firebase Console и пересоздайте google-services.json"
echo "3. Убедитесь, что package name везде com.allcourt.app"