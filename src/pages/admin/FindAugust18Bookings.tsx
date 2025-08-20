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

export default function FindAugust18Bookings() {
  const { admin, club } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [august18Bookings, setAugust18Bookings] = useState<any[]>([])
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set())

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
    console.log(message)
  }

  const findAugust18Bookings = async () => {
    if (!admin) {
      addLog('❌ Необходимо войти в систему')
      return
    }

    setIsProcessing(true)
    setLogs([])
    setAugust18Bookings([])
    setSelectedBookings(new Set())
    
    addLog('🔍 Ищем все бронирования на 18 августа в часовом поясе клуба...')
    
    try {
      // Получаем все бронирования
      const bookingsRef = collection(db, 'bookings')
      const snapshot = await getDocs(bookingsRef)
      
      addLog(`📊 Найдено всего бронирований: ${snapshot.size}`)
      
      const found: any[] = []
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data()
        const bookingId = docSnap.id
        
        if (data.date) {
          const bookingDate = data.date.toDate ? data.date.toDate() : new Date(data.date)
          const clubTimezone = club?.timezone || 'Asia/Yekaterinburg'
          
          // Проверяем дату в часовом поясе клуба
          const clubDateStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: clubTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(bookingDate)
          
          // Проверяем, является ли дата 18 августа 2025 в часовом поясе клуба
          if (clubDateStr === '2025-08-18') {
            // Форматируем дату для отображения в русском формате
            const displayDate = new Intl.DateTimeFormat('ru-RU', {
              timeZone: clubTimezone,
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }).format(bookingDate)
            
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
            
            found.push({
              id: bookingId,
              customerName: data.customerName || data.clientName || 'Неизвестно',
              time: data.startTime || data.time || 'Неизвестно',
              dateISO: bookingDate.toISOString(),
              displayDate: displayDate,
              clubDate: clubDateStr,
              moscowDate: moscowDateStr,
              yekaterinburgDate: yekaterinburgDateStr,
              rawData: data
            })
          }
        }
      }
      
      setAugust18Bookings(found)
      
      if (found.length > 0) {
        addLog(`\n✅ Найдено ${found.length} бронирований на 18 августа:`)
        
        found.forEach((booking, index) => {
          addLog(`\n📌 Бронирование ${index + 1}:`)
          addLog(`   ID: ${booking.id}`)
          addLog(`   Клиент: ${booking.customerName}`)
          addLog(`   Время: ${booking.time}`)
          addLog(`   Отображается как: ${booking.displayDate}`)
          addLog(`   UTC: ${booking.dateISO}`)
          addLog(`   В часовом поясе клуба: ${booking.clubDate}`)
          addLog(`   В Москве: ${booking.moscowDate}`)
          addLog(`   В Екатеринбурге: ${booking.yekaterinburgDate}`)
        })
      } else {
        addLog('❌ Не найдено бронирований на 18 августа')
      }
      
    } catch (error) {
      console.error('Error finding bookings:', error)
      addLog(`❌ Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSelectBooking = (bookingId: string) => {
    const newSelected = new Set(selectedBookings)
    if (newSelected.has(bookingId)) {
      newSelected.delete(bookingId)
    } else {
      newSelected.add(bookingId)
    }
    setSelectedBookings(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedBookings.size === august18Bookings.length) {
      setSelectedBookings(new Set())
    } else {
      setSelectedBookings(new Set(august18Bookings.map(b => b.id)))
    }
  }

  const fixBookings = async () => {
    if (selectedBookings.size === 0) {
      addLog('❌ Не выбрано бронирований для исправления')
      return
    }

    setIsProcessing(true)
    addLog(`\n🔧 Начинаем исправление ${selectedBookings.size} выбранных бронирований...`)

    try {
      const updates: Promise<void>[] = []
      const clubTimezone = club?.timezone || 'Asia/Yekaterinburg'
      const selectedBookingsList = august18Bookings.filter(b => selectedBookings.has(b.id))
      
      for (const booking of selectedBookingsList) {
        // Определяем смещение часового пояса
        let offsetHours = 5 // По умолчанию для Екатеринбурга
        if (clubTimezone === 'Europe/Moscow') offsetHours = 3
        
        // Создаем Timestamp для 18 августа 2025 в полночь UTC
        // Это будет отображаться как 18 августа везде, независимо от часового пояса
        const correctedDate = new Date(Date.UTC(2025, 7, 18, 0, 0, 0, 0))
        
        addLog(`\n🔄 Исправляем ${booking.id}`)
        addLog(`   Было: ${booking.dateISO}`)
        addLog(`   Будет: ${correctedDate.toISOString()}`)
        
        const updateData: any = {
          date: Timestamp.fromDate(correctedDate),
          _dateFixedManual: true,
          _dateFixedAt: Timestamp.now()
        }
        
        if (admin?.uid) {
          updateData._dateFixedBy = admin.uid
        }
        
        const updatePromise = updateDoc(doc(db, 'bookings', booking.id), updateData)
        updates.push(updatePromise)
      }
      
      await Promise.all(updates)
      addLog(`\n✅ Успешно исправлено ${selectedBookings.size} бронирований!`)
      addLog('🔄 Обновите страницу с календарем, чтобы увидеть изменения')
      
      // Сбрасываем выбор после успешного исправления
      setSelectedBookings(new Set())
      
    } catch (error) {
      console.error('Error fixing bookings:', error)
      addLog(`❌ Ошибка при исправлении: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!admin) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Доступ запрещен</h2>
        <p>Необходимо войти в систему</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h2>🔍 Поиск и исправление бронирований на 18 августа</h2>
      
      <div style={{ 
        background: '#e3f2fd', 
        border: '1px solid #2196f3',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px'
      }}>
        <h3>ℹ️ Информация</h3>
        <p>Эта утилита находит все бронирования на 18 августа 2025 года в часовом поясе клуба</p>
        <p>и позволяет выборочно исправить их даты для корректного отображения в календаре.</p>
        <p><strong>Выберите нужные бронирования</strong> и нажмите кнопку исправления.</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={findAugust18Bookings}
          disabled={isProcessing}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: isProcessing ? '#ccc' : '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {isProcessing ? '⏳ Поиск...' : '🔍 Найти бронирования на 18 августа'}
        </button>

        {august18Bookings.length > 0 && (
          <>
            <button 
              onClick={handleSelectAll}
              disabled={isProcessing}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: isProcessing ? '#ccc' : '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                marginRight: '10px'
              }}
            >
              {selectedBookings.size === august18Bookings.length ? '❌ Снять выбор' : '☑️ Выбрать все'}
            </button>
            
            <button 
              onClick={fixBookings}
              disabled={isProcessing || selectedBookings.size === 0}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: isProcessing || selectedBookings.size === 0 ? '#ccc' : '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: isProcessing || selectedBookings.size === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {isProcessing ? '⏳ Исправление...' : `✅ Исправить ${selectedBookings.size} выбранных`}
            </button>
          </>
        )}
      </div>

      {august18Bookings.length > 0 && (
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <h3>📋 Найденные бронирования на 18 августа:</h3>
          <div style={{ maxHeight: '300px', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '8px', textAlign: 'center', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedBookings.size === august18Bookings.length && august18Bookings.length > 0}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Клиент</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Время</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Дата (клуб)</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>UTC</th>
                </tr>
              </thead>
              <tbody>
                {august18Bookings.map((booking, index) => (
                  <tr 
                    key={booking.id} 
                    style={{ 
                      borderBottom: '1px solid #eee',
                      backgroundColor: selectedBookings.has(booking.id) ? '#e3f2fd' : 'transparent',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleSelectBooking(booking.id)}
                  >
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedBookings.has(booking.id)}
                        onChange={() => handleSelectBooking(booking.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>{booking.customerName}</td>
                    <td style={{ padding: '8px' }}>{booking.time}</td>
                    <td style={{ padding: '8px' }}>{booking.displayDate}</td>
                    <td style={{ padding: '8px', fontSize: '11px' }}>{booking.dateISO}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            <div key={index} style={{ marginBottom: '5px', whiteSpace: 'pre-wrap' }}>
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}