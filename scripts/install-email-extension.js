#!/usr/bin/env node

/**
 * Скрипт для автоматической установки Firebase Extension
 * с предварительно заданными параметрами
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Установка Firebase Extension для отправки email...\n');

// Проверяем наличие файла с конфигурацией
const envFile = path.join(__dirname, '../extensions/firestore-send-email.env');
if (!fs.existsSync(envFile)) {
  console.error('❌ Файл extensions/firestore-send-email.env не найден!');
  process.exit(1);
}

// Читаем конфигурацию
const envContent = fs.readFileSync(envFile, 'utf8');
const config = {};
envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, value] = line.split('=');
    if (key && value) {
      config[key.trim()] = value.trim();
    }
  }
});

console.log('📋 Конфигурация:');
console.log('  - Коллекция для писем:', config.EMAIL_COLLECTION);
console.log('  - SMTP сервер: smtp.timeweb.ru:465');
console.log('  - От кого:', config.DEFAULT_FROM);
console.log('  - Reply-to:', config.DEFAULT_REPLY_TO);
console.log('\n');

console.log('⚡ Запуск установки расширения...\n');
console.log('Вам нужно будет подтвердить следующие параметры:');
console.log('1. Email collection path: mail');
console.log('2. SMTP connection URI: (скопируйте из файла .env)');
console.log('3. Default FROM: Все Корты <noreply@allcourt.ru>');
console.log('4. Default REPLY-TO: support@allcourt.ru');
console.log('5. Email templates collection: mail_templates');
console.log('6. Users collection: users (можно оставить пустым)');
console.log('7. TTL: 7');
console.log('\n');

try {
  // Запускаем установку в интерактивном режиме
  execSync('firebase ext:install firebase/firestore-send-email', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('\n✅ Расширение успешно установлено!');
  console.log('\n📝 Следующие шаги:');
  console.log('1. Разверните функции: firebase deploy --only functions');
  console.log('2. Протестируйте отправку через функцию testEmailSending');
  
} catch (error) {
  console.error('\n❌ Ошибка при установке расширения:', error.message);
  process.exit(1);
}