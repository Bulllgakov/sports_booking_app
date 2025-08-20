import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { 
  collection, 
  query, 
  getDocs,
  updateDoc,
  doc,
  Timestamp,
  where
} from 'firebase/firestore'
import { db } from '../../services/firebase'

export default function FixBookingDatesAdvanced() {
  const { admin, club } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [fixedCount, setFixedCount] = useState(0)
  const [targetDate, setTargetDate] = useState('2025-08-18')

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
    console.log(message)
  }

  const analyzeAndFixDates = async () => {
    if (!admin || admin.role !== 'superadmin') {
      addLog('❌ Только суперадмин может выполнить эту операцию')
      return
    }

    setIsProcessing(true)
    setLogs([])
    setFixedCount(0)
    
    const clubTimezone = club?.timezone || 'Asia/Yekaterinburg'
    addLog(`🔄 Анализируем бронирования для даты ${targetDate}`)
    addLog(`📍 Часовой пояс клуба: ${clubTimezone}`)
    
    try {
      // Получаем все бронирования
      const bookingsRef = collection(db, 'bookings')
      const snapshot = await getDocs(bookingsRef)
      
      addLog(`📊 Найдено всего бронирований: ${snapshot.size}`)
      
      let fixed = 0
      const updates: Promise<void>[] = []
      const problematicBookings: any[] = []
      const debugInfo: any[] = []
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data()
        const bookingId = docSnap.id
        
        if (data.date) {
          const bookingDate = data.date.toDate ? data.date.toDate() : new Date(data.date)
          
          // Форматируем как в списке (локальное время браузера)
          const localDateStr = new Intl.DateTimeFormat('en-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(bookingDate)
          
          // Форматируем в часовом поясе клуба
          const clubDateStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: clubTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(bookingDate)
          
          // Также попробуем форматировать в других часовых поясах
          const moscowDateStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Moscow',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(bookingDate)
          
          const yekaterinburgDateStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Yekaterinburg',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(bookingDate)
          
          // Собираем отладочную информацию для бронирований вокруг целевой даты
          // Показываем бронирования на 17, 18, 19 августа
          if ((localDateStr >= '2025-08-17' && localDateStr <= '2025-08-19') ||
              (clubDateStr >= '2025-08-17' && clubDateStr <= '2025-08-19') ||
              (yekaterinburgDateStr >= '2025-08-17' && yekaterinburgDateStr <= '2025-08-19')) {
            if (debugInfo.length < 20) {  // Увеличиваем лимит для лучшей диагностики
              debugInfo.push({
                id: bookingId,
                customerName: data.customerName || data.clientName,
                time: data.startTime || data.time,
                dateISO: bookingDate.toISOString(),
                localDate: localDateStr,
                clubDate: clubDateStr,
                moscowDate: moscowDateStr,
                yekaterinburgDate: yekaterinburgDateStr
              })
            }
          }
          
          // Проверяем разные условия для поиска проблемных бронирований
          // Условие 1: локальная дата совпадает с целевой, но в часовом поясе клуба - нет
          if (localDateStr === targetDate && clubDateStr !== targetDate) {
            problematicBookings.push({
              id: bookingId,
              customerName: data.customerName || data.clientName,
              time: data.startTime || data.time,
              currentDate: bookingDate,
              localDate: localDateStr,
              clubDate: clubDateStr,
              reason: 'Локальная дата совпадает, но в часовом поясе клуба отличается'
            })
          }
          // Условие 2: в часовом поясе клуба показывает на день позже целевой даты
          else if (clubDateStr === '2025-08-19' && localDateStr === targetDate) {
            problematicBookings.push({
              id: bookingId,
              customerName: data.customerName || data.clientName,
              time: data.startTime || data.time,
              currentDate: bookingDate,
              localDate: localDateStr,
              clubDate: clubDateStr,
              reason: 'В часовом поясе клуба показывает 19 августа вместо 18'
            })
          }
          // Условие 3: проверяем по времени UTC
          else if (bookingDate.toISOString().startsWith('2025-08-18T19:') || 
                   bookingDate.toISOString().startsWith('2025-08-18T20:') ||
                   bookingDate.toISOString().startsWith('2025-08-18T21:')) {
            problematicBookings.push({
              id: bookingId,
              customerName: data.customerName || data.clientName,
              time: data.startTime || data.time,
              currentDate: bookingDate,
              localDate: localDateStr,
              clubDate: clubDateStr,
              reason: 'UTC время указывает на вечер 18 августа (возможно неправильная дата)'
            })
          }
        }
      }
      
      // ВСЕГДА показываем отладочную информацию для понимания ситуации
      if (debugInfo.length > 0) {
        addLog(`\n📋 Примеры первых ${debugInfo.length} бронирований для анализа:`)
        debugInfo.forEach(info => {
          addLog(`\n🔍 ${info.customerName || 'Неизвестно'} - ${info.time || ''}`)
          addLog(`   ID: ${info.id}`)
          addLog(`   UTC: ${info.dateISO}`)
          addLog(`   Локальная дата: ${info.localDate}`)
          addLog(`   В часовом поясе клуба: ${info.clubDate}`)
          addLog(`   В Москве: ${info.moscowDate}`)
          addLog(`   В Екатеринбурге: ${info.yekaterinburgDate}`)
        })
      } else {
        addLog(`\n⚠️ Нет бронирований для анализа`)
      }
      
      if (problematicBookings.length > 0) {
        addLog(`\n🔍 Найдено ${problematicBookings.length} бронирований, требующих корректировки:`)
        
        for (const booking of problematicBookings) {
          addLog(`\n📌 Бронирование ${booking.id}`)
          addLog(`   Клиент: ${booking.customerName || 'Неизвестно'}`)
          addLog(`   Время: ${booking.time || 'Неизвестно'}`)
          addLog(`   Причина: ${booking.reason}`)
          addLog(`   Текущая дата UTC: ${booking.currentDate.toISOString()}`)
          addLog(`   Отображается в списке как: ${booking.localDate}`)
          addLog(`   В часовом поясе клуба: ${booking.clubDate}`)
          
          // Вычисляем правильную дату
          // Нужно установить дату так, чтобы в часовом поясе клуба было targetDate
          const [year, month, day] = targetDate.split('-').map(Number)
          
          // Определяем смещение часового пояса
          let offsetHours = 5 // По умолчанию для Екатеринбурга
          if (clubTimezone === 'Europe/Moscow') offsetHours = 3
          else if (clubTimezone === 'Asia/Yekaterinburg') offsetHours = 5
          
          // Создаем правильную дату
          // Для того чтобы в часовом поясе +5 было 18 августа 00:00,
          // в UTC должно быть 17 августа 19:00
          const correctedDate = new Date(Date.UTC(year, month - 1, day - 1, 24 - offsetHours, 0, 0))
          
          addLog(`   ✅ Корректируем на: ${correctedDate.toISOString()}`)
          
          const correctDateInClub = new Intl.DateTimeFormat('en-CA', {
            timeZone: clubTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(correctedDate)
          
          addLog(`   Проверка: в часовом поясе клуба будет ${correctDateInClub}`)
          
          // Обновляем документ
          const updateData: any = {
            date: Timestamp.fromDate(correctedDate),
            _dateFixedAdvanced: true,
            _dateFixedAt: Timestamp.now()
          }
          
          if (admin?.uid) {
            updateData._dateFixedBy = admin.uid
          }
          
          const updatePromise = updateDoc(doc(db, 'bookings', booking.id), updateData)
          updates.push(updatePromise)
          fixed++
        }
        
        if (updates.length > 0) {
          addLog(`\n🔧 Применяем изменения к ${fixed} бронированиям...`)
          await Promise.all(updates)
          setFixedCount(fixed)
          addLog(`✅ Успешно исправлено ${fixed} бронирований!`)
        }
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
      <h2>🔧 Расширенная корректировка дат бронирований</h2>
      
      <div style={{ 
        background: '#e3f2fd', 
        border: '1px solid #2196f3',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px'
      }}>
        <h3>ℹ️ Информация</h3>
        <p>Эта утилита находит бронирования, которые:</p>
        <ul>
          <li>Отображаются в списке как выбранная дата (по локальному времени браузера)</li>
          <li>Но в календаре не показываются (из-за разницы часовых поясов)</li>
        </ul>
        <p>Часовой пояс вашего клуба: <strong>{club?.timezone || 'Asia/Yekaterinburg'}</strong></p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Целевая дата для корректировки:
        </label>
        <input 
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          disabled={isProcessing}
          style={{
            padding: '8px',
            fontSize: '16px',
            borderRadius: '5px',
            border: '1px solid #ccc',
            marginRight: '10px'
          }}
        />
      </div>

      <button 
        onClick={analyzeAndFixDates}
        disabled={isProcessing}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: isProcessing ? '#ccc' : '#2196f3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {isProcessing ? '⏳ Анализ и корректировка...' : '🔍 Анализировать и исправить'}
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
          <p>Обновите страницу с календарем, чтобы увидеть изменения.</p>
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
          maxHeight: '500px',
          overflow: 'auto'
        }}>
          <h3>📋 Лог операций:</h3>
          {logs.map((log, index) => (
            <div key={index} style={{ marginBottom: '5px', whiteSpace: 'pre-wrap' }}>
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}