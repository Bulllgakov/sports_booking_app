#!/bin/bash

# Остановить все процессы на портах
echo "Остановка процессов на портах..."
lsof -ti:5173,3000,4173 | xargs kill -9 2>/dev/null || true

# Очистить кеш npm
echo "Очистка кеша..."
npm cache clean --force 2>/dev/null || true

# Проверить зависимости
echo "Проверка зависимостей..."
npm install

# Запустить dev сервер
echo "Запуск dev сервера..."
npm run dev