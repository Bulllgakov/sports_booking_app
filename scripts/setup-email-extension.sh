#!/bin/bash

echo "=== Настройка Firebase Extension для отправки email ==="
echo ""
echo "Перед началом убедитесь, что у вас есть SMTP данные от вашего хостинга:"
echo "- SMTP сервер (например: mail.your-hosting.ru)"
echo "- Порт (587 для TLS или 465 для SSL)"
echo "- Email пользователя (например: noreply@allcourt.ru)"
echo "- Пароль"
echo ""
echo "Нажмите Enter, чтобы продолжить..."
read

# Установка расширения
echo "Устанавливаем Firebase Extension..."
firebase ext:install firebase/firestore-send-email --params=extensions/firestore-send-email.env

echo ""
echo "=== Установка завершена! ==="
echo ""
echo "Теперь вы можете:"
echo "1. Протестировать отправку через функцию testEmailSending"
echo "2. Проверить статус писем в коллекции 'mail' в Firestore"
echo ""
echo "Для обновления SMTP настроек:"
echo "- Отредактируйте файл extensions/firestore-send-email.env"
echo "- Выполните: firebase ext:configure firestore-send-email --params=extensions/firestore-send-email.env"