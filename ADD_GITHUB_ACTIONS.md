# 🚀 Добавление GitHub Actions для автоматической сборки APK

Код успешно загружен! Теперь нужно добавить автоматическую сборку.

## Вариант 1: Через веб-интерфейс (Рекомендуется)

1. Откройте https://github.com/Bulllgakov/sports_booking_app
2. Нажмите кнопку **"Add file"** → **"Create new file"**
3. В поле имени файла введите: `.github/workflows/build-apk.yml`
4. Скопируйте содержимое из файла `.github_backup/workflows/build-apk.yml`
5. Вставьте в редактор
6. Нажмите **"Commit new file"**

## Вариант 2: Обновить токен

1. Создайте новый токен с правами `repo` и `workflow`:
   - https://github.com/settings/tokens
   - Отметьте: ✅ repo, ✅ workflow
2. Выполните команды:
   ```bash
   mv .github_backup .github
   git add .github
   git commit -m "Добавляем GitHub Actions"
   git push
   ```

## Проверка

После добавления workflows:
1. Перейдите во вкладку **Actions**
2. Сборка начнется автоматически
3. Через 5-10 минут APK будет в **Releases**

## Прямая ссылка для скачивания

После сборки APK будет доступен по адресу:
https://github.com/Bulllgakov/sports_booking_app/releases

---

🎉 Поздравляю! Ваш проект загружен на GitHub!