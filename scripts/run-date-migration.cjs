#!/usr/bin/env node

/**
 * Скрипт для запуска миграции унификации форматов дат
 * 
 * Использование:
 * node scripts/run-date-migration.js [команда]
 * 
 * Команды:
 * - check: проверить текущие форматы дат (dry run)
 * - run: выполнить миграцию
 * - status: проверить статус миграции
 */

const admin = require('firebase-admin')

// Инициализация Firebase Admin с использованием default credentials
// Убедитесь, что вы авторизованы через: firebase login
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'sports-booking-app-1d7e5'
  })
}

const db = admin.firestore()

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset)
}

/**
 * Анализирует типы дат в коллекции
 */
async function analyzeCollection(collectionName) {
  log(`\n📊 Analyzing collection: ${collectionName}`, 'cyan')
  
  const snapshot = await db.collection(collectionName).limit(10).get()
  
  if (snapshot.empty) {
    log(`  ⚠️  Collection is empty`, 'yellow')
    return
  }

  const dateFields = new Map()
  
  snapshot.forEach(doc => {
    const data = doc.data()
    
    // Рекурсивно ищем поля с датами
    function findDates(obj, path = '') {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key
        
        if (value === null || value === undefined) continue
        
        // Проверяем различные форматы дат
        if (value instanceof admin.firestore.Timestamp) {
          if (!dateFields.has(fullPath)) dateFields.set(fullPath, new Set())
          dateFields.get(fullPath).add('Timestamp')
        } else if (value?.toDate && typeof value.toDate === 'function') {
          if (!dateFields.has(fullPath)) dateFields.set(fullPath, new Set())
          dateFields.get(fullPath).add('Timestamp-like')
        } else if (value?.seconds !== undefined) {
          if (!dateFields.has(fullPath)) dateFields.set(fullPath, new Set())
          dateFields.get(fullPath).add('Timestamp object')
        } else if (value instanceof Date) {
          if (!dateFields.has(fullPath)) dateFields.set(fullPath, new Set())
          dateFields.get(fullPath).add('Date')
        } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
          if (!dateFields.has(fullPath)) dateFields.set(fullPath, new Set())
          dateFields.get(fullPath).add('String (yyyy-MM-dd)')
        } else if (typeof value === 'string' && !isNaN(Date.parse(value)) && value.includes('T')) {
          if (!dateFields.has(fullPath)) dateFields.set(fullPath, new Set())
          dateFields.get(fullPath).add('String (ISO)')
        } else if (typeof value === 'number' && value > 1000000000000) { // Likely timestamp
          if (!dateFields.has(fullPath)) dateFields.set(fullPath, new Set())
          dateFields.get(fullPath).add('Number (timestamp)')
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          // Рекурсивно проверяем вложенные объекты
          findDates(value, fullPath)
        }
      }
    }
    
    findDates(data)
  })
  
  if (dateFields.size === 0) {
    log(`  ℹ️  No date fields found`, 'blue')
  } else {
    log(`  📅 Date fields found:`, 'green')
    for (const [field, types] of dateFields) {
      const typesList = Array.from(types).join(', ')
      const icon = types.size > 1 ? '⚠️ ' : '✅ '
      log(`    ${icon}${field}: ${typesList}`, types.size > 1 ? 'yellow' : 'green')
    }
  }
}

/**
 * Проверяет все коллекции
 */
async function checkAllCollections() {
  log('\n🔍 Checking date formats in all collections...', 'bright')
  
  const collections = [
    'bookings',
    'venues', 
    'subscriptions',
    'invoices',
    'payments',
    'trainers',
    'admins',
    'customers',
    'courts',
    'openGames'
  ]
  
  for (const collection of collections) {
    try {
      await analyzeCollection(collection)
    } catch (error) {
      log(`  ❌ Error analyzing ${collection}: ${error.message}`, 'red')
    }
  }
}

/**
 * Запускает миграцию
 */
async function runMigration() {
  log('\n🚀 Starting date format unification migration...', 'bright')
  log('⚠️  This will modify your database. Make sure you have a backup!', 'yellow')
  
  // Ждем подтверждения
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  await new Promise(resolve => {
    readline.question('\nType "yes" to continue: ', answer => {
      readline.close()
      if (answer.toLowerCase() !== 'yes') {
        log('Migration cancelled', 'yellow')
        process.exit(0)
      }
      resolve()
    })
  })
  
  // Компилируем и запускаем миграцию
  log('\n📦 Compiling migration script...', 'blue')
  const { execSync } = require('child_process')
  
  try {
    execSync('cd functions && npm run build', { stdio: 'inherit' })
    log('✅ Compilation successful', 'green')
    
    log('\n🏃 Running migration...', 'blue')
    execSync('cd functions && node lib/migrations/unifyAllDateFormats.js run', { stdio: 'inherit' })
    
    log('\n✅ Migration completed successfully!', 'green')
  } catch (error) {
    log(`\n❌ Migration failed: ${error.message}`, 'red')
    process.exit(1)
  }
}

/**
 * Проверяет статус миграции
 */
async function checkMigrationStatus() {
  log('\n📊 Checking migration status...', 'cyan')
  
  try {
    const migrationDoc = await db.collection('migrations').doc('unifyAllDateFormats').get()
    
    if (migrationDoc.exists) {
      const data = migrationDoc.data()
      log('\n✅ Migration has been executed', 'green')
      log(`  Status: ${data.status}`, 'blue')
      log(`  Executed at: ${data.executedAt?.toDate?.() || data.executedAt}`, 'blue')
      log(`  Description: ${data.description}`, 'blue')
    } else {
      log('\n⚠️  Migration has not been executed yet', 'yellow')
    }
  } catch (error) {
    log(`\n❌ Error checking status: ${error.message}`, 'red')
  }
}

/**
 * Главная функция
 */
async function main() {
  const command = process.argv[2]
  
  log('🗄️  Date Format Unification Tool', 'bright')
  log('================================\n', 'bright')
  
  switch (command) {
    case 'check':
      await checkAllCollections()
      break
      
    case 'run':
      await runMigration()
      break
      
    case 'status':
      await checkMigrationStatus()
      break
      
    default:
      log('Usage:', 'cyan')
      log('  node scripts/run-date-migration.js check   - Analyze current date formats')
      log('  node scripts/run-date-migration.js run     - Execute the migration')
      log('  node scripts/run-date-migration.js status  - Check migration status')
      log('\nℹ️  Start with "check" to see current state', 'blue')
  }
  
  log('\n✨ Done!', 'green')
  process.exit(0)
}

// Запуск
main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red')
  console.error(error)
  process.exit(1)
})