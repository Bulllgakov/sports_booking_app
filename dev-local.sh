#!/bin/bash

echo "🚀 Запуск локального сервера разработки..."

# Остановить процессы на порту 8080
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

# Запустить dev сервер
echo "🌐 Запуск на http://127.0.0.1:8080"
echo "📱 Админ-панель: http://127.0.0.1:8080/admin/login"
echo ""
echo "Данные для входа:"
echo "Email: admin@test.com"
echo "Пароль: admin123"
echo ""

npm run dev:admin