# Настройка gcloud CLI для развертывания функций

## Вариант 1: Интерактивная авторизация

1. Запустите команду:
```bash
gcloud auth login
```

2. Откроется браузер - войдите в Google аккаунт

3. Скопируйте код авторизации и вставьте в терминал

4. Установите проект:
```bash
gcloud config set project sports-booking-app-1d7e5
```

## Вариант 2: Service Account (для CI/CD)

1. Создайте service account в Firebase Console:
   - Перейдите в Project Settings → Service Accounts
   - Нажмите "Generate new private key"
   - Сохраните JSON файл

2. Авторизуйтесь с service account:
```bash
gcloud auth activate-service-account --key-file=path/to/service-account-key.json
```

3. Установите проект:
```bash
gcloud config set project sports-booking-app-1d7e5
```

## Развертывание функций

После авторизации запустите:
```bash
cd functions
./gcloud-deploy.sh
```

## Проверка развертывания

```bash
# Список всех функций
gcloud functions list --region=europe-west1

# Логи конкретной функции
gcloud functions logs read sendAuthSMSCode --region=europe-west1
```

## Полезные команды

```bash
# Проверить текущую конфигурацию
gcloud config list

# Проверить доступные проекты
gcloud projects list

# Обновить функцию
gcloud functions deploy FUNCTION_NAME --region=europe-west1

# Удалить функцию
gcloud functions delete FUNCTION_NAME --region=europe-west1
```