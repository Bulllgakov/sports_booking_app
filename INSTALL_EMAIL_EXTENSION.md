# Установка Firebase Extension для отправки Email

## ✅ SMTP настройки уже сконфигурированы для Timeweb!

### Шаг 1: Установите расширение

Выполните одну из команд:

```bash
# Вариант 1: Используйте готовый скрипт
./scripts/setup-email-extension.sh

# Вариант 2: Установите напрямую
firebase ext:install firebase/firestore-send-email --params=extensions/firestore-send-email.env
```

### Шаг 2: Разверните функции

```bash
firebase deploy --only functions
```

### Шаг 3: Протестируйте отправку

В консоли браузера админ-панели (https://allcourt.ru/admin) выполните:

```javascript
// Замените на ваш email для теста
const functions = firebase.functions('europe-west1');
const testEmailFn = functions.httpsCallable('testEmailSending');
const result = await testEmailFn({ testEmail: 'test@example.com' });
console.log(result.data);
```

### Проверка работы:

1. Откройте Firebase Console → Firestore → коллекция `mail`
2. Вы увидите документ с вашим письмом
3. Поле `delivery.state` покажет статус отправки:
   - `PENDING` - ожидает отправки
   - `PROCESSING` - отправляется
   - `SUCCESS` - успешно отправлено
   - `ERROR` - ошибка (детали в `delivery.error`)

### Если возникли проблемы:

1. Проверьте логи функции `ext-firestore-send-email-processQueue` в Firebase Console
2. Убедитесь, что Timeweb не блокирует подключения от Google Cloud
3. Проверьте правильность пароля в файле `/extensions/firestore-send-email.env`

### Важно:

⚠️ Файл `/extensions/firestore-send-email.env` содержит пароль и НЕ должен попадать в git репозиторий!