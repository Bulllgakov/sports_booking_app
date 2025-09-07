import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

const BACKUP_BUCKET = 'gs://sports-booking-backups-1d7e5'

/**
 * Scheduled function to backup Firestore database
 * Runs daily at 3:00 AM Moscow time
 */
export const scheduledFirestoreBackup = functions
  .region('europe-west1')
  .pubsub
  .schedule('0 3 * * *')
  .timeZone('Europe/Moscow')
  .onRun(async (context) => {
    const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT
    
    if (!projectId) {
      console.error('Project ID not found in environment')
      return null
    }

    const databaseName = `projects/${projectId}/databases/(default)`
    
    // Generate backup path with timestamp
    const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const outputUriPrefix = `${BACKUP_BUCKET}/backups/${timestamp}`
    
    try {
      // Import firestore client
      const firestore = require('@google-cloud/firestore')
      const client = new firestore.v1.FirestoreAdminClient()
      
      // Collections to backup (empty array means all collections)
      const collectionIds: string[] = []
      
      console.log(`Starting backup to ${outputUriPrefix}`)
      
      // Initiate the backup
      const [operation] = await client.exportDocuments({
        name: databaseName,
        outputUriPrefix,
        collectionIds: collectionIds.length > 0 ? collectionIds : undefined
      })
      
      console.log(`Backup operation started: ${operation.name}`)
      
      // Log success
      await admin.firestore().collection('backup_logs').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'started',
        outputPath: outputUriPrefix,
        operationName: operation.name,
        type: 'scheduled_daily'
      })
      
      return { success: true, operation: operation.name }
    } catch (error) {
      console.error('Backup failed:', error)
      
      // Log failure
      await admin.firestore().collection('backup_logs').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        type: 'scheduled_daily'
      })
      
      throw error
    }
  })

/**
 * Manual backup function that can be triggered via HTTP
 */
export const manualFirestoreBackup = functions
  .region('europe-west1')
  .https
  .onCall(async (data, context) => {
    // Check if user is authenticated and is admin
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to perform backup'
      )
    }
    
    // Check if user is admin
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get()
    
    const userData = userDoc.data()
    if (!userData || userData.role !== 'superadmin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only superadmin can trigger manual backups'
      )
    }
    
    const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT
    
    if (!projectId) {
      throw new functions.https.HttpsError(
        'internal',
        'Project ID not found'
      )
    }
    
    const databaseName = `projects/${projectId}/databases/(default)`
    
    // Generate backup path with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-')
    const outputUriPrefix = `${BACKUP_BUCKET}/manual-backups/${timestamp}`
    
    try {
      const firestore = require('@google-cloud/firestore')
      const client = new firestore.v1.FirestoreAdminClient()
      
      console.log(`Starting manual backup to ${outputUriPrefix}`)
      
      const [operation] = await client.exportDocuments({
        name: databaseName,
        outputUriPrefix,
        collectionIds: data.collections || undefined
      })
      
      console.log(`Manual backup operation started: ${operation.name}`)
      
      // Log success
      await admin.firestore().collection('backup_logs').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'started',
        outputPath: outputUriPrefix,
        operationName: operation.name,
        type: 'manual',
        triggeredBy: context.auth.uid
      })
      
      return { 
        success: true, 
        operation: operation.name,
        outputPath: outputUriPrefix
      }
    } catch (error) {
      console.error('Manual backup failed:', error)
      
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // Log failure
      await admin.firestore().collection('backup_logs').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'failed',
        error: errorMessage,
        type: 'manual',
        triggeredBy: context.auth.uid
      })
      
      throw new functions.https.HttpsError(
        'internal',
        `Backup failed: ${errorMessage}`
      )
    }
  })

/**
 * Clean up old backups (keep last 30 days)
 */
export const cleanupOldBackups = functions
  .region('europe-west1')
  .pubsub
  .schedule('0 4 * * 1') // Every Monday at 4 AM
  .timeZone('Europe/Moscow')
  .onRun(async (context) => {
    const storage = admin.storage()
    const bucket = storage.bucket('sports-booking-backups-1d7e5')
    
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    try {
      const [files] = await bucket.getFiles({
        prefix: 'backups/'
      })
      
      let deletedCount = 0
      
      for (const file of files) {
        const metadata = file.metadata
        if (metadata && metadata.timeCreated) {
          const created = new Date(metadata.timeCreated)
          
          if (created < thirtyDaysAgo) {
            await file.delete()
            deletedCount++
            console.log(`Deleted old backup: ${file.name}`)
          }
        }
      }
      
      console.log(`Cleanup completed. Deleted ${deletedCount} old backups`)
      
      // Log cleanup
      await admin.firestore().collection('backup_logs').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'cleanup_completed',
        deletedFiles: deletedCount,
        type: 'cleanup'
      })
      
      return { success: true, deletedFiles: deletedCount }
    } catch (error) {
      console.error('Cleanup failed:', error)
      
      await admin.firestore().collection('backup_logs').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'cleanup_failed',
        error: error instanceof Error ? error.message : String(error),
        type: 'cleanup'
      })
      
      throw error
    }
  })