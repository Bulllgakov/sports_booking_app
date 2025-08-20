import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { 
  collection, 
  query, 
  getDocs,
  updateDoc,
  doc,
  Timestamp 
} from 'firebase/firestore'
import { db } from '../../services/firebase'

export default function FixBookingDates() {
  const { admin } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [fixedCount, setFixedCount] = useState(0)

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
    console.log(message)
  }

  const fixBookingDates = async () => {
    if (!admin || admin.role !== 'superadmin') {
      addLog('❌ Только суперадмин может выполнить эту операцию')
      return
    }

    setIsProcessing(true)
    setLogs([])
    setFixedCount(0)
    
    addLog('🔄 Начинаем корректировку дат бронирований...')
    
    try {
      // Получаем все бронирования
      const bookingsRef = collection(db, 'bookings')
      const snapshot = await getDocs(bookingsRef)
      
      addLog(`📊 Найдено всего бронирований: ${snapshot.size}`)
      
      let fixed = 0
      const updates: Promise<void>[] = []
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data()
        const bookingId = docSnap.id
        
        // Проверяем дату бронирования
        if (data.date) {
          const bookingDate = data.date.toDate ? data.date.toDate() : new Date(data.date)
          
          // Проверяем дату в часовом поясе клуба
          const dateInMoscow = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Moscow',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(bookingDate)
          
          const dateInYekaterinburg = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Yekaterinburg',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(bookingDate)
          
          // ТОЛЬКО корректируем бронирования, которые были созданы 18 августа,
          // но из-за проблемы с часовыми поясами сохранились с неправильной датой
          let needsFix = false
          let correctedDate: Date | null = null
          
          // Проверяем, было ли бронирование создано 18 августа
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null
          if (createdAt) {
            const createdDateStr = new Intl.DateTimeFormat('en-CA', {
              timeZone: 'Asia/Yekaterinburg',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).format(createdAt)
            
            // Если бронирование было создано 18 августа
            if (createdDateStr === '2025-08-18') {
              // И если оно отображается как 19 августа в Екатеринбурге
              if (dateInYekaterinburg === '2025-08-19') {
                needsFix = true
                // Корректируем дату - вычитаем часы в зависимости от того, как сохранилось
                if (dateInMoscow === '2025-08-18') {
                  // Если в Москве показывает 18, а в Екб 19 - вычитаем 5 часов
                  correctedDate = new Date(bookingDate.getTime() - 5 * 60 * 60 * 1000)
                } else if (dateInMoscow === '2025-08-19') {
                  // Если и в Москве и в Екб показывает 19 - вычитаем 24 часа
                  correctedDate = new Date(bookingDate.getTime() - 24 * 60 * 60 * 1000)
                }
              }
              // Также проверяем если уже была попытка исправления
              else if (!data._dateFixed && dateInMoscow === '2025-08-19') {
                needsFix = true
                correctedDate = new Date(bookingDate.getTime() - 3 * 60 * 60 * 1000)
              }
            }
          }
          
          if (needsFix && correctedDate) {
            addLog(`🔍 Найдено бронирование для корректировки: ${bookingId}`)
            addLog(`   Клиент: ${data.customerName || data.clientName || 'Неизвестно'}`)
            addLog(`   Время: ${data.startTime || data.time || 'Неизвестно'}`)
            addLog(`   Текущая дата UTC: ${bookingDate.toISOString()}`)
            addLog(`   Дата в Moscow: ${dateInMoscow}`)
            addLog(`   Дата в Yekaterinburg: ${dateInYekaterinburg}`)
            addLog(`   ✅ Корректируем на: ${correctedDate.toISOString()}`)
            
            // Обновляем документ
            const updateData: any = {
              date: Timestamp.fromDate(correctedDate),
              _dateFixed: true,
              _dateFixedAt: Timestamp.now()
            }
            
            // Добавляем uid только если он есть
            if (admin?.uid) {
              updateData._dateFixedBy = admin.uid
            }
            
            const updatePromise = updateDoc(doc(db, 'bookings', bookingId), updateData)
            
            updates.push(updatePromise)
            fixed++
          }
        }
      }
      
      if (updates.length > 0) {
        addLog(`\n🔧 Исправляем ${fixed} бронирований...`)
        await Promise.all(updates)
        setFixedCount(fixed)
        addLog(`✅ Успешно исправлено ${fixed} бронирований!`)
      } else {
        addLog('✅ Не найдено бронирований, требующих корректировки')
      }
      
    } catch (error) {
      console.error('Error fixing booking dates:', error)
      addLog(`❌ Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!admin || admin.role !== 'superadmin') {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Доступ запрещен</h2>
        <p>Только суперадмин может использовать эту функцию</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🔧 Корректировка дат бронирований</h2>
      
      <div style={{ 
        background: '#fff3cd', 
        border: '1px solid #ffc107',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px'
      }}>
        <h3>⚠️ Внимание!</h3>
        <p>Эта операция исправит даты бронирований, которые были созданы 18 августа 2025,</p>
        <p>но отображаются как 19 августа из-за проблемы с часовыми поясами.</p>
        <p><strong>Будут исправлены только бронирования, созданные сегодня (18 августа).</strong></p>
      </div>

      <button 
        onClick={fixBookingDates}
        disabled={isProcessing}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: isProcessing ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {isProcessing ? '⏳ Обработка...' : '🚀 Начать корректировку'}
      </button>

      {fixedCount > 0 && (
        <div style={{
          background: '#d4edda',
          border: '1px solid #28a745',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <h3>✅ Успешно!</h3>
          <p>Исправлено бронирований: <strong>{fixedCount}</strong></p>
        </div>
      )}

      {logs.length > 0 && (
        <div style={{
          background: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '15px',
          fontFamily: 'monospace',
          fontSize: '12px',
          maxHeight: '400px',
          overflow: 'auto'
        }}>
          <h3>📋 Лог операций:</h3>
          {logs.map((log, index) => (
            <div key={index} style={{ marginBottom: '5px' }}>
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}