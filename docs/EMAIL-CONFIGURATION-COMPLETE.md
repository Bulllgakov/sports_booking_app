# Настройка Email завершена ✅

## Что было сделано:

### 1. Создана конфигурация Firebase Extension
- Файл `/extensions/firestore-send-email.env` с параметрами SMTP
- Добавлено расширение в `firebase.json`

### 2. Обновлены функции отправки email
- Создан новый сервис `/functions/src/services/emailService.ts` для работы с Firebase Extension
- Обновлены функции уведомлений о бронировании в `/functions/src/booking/notifications.ts`
- Обновлены функции в `index.ts` для использования нового сервиса

### 3. Создана функция тестирования
- `/functions/src/test/testEmail.ts` - функция для проверки работы email

### 4. Документация
- `/docs/EMAIL-SETUP.md` - полная инструкция по настройке

## Что нужно сделать вам:

### 1. Получите SMTP данные от вашего хостинга:
- SMTP сервер (например: mail.your-hosting.ru)
- Порт (587 для TLS или 465 для SSL)
- Email и пароль (например: noreply@allcourt.ru)

### 2. Обновите файл `/extensions/firestore-send-email.env`:
```env
# Для TLS (порт 587):
SMTP_CONNECTION_URI=smtp://noreply@allcourt.ru:ваш-пароль@mail.your-hosting.ru:587

# Для SSL (порт 465):
SMTP_CONNECTION_URI=smtps://noreply@allcourt.ru:ваш-пароль@mail.your-hosting.ru:465
```

### 3. Установите расширение:
```bash
# Вариант 1: Используйте готовый скрипт
./scripts/setup-email-extension.sh

# Вариант 2: Установите вручную
firebase ext:install firebase/firestore-send-email --params=extensions/firestore-send-email.env
```

### 4. Разверните функции:
```bash
firebase deploy --only functions
```

### 5. Протестируйте отправку:
В консоли браузера админ-панели выполните:
```javascript
const functions = firebase.functions('europe-west1');
const testEmailFn = functions.httpsCallable('testEmailSending');
await testEmailFn({ testEmail: 'ваш-email@example.com' });
```

## Какие письма будут отправляться:

1. **Уведомления о бронировании** ✅
   - Клиенту - подтверждение с деталями
   - Администратору - новое бронирование

2. **Приветственное письмо администраторам** ✅
   - При создании нового админа

3. **Коды верификации** ✅
   - При регистрации

## Примечания:

- Все письма теперь отправляются через Firebase Extension
- Статус отправки можно отслеживать в коллекции `mail` в Firestore
- Расширение автоматически повторяет попытки при ошибках
- Старые письма удаляются через 7 дней

## Поддержка:

Если возникнут проблемы:
1. Проверьте логи функции `ext-firestore-send-email-processQueue` в Firebase Console
2. Убедитесь, что SMTP данные корректны
3. Проверьте коллекцию `mail` в Firestore на наличие ошибок в поле `delivery`