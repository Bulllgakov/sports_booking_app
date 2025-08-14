# Инструкция по развертыванию SMS функций

## Шаг 1: Авторизация в gcloud

Откройте терминал и выполните:
```bash
gcloud auth login
```

Откроется браузер - войдите в ваш Google аккаунт, связанный с проектом Firebase.

## Шаг 2: Проверка проекта

```bash
gcloud config set project sports-booking-app-1d7e5
gcloud config list
```

## Шаг 3: Развертывание функций

```bash
cd functions
./gcloud-deploy.sh
```

## Что будет развернуто:

1. **SMS Авторизация**
   - `sendAuthSMSCode` - отправка SMS кода
   - `verifyAuthSMSCode` - проверка SMS кода

2. **SMS Уведомления**
   - `sendBookingReminders` - cron job для напоминаний за 2 часа
   - `sendBookingReminderManual` - ручная отправка напоминания
   - `updateBooking` - обновление бронирования с SMS

3. **SMS Настройки**
   - `getSMSSettings` - получение настроек
   - `updateSMSSettings` - обновление настроек
   - `getSMSTemplates` - получение шаблонов
   - `updateSMSTemplates` - обновление шаблонов

## Проверка развертывания

```bash
# Список функций
gcloud functions list --region=europe-west1

# Логи функции
gcloud functions logs read sendAuthSMSCode --region=europe-west1 --limit=50

# Описание функции
gcloud functions describe sendAuthSMSCode --region=europe-west1
```

## Если Firebase заработает

Можно будет использовать стандартную команду:
```bash
firebase deploy --only functions
```