# Руководство по миграции форматов дат

## Проблема

В системе используются различные форматы дат, что приводит к проблемам:
- Несоответствие при сравнении дат
- Ошибки при обработке временных зон
- Проблемы с сортировкой и фильтрацией
- Ошибки типа "W.toDate is not a function"

### Текущие форматы дат в системе:
1. **Firestore Timestamp** - рекомендуемый формат
2. **Строки 'yyyy-MM-dd'** - используются в старых бронированиях
3. **Date объекты** - используются в некоторых местах
4. **Числовые timestamps** - миллисекунды с 1970
5. **Объекты {seconds, nanoseconds}** - промежуточный формат

## Решение

Миграция всех дат к единому формату **Firestore Timestamp**.

## Перед началом миграции

### 1. Создайте резервную копию базы данных

```bash
# Экспорт данных Firestore
gcloud firestore export gs://sports-booking-app-backup/$(date +%Y%m%d_%H%M%S)
```

### 2. Проверьте текущее состояние

```bash
cd functions
npm run migrate:dates:check
```

Эта команда покажет:
- Какие коллекции содержат даты
- Какие форматы используются
- Есть ли несоответствия

## Выполнение миграции

### Шаг 1: Компиляция миграции

```bash
cd functions
npm run build
```

### Шаг 2: Запуск миграции

```bash
npm run migrate:dates:run
```

Миграция выполнит:
1. Сканирование всех коллекций
2. Преобразование дат в Timestamp
3. Обновление документов батчами (по 400)
4. Создание записи о выполненной миграции

### Шаг 3: Проверка статуса

```bash
npm run migrate:dates:status
```

## Затрагиваемые коллекции и поля

### bookings
- `date` - дата бронирования
- `createdAt` - дата создания
- `updatedAt` - дата обновления
- `cancelledAt` (опционально)
- `paymentCompletedAt` (опционально)
- `refundedAt` (опционально)

### venues
- `createdAt`
- `updatedAt`
- `lastPaymentAt` (опционально)

### subscriptions
- `startDate`
- `endDate` (опционально)
- `trialEndDate` (опционально)
- `nextBillingDate` (опционально)
- `createdAt`
- `updatedAt`

### invoices
- `createdAt`
- `updatedAt`
- `paidAt` (опционально)
- `period.start` (опционально)
- `period.end` (опционально)

### payments
- `createdAt`
- `completedAt` (опционально)
- `failedAt` (опционально)

### trainers
- `createdAt`
- `updatedAt`

### admins
- `createdAt`
- `lastLogin` (опционально)
- `updatedAt` (опционально)

### customers
- `createdAt`
- `lastVisit` (опционально)

### courts
- `createdAt`
- `updatedAt`

### openGames
- `date`
- `createdAt`
- `updatedAt`
- `cancelledAt` (опционально)

## После миграции

### 1. Проверьте работу системы

- Откройте раздел Финансы
- Проверьте отображение бронирований
- Проверьте фильтры по датам
- Убедитесь, что нет ошибок в консоли

### 2. Обновите код

Все новые даты должны создаваться как Firestore Timestamp:

```typescript
import { Timestamp } from 'firebase/firestore'

// Правильно
const booking = {
  date: Timestamp.fromDate(new Date()),
  createdAt: Timestamp.now()
}

// Неправильно
const booking = {
  date: '2025-01-16',
  createdAt: new Date()
}
```

### 3. Используйте утилиты для работы с датами

```typescript
import { normalizeDateInClubTZ } from '@/utils/clubDateTime'

// Безопасное преобразование любого формата
const date = normalizeDateInClubTZ(dateValue, venue.timezone)
```

## Откат миграции

Откат возможен только через восстановление из резервной копии:

```bash
# Восстановление из backup
gcloud firestore import gs://sports-booking-app-backup/[BACKUP_NAME]
```

## Мониторинг

После миграции следите за:
- Ошибками в логах Functions
- Ошибками в консоли браузера
- Корректностью отображения дат

## Известные проблемы

1. **Временные зоны**: Даты без времени интерпретируются как полночь UTC
2. **Старые бронирования**: Могут иметь смещение на день из-за временных зон
3. **Производительность**: Миграция больших коллекций может занять время

## Поддержка

При возникновении проблем:
1. Проверьте логи: `firebase functions:log`
2. Проверьте статус миграции: `npm run migrate:dates:status`
3. Создайте issue в репозитории с описанием проблемы

## Автоматизация

Для автоматического запуска миграции при деплое добавьте в CI/CD:

```yaml
- name: Check and run migrations
  run: |
    cd functions
    npm run build
    npm run migrate:dates:status || npm run migrate:dates:run
```