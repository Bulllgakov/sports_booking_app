# Руководство по SMS интеграции - Все Корты

## Обзор

Система SMS уведомлений интегрирована с сервисом SMS.RU и поддерживает отправку уведомлений на всех этапах работы с бронированиями.

## Настройка

### 1. Конфигурация SMS.RU

API ключ хранится в Firestore:
```
Collection: settings
Document: sms
Fields:
  - smsruApiId: "410846D5-E996-04BE-F3D7-B2C88E1A7C6C"
  - provider: "smsru"
  - testMode: false
```

### 2. Управление шаблонами

Шаблоны SMS доступны в админ-панели:
**Системные настройки → SMS настройки → Шаблоны SMS**

Все шаблоны ограничены 70 символами и поддерживают переменные.

## Типы SMS уведомлений

### 1. Подтверждение бронирования
- **Когда отправляется**: После успешной оплаты
- **Шаблон**: `Бронирование подтверждено! {venue}, {date} в {time}`
- **Переменные**: 
  - `{venue}` - название площадки
  - `{date}` - дата игры (формат: "15 янв")
  - `{time}` - время начала

### 2. Напоминание о игре
- **Когда отправляется**: За 2 часа до начала игры
- **Шаблон**: `Напоминание: через 2 часа игра в {venue}, корт {court}`
- **Переменные**:
  - `{venue}` - название площадки
  - `{court}` - название корта
- **Cron job**: Каждые 15 минут

### 3. Отмена бронирования
- **Когда отправляется**: При отмене бронирования или возврате средств
- **Шаблон**: `Игра {date} в {time} в {venue} отменена`
- **Переменные**:
  - `{date}` - дата игры
  - `{time}` - время начала
  - `{venue}` - название площадки

### 4. Изменение бронирования
- **Когда отправляется**: При изменении времени или корта
- **Шаблон**: `Изменение: игра перенесена на {time}, корт {court}`
- **Переменные**:
  - `{time}` - новое время
  - `{court}` - новый корт

### 5. Код авторизации
- **Когда отправляется**: При входе в приложение по номеру телефона
- **Шаблон**: `Ваш код для входа в Все Корты: {code}`
- **Переменные**:
  - `{code}` - 6-значный код
- **Срок действия**: 5 минут
- **Максимум попыток**: 3

## Cloud Functions

### SMS уведомления о бронированиях

```javascript
// В webhooks платежных систем автоматически вызывается:
const smsService = new BookingSMSService();
await smsService.sendBookingConfirmation(bookingId);
```

### SMS авторизация

```javascript
// Отправка кода
const result = await sendAuthSMSCode({phone: "+79991234567"});
// result: {success: true, codeId: "abc123"}

// Проверка кода
const verify = await verifyAuthSMSCode({
  phone: "+79991234567",
  code: "123456"
});
// verify: {success: true, verified: true}
```

### Обновление бронирования

```javascript
// Обновление с автоматической отправкой SMS
const result = await updateBooking({
  bookingId: "booking123",
  updates: {
    startTime: "15:00",
    courtId: "court456"
  }
});
```

### Ручная отправка напоминания

```javascript
// Для тестирования
const result = await sendBookingReminderManual({
  bookingId: "booking123"
});
```

## Интеграция в мобильное приложение

### Flutter/Dart пример

```dart
import 'package:cloud_functions/cloud_functions.dart';

class SMSAuthService {
  final FirebaseFunctions _functions = FirebaseFunctions.instance;
  
  // Отправка SMS кода
  Future<Map<String, dynamic>> sendSMSCode(String phone) async {
    try {
      final callable = _functions.httpsCallable('sendAuthSMSCode');
      final result = await callable.call({'phone': phone});
      return result.data;
    } catch (e) {
      print('Error sending SMS code: $e');
      throw e;
    }
  }
  
  // Проверка кода
  Future<Map<String, dynamic>> verifySMSCode(String phone, String code) async {
    try {
      final callable = _functions.httpsCallable('verifyAuthSMSCode');
      final result = await callable.call({
        'phone': phone,
        'code': code
      });
      return result.data;
    } catch (e) {
      print('Error verifying SMS code: $e');
      throw e;
    }
  }
}

// Использование
final smsAuth = SMSAuthService();

// Отправка кода
final sendResult = await smsAuth.sendSMSCode('+79991234567');
if (sendResult['success']) {
  print('Code sent successfully');
}

// Проверка кода
final verifyResult = await smsAuth.verifySMSCode('+79991234567', '123456');
if (verifyResult['verified']) {
  print('Code verified successfully');
  // Продолжить авторизацию
}
```

## Мониторинг и логи

### Просмотр логов SMS
- **Firestore коллекция**: `sms_logs`
- **Поля**:
  - `type` - тип уведомления
  - `phone` - номер телефона
  - `message` - текст сообщения
  - `success` - статус отправки
  - `timestamp` - время отправки
  - `bookingId` - ID бронирования (если применимо)

### Статистика в админ-панели
**Системные настройки → SMS настройки → Статистика**
- Количество отправленных SMS
- Последняя отправка
- История отправок

## Безопасность

1. **Нормализация телефонов**: Все номера автоматически приводятся к формату 7XXXXXXXXXX
2. **Защита от спама**: 
   - SMS коды действительны 5 минут
   - Максимум 3 попытки ввода кода
   - Автоматическая очистка истекших кодов
3. **Права доступа**: Только суперадмины могут изменять настройки SMS

## Тестирование

### Тестовый режим
В настройках можно включить тестовый режим:
```javascript
testMode: true
```
В этом режиме SMS не отправляются, но логируются в консоль.

### Тестовая отправка
**Системные настройки → SMS настройки → Тест отправки**

## Стоимость

SMS.RU тарифы:
- Россия: ~2-3 руб/SMS
- СНГ: ~5-10 руб/SMS

## Troubleshooting

### SMS не отправляются
1. Проверьте баланс SMS.RU
2. Проверьте API ключ в настройках
3. Убедитесь, что шаблон включен
4. Проверьте логи в Firestore

### Неверный формат номера
- Поддерживаются только российские номера
- Формат: +7XXXXXXXXXX, 8XXXXXXXXXX, 7XXXXXXXXXX

### Код не приходит
1. Проверьте правильность номера
2. Проверьте спам-фильтры
3. Подождите до 1 минуты
4. Запросите код повторно