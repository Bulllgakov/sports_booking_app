# Все Корты - Техническое задание

## 🏗️ Архитектура системы

```
┌─────────────────────┐     ┌─────────────────────┐
│   КЛИЕНТЫ           │     │   КЛУБЫ             │
│                     │     │                     │
│ 📱 Mobile App Only  │     │ 💻 Web Admin Only   │
│   "Все Корты"       │     │ allcourt.ru/admin   │
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
                  │ 955₽→Клуб  │
                  │  45₽→Комиссия│
                  └───────────┘
```

## 📋 Общая информация

**Название проекта:** Все Корты (AllCourt)  
**Домен:** allcourt.ru  
**Админ-панель:** allcourt.ru/admin  

### Миссия платформы:
Сделать бронирование спортивных кортов простым и доступным для всех, предоставив клубам бесплатные современные инструменты управления.

**Слоган:** "Все корты города в твоем смартфоне"

### Описание платформы:

**Для клиентов (B2C):**  
Мобильное приложение для бронирования спортивных кортов (теннис, падел, бадминтон) с функцией поиска партнеров для игры

**Для клубов (B2B):**  
Бесплатная платформа для клубов по паделу, теннису и бадминтону для управления бронированиями и клиентами

### ⚠️ ВАЖНО: Разделение платформ
- **Клиенты:** ТОЛЬКО мобильное приложение (iOS/Android на Flutter)
- **Клубы:** ТОЛЬКО веб админ-панель
- **Веб-версии для клиентов НЕТ** - бронирование возможно только через приложение
- Клиент обязан скачать приложение для бронирования кортов

### 🌐 Экосистема AllCourt
- **allcourt.ru** - лендинг с информацией о платформе
- **allcourt.ru/admin** - вход для клубов
- **allcourt.ru/app** - ссылки на скачивание приложения
- **allcourt.ru/help** - центр помощи

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
   - 95.5% → на счет клуба (мгновенно)
   - 4.5% → комиссия (2% платформа + 2.5% эквайринг)
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
- **Платежи:** Т-Касса с Мультирасчетами (Тинькофф Касса)
- **Карты:** Яндекс MapKit
- **Уведомления:** Firebase Cloud Messaging

**Админ-панель для клубов:**
- **Платформа:** Веб-приложение (React.js/Vue.js)
- **Hosting:** Firebase Hosting (allcourt.ru/admin)
- **Backend:** Тот же Firebase проект  

## 🎨 Дизайн-система (УЖЕ ГОТОВА)

### Логотип "Все Корты"
```dart
// Логотип представляет собой стилизованный корт в зеленом квадрате
// Основной цвет: #00A86B (зеленый)
// SVG код сохранить в: assets/logo/allcourts_logo.svg
```

**Визуальное описание логотипа:**
- Зеленый квадрат с закругленными углами (#00A86B)
- Белые линии, формирующие теннисный корт
- Минималистичный и узнаваемый дизайн
- Адаптивен для разных размеров

**Использование логотипа:**
```dart
// Импорт виджета логотипа
import 'package:allcourt/widgets/logo/allcourts_logo.dart';

// Примеры использования
AllCourtsLogo(size: 60), // Стандартный размер
AllCourtsLogo(
  size: 120,
  backgroundColor: AppColors.padel, // Синий для падела
),
AnimatedAllCourtsLogo(size: 120), // С анимацией появления
```

### Цветовая палитра
```dart
class AppColors {
  // Основные цвета бренда
  static const Color primary = Color(0xFF00A86B);        // Зеленый (из логотипа)
  static const Color primaryDark = Color(0xFF007A4D);    // Темно-зеленый
  static const Color primaryLight = Color(0xFF33C18A);   // Светло-зеленый
  
  // Цвета для видов спорта
  static const Color tennis = Color(0xFF00A86B);         // Зеленый
  static const Color padel = Color(0xFF2E86AB);          // Синий
  static const Color badminton = Color(0xFFFF6B6B);      // Красный
  
  // UI цвета
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
  // Используем системные шрифты для лучшей читаемости
  static const String fontFamily = 'SF Pro Display'; // iOS
  // Для Android будет использоваться Roboto
  
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
  
  static const TextStyle caption = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: AppColors.gray,
  );
}
```

## 📂 Структура проекта

```
allcourt/
├── design/
│   ├── logo/
│   │   ├── allcourts_logo.svg
│   │   ├── example_venues/
│   │   │   ├── smartpadel_logo.png
│   │   │   └── venue_logo_template.sketch
│   │   └── app_icons/
│   ├── figma_export/
│   ├── colors.md
│   ├── typography.md
│   └── components.md
├── lib/
│   ├── core/
│   │   ├── theme/
│   │   │   ├── colors.dart      # Цветовая палитра
│   │   │   ├── text_styles.dart # Стили текста
│   │   │   └── spacing.dart     # Размеры и отступы
│   │   └── services/
│   │       ├── location_service.dart  # Работа с геолокацией
│   │       └── map_service.dart       # Интеграция с Яндекс MapKit
│   ├── widgets/
│   │   ├── logo/
│   │   │   ├── allcourts_logo.dart # Виджет логотипа платформы
│   │   │   └── venue_logo.dart     # Виджет логотипа клуба
│   │   └── cards/
│   │       └── venue_card.dart     # Карточка клуба с логотипом
│   ├── screens/
│   │   ├── home_screen.dart          # Главный экран
│   │   ├── court_detail_screen.dart  # Детали корта
│   │   ├── time_selection_screen.dart # Выбор времени
│   │   ├── game_type_screen.dart     # Выбор типа игры
│   │   ├── create_open_game_screen.dart # Создание открытой игры
│   │   ├── find_game_screen.dart     # Поиск игр
│   │   ├── payment_screen.dart       # Оплата
│   │   ├── my_bookings_screen.dart   # Мои бронирования
│   │   ├── map_screen.dart           # Карта кортов
│   │   └── profile_screen.dart       # Профиль
│   └── main.dart                # Точка входа
├── assets/
│   ├── logo/
│   │   └── allcourts_logo.svg
│   ├── images/
│   └── icons/
├── admin_panel/                 # Веб-админка на allcourt.ru/admin
└── firebase.json
```

## 📱 Мобильное приложение (ТОЛЬКО для клиентов, НЕТ веб-версии)

### Экраны приложения (10 экранов)

### 1. home_screen.dart - Главный экран
- Логотип "Все Корты" в верхней части
- Приветствие: "Привет, [Имя]!"
- **Определенный город** под именем (например: "📍 Москва")
  - Автоматически определяется по геолокации
  - Можно изменить вручную
- Подзаголовок: "Найдём корт для игры?"
- Кнопка уведомлений (справа вверху)
- **Секция "Рядом с вами":**
  - Автоматическое определение геопозиции
  - Показ 3-5 ближайших клубов
  - Расстояние до каждого клуба
  - Кнопка "Показать на карте"
- Строка поиска
- Фильтры: вид спорта, расстояние, цена
- Список всех кортов (карточки с тенью)
- Быстрые действия внизу

**Onboarding при первом запуске:**
- Экран 1: "Добро пожаловать в Все Корты! Бронируйте корты в один клик"
- Экран 2: "Находите партнёров для игры"
- Экран 3: "Разрешите доступ к геолокации для показа ближайших кортов"
- Экран 4: "Начните с регистрации по номеру телефона"

### 2. court_detail_screen.dart - Детали корта
- **Заголовок с логотипом клуба** (или текстовый placeholder)
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
- Информация о комиссии (прозрачно):
  - Сумма клубу: 955₽ (при платеже 1000₽)
  - Комиссия сервиса: 45₽ (4.5%)
- Кнопка "Оплатить"

### 8. my_bookings_screen.dart - Мои бронирования
- Вкладки: Предстоящие / История
- **Карточка бронирования с логотипом клуба**
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

### 10. map_screen.dart - Карта кортов
- **Интерактивная карта** (Яндекс MapKit)
- **Текущее местоположение** пользователя (синяя точка)
- **Маркеры клубов:**
  - Зеленые для тенниса
  - Синие для падела
  - Красные для бадминтона
  - Мини-логотип клуба на маркере
- **При нажатии на маркер:**
  - Всплывающая карточка клуба
  - Название, адрес, расстояние
  - Рейтинг и цена
  - Кнопка "Подробнее"
- **Кнопки управления:**
  - Центрировать на моем местоположении
  - Переключение на список
  - Фильтры
- **Радиус поиска** (полупрозрачный круг)

## 📍 Функционал геолокации "Рядом с вами"

### Как работает определение ближайших клубов:

#### 1. **Запрос разрешений и определение города**
```dart
// При первом запуске или при нажатии на "Показать рядом"
class LocationService {
  static Future<bool> requestLocationPermission() async {
    final status = await Permission.location.request();
    return status == PermissionStatus.granted;
  }
  
  static Future<Position?> getCurrentLocation() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      // Предложить включить геолокацию
      return null;
    }
    
    final position = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
    
    // Определение города через reverse geocoding
    await _updateUserCity(position);
    
    return position;
  }
  
  static Future<void> _updateUserCity(Position position) async {
    final placemarks = await placemarkFromCoordinates(
      position.latitude,
      position.longitude,
    );
    
    if (placemarks.isNotEmpty) {
      final city = placemarks.first.locality ?? placemarks.first.administrativeArea;
      // Сохраняем город в профиль пользователя
      await FirebaseFirestore.instance
        .collection('users')
        .doc(currentUserId)
        .update({
          'location': {
            'city': city,
            'lastKnownPosition': GeoPoint(position.latitude, position.longitude),
            'updatedAt': FieldValue.serverTimestamp(),
          }
        });
    }
  }
}
```

#### 2. **Интеграция с Яндекс MapKit**
```dart
// Инициализация Яндекс MapKit
class MapService {
  static Future<void> initializeMapKit() async {
    await YandexMapkit.setup(apiKey: 'YOUR_YANDEX_MAPKIT_API_KEY');
  }
  
  static Widget buildMap({
    required List<Venue> venues,
    required Position userPosition,
  }) {
    return YandexMap(
      onMapCreated: (YandexMapController controller) {
        // Добавляем маркер пользователя
        controller.addPlacemark(
          Placemark(
            mapId: MapObjectId('user_location'),
            point: Point(
              latitude: userPosition.latitude,
              longitude: userPosition.longitude,
            ),
            style: PlacemarkStyle(
              iconName: 'assets/icons/user_location.png',
            ),
          ),
        );
        
        // Добавляем маркеры клубов
        venues.forEach((venue) {
          controller.addPlacemark(
            Placemark(
              mapId: MapObjectId(venue.id),
              point: Point(
                latitude: venue.location.latitude,
                longitude: venue.location.longitude,
              ),
              style: PlacemarkStyle(
                iconName: _getIconForSport(venue.sports.first),
              ),
              onTap: () => _showVenueCard(venue),
            ),
          );
        });
      },
    );
  }
}
```

#### 3. **Расчет расстояний**
```dart
// Функция расчета расстояния между пользователем и клубом
double calculateDistance(
  double userLat, 
  double userLon, 
  double venueLat, 
  double venueLon
) {
  return Geolocator.distanceBetween(
    userLat, userLon, 
    venueLat, venueLon
  ) / 1000; // Конвертация в километры
}

// Форматирование расстояния для отображения
String formatDistance(double distanceKm) {
  if (distanceKm < 1) {
    return '${(distanceKm * 1000).round()} м';
  } else {
    return '${distanceKm.toStringAsFixed(1)} км';
  }
}
```

#### 4. **Firestore запрос с геофильтрацией**
```dart
// Получение клубов в радиусе
Stream<List<Venue>> getNearbyVenues(Position userPosition, double radiusKm) {
  // Firestore не поддерживает прямые geo-запросы,
  // поэтому используем geohash или загружаем все и фильтруем
  
  return FirebaseFirestore.instance
    .collection('venues')
    .snapshots()
    .map((snapshot) {
      final venues = snapshot.docs
        .map((doc) => Venue.fromFirestore(doc))
        .toList();
      
      // Фильтрация по расстоянию
      return venues.where((venue) {
        final distance = calculateDistance(
          userPosition.latitude,
          userPosition.longitude,
          venue.location.latitude,
          venue.location.longitude,
        );
        return distance <= radiusKm;
      }).toList()
        ..sort((a, b) => a.distance.compareTo(b.distance));
    });
}

// Получение клубов по городу (когда геолокация выключена)
Stream<List<Venue>> getVenuesByCity(String city) {
  return FirebaseFirestore.instance
    .collection('venues')
    .where('city', isEqualTo: city)
    .orderBy('rating', descending: true)
    .snapshots()
    .map((snapshot) => snapshot.docs
      .map((doc) => Venue.fromFirestore(doc))
      .toList());
}
```

#### 5. **UI отображение**
```dart
// Виджет секции "Рядом с вами"
class NearbyVenuesSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Рядом с вами', style: AppTextStyles.h2),
            TextButton(
              onPressed: () => Navigator.pushNamed(context, '/map'),
              child: Text('На карте'),
            ),
          ],
        ),
        SizedBox(height: 12),
        Container(
          height: 180,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: nearbyVenues.length,
            itemBuilder: (context, index) {
              final venue = nearbyVenues[index];
              return NearbyVenueCard(
                venue: venue,
                distance: venue.distance,
              );
            },
          ),
        ),
      ],
    );
  }
}
```

#### 6. **Карточка ближайшего клуба**
```dart
class NearbyVenueCard extends StatelessWidget {
  final Venue venue;
  final double distance;
  
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 280,
      margin: EdgeInsets.only(right: 16),
      child: Card(
        child: Column(
          children: [
            // Мини-карта с маркером
            Container(
              height: 100,
              child: Stack(
                children: [
                  // Статичная карта или превью
                  Image.network(
                    'https://static-maps.yandex.ru/...',
                    fit: BoxFit.cover,
                  ),
                  // Расстояние в углу
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        formatDistance(distance),
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Информация о клубе
            Padding(
              padding: EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      // Логотип или заглушка
                      ClubLogo(venue: venue, size: 32),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          venue.name,
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 4),
                  Text(
                    venue.address,
                    style: TextStyle(color: Colors.grey, fontSize: 12),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'от ${venue.minPrice}₽/час',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Row(
                        children: [
                          Icon(Icons.star, size: 16, color: Colors.amber),
                          Text(' ${venue.rating}'),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

### 🏢 Примеры реальных клубов в системе:

#### SmartPadel (с логотипом)
- **Название:** SmartPadel
- **Адрес:** ул. Профсоюзная, 69, Москва
- **Специализация:** Падел
- **Логотип:** Современный минималистичный дизайн
- **Особенности:** 
  - 6 крытых кортов
  - Профессиональное освещение
  - Кафе и pro shop
- **В приложении:** Отображается с фирменным логотипом

#### Теннисный клуб "Олимп" (без логотипа)
- **Название:** Теннисный клуб Олимп
- **Адрес:** Ленинский пр-т, 123, Москва
- **Специализация:** Теннис
- **Логотип:** Не загружен
- **В приложении:** Отображается текст "ТК" в цветном квадрате

### 🎯 Целевая аудитория:

**Клиенты (B2C):**
- Возраст: 25-45 лет
- Активные любители спорта
- Средний и выше доход
- Ценят удобство и экономию времени
- Играют 1-3 раза в неделю

**Клубы (B2B):**
- Частные спортивные клубы
- Муниципальные спортивные центры
- Отдельные корты и площадки
- От 2 до 20+ кортов
- Ищут автоматизацию и новых клиентов

## 🎯 Ключевые преимущества "Все Корты"

### Для клубов:
- ✅ **100% БЕСПЛАТНАЯ платформа**
- ✅ Никаких абонентских платежей
- ✅ Никаких скрытых комиссий
- ✅ Минимальная комиссия в отрасли (всего 4.5%)
- ✅ Полнофункциональная система управления
- ✅ Автоматическое привлечение клиентов
- ✅ Мгновенные выплаты (95.5% от платежа)
- ✅ Интеграция с налоговой (чеки, отчеты)
- ✅ Техподдержка на русском языке

### Для клиентов:
- ✅ Все корты города в одном приложении
- ✅ Поиск партнеров для игры
- ✅ Удобная оплата любым способом
- ✅ QR-код для быстрого входа
- ✅ История всех бронирований
- ✅ Уведомления и напоминания

### 🏆 Конкурентные преимущества:
1. **Единственная БЕСПЛАТНАЯ платформа** (конкуренты берут абонплату)
2. **Минимальная комиссия 4.5%** (у конкурентов от 10%)
3. **Автоматическое распределение платежей** (у других - ручное)
4. **Поддержка всех видов спорта** (теннис + падел + бадминтон)
5. **Поиск партнеров для игры** (социальный элемент)
6. **Простая интеграция** (подключение за 1 день)
7. **Локальная поддержка** (на русском языке)

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
  - location {
      city: string,          // Определенный город
      lastKnownPosition: GeoPoint,
      updatedAt: timestamp
    }
  - installedAt
  - lastActiveAt
  - createdAt

venues/
  - name
  - address
  - city                           // Город расположения
  - location (GeoPoint)
  - photos[]
  - logo {
      url: string,
      uploadedAt: timestamp
    }
  - rating
  - sports[] (tennis, padel, badminton)
  - amenities[] (shower, parking, cafe)
  - workingHours{}
  - description
  - paymentEnabled (boolean)
  - paymentRecipientId (ID получателя в Т-Касса)
  - commissionPercent (процент клубу: 95.5)

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
      venueAmount: number,  // 95.5% от суммы
      platformFee: number,  // 2% от суммы
      acquiringFee: number, // 2.5% от суммы
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

// Клиенты не имеют доступ к админским коллекциям
match /admins/{document=**} {
  allow read, write: if false;
}
```

### Firebase Storage для логотипов
```javascript
// Структура хранения в Storage
venues/
  {venueId}/
    logo/
      original.png    // Оригинальный файл
      thumb_200.png   // Миниатюра 200x200
      thumb_60.png    // Миниатюра 60x60

// Правила Storage
match /venues/{venueId}/logo/{fileName} {
  allow read: if true;  // Публичный доступ к логотипам
  allow write: if request.auth != null && 
    exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.venueId == venueId &&
    request.resource.size < 2 * 1024 * 1024; // Максимум 2MB
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

// Работа с логотипами
exports.processVenueLogo // Создание миниатюр при загрузке
exports.generatePromoMaterials // Генерация промо с логотипом

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
flutter create allcourt --org ru.allcourt
cd allcourt

# 2. Установка Firebase CLI
npm install -g firebase-tools
firebase login

# 3. Инициализация Firebase
firebase init
# Выбрать: Firestore, Functions, Hosting, Storage
# Для Hosting указать папку: admin_panel/build

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
# Пакеты для геолокации и карт
flutter pub add geolocator
flutter pub add geocoding
flutter pub add yandex_mapkit
flutter pub add permission_handler
# Пакет для Т-Касса пока в разработке, использовать WebView или API

# 6. Добавление логотипа и иконок
flutter pub add flutter_launcher_icons
# Конфигурация в pubspec.yaml:
# flutter_icons:
#   android: true
#   ios: true
#   image_path: "assets/logo/launcher_icon.png"
#   adaptive_icon_background: "#00A86B"

# 7. Настройка iOS (в папке ios/)
pod install

# Настройка для Яндекс MapKit iOS:
# - Добавить в Info.plist:
#   <key>YandexMapKitApiKey</key>
#   <string>YOUR_API_KEY</string>

# Настройка для Т-Касса iOS:
# - Добавить URL Scheme: tkassa-allcourt
# - Настроить App Transport Security
# - Добавить в Info.plist разрешения для T-Pay

# 8. Настройка Android
# - Минимальная версия SDK: 21
# - Добавить в AndroidManifest.xml:
#   - Разрешения для геолокации:
#     <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
#     <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
#   - Яндекс MapKit API ключ в meta-data
#   - Intent filters для возврата из T-Pay
#   - Разрешения для интернета
# - Package name: ru.allcourt

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

## 🎨 UI компоненты "Все Корты"

```dart
// Основная кнопка с цветами "Все Корты"
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
        color: AppColors.primary, // #00A86B - зеленый из логотипа
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

1. **Нет веб-версии для клиентов** - только мобильное приложение "Все Корты"
2. **БЕСПЛАТНАЯ платформа для клубов** - никаких платежей за использование
3. **Минимальная комиссия 4.5%** - самая низкая на рынке (2% сервис + 2.5% эквайринг)
4. **Т-Касса Мультирасчеты** - автоматическое распределение платежей между клубами и платформой
5. **Яндекс MapKit** - для карт и определения местоположения
6. **Автоматическое определение города** - показывается под именем пользователя
7. **Брендирование клубов** - каждый клуб может загрузить свой логотип
8. **Начни с простого** - сначала базовая функциональность, потом усложняй
9. **Используй готовую дизайн-систему** - цвета и логотип уже определены
10. **Тестируй на обеих платформах** - iOS и Android
11. **Следи за производительностью** - кешируй изображения и логотипы
12. **Безопасность Firestore** - настрой правила доступа
13. **Разделение ролей** - клиенты и админы не пересекаются
14. **Прозрачность платежей** - клиент видит точную сумму комиссии

## 💼 Веб админ-панель (БЕСПЛАТНО для клубов)

**Адрес:** allcourt.ru/admin

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
- Логотип "Все Корты" в верхнем левом углу
- Статистика за сегодня/неделю/месяц
- График загрузки кортов
- Доходы
- Последние бронирования
- Количество активных клиентов (скачавших приложение)
- QR-код и ссылки для скачивания приложения
- Баннер "Платформа полностью бесплатна! Комиссия всего 4.5%"
- Быстрые действия

#### 3. Управление клубом
- Информация о клубе (название, адрес, описание)
- **Логотип клуба:**
  - Загрузка собственного логотипа (PNG/JPG/SVG)
  - Рекомендуемый размер: 500x500px
  - Максимальный размер файла: 2MB
  - Предпросмотр логотипа
  - Если логотип не загружен - отображается название клуба
- Загрузка фотографий
- Расписание работы
- Контактная информация
- Удобства (душ, парковка, кафе)
- **Настройка получателя платежей:**
  - Тип организации (ООО/ИП/Самозанятый)
  - Банковские реквизиты
  - Фиксированный процент получения (95.5%)
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
  - Сумма клубу (95.5%)
  - Комиссия платформы (2%)
  - Комиссия Т-Касса (2.5%)
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
  - Процент клубу (95.5%)
  - Комиссия платформы (2%)
  - Комиссия эквайринга (2.5%)
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
4. **Автоматическая настройка распределения** (95.5% клубу, 4.5% комиссия)
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
   - Оплата клубу 95.5% от общей суммы
   - Удержание комиссии платформы 4.5%
4. **При отмене игры** - автоматический возврат всем участникам

### Дизайн админки
- Минималистичный интерфейс
- **Брендирование клуба:**
  - Отображение логотипа клуба в хедере админки
  - Если нет логотипа - название клуба
  - Возможность кастомизации цветов (в будущем)
- Адаптивный дизайн (работа с планшета)
- Темная/светлая тема
- Быстрая навигация
- Графики и визуализация данных

### Процесс загрузки логотипа клуба:
1. **В разделе "Управление клубом"** есть блок "Логотип"
2. **Кнопка "Загрузить логотип"** открывает файловый диалог
3. **Требования к логотипу:**
   - Форматы: PNG, JPG, SVG
   - Рекомендуемый размер: 500x500px (квадрат)
   - Максимальный размер файла: 2MB
   - Автоматическая оптимизация при загрузке
4. **Предпросмотр** перед сохранением
5. **Кнопка "Удалить логотип"** для возврата к текстовому отображению

### Отображение логотипа в приложении:
- **Список клубов** - маленький логотип слева (60x60px)
- **Страница клуба** - большой логотип в хедере (120x120px)
- **Подтверждение бронирования** - логотип клуба
- **История бронирований** - мини-логотипы

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
      splitPercent: number, // процент клубу (95.5%)
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
  - posterTemplates[] // Шаблоны с логотипом "Все Корты"
  - instructionText
  - brandAssets[] // Логотипы для использования клубами

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
│   │   ├── Header.js        // Отображает логотип клуба
│   │   └── Footer.js
│   ├── VenueSettings/
│   │   ├── LogoUploader.js  // Компонент загрузки логотипа
│   │   ├── VenueInfo.js
│   │   └── VenuePreview.js  // Превью как выглядит в приложении
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
│   ├── VenueSettings.js  // Страница с загрузкой логотипа
│   ├── Courts.js
│   ├── Bookings.js
│   ├── Customers.js
│   ├── Finance.js
│   └── Settings.js
└── services/
    ├── firebase.js
    ├── auth.js
    ├── storage.js      // Загрузка логотипов в Firebase Storage
    └── api.js

// Пример компонента LogoUploader.js
import React, { useState } from 'react';
import { uploadVenueLogo, deleteVenueLogo } from '../services/storage';

const LogoUploader = ({ venue, onLogoUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(venue.logo?.url);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Проверка размера
    if (file.size > 2 * 1024 * 1024) {
      alert('Файл слишком большой. Максимум 2MB');
      return;
    }

    // Показать превью
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    // Загрузить на сервер
    setUploading(true);
    try {
      const logoUrl = await uploadVenueLogo(venue.id, file);
      onLogoUpdate(logoUrl);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    }
    setUploading(false);
  };

  return (
    <div className="logo-uploader">
      <h3>Логотип клуба</h3>
      
      {preview ? (
        <div className="logo-preview">
          <img src={preview} alt="Логотип" />
          <button onClick={() => deleteVenueLogo(venue.id)}>
            Удалить логотип
          </button>
        </div>
      ) : (
        <div className="logo-placeholder">
          <div className="text-logo">
            {venue.name.split(' ').map(w => w[0]).join('').toUpperCase()}
          </div>
          <p>Логотип не загружен</p>
        </div>
      )}

      <input
        type="file"
        accept="image/png,image/jpeg,image/svg+xml"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      
      <p className="hint">
        Рекомендуемый размер: 500x500px. Максимум 2MB.
      </p>
    </div>
  );
};
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

- [AllCourt.ru](https://allcourt.ru) - основной сайт платформы
- [AllCourt Admin](https://allcourt.ru/admin) - вход для клубов
- [FlutterFire документация](https://firebase.flutter.dev/)
- [Flutter packages](https://pub.dev/)
- [Firebase Console](https://console.firebase.google.com/)
- [Яндекс MapKit для Flutter](https://pub.dev/packages/yandex_mapkit)
- [Яндекс для разработчиков](https://developer.tech.yandex.ru/)
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
1. **Комиссия с бронирований** (всего 4.5%):
   - 2% - комиссия платформы
   - 2.5% - комиссия эквайринга Т-Касса
2. **Премиум функции для клубов** (в будущем):
   - Расширенная аналитика
   - Интеграции с CRM
   - Приоритет в поиске
   - Брендирование

#### Преимущества для клубов:
- **БЕСПЛАТНОЕ подключение и использование**
- **Минимальная комиссия в отрасли (4.5%)**
- **Прозрачная структура комиссии**
- **Бесплатная система управления бронированиями**
- **Автоматизация всех процессов**
- **Привлечение новых клиентов**
- **Никаких скрытых платежей**

#### Распределение платежа (пример на 1000₽):
- **Клуб получает:** 955₽ (95.5%)
- **Комиссия платформы получает:** 20₽ (2%)
- **Т-Касса эквайринг:** 25₽ (2.5%)

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

### 📊 Метрики успеха платформы:
- Количество подключенных клубов
- Количество активных пользователей (MAU)
- Количество бронирований в месяц
- Средний чек бронирования
- Общий объем транзакций (GMV)
- Средний доход с клуба (4.5% от оборота)
- Retention пользователей
- NPS клубов и клиентов
- Конверсия установка → первое бронирование

### Тестирование платежей с Мультирасчетами:
1. **Создать тестовый клуб** в админке
2. **Настроить тестового получателя** в Т-Касса
3. **Проверить сценарии:**
   - Обычное бронирование (платеж 1000₽ → клуб получает 955₽)
   - Открытая игра (множественные платежи)
   - Отмена и возврат
   - Частичный возврат
4. **Проверить отчеты** в админке с точными суммами комиссий
5. **Webhook уведомления**

### 📞 Контакты и поддержка:
- **Email поддержки клубов:** clubs@allcourt.ru
- **Email поддержки клиентов:** support@allcourt.ru
- **Телефон горячей линии:** 8-800-XXX-XX-XX
- **Telegram канал:** @allcourt_ru
- **Время работы поддержки:** 9:00-21:00 МСК

---

**Это полное ТЗ для разработки платформы "Все Корты" (AllCourt) с клиентским приложением и админ-панелью. Используй его как руководство при работе в Claude Code. Удачи в разработке!**