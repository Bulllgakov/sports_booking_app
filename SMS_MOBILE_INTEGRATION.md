# SMS Авторизация - Интеграция для мобильного приложения

## Quick Start

### 1. Добавьте зависимость
```yaml
dependencies:
  cloud_functions: ^4.5.0
```

### 2. Создайте сервис

```dart
import 'package:cloud_functions/cloud_functions.dart';

class SMSAuthService {
  final FirebaseFunctions _functions = FirebaseFunctions.instanceFor(region: 'europe-west1');
  
  Future<String?> sendCode(String phone) async {
    try {
      final result = await _functions
          .httpsCallable('sendAuthSMSCode')
          .call({'phone': phone});
      
      if (result.data['success'] == true) {
        return result.data['codeId'];
      }
      return null;
    } catch (e) {
      print('Error: $e');
      return null;
    }
  }
  
  Future<bool> verifyCode(String phone, String code) async {
    try {
      final result = await _functions
          .httpsCallable('verifyAuthSMSCode')
          .call({
            'phone': phone,
            'code': code,
          });
      
      return result.data['verified'] == true;
    } catch (e) {
      print('Error: $e');
      return false;
    }
  }
}
```

### 3. UI пример

```dart
class SMSLoginScreen extends StatefulWidget {
  @override
  _SMSLoginScreenState createState() => _SMSLoginScreenState();
}

class _SMSLoginScreenState extends State<SMSLoginScreen> {
  final _phoneController = TextEditingController();
  final _codeController = TextEditingController();
  final _smsAuth = SMSAuthService();
  
  bool _codeSent = false;
  bool _loading = false;
  String? _codeId;
  
  // Отправка кода
  Future<void> _sendCode() async {
    setState(() => _loading = true);
    
    final codeId = await _smsAuth.sendCode(_phoneController.text);
    
    setState(() {
      _loading = false;
      _codeSent = codeId != null;
      _codeId = codeId;
    });
    
    if (_codeSent) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Код отправлен на ${_phoneController.text}')),
      );
    }
  }
  
  // Проверка кода
  Future<void> _verifyCode() async {
    setState(() => _loading = true);
    
    final verified = await _smsAuth.verifyCode(
      _phoneController.text,
      _codeController.text,
    );
    
    setState(() => _loading = false);
    
    if (verified) {
      // Успешная авторизация
      // TODO: Создать пользователя в Firebase Auth
      Navigator.pushReplacementNamed(context, '/home');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Неверный код')),
      );
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Вход по SMS')),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            // Поле телефона
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: 'Номер телефона',
                hintText: '+7 999 123 45 67',
              ),
              enabled: !_codeSent,
            ),
            
            if (!_codeSent) ...[
              SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loading ? null : _sendCode,
                child: _loading 
                  ? CircularProgressIndicator()
                  : Text('Получить код'),
              ),
            ],
            
            if (_codeSent) ...[
              SizedBox(height: 16),
              TextField(
                controller: _codeController,
                keyboardType: TextInputType.number,
                maxLength: 6,
                decoration: InputDecoration(
                  labelText: 'Код из SMS',
                  hintText: '123456',
                ),
              ),
              SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loading ? null : _verifyCode,
                child: _loading 
                  ? CircularProgressIndicator()
                  : Text('Войти'),
              ),
              TextButton(
                onPressed: () {
                  setState(() => _codeSent = false);
                  _codeController.clear();
                },
                child: Text('Изменить номер'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
```

## Важные моменты

1. **Регион функций**: `europe-west1`
2. **Формат телефона**: Любой, нормализация на сервере
3. **Длина кода**: 6 цифр
4. **Срок действия кода**: 5 минут
5. **Максимум попыток**: 3

## Обработка ошибок

```dart
try {
  final result = await _functions.httpsCallable('sendAuthSMSCode').call({...});
} on FirebaseFunctionsException catch (e) {
  switch (e.code) {
    case 'invalid-argument':
      // Неверный формат телефона
      break;
    case 'internal':
      // Ошибка отправки SMS
      break;
    case 'unauthenticated':
      // Требуется авторизация (не для SMS)
      break;
  }
}
```

## После успешной верификации

После успешной проверки SMS кода нужно:

1. Создать/обновить пользователя в Firebase Auth
2. Сохранить телефон в профиле пользователя
3. Перенаправить на главный экран

```dart
// Пример создания пользователя после SMS верификации
Future<void> _createUserAfterSMS(String phone) async {
  // 1. Создать custom token на сервере (требует дополнительной функции)
  // 2. Войти с custom token
  // 3. Обновить профиль пользователя
}
```

## Тестирование

Для тестирования можно:
1. Использовать тестовый режим в настройках SMS (коды логируются в консоль)
2. Создать тестовые номера с фиксированными кодами