#!/bin/bash

echo "📱 Загрузка проекта 'Все Корты' на GitHub"
echo "========================================="
echo ""
echo "⚠️  ВАЖНО: Сначала создайте репозиторий на GitHub!"
echo "   Инструкция в файле GITHUB_SETUP.md"
echo ""
echo "Введите ваш GitHub username:"
read username

echo ""
echo "Введите название репозитория (по умолчанию: sports_booking_app):"
read repo_name
repo_name=${repo_name:-sports_booking_app}

# Формируем URL
repo_url="https://github.com/$username/$repo_name.git"

echo ""
echo "🔗 Будет использован URL: $repo_url"
echo "Продолжить? (y/n)"
read confirm

if [ "$confirm" != "y" ]; then
    echo "❌ Отменено"
    exit 1
fi

# Добавляем remote и пушим
echo ""
echo "📤 Загружаем код..."
git remote add origin $repo_url
git branch -M main
git push -u origin main

echo ""
echo "✅ Готово! Теперь:"
echo "1. Откройте https://github.com/$username/$repo_name"
echo "2. Перейдите в Actions - там уже должна идти сборка"
echo "3. Через 5-10 минут APK будет доступен в Releases"