# 📧 Ручная установка Firebase Extension для Email

## Шаг 1: Запустите команду установки

```bash
firebase ext:install firebase/firestore-send-email@latest
```

## Шаг 2: Ответьте на вопросы установщика

При установке вам будут заданы вопросы. Используйте следующие ответы:

1. **Name for this instance:** 
   - Нажмите Enter (используйте предложенное имя)

2. **Firestore Instance ID:**
   - Введите: `(default)`

3. **Firestore Instance Location:**
   - Введите: `europe-west1`

4. **Authentication Type:**
   - Выберите: `Username & Password`

5. **SMTP connection URI:**
   - Введите: `smtps://noreply@allcourt.ru@smtp.timeweb.ru:465`

6. **SMTP password:**
   - Введите: `v3H2OO139`

7. **Email documents collection:**
   - Введите: `mail`

8. **Default FROM address:**
   - Введите: `Все Корты <noreply@allcourt.ru>`

9. **Default REPLY-TO address:**
   - Введите: `support@allcourt.ru`

10. **Users collection:**
    - Введите: `users`

11. **Templates collection:**
    - Введите: `mail_templates`

12. **Firestore TTL type:**
    - Выберите: `Day`

13. **Firestore TTL value:**
    - Введите: `7`

14. **TLS Options:**
    - Нажмите Enter (оставить пустым)

## Шаг 3: Подтвердите установку

После ввода всех параметров:
- Проверьте конфигурацию
- Введите `Y` для подтверждения

## Шаг 4: Дождитесь завершения

Установка займет 1-2 минуты.

## Шаг 5: Разверните функции

```bash
firebase deploy --only functions
```

## Проверка работы

После установки протестируйте отправку email:

```javascript
// В консоли браузера админ-панели
const functions = firebase.functions('europe-west1');
const testEmailFn = functions.httpsCallable('testEmailSending');
const result = await testEmailFn({ testEmail: 'ваш-email@example.com' });
console.log(result.data);
```

✅ Готово! Email-уведомления настроены.