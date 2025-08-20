# Исправление обработки дат бронирований

## Проблема
Бронирования отображались со сдвигом на 1 день назад. Когда клиент бронировал на 17 августа в 9 утра, бронирование могло отображаться на 16 августа из-за некорректной обработки часовых поясов.

## Причина
1. При сохранении даты использовалась функция `stringToDate()`, которая создавала дату в локальном времени браузера
2. При чтении из Firestore использовались UTC компоненты даты, что приводило к сдвигу на день в зависимости от часового пояса

## Решение
Унифицирована работа с датами - все даты бронирований теперь обрабатываются в UTC:

### 1. Сохранение даты (src/utils/dateTime.ts)
```typescript
export function stringToDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  // Создаем дату в UTC (полночь UTC)
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
}
```

### 2. Чтение даты из Firestore (src/utils/clubDateTime.ts)
```typescript
export function normalizeDateInClubTZ(dateValue: any, clubTimezone?: string): Date {
  if (dateValue?.toDate && typeof dateValue.toDate === 'function') {
    // Firestore Timestamp уже хранит точную дату в UTC
    // Просто возвращаем его как есть
    return dateValue.toDate()
  }
  // ...
}
```

### 3. Преобразование в строку (src/utils/dateTime.ts)
```typescript
export function dateToString(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
```

## Ключевой принцип
Дата бронирования - это абсолютная дата в часовом поясе клуба. Когда клиент бронирует на "17 августа", это должно быть именно 17 августа, независимо от часового пояса пользователя или сервера.

## Результат
- Бронирования теперь отображаются на правильные даты
- Нет сдвига дат при просмотре из разных часовых поясов
- Дата бронирования остается неизменной независимо от настроек системы