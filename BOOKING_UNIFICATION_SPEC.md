# Техническое задание по унификации системы бронирования

## Статусы в системе бронирования

### Статусы бронирования (status)
Отвечают за состояние самого бронирования:

- **`pending`** - Бронирование создано, но не подтверждено (ожидает оплаты или подтверждения админом)
- **`confirmed`** - Бронирование подтверждено и активно
- **`cancelled`** - Бронирование отменено

### Статусы оплаты (paymentStatus)
Отвечают за состояние платежа:

- **`awaiting_payment`** - Ожидает оплаты (по умолчанию для всех новых бронирований)
- **`paid`** - Оплачено
- **`online_payment`** - В процессе онлайн оплаты (не используется в текущей версии)
- **`cancelled`** - Платеж отменен
- **`refunded`** - Произведен возврат

### Комбинации статусов для разных сценариев

#### Онлайн оплата
1. **При создании**: `status: 'pending'` + `paymentStatus: 'awaiting_payment'`
2. **После успешной оплаты**: `status: 'confirmed'` + `paymentStatus: 'paid'`
3. **При отмене (таймаут 10 мин)**: `status: 'cancelled'` + `paymentStatus: 'cancelled'`

#### Наличные/Карта на месте/Перевод
1. **При создании админом**: `status: 'confirmed'` + `paymentStatus: 'awaiting_payment'`
2. **После получения оплаты**: `status: 'confirmed'` + `paymentStatus: 'paid'`
3. **При отмене**: `status: 'cancelled'` + `paymentStatus: 'cancelled'`

### Логика заморозки слотов
Слот считается занятым в календаре если:
- `status === 'confirmed'` ИЛИ
- `paymentStatus === 'paid'` ИЛИ
- `paymentStatus === 'awaiting_payment'`

Это обеспечивает заморозку слота на время ожидания оплаты (10 минут для онлайн, без ограничения для других способов).

## Обзор текущей ситуации

В проекте бронирования осуществляются в 3-х местах:
1. **Календарь бронирования в админке** - поддерживает все способы оплаты, но без онлайн оплаты
2. **Веб страница бронирования** - только 100% онлайн оплата
3. **Мобильное приложение** - только 100% онлайн оплата

## Анализ различий

### 1. Календарь бронирования в админке (BookingsManagement.tsx + CreateBookingModal.tsx)

**Структура данных бронирования:**
```typescript
{
  id: string
  courtId: string
  courtName: string
  clientName: string          // основное поле
  clientPhone: string         // основное поле
  customerName?: string       // для совместимости
  customerPhone?: string      // для совместимости
  date: Date | string         // может быть как Date, так и string
  time?: string              // для совместимости со старыми записями
  startTime: string
  endTime: string
  duration: number           // в минутах
  status: 'confirmed' | 'pending' | 'cancelled'
  amount: number
  paymentMethod: 'cash' | 'card_on_site' | 'transfer' | 'online'
  paymentStatus?: 'awaiting_payment' | 'paid' | 'online_payment' | 'cancelled'
  paymentHistory?: PaymentHistory[]
  createdBy?: {...}
  venueId: string
  venueName: string
  createdAt: Date
  source: 'admin'
  gameType: 'single'
}
```

**Особенности:**
- Поддержка 4 способов оплаты: наличные, карта в клубе, перевод, онлайн
- Бронирование создается сразу со статусом 'confirmed'
- Нет интеграции с платежными системами
- Есть история изменений платежей
- Поддержка дублирующих полей для совместимости

### 2. Веб страница бронирования (BookingPaymentPage.tsx)

**Структура данных бронирования:**
```typescript
{
  courtId: string
  courtName: string
  venueId: string
  venueName: string
  date: string               // всегда string формат 'yyyy-MM-dd'
  startTime: string
  endTime: string
  duration: number           // в минутах
  gameType: string
  playersCount: number
  totalPrice: number
  pricePerPlayer: number
  customerName: string       // основное поле
  customerPhone: string      // основное поле
  customerEmail: string | null
  status: 'pending' | 'confirmed'
  paymentStatus: 'pending' | 'paid' | 'error' | 'not_required'
  paymentId?: string
  paymentUrl?: string
  paymentProvider?: string
  createdAt: Date
  updatedAt: Date
}
```

**Особенности:**
- Только онлайн оплата через платежные системы
- Бронирование создается со статусом 'pending'
- Подтверждается только после успешной оплаты
- Интеграция с YooKassa через Cloud Functions
- Поддержка открытых игр

### 3. Мобильное приложение (simple_booking_form_screen.dart)

**Структура данных бронирования:**
```typescript
{
  venueId: string
  venueName: string
  courtId: string
  courtName: string
  date: string              // ISO формат
  dateString: string        // форматированная дата
  time: string
  startTime: string
  endTime: string
  duration: number          // в минутах
  gameType: string
  customerName: string      // основное поле
  customerPhone: string     // основное поле
  customerEmail: string | null
  price: number
  pricePerPlayer: number
  playersCount: number
  userId: string
  openGameId?: string       // для присоединения к открытым играм
}
```

**Особенности:**
- Только онлайн оплата
- Переход на отдельный экран оплаты
- Проверка включенных платежей для клуба
- Поддержка открытых игр и присоединения к ним

## Проблемы несоответствия

1. **Различные наименования полей:**
   - `clientName`/`clientPhone` vs `customerName`/`customerPhone`
   - `amount` vs `totalPrice` vs `price`
   - Дублирование полей для совместимости

2. **Различные форматы даты:**
   - Date объект vs string формат
   - Отсутствие единого подхода

3. **Различная логика создания:**
   - Админка: сразу confirmed без оплаты
   - Веб/мобильное: pending до оплаты

4. **Различные способы оплаты:**
   - Админка: 4 способа
   - Веб/мобильное: только онлайн

5. **Отсутствие полей в некоторых системах:**
   - `source` - только в админке
   - `paymentHistory` - только в админке
   - `openGameId` - только в веб/мобильном

## Требования к унификации

### 1. Единая структура данных

```typescript
interface UnifiedBooking {
  // Основные идентификаторы
  id: string
  venueId: string
  venueName: string
  courtId: string
  courtName: string
  
  // Информация о клиенте (единые названия)
  customerName: string      // использовать везде вместо clientName
  customerPhone: string     // использовать везде вместо clientPhone
  customerEmail?: string
  userId?: string           // ID пользователя если авторизован
  
  // Дата и время (единый формат)
  date: string             // всегда string в формате 'yyyy-MM-dd'
  startTime: string        // формат 'HH:mm'
  endTime: string          // формат 'HH:mm'
  duration: number         // всегда в минутах
  
  // Тип игры
  gameType: 'single' | 'open' | 'open_join'
  playersCount?: number    // для открытых игр
  openGameId?: string      // для присоединения к открытой игре
  
  // Финансовая информация (единые названия)
  totalPrice: number       // общая стоимость
  pricePerPlayer?: number  // цена за игрока для открытых игр
  
  // Платежная информация
  paymentMethod: 'cash' | 'card_on_site' | 'transfer' | 'online'
  paymentStatus: 'awaiting_payment' | 'pending' | 'paid' | 'error' | 'not_required'
  paymentId?: string
  paymentUrl?: string
  paymentProvider?: string
  
  // Статус бронирования
  status: 'pending' | 'confirmed' | 'cancelled'
  
  // Метаданные
  source: 'admin' | 'web' | 'mobile'
  createdAt: Timestamp
  updatedAt?: Timestamp
  createdBy?: {
    userId: string
    userName: string
    userRole?: string
  }
  paymentHistory?: Array<{
    timestamp: Timestamp
    action: string
    userId: string
    userName?: string
    note?: string
  }>
}
```

### 2. Единая логика создания бронирования

1. **Для всех источников:**
   - Использовать единые названия полей
   - Сохранять `source` для отслеживания источника создания
   - Всегда сохранять дату как string в формате 'yyyy-MM-dd'
   - Всегда указывать duration в минутах

2. **Логика по способам оплаты:**
   - **Онлайн оплата:** status = 'pending', paymentStatus = 'pending', подтверждение после оплаты
   - **Другие способы:** status = 'confirmed', paymentStatus = 'awaiting_payment'

3. **Обратная совместимость:**
   - При чтении поддерживать старые поля (clientName, amount, date как Timestamp)
   - При записи всегда использовать новые поля

### 3. Изменения по системам

#### Админка (BookingsManagement.tsx + CreateBookingModal.tsx):
1. Переименовать `clientName`/`clientPhone` в `customerName`/`customerPhone`
2. Переименовать `amount` в `totalPrice`
3. Всегда сохранять дату как string
4. Добавить поддержку онлайн оплаты с переходом на платежную страницу
5. Убрать дублирующие поля после миграции данных

#### Веб страница (BookingPaymentPage.tsx):
1. Добавить поле `source: 'web'`
2. Добавить поддержку других способов оплаты (опционально)
3. Унифицировать названия полей согласно спецификации

#### Мобильное приложение (simple_booking_form_screen.dart):
1. Добавить поле `source: 'mobile'`
2. Использовать единый формат даты (убрать dateString)
3. Переименовать `price` в `totalPrice`
4. Добавить поддержку других способов оплаты (опционально)

### 4. План миграции

1. **Фаза 1 - Подготовка:**
   - Обновить все системы для чтения как старых, так и новых полей
   - Добавить логирование для отслеживания использования старых полей

2. **Фаза 2 - Миграция данных:**
   - Скрипт миграции существующих бронирований
   - Переименование полей в базе данных
   - Конвертация дат в единый формат

3. **Фаза 3 - Обновление кода:**
   - Обновить создание бронирований во всех системах
   - Использовать только новые поля
   - Добавить валидацию данных

4. **Фаза 4 - Очистка:**
   - Удалить поддержку старых полей
   - Удалить дублирующий код

### 5. Валидация данных

Все системы должны валидировать:
- Формат телефона
- Формат email (если указан)
- Даты не в прошлом
- Корректность времени (startTime < endTime)
- Наличие обязательных полей

### 6. Тестирование

1. Создание бронирования во всех системах
2. Проверка совместимости между системами
3. Проверка отображения бронирований созданных в разных системах
4. Проверка платежных сценариев
5. Проверка миграции старых данных

## Приоритеты реализации

1. **Высокий приоритет:**
   - Унификация названий полей
   - Единый формат даты
   - Добавление поля source

2. **Средний приоритет:**
   - Интеграция онлайн оплаты в админку
   - Миграция существующих данных

3. **Низкий приоритет:**
   - Добавление альтернативных способов оплаты в веб/мобильное
   - Расширенная история изменений