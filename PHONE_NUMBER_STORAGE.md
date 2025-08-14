# Хранение телефонных номеров в проекте

## Формат хранения

### В базе данных (Firestore)
Телефонные номера хранятся в **нормализованном формате** без лишних символов:
- **Формат:** `79991234567` (только цифры)
- **Префикс:** Всегда начинается с `7` для российских номеров
- **Без символов:** Без пробелов, скобок, дефисов, знака `+`

### Поля в коллекциях

#### Коллекция `bookings`
- `customerPhone` - телефон клиента (новое поле)
- `clientPhone` - телефон клиента (старое поле для обратной совместимости)

#### Коллекция `venues`
- `phone` - контактный телефон клуба

#### Коллекция `sms_auth_codes`
- `phone` - телефон для авторизации по SMS

## Нормализация телефонов

### Функция нормализации (TypeScript/JavaScript)
```typescript
// src/components/CreateBookingModal.tsx
const normalizePhone = (phone: string): string => {
  // Удаляем все нецифровые символы
  let normalized = phone.replace(/\D/g, '')
  
  // Если номер начинается с 8, заменяем на 7
  if (normalized.startsWith('8') && normalized.length === 11) {
    normalized = '7' + normalized.substring(1)
  }
  
  // Если номер не начинается с 7, добавляем
  if (!normalized.startsWith('7')) {
    normalized = '7' + normalized
  }
  
  return normalized
}
```

### Функция нормализации (Cloud Functions)
```typescript
// functions/src/services/authSmsService.ts
private normalizePhone(phone: string): string {
  // Удаляем все нецифровые символы
  let normalized = phone.replace(/\D/g, "")
  
  // Если номер начинается с 8, заменяем на 7
  if (normalized.startsWith("8") && normalized.length === 11) {
    normalized = "7" + normalized.substring(1)
  }
  
  // Если номер не начинается с 7, добавляем
  if (!normalized.startsWith("7")) {
    normalized = "7" + normalized
  }
  
  return normalized
}
```

## Валидация телефонов

### Проверка формата
```typescript
// src/components/CreateBookingModal.tsx
const isValidPhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '')
  return cleanPhone.length >= 10 && cleanPhone.length <= 15
}
```

### Regex для валидации
```typescript
// functions/src/auth/smsAuth.ts
const phoneRegex = /^[\d\s\-()\\+]+$/
```

## Форматирование для отображения

### Функция форматирования
```typescript
// src/pages/public/PaymentErrorPage.tsx
const formatPhone = (phone: string) => {
  if (phone.startsWith('+7')) {
    const digits = phone.replace(/\D/g, '')
    if (digits.length === 11) {
      return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
    }
  }
  return phone
}
```

## Примеры использования

### При создании бронирования
```typescript
// Пользователь вводит: +7 (999) 123-45-67
// Сохраняется в БД: 79991234567

const bookingData = {
  customerPhone: normalizePhone(formData.clientPhone), // 79991234567
  // ... другие поля
}
```

### При поиске клиента
```typescript
// src/pages/admin/CustomersManagement.tsx
// Поиск работает по цифрам телефона
const phoneDigits = searchText.replace(/\D/g, '')
const customerPhoneDigits = customerPhone.replace(/\D/g, '')
const phoneMatch = phoneDigits.length >= 3 && customerPhoneDigits.includes(phoneDigits)
```

### При отправке SMS
```typescript
// functions/src/services/authSmsService.ts
const normalizedPhone = this.normalizePhone(phone) // Нормализуем перед отправкой
const success = await this.smsService.sendSMS(normalizedPhone, message)
```

## Миграция данных

В проекте используются два поля для обратной совместимости:
- **Новые поля:** `customerPhone`, `customerName`, `customerEmail`
- **Старые поля:** `clientPhone`, `clientName`, `clientEmail`

При чтении данных проверяются оба варианта:
```typescript
const customerPhone = booking.customerPhone || booking.clientPhone
const customerName = booking.customerName || booking.clientName
```

## Важные замечания

1. **Всегда нормализуйте** телефон перед сохранением в БД
2. **Используйте единый формат** хранения (только цифры)
3. **Форматируйте только для отображения** пользователю
4. **Поддерживайте обратную совместимость** при чтении данных
5. **Валидируйте** телефон перед сохранением

## Примеры телефонов в системе

| Ввод пользователя | Хранение в БД | Отображение |
|-------------------|---------------|-------------|
| +7 (999) 123-45-67 | 79991234567 | +7 (999) 123-45-67 |
| 8 999 123 45 67 | 79991234567 | +7 (999) 123-45-67 |
| 9991234567 | 79991234567 | +7 (999) 123-45-67 |
| 89991234567 | 79991234567 | +7 (999) 123-45-67 |