import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore'
import { db } from '../services/firebase'

export async function migrateSubscriptionPlans() {
  console.log('🚀 Начинаем миграцию тарифов...')
  
  try {
    // Получаем все подписки
    const subscriptionsRef = collection(db, 'subscriptions')
    const subscriptionsSnapshot = await getDocs(subscriptionsRef)
    
    let updated = 0
    let skipped = 0
    
    for (const docSnapshot of subscriptionsSnapshot.docs) {
      const data = docSnapshot.data()
      let needsUpdate = false
      let newPlan = data.plan
      
      // Преобразуем старые названия в новые
      if (data.plan === 'start') {
        newPlan = 'basic'
        needsUpdate = true
      } else if (data.plan === 'standard') {
        newPlan = 'crm'
        needsUpdate = true
      }
      
      if (needsUpdate) {
        await updateDoc(doc(db, 'subscriptions', docSnapshot.id), {
          plan: newPlan,
          updatedAt: new Date()
        })
        
        console.log(`✅ Обновлен тариф для подписки ${docSnapshot.id}: ${data.plan} → ${newPlan}`)
        updated++
      } else {
        skipped++
      }
    }
    
    console.log(`\n📊 Результаты миграции:`)
    console.log(`✅ Обновлено: ${updated} подписок`)
    console.log(`⏭️ Пропущено: ${skipped} подписок (уже имеют новые названия)`)
    console.log(`📝 Всего обработано: ${subscriptionsSnapshot.size} подписок`)
    
    return { success: true, updated, skipped, total: subscriptionsSnapshot.size }
  } catch (error) {
    console.error('❌ Ошибка при миграции:', error)
    return { success: false, error }
  }
}

// Функция для миграции одной подписки
export async function migrateSingleSubscription(venueId: string) {
  try {
    const subsQuery = query(
      collection(db, 'subscriptions'),
      where('venueId', '==', venueId),
      where('status', 'in', ['active', 'trial'])
    )
    const snapshot = await getDocs(subsQuery)
    
    if (!snapshot.empty) {
      const subDoc = snapshot.docs[0]
      const data = subDoc.data()
      
      if (data.plan === 'start' || data.plan === 'standard') {
        const newPlan = data.plan === 'start' ? 'basic' : 'crm'
        
        await updateDoc(doc(db, 'subscriptions', subDoc.id), {
          plan: newPlan,
          updatedAt: new Date()
        })
        
        console.log(`✅ Мигрирована подписка для клуба ${venueId}: ${data.plan} → ${newPlan}`)
        return true
      }
    }
    return false
  } catch (error) {
    console.error('Ошибка миграции подписки:', error)
    return false
  }
}