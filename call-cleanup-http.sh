#!/bin/bash

# Получаем ID token для аутентификации
echo "🔐 Получение токена аутентификации..."

# Сначала нужно получить ID token через Firebase Auth
# Используем gcloud для получения токена
ID_TOKEN=$(gcloud auth print-identity-token)

if [ -z "$ID_TOKEN" ]; then
    echo "❌ Не удалось получить токен. Убедитесь, что вы вошли в gcloud:"
    echo "   gcloud auth login"
    exit 1
fi

echo "✅ Токен получен"

# URL функции
FUNCTION_URL="https://europe-west1-sports-booking-app-1d7e5.cloudfunctions.net/cleanupWebBookings"

echo "📞 Вызов функции cleanupWebBookings..."

# Вызываем функцию
RESPONSE=$(curl -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -s)

echo "📊 Ответ функции:"
echo "$RESPONSE" | jq .

# Если jq не установлен, просто выводим ответ
if [ $? -ne 0 ]; then
    echo "$RESPONSE"
fi