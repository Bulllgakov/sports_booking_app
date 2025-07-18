# Дизайн-система Sports Booking App

## 🎨 Обзор

Дизайн-система для приложения Sports Booking App создана с учетом современных принципов Material Design и адаптирована под спортивную тематику. Основной акцент сделан на яркий зеленый цвет, который ассоциируется со спортом и активностью.

## 🎨 Цветовая палитра

### Основные цвета

| Название | HEX | Использование |
|----------|-----|---------------|
| Primary | `#00D632` | Основной бренд-цвет, кнопки CTA, активные элементы |
| Primary Light | `#D1FAE5` | Фоны, светлые акценты |
| Primary Dark | `#065F46` | Темные акценты, тексты на светлом фоне |

### Нейтральные цвета

| Название | HEX | Использование |
|----------|-----|---------------|
| Dark | `#1A1F36` | Основной текст, заголовки |
| Gray | `#6B7280` | Второстепенный текст, иконки |
| Light Gray | `#9CA3AF` | Подписи, неактивные элементы |
| Extra Light Gray | `#E5E7EB` | Разделители, фоны |
| Background | `#F8F9FA` | Основной фон приложения |
| White | `#FFFFFF` | Карточки, модальные окна |

### Семантические цвета

| Название | HEX | Использование |
|----------|-----|---------------|
| Error | `#EF4444` | Ошибки, отмены |
| Warning | `#F59E0B` | Предупреждения, рейтинги |
| Success | `#10B981` | Успешные действия, подтверждения |
| Info | `#3B82F6` | Информационные сообщения |

## 📝 Типографика

### Шрифт
Используется Google Fonts - **Inter** для всего приложения.

### Стили текста

#### Заголовки
- **H1**: 24px, Bold (700), `#1A1F36`
- **H2**: 20px, Bold (700), `#1A1F36`
- **H3**: 18px, SemiBold (600), `#1A1F36`

#### Основной текст
- **Body**: 16px, Regular (400), `#1A1F36`
- **Body Small**: 14px, Regular (400), `#6B7280`
- **Caption**: 12px, Regular (400), `#9CA3AF`

#### Специальные
- **Button**: 16px, SemiBold (600), `#FFFFFF`
- **Link**: 16px, Medium (500), `#00D632`, underline

## 📐 Отступы и размеры

### Базовые отступы
- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px
- **xxl**: 48px
- **xxxl**: 64px

### Радиусы скругления
- **Radius XS**: 4px - чипы, маленькие элементы
- **Radius SM**: 8px - кнопки, поля ввода
- **Radius MD**: 12px - карточки
- **Radius LG**: 16px - модальные окна
- **Radius XL**: 24px - большие карточки
- **Radius Round**: 100px - круглые элементы

### Размеры иконок
- **Icon XS**: 16px - маленькие иконки в тексте
- **Icon SM**: 20px - иконки в списках
- **Icon MD**: 24px - стандартные иконки
- **Icon LG**: 32px - большие иконки
- **Icon XL**: 48px - иконки в пустых состояниях

### Высота элементов
- **Button Height**: 48px
- **Input Height**: 48px
- **Card Height**: 120px (минимальная)
- **App Bar Height**: 56px

## 🎯 Компоненты

### Кнопки

#### Primary Button
```dart
ElevatedButton(
  style: ElevatedButton.styleFrom(
    backgroundColor: AppColors.primary,
    foregroundColor: AppColors.white,
    minimumSize: Size(120, 48),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(8),
    ),
  ),
  onPressed: () {},
  child: Text('Забронировать'),
)
```

#### Outlined Button
```dart
OutlinedButton(
  style: OutlinedButton.styleFrom(
    foregroundColor: AppColors.primary,
    side: BorderSide(color: AppColors.primary),
    minimumSize: Size(120, 48),
  ),
  onPressed: () {},
  child: Text('Отмена'),
)
```

### Карточки
- Белый фон
- Скругление 12px
- Тень: `boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 5, offset: Offset(0, 2))]`
- Отступ внутри: 16px

### Поля ввода
- Высота: 48px
- Скругление: 8px
- Граница: 1px `#E5E7EB`
- При фокусе: 2px `#00D632`
- Фон: белый

### Чипы и бейджи
- Скругление: 100px
- Отступы: 8px горизонтально, 4px вертикально
- Фон: цвет с opacity 0.1
- Текст: основной цвет

## 🎨 Состояния элементов

### Активное
- Цвет: Primary (`#00D632`)
- Для текста: Bold weight

### Неактивное
- Цвет: Light Gray (`#9CA3AF`)
- Opacity: 0.6

### Hover (для веб)
- Увеличение яркости на 10%
- Добавление тени

### Pressed
- Уменьшение яркости на 10%
- Scale: 0.98

## 📱 Адаптивность

### Breakpoints
- Mobile: < 600px
- Tablet: 600px - 1024px
- Desktop: > 1024px

### Отступы по краям экрана
- Mobile: 16px
- Tablet: 24px
- Desktop: 32px

## 🌗 Темная тема (планируется)

В будущем планируется добавление темной темы со следующими изменениями:
- Background: `#0F0F0F`
- Card background: `#1A1A1A`
- Primary остается `#00D632` для контраста

## 📏 Сетка

Используется 12-колоночная сетка с отступами:
- Gutter: 16px на мобильных, 24px на планшетах

## 🎯 Принципы дизайна

1. **Консистентность** - одинаковые элементы выглядят одинаково
2. **Иерархия** - важные элементы выделены размером и цветом
3. **Доступность** - контраст текста минимум 4.5:1
4. **Простота** - минимум декоративных элементов
5. **Отзывчивость** - приятная анимация и feedback

---

Эта дизайн-система обеспечивает единообразный и профессиональный вид приложения Sports Booking App на всех платформах.