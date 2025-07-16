# 🚀 Загрузка проекта на GitHub

## Шаг 1: Создайте репозиторий на GitHub

1. Откройте https://github.com
2. Войдите в свой аккаунт (или создайте новый)
3. Нажмите зеленую кнопку **"New"** или **"+"** → **"New repository"**
4. Заполните форму:
   - **Repository name**: `sports_booking_app` (или любое другое)
   - **Description**: "Все Корты - мобильное приложение для бронирования спортивных кортов"
   - **Public/Private**: выберите по желанию
   - **НЕ** добавляйте README, .gitignore или лицензию (у нас уже есть)
5. Нажмите **"Create repository"**

## Шаг 2: Скопируйте URL репозитория

После создания вы увидите страницу с инструкциями. Скопируйте URL вашего репозитория:
- Формат: `https://github.com/YOUR_USERNAME/sports_booking_app.git`

## Шаг 3: Загрузите код

Откройте терминал и выполните команды:

```bash
cd /Users/bulat/sports_booking_app

# Добавляем удаленный репозиторий
git remote add origin https://github.com/YOUR_USERNAME/sports_booking_app.git

# Загружаем код
git push -u origin main
```

**Важно**: Замените `YOUR_USERNAME` на ваш GitHub username!

## Шаг 4: Проверьте GitHub Actions

1. После загрузки перейдите на GitHub
2. Откройте вкладку **Actions**
3. Вы увидите, что сборка APK запустилась автоматически!
4. Подождите 5-10 минут

## Шаг 5: Скачайте APK

1. После успешной сборки перейдите в **Releases**
2. Вы увидите новый релиз "Все Корты v1.0.1"
3. Скачайте:
   - `allcourt-debug.apk` - для тестирования
   - `allcourt-release.apk` - для использования

## Возможные проблемы

### Ошибка при push
Если возникает ошибка аутентификации:
1. Создайте Personal Access Token:
   - GitHub → Settings → Developer settings → Personal access tokens
   - Generate new token (classic)
   - Выберите scope: repo
   - Скопируйте токен
2. Используйте токен вместо пароля при push

### Ветка main не существует
Если ошибка про ветку main:
```bash
git branch -M main
git push -u origin main
```

## Готово! 🎉

После успешной загрузки:
- Код сохранен на GitHub
- APK собирается автоматически при каждом изменении
- Вы можете скачать приложение из Releases