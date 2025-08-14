# Интеграция SMS-сервисов

## 🚀 Быстрый старт

### 1. Настройка конфигурации

```bash
# Для SMS.RU
firebase functions:config:set sms.provider="smsru" sms.smsru_api_id="YOUR_API_ID"

# Для SMSC.RU
firebase functions:config:set sms.provider="smsc" sms.smsc_login="YOUR_LOGIN" sms.smsc_password="YOUR_PASSWORD"

# Тестовый режим (всегда код 1234)
firebase functions:config:set sms.test_mode="true"
```

### 2. Применение конфигурации

```bash
# Получить текущую конфигурацию локально
firebase functions:config:get > .runtimeconfig.json

# Деплой функций
firebase deploy --only functions
```

## 📱 SMS-провайдеры

### SMS.RU (Рекомендуется)

**Регистрация:**
1. Зайдите на https://sms.ru
2. Зарегистрируйтесь и подтвердите email
3. Получите API ID в личном кабинете
4. Пополните баланс (есть бесплатные SMS для тестирования)

**Преимущества:**
- ✅ Простая интеграция
- ✅ Дешевые SMS (1-2₽)
- ✅ Бесплатный тестовый баланс
- ✅ Хорошая документация

### SMSC.RU

**Регистрация:**
1. Зайдите на https://smsc.ru
2. Зарегистрируйтесь
3. Получите логин и пароль
4. Пополните баланс

**Преимущества:**
- ✅ Надежный сервис
- ✅ Множество функций
- ✅ Массовые рассылки

## 🔧 Структура интеграции

### Сервис SMS (`functions/src/services/smsService.ts`)

```typescript
// Основные методы:
- sendVerificationCode(phone, code) // Код верификации
- sendBookingConfirmation(phone, booking) // Подтверждение бронирования
- sendBookingReminder(phone, booking) // Напоминание
- sendCancellationNotice(phone, booking) // Отмена
- sendRefundNotice(phone, amount) // Возврат средств
```

### Cloud Functions (`functions/src/auth/sendSMSCode.ts`)

```typescript
// Функции:
- sendSMSCode // Отправка кода
- verifySMSCode // Проверка кода
```

## 📝 Использование в мобильном приложении

### 1. Обновите AuthService

```dart
// lib/services/auth_service.dart
class AuthService {
  // Отправка SMS кода
  Future<void> sendSMSCode(String phoneNumber) async {
    final callable = FirebaseFunctions.instanceFor(region: 'europe-west1')
        .httpsCallable('sendSMSCode');
    
    try {
      final result = await callable.call({
        'phoneNumber': phoneNumber,
      });
      
      if (result.data['testMode'] == true) {
        // Показать уведомление о тестовом режиме
        print('Тестовый режим: код всегда 1234');
      }
    } catch (e) {
      throw Exception('Ошибка отправки SMS: $e');
    }
  }
  
  // Проверка кода
  Future<UserCredential> verifySMSCode(String phoneNumber, String code) async {
    final callable = FirebaseFunctions.instanceFor(region: 'europe-west1')
        .httpsCallable('verifySMSCode');
    
    final result = await callable.call({
      'phoneNumber': phoneNumber,
      'code': code,
    });
    
    if (result.data['success']) {
      // Авторизация с custom token
      final token = result.data['token'];
      return await FirebaseAuth.instance.signInWithCustomToken(token);
    } else {
      throw Exception('Неверный код');
    }
  }
}
```

### 2. Экран авторизации

```dart
// lib/screens/auth/phone_auth_screen.dart
class PhoneAuthScreen extends StatefulWidget {
  @override
  _PhoneAuthScreenState createState() => _PhoneAuthScreenState();
}

class _PhoneAuthScreenState extends State<PhoneAuthScreen> {
  final _phoneController = TextEditingController();
  final _codeController = TextEditingController();
  bool _codeSent = false;
  
  Future<void> _sendCode() async {
    final phone = _phoneController.text;
    
    try {
      await context.read<AuthService>().sendSMSCode(phone);
      setState(() {
        _codeSent = true;
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Код отправлен на $phone')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Ошибка: $e')),
      );
    }
  }
  
  Future<void> _verifyCode() async {
    final phone = _phoneController.text;
    final code = _codeController.text;
    
    try {
      await context.read<AuthService>().verifySMSCode(phone, code);
      Navigator.of(context).pushReplacementNamed('/home');
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Неверный код')),
      );
    }
  }
}
```

## 🔔 SMS-уведомления для бронирований

### Добавьте в функцию создания бронирования:

```typescript
// functions/src/booking/createBooking.ts
import {smsService} from "../services/smsService";

// После создания бронирования
if (bookingData.paymentStatus === 'paid' || bookingData.paymentStatus === 'not_required') {
  await smsService.sendBookingConfirmation(
    bookingData.customerPhone,
    {
      venueName: bookingData.venueName,
      courtName: bookingData.courtName,
      date: bookingData.date,
      time: bookingData.startTime,
      totalPrice: bookingData.totalPrice,
    }
  );
}
```

### Добавьте scheduled функцию для напоминаний:

```typescript
// functions/src/booking/sendReminders.ts
export const sendBookingReminders = functions
  .region('europe-west1')
  .pubsub
  .schedule('every day 10:00')
  .timeZone('Europe/Moscow')
  .onRun(async () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Получаем бронирования на сегодня
    const bookings = await admin.firestore()
      .collection('bookings')
      .where('date', '==', todayStr)
      .where('status', '==', 'confirmed')
      .get();
    
    for (const doc of bookings.docs) {
      const booking = doc.data();
      
      // Отправляем напоминание за 2 часа до игры
      const bookingTime = new Date(`${booking.date}T${booking.startTime}`);
      const twoHoursBefore = new Date(bookingTime.getTime() - 2 * 60 * 60 * 1000);
      
      if (now >= twoHoursBefore && now < bookingTime) {
        await smsService.sendBookingReminder(
          booking.customerPhone,
          {
            venueName: booking.venueName,
            time: booking.startTime,
          }
        );
      }
    }
  });
```

## 🧪 Тестирование

### 1. Локальное тестирование

```bash
# Запустите эмулятор
firebase emulators:start --only functions

# В другом терминале
curl -X POST http://localhost:5001/YOUR_PROJECT_ID/europe-west1/sendSMSCode \
  -H "Content-Type: application/json" \
  -d '{"data": {"phoneNumber": "+79123456789"}}'
```

### 2. Тестовый режим

В тестовом режиме:
- SMS не отправляются реально
- Код всегда `1234`
- Логи показывают, что бы отправилось

## 📊 Мониторинг

### Firebase Console

Смотрите логи функций:
```
Firebase Console → Functions → Logs
```

### Статистика SMS

Добавьте счетчики в Firestore:
```typescript
// При отправке SMS
await admin.firestore().collection('stats').doc('sms').update({
  sent: admin.firestore.FieldValue.increment(1),
  [`sent_${new Date().toISOString().split('T')[0]}`]: admin.firestore.FieldValue.increment(1),
});
```

## 💰 Расходы

### Примерные цены:
- SMS.RU: 1-2₽ за SMS
- SMSC.RU: 1.5-2.5₽ за SMS

### Оптимизация расходов:
1. Используйте ограничения на количество попыток
2. Добавьте rate limiting
3. Проверяйте валидность номеров перед отправкой
4. Используйте альфа-имя для брендирования

## 🔒 Безопасность

1. **Никогда не коммитьте API ключи**
2. **Используйте Firebase Config для хранения ключей**
3. **Добавьте rate limiting для защиты от спама**
4. **Логируйте все отправки для аудита**

## 🚨 Troubleshooting

### SMS не отправляются
1. Проверьте баланс в личном кабинете провайдера
2. Проверьте правильность API ключей
3. Проверьте формат номера телефона
4. Смотрите логи в Firebase Console

### Код не приходит
1. Проверьте, что номер правильный
2. Проверьте папку "Спам" для SMS
3. Попробуйте другой номер
4. Включите тестовый режим для отладки

### Ошибка авторизации
1. Проверьте настройки Authentication в Firebase
2. Убедитесь, что Custom Token Authentication включен
3. Проверьте регион Cloud Functions