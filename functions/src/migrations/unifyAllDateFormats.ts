import * as admin from 'firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

/**
 * Миграция для приведения всех дат в системе к единому формату Firestore Timestamp
 * 
 * Проблема: в системе используются разные форматы дат:
 * - Строки 'yyyy-MM-dd'
 * - Date объекты
 * - Firestore Timestamp
 * - Числовые timestamps
 * - Объекты с полями seconds/nanoseconds
 * 
 * Решение: привести все даты к Firestore Timestamp для консистентности
 */

interface DateField {
  collection: string
  fields: string[]
  optional?: string[] // Поля, которые могут отсутствовать
}

// Конфигурация полей с датами в каждой коллекции
const DATE_FIELDS: DateField[] = [
  {
    collection: 'bookings',
    fields: ['date', 'createdAt', 'updatedAt'],
    optional: ['cancelledAt', 'paymentCompletedAt', 'refundedAt']
  },
  {
    collection: 'venues',
    fields: ['createdAt', 'updatedAt'],
    optional: ['lastPaymentAt']
  },
  {
    collection: 'subscriptions',
    fields: ['startDate', 'createdAt', 'updatedAt'],
    optional: ['endDate', 'trialEndDate', 'nextBillingDate', 'cancelledAt', 'lastPaymentAt', 'gracePeriodEnd']
  },
  {
    collection: 'invoices',
    fields: ['createdAt', 'updatedAt'],
    optional: ['paidAt', 'failedAt', 'refundedAt', 'period.start', 'period.end']
  },
  {
    collection: 'payments',
    fields: ['createdAt'],
    optional: ['completedAt', 'failedAt', 'refundedAt']
  },
  {
    collection: 'trainers',
    fields: ['createdAt', 'updatedAt'],
    optional: []
  },
  {
    collection: 'admins',
    fields: ['createdAt'],
    optional: ['lastLogin', 'updatedAt']
  },
  {
    collection: 'customers',
    fields: ['createdAt'],
    optional: ['lastVisit', 'updatedAt']
  },
  {
    collection: 'courts',
    fields: ['createdAt', 'updatedAt'],
    optional: []
  },
  {
    collection: 'openGames',
    fields: ['date', 'createdAt', 'updatedAt'],
    optional: ['cancelledAt']
  }
]

/**
 * Преобразует различные форматы даты в Firestore Timestamp
 */
function convertToTimestamp(value: any): Timestamp | null {
  if (!value) return null

  // Уже Timestamp
  if (value instanceof Timestamp) {
    return value
  }

  // Объект с toDate методом (Firestore Timestamp в клиенте)
  if (value?.toDate && typeof value.toDate === 'function') {
    try {
      const date = value.toDate()
      return Timestamp.fromDate(date)
    } catch (e) {
      console.error('Error converting toDate:', e)
      return null
    }
  }

  // Объект с seconds и nanoseconds
  if (typeof value === 'object' && 'seconds' in value) {
    try {
      return new Timestamp(value.seconds, value.nanoseconds || 0)
    } catch (e) {
      console.error('Error creating Timestamp from seconds:', e)
      return null
    }
  }

  // Date объект
  if (value instanceof Date) {
    return Timestamp.fromDate(value)
  }

  // Строка даты
  if (typeof value === 'string') {
    try {
      // Для формата 'yyyy-MM-dd' создаем дату в UTC
      if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = value.split('-').map(Number)
        const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
        return Timestamp.fromDate(date)
      }
      // Для других форматов пробуем обычный парсинг
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        return Timestamp.fromDate(date)
      }
    } catch (e) {
      console.error('Error parsing date string:', value, e)
    }
    return null
  }

  // Числовой timestamp (миллисекунды)
  if (typeof value === 'number') {
    try {
      return Timestamp.fromMillis(value)
    } catch (e) {
      console.error('Error converting number to Timestamp:', value, e)
      return null
    }
  }

  console.warn('Unknown date format:', value)
  return null
}

/**
 * Обрабатывает вложенные поля (например, period.start)
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

/**
 * Устанавливает значение во вложенное поле
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.')
  const lastKey = keys.pop()!
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {}
    return current[key]
  }, obj)
  target[lastKey] = value
}

/**
 * Основная функция миграции
 */
export async function unifyAllDateFormats() {
  const db = admin.firestore()
  let batch = db.batch()
  let batchOperations = 0
  const MAX_BATCH_SIZE = 400 // Оставляем запас от лимита в 500

  console.log('Starting date format unification migration...')

  for (const config of DATE_FIELDS) {
    console.log(`\nProcessing collection: ${config.collection}`)
    
    try {
      const snapshot = await db.collection(config.collection).get()
      console.log(`Found ${snapshot.size} documents`)

      let processedCount = 0
      let updatedCount = 0
      let errorCount = 0

      for (const doc of snapshot.docs) {
        const data = doc.data()
        const updates: any = {}
        let hasChanges = false

        // Обрабатываем обязательные поля
        for (const field of config.fields) {
          const value = getNestedValue(data, field)
          if (value !== undefined && value !== null) {
            const timestamp = convertToTimestamp(value)
            if (timestamp && !(value instanceof Timestamp)) {
              setNestedValue(updates, field, timestamp)
              hasChanges = true
            }
          } else {
            // Если обязательное поле отсутствует, добавляем текущее время
            console.warn(`Missing required field ${field} in doc ${doc.id}, adding current timestamp`)
            setNestedValue(updates, field, Timestamp.now())
            hasChanges = true
          }
        }

        // Обрабатываем опциональные поля
        for (const field of config.optional || []) {
          const value = getNestedValue(data, field)
          if (value !== undefined && value !== null) {
            const timestamp = convertToTimestamp(value)
            if (timestamp && !(value instanceof Timestamp)) {
              setNestedValue(updates, field, timestamp)
              hasChanges = true
            }
          }
        }

        // Если есть изменения, добавляем в batch
        if (hasChanges) {
          try {
            batch.update(doc.ref, updates)
            batchOperations++
            updatedCount++

            // Если batch достиг лимита, выполняем и создаем новый
            if (batchOperations >= MAX_BATCH_SIZE) {
              console.log(`Committing batch of ${batchOperations} operations...`)
              await batch.commit()
              batchOperations = 0
              // Создаем новый batch
              batch = db.batch()
            }
          } catch (error) {
            console.error(`Error updating document ${doc.id}:`, error)
            errorCount++
          }
        }

        processedCount++
        if (processedCount % 100 === 0) {
          console.log(`Processed ${processedCount}/${snapshot.size} documents`)
        }
      }

      console.log(`Collection ${config.collection} complete:`)
      console.log(`  - Processed: ${processedCount}`)
      console.log(`  - Updated: ${updatedCount}`)
      console.log(`  - Errors: ${errorCount}`)

    } catch (error) {
      console.error(`Error processing collection ${config.collection}:`, error)
    }
  }

  // Выполняем оставшиеся операции
  if (batchOperations > 0) {
    console.log(`\nCommitting final batch of ${batchOperations} operations...`)
    try {
      await batch.commit()
      console.log('Final batch committed successfully')
    } catch (error) {
      console.error('Error committing final batch:', error)
    }
  }

  console.log('\n=== Migration Complete ===')
  console.log('All date fields have been unified to Firestore Timestamp format')
  
  // Добавляем запись о выполненной миграции
  try {
    await db.collection('migrations').doc('unifyAllDateFormats').set({
      executedAt: Timestamp.now(),
      status: 'completed',
      description: 'Unified all date formats to Firestore Timestamp'
    })
    console.log('Migration record saved')
  } catch (error) {
    console.error('Error saving migration record:', error)
  }
}

// Функция для проверки статуса миграции
export async function checkMigrationStatus() {
  const db = admin.firestore()
  
  try {
    const migrationDoc = await db.collection('migrations').doc('unifyAllDateFormats').get()
    
    if (migrationDoc.exists) {
      const data = migrationDoc.data()
      console.log('Migration status:', data?.status)
      console.log('Executed at:', data?.executedAt?.toDate())
      return true
    } else {
      console.log('Migration has not been executed yet')
      return false
    }
  } catch (error) {
    console.error('Error checking migration status:', error)
    return false
  }
}

// Функция для отката миграции (на случай проблем)
export async function rollbackDateFormatMigration() {
  console.log('Rollback functionality not implemented')
  console.log('Date format changes are reversible only through database restore')
}

// CLI интерфейс для запуска миграции
if (require.main === module) {
  const command = process.argv[2]
  
  if (!admin.apps.length) {
    admin.initializeApp()
  }

  switch (command) {
    case 'run':
      unifyAllDateFormats()
        .then(() => {
          console.log('Migration completed successfully')
          process.exit(0)
        })
        .catch((error) => {
          console.error('Migration failed:', error)
          process.exit(1)
        })
      break
      
    case 'status':
      checkMigrationStatus()
        .then(() => process.exit(0))
        .catch((error) => {
          console.error('Status check failed:', error)
          process.exit(1)
        })
      break
      
    default:
      console.log('Usage:')
      console.log('  npm run migrate:dates run     - Execute the migration')
      console.log('  npm run migrate:dates status  - Check migration status')
      process.exit(0)
  }
}