#!/bin/bash

echo "🔍 Проверка аутентификации Firebase..."

# Проверка версии Firebase CLI
echo "📋 Версия Firebase CLI:"
firebase --version

echo ""
echo "👤 Проверка аутентификации:"

# Проверка аутентификации
if firebase projects:list &>/dev/null; then
    echo "✅ Аутентификация успешна!"
    echo ""
    echo "📦 Доступные проекты:"
    firebase projects:list
else
    echo "❌ Не авторизован. Выполните: firebase login"
    exit 1
fi

echo ""
echo "🎯 Следующий шаг: firebase init"