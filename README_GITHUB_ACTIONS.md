# 🚀 Автоматическая сборка APK через GitHub Actions

## Как это работает

### Автоматическая сборка
При каждом `push` в ветку `main` автоматически:
1. Собираются Debug и Release версии APK
2. Создается новый релиз с обеими версиями
3. APK файлы доступны для скачивания

### Ручная сборка
Вы можете запустить сборку вручную:
1. Перейдите в раздел **Actions** на GitHub
2. Выберите **Manual Build APK**
3. Нажмите **Run workflow**
4. Выберите тип сборки (debug/release/both)
5. Нажмите **Run workflow**

## Где скачать APK

### Вариант 1: Из релизов (рекомендуется)
1. Перейдите в раздел **Releases** вашего репозитория
2. Выберите последний релиз
3. Скачайте нужный APK:
   - `allcourt-debug.apk` - для тестирования
   - `allcourt-release.apk` - для использования

### Вариант 2: Из артефактов сборки
1. Перейдите в раздел **Actions**
2. Выберите последнюю успешную сборку
3. В разделе **Artifacts** скачайте APK

## Первый запуск

### Шаг 1: Загрузите код на GitHub
```bash
cd /Users/bulat/sports_booking_app
git init
git add .
git commit -m "Initial commit: Все Корты app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sports_booking_app.git
git push -u origin main
```

### Шаг 2: Проверьте Actions
1. Перейдите на GitHub в раздел **Actions**
2. Вы увидите, что сборка запустилась автоматически
3. Подождите 5-10 минут

### Шаг 3: Скачайте APK
1. После успешной сборки перейдите в **Releases**
2. Скачайте APK на телефон
3. Установите приложение

## Версии APK

- **Debug APK** (~50MB)
  - Включает отладочную информацию
  - Можно устанавливать поверх предыдущих версий
  - Подходит для тестирования

- **Release APK** (~15MB)
  - Оптимизирован и сжат
  - Быстрее работает
  - Для финальных пользователей

## Установка на Android

1. Скачайте APK файл на телефон
2. Откройте **Настройки** → **Безопасность**
3. Включите **Неизвестные источники**
4. Откройте скачанный APK файл
5. Нажмите **Установить**

## Решение проблем

### Ошибка установки
- Удалите предыдущую версию приложения
- Проверьте свободное место на телефоне
- Убедитесь, что Android версии 5.0 или выше

### APK не скачивается
- Проверьте, что сборка прошла успешно (зеленая галочка)
- Попробуйте другой браузер
- Скачайте на компьютер и перенесите на телефон

## Настройки

Файлы конфигурации:
- `.github/workflows/build-apk.yml` - автоматическая сборка
- `.github/workflows/manual-build.yml` - ручная сборка