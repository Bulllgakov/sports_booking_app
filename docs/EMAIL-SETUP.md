# Настройка отправки Email через Firebase Extension

## 1. Получите SMTP данные от вашего хостинга

Вам понадобятся следующие данные:
- SMTP сервер (например: `mail.your-hosting.ru`)
- Порт (обычно 587 для TLS или 465 для SSL)
- Имя пользователя (обычно полный email: `noreply@allcourt.ru`)
- Пароль
- Протокол шифрования (TLS/SSL)

## 2. Обновите файл конфигурации

Откройте файл `/extensions/firestore-send-email.env` и замените данные:

```env
# Для TLS (порт 587):
SMTP_CONNECTION_URI=smtp://noreply@allcourt.ru:ваш-пароль@mail.your-hosting.ru:587

# Для SSL (порт 465):
SMTP_CONNECTION_URI=smtps://noreply@allcourt.ru:ваш-пароль@mail.your-hosting.ru:465

# Адрес отправителя
DEFAULT_FROM=Все Корты <noreply@allcourt.ru>
```

### Примеры для популярных хостингов:

**Beget:**
```
SMTP_CONNECTION_URI=smtp://noreply@allcourt.ru:password@smtp.beget.com:465
```

**Timeweb:**
```
SMTP_CONNECTION_URI=smtps://noreply@allcourt.ru:password@smtp.timeweb.ru:465
# Порт 465 для SSL
# POP3: pop3.timeweb.ru:995
# IMAP: imap.timeweb.ru:993
```

**REG.RU:**
```
SMTP_CONNECTION_URI=smtp://noreply@allcourt.ru:password@smtp.reg.ru:587
```

## 3. Установите расширение

```bash
# Установка расширения с конфигурацией
firebase ext:configure firestore-send-email --params=extensions/firestore-send-email.env

# Или интерактивная установка
firebase ext:install firebase/firestore-send-email
```

При интерактивной установке введите:
1. **Email documents collection:** `mail`
2. **SMTP connection URI:** (ваши SMTP данные)
3. **Default FROM address:** `Все Корты <noreply@allcourt.ru>`
4. **Default REPLY-TO address:** `support@allcourt.ru` (опционально)
5. **Email templates collection:** `mail_templates` (опционально)
6. **Users collection:** оставьте пустым
7. **TTL for processed emails:** `7` (дней)

## 4. Проверьте работу

После установки протестируйте отправку:

```javascript
// В консоли Firebase или в коде
import { addDoc, collection } from 'firebase/firestore';
import { db } from './services/firebase';

// Тестовое письмо
await addDoc(collection(db, 'mail'), {
  to: 'test@example.com',
  message: {
    subject: 'Тест отправки',
    text: 'Это тестовое письмо',
    html: '<p>Это <b>тестовое</b> письмо</p>'
  }
});
```

## 5. Структура документа для отправки

```javascript
{
  to: 'recipient@example.com', // или ['email1@example.com', 'email2@example.com']
  cc: 'cc@example.com', // опционально
  bcc: 'bcc@example.com', // опционально
  from: 'Sender Name <sender@example.com>', // опционально, иначе DEFAULT_FROM
  replyTo: 'reply@example.com', // опционально
  message: {
    subject: 'Тема письма',
    text: 'Текстовая версия письма',
    html: '<p>HTML версия письма</p>',
    attachments: [ // опционально
      {
        filename: 'invoice.pdf',
        path: 'gs://bucket/path/to/file.pdf' // или base64 content
      }
    ]
  },
  template: { // опционально, для использования шаблонов
    name: 'welcome', // имя шаблона из mail_templates
    data: { // данные для шаблона
      name: 'Иван',
      clubName: 'Теннис Клуб'
    }
  }
}
```

## 6. Статусы отправки

Расширение автоматически добавляет поле `delivery` к документу:

```javascript
{
  delivery: {
    state: 'SUCCESS', // или 'PENDING', 'PROCESSING', 'ERROR', 'RETRY'
    startTime: Timestamp,
    endTime: Timestamp,
    error: 'Error message if failed',
    attempts: 1,
    info: {
      messageId: '...',
      accepted: ['email@example.com'],
      rejected: [],
      response: '250 OK'
    }
  }
}
```

## 7. Создание шаблонов писем

Создайте документы в коллекции `mail_templates`:

```javascript
// Документ: mail_templates/booking_confirmation
{
  subject: 'Подтверждение бронирования - {{courtName}}',
  html: `
    <h1>Здравствуйте, {{customerName}}!</h1>
    <p>Ваше бронирование подтверждено:</p>
    <ul>
      <li>Корт: {{courtName}}</li>
      <li>Дата: {{date}}</li>
      <li>Время: {{time}}</li>
    </ul>
  `,
  text: 'Здравствуйте, {{customerName}}! Ваше бронирование подтверждено...'
}
```

## 8. Отладка

Если письма не отправляются:

1. Проверьте логи функции в Firebase Console
2. Проверьте коллекцию `mail` - там должно быть поле `delivery`
3. Убедитесь, что SMTP данные корректны
4. Проверьте, не блокирует ли хостинг подключения с Google Cloud

## 9. Лимиты

- Gmail: 500 писем/день
- Яндекс: 500 писем/день
- Хостинг: обычно 50-200 писем/час (уточните у провайдера)

## 10. Безопасность

- Не храните SMTP пароль в коде
- Используйте Firebase Security Rules для защиты коллекции `mail`
- Ограничьте доступ к записи в `mail` только авторизованным пользователям

## 11. Тестирование настройки

После установки расширения вы можете протестировать отправку email:

### Через функцию тестирования (рекомендуется):

1. Откройте Firebase Console → Functions
2. Найдите функцию `testEmailSending`
3. Нажмите на неё и перейдите в "Logs"
4. В другой вкладке откройте админ-панель и выполните в консоли:

```javascript
// Замените email на ваш тестовый адрес
const testEmail = async () => {
  const functions = firebase.functions('europe-west1');
  const testEmailFn = functions.httpsCallable('testEmailSending');
  
  try {
    const result = await testEmailFn({ testEmail: 'test@example.com' });
    console.log('Результат:', result.data);
  } catch (error) {
    console.error('Ошибка:', error);
  }
};

testEmail();
```

### Через прямое добавление в Firestore:

```javascript
// В консоли админ-панели
import { addDoc, collection } from 'firebase/firestore';
import { db } from './services/firebase';

const sendTestEmail = async () => {
  const mailRef = await addDoc(collection(db, 'mail'), {
    to: 'test@example.com',
    message: {
      subject: 'Тест - Все Корты',
      text: 'Это тестовое сообщение',
      html: '<h1>Тестовое сообщение</h1><p>Если вы видите это письмо, настройка работает!</p>'
    }
  });
  
  console.log('Email добавлен в очередь:', mailRef.id);
};

sendTestEmail();
```

## 12. Обновление существующих функций

Все функции отправки email уже обновлены для использования Firebase Extension:

- `sendBookingNotifications` - отправка уведомлений о бронировании
- `sendWelcomeEmail` - требует обновления для использования extension
- `sendVerificationCode` - требует обновления для использования extension

Функции теперь добавляют документы в коллекцию `mail` вместо прямой отправки через nodemailer.