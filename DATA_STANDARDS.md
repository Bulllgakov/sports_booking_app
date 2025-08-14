# Стандарты работы с данными в проекте Sports Booking App

## 📅 Формат даты

### Текущая ситуация (ПРОБЛЕМА):
- **В Firestore**: дата хранится как **строка** формата `'yyyy-MM-dd'` (например: '2024-03-15')
- **В React компонентах**: используется как `Date` объект
- **В типах TypeScript**: смешанные типы - где-то `string`, где-то `Date`
- **При передаче между компонентами**: часто происходят ошибки преобразования

### Рекомендуемый стандарт:
1. **В Firestore**: хранить как `Timestamp` (нативный тип Firestore)
2. **В TypeScript интерфейсах**: использовать `Date` 
3. **При отображении**: форматировать через утилиты
4. **При вводе от пользователя**: конвертировать в `Date` сразу при получении

## ⏰ Формат времени бронирования

### Текущая ситуация:
Система использует **ОБА подхода одновременно**, что создает путаницу:

1. **Подход с startTime + endTime**:
   - `startTime: string` (формат: 'HH:mm', например: '10:00')
   - `endTime: string` (формат: 'HH:mm', например: '11:30')
   - Используется в: BookingDetailsModal, BookingsList, большинство интерфейсов

2. **Подход с startTime + duration**:
   - `time: string` или `startTime: string` (формат: 'HH:mm')
   - `duration: number` (в минутах, например: 90)
   - Используется в: CreateBookingModal (форма создания), расчет цены

### Проблемы текущего подхода:
- **Дублирование данных**: в bookingData сохраняется и `endTime`, и `duration`
- **Несогласованность**: duration хранится в минутах (90), но в форме вводится в часах (1.5)
- **Конфликты**: при изменении duration нужно пересчитывать endTime и наоборот

### Рекомендуемый стандарт:

#### Вариант 1: startTime + duration (РЕКОМЕНДУЕТСЯ)
```typescript
interface Booking {
  date: Date,           // Дата бронирования
  startTime: string,    // Время начала 'HH:mm'
  duration: number,     // Длительность в минутах
  // endTime вычисляется при необходимости
}
```

**Преимущества**:
- Проще изменять длительность
- Нет рассинхронизации данных
- Легче рассчитывать цену (цена за час * часы)

#### Вариант 2: startTime + endTime
```typescript
interface Booking {
  date: Date,           // Дата бронирования
  startTime: string,    // Время начала 'HH:mm'
  endTime: string,      // Время окончания 'HH:mm'
  // duration вычисляется при необходимости
}
```

**Преимущества**:
- Понятнее для пользователя
- Не нужны вычисления при отображении

## 🔄 План миграции

### Фаза 1: Стандартизация даты
1. Создать утилиты конвертации:
   - `stringToDate(dateString: string): Date`
   - `dateToString(date: Date): string`
   - `timestampToDate(timestamp: Timestamp): Date`

2. Обновить все интерфейсы на использование `Date`

3. При сохранении в Firestore конвертировать в `Timestamp`

### Фаза 2: Стандартизация времени
1. Выбрать единый подход (рекомендуется startTime + duration)

2. Создать утилиты:
   - `calculateEndTime(startTime: string, duration: number): string`
   - `calculateDuration(startTime: string, endTime: string): number`

3. Обновить все компоненты на единый стандарт

4. Мигрировать существующие данные в Firestore

## 📝 Примеры использования

### Сохранение бронирования:
```typescript
const bookingData = {
  venueId: venueId,
  courtId: courtId,
  date: Timestamp.fromDate(selectedDate),  // Date -> Timestamp
  startTime: '10:00',                       // Строка времени
  duration: 90,                             // Минуты
  // ... остальные поля
}
```

### Получение бронирования:
```typescript
const booking = {
  ...docData,
  date: docData.date.toDate(),              // Timestamp -> Date
  endTime: calculateEndTime(docData.startTime, docData.duration)
}
```

### Отображение:
```typescript
<span>{format(booking.date, 'dd MMMM yyyy')}</span>
<span>{booking.startTime} - {booking.endTime}</span>
```

## ⚠️ Критические места в коде

1. **CreateBookingModal.tsx:696** - дата сохраняется как строка
2. **BookingDetailsModal.tsx:78-102** - сложная логика преобразования дат
3. **BookingModal.tsx** - использует строковые даты для запросов
4. **functions/src/booking/** - серверные функции ожидают определенный формат

## 🎯 Цель
Единообразие и предсказуемость работы с датами и временем во всем приложении, минимизация ошибок преобразования типов.