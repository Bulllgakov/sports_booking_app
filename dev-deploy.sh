#!/bin/bash

echo "🚀 Сборка и деплой для разработки..."

# Сборка проекта
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Сборка успешна"
    
    # Деплой только хостинга
    firebase deploy --only hosting
    
    if [ $? -eq 0 ]; then
        echo "✅ Деплой успешен!"
        echo "🌐 Приложение доступно по адресу:"
        echo "   https://sports-booking-app-1d7e5.web.app"
        
        # Попытаться открыть в браузере
        open "https://sports-booking-app-1d7e5.web.app"
    else
        echo "❌ Ошибка деплоя"
    fi
else
    echo "❌ Ошибка сборки"
fi