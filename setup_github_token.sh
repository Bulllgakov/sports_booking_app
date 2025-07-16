#!/bin/bash

echo "🔐 Настройка доступа к GitHub"
echo "============================"
echo ""
echo "Для загрузки кода нужен Personal Access Token."
echo ""
echo "📋 Как получить токен:"
echo "1. Откройте https://github.com/settings/tokens"
echo "2. Нажмите 'Generate new token (classic)'"
echo "3. Дайте название: 'sports_booking_app'"
echo "4. Выберите срок действия (рекомендую 90 дней)"
echo "5. Отметьте галочку 'repo' (полный доступ к репозиториям)"
echo "6. Нажмите 'Generate token'"
echo "7. СКОПИРУЙТЕ токен (он показывается только один раз!)"
echo ""
echo "Вставьте токен сюда и нажмите Enter:"
read -s token

echo ""
echo "Введите ваш GitHub username (Bulllgakov):"
read username
username=${username:-Bulllgakov}

# Настраиваем git с токеном
git remote set-url origin https://$username:$token@github.com/Bulllgakov/sports_booking_app.git

echo ""
echo "📤 Загружаем код..."
git push -u origin main

echo ""
echo "✅ Готово!"
echo ""
echo "🎉 Что дальше:"
echo "1. Откройте https://github.com/Bulllgakov/sports_booking_app"
echo "2. Перейдите во вкладку Actions"
echo "3. Вы увидите, что сборка APK уже началась!"
echo "4. Через 5-10 минут перейдите в Releases"
echo "5. Скачайте allcourt-release.apk на телефон"