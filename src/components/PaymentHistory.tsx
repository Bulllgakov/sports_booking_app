import React from 'react'
import { History, AccountCircle, Edit } from '@mui/icons-material'

interface PaymentHistoryEntry {
  timestamp: any // Firestore Timestamp
  action: 'created' | 'paid' | 'cancelled' | 'edited' | 'refunded'
  userId: string
  userName?: string
  note?: string
  changes?: {
    court?: { from: string; to: string }
    date?: { from: string; to: string }
    duration?: { from: string; to: string }
    time?: { from: string; to: string }
  }
}

interface PaymentHistoryProps {
  history?: PaymentHistoryEntry[]
}

const actionLabels = {
  created: 'Создано бронирование',
  paid: 'Оплачено',
  cancelled: 'Отменено',
  edited: 'Изменено бронирование',
  refunded: 'Возврат средств'
}

const actionColors = {
  created: '#6B7280',
  paid: '#10B981',
  cancelled: '#EF4444',
  edited: '#3B82F6',
  refunded: '#F59E0B'
}

const actionIcons = {
  created: null,
  paid: null,
  cancelled: null,
  edited: Edit,
  refunded: null
}

export default function PaymentHistory({ history }: PaymentHistoryProps) {
  if (!history || history.length === 0) {
    return null
  }

  const formatDate = (timestamp: any) => {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  return (
    <div style={{ 
      marginTop: '16px',
      padding: '16px',
      background: 'var(--background)',
      borderRadius: '8px'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        marginBottom: '12px',
        color: 'var(--gray)',
        fontSize: '14px',
        fontWeight: '600'
      }}>
        <History style={{ fontSize: '18px' }} />
        История изменений
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {history.map((entry, index) => (
          <div 
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px',
              background: 'var(--white)',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <div style={{
              width: entry.action === 'edited' ? '20px' : '8px',
              height: entry.action === 'edited' ? '20px' : '8px',
              borderRadius: '50%',
              background: actionColors[entry.action],
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {entry.action === 'edited' && (
                <Edit style={{ fontSize: '12px', color: 'white' }} />
              )}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ 
                color: actionColors[entry.action],
                fontWeight: '500'
              }}>
                {actionLabels[entry.action]}
              </div>
              <div style={{ 
                color: 'var(--gray)', 
                fontSize: '12px',
                marginTop: '2px'
              }}>
                {formatDate(entry.timestamp)}
              </div>
              {/* Отображаем детали изменений */}
              {entry.action === 'edited' && entry.changes && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px',
                  background: 'var(--background)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: 'var(--gray)'
                }}>
                  <div style={{ marginBottom: '4px', fontWeight: '600', color: '#4B5563' }}>
                    Изменения:
                  </div>
                  {entry.changes.court && (
                    <div style={{ marginBottom: '4px', paddingLeft: '8px' }}>
                      <span style={{ color: '#6B7280' }}>Корт:</span>{' '}
                      <span style={{ textDecoration: 'line-through' }}>{entry.changes.court.from}</span>
                      {' → '}
                      <span style={{ color: '#059669', fontWeight: '500' }}>{entry.changes.court.to}</span>
                    </div>
                  )}
                  {entry.changes.date && (
                    <div style={{ marginBottom: '4px', paddingLeft: '8px' }}>
                      <span style={{ color: '#6B7280' }}>Дата:</span>{' '}
                      <span style={{ textDecoration: 'line-through' }}>{entry.changes.date.from}</span>
                      {' → '}
                      <span style={{ color: '#059669', fontWeight: '500' }}>{entry.changes.date.to}</span>
                    </div>
                  )}
                  {entry.changes.duration && (
                    <div style={{ marginBottom: '4px', paddingLeft: '8px' }}>
                      <span style={{ color: '#6B7280' }}>Длительность:</span>{' '}
                      <span style={{ textDecoration: 'line-through' }}>{entry.changes.duration.from}</span>
                      {' → '}
                      <span style={{ color: '#059669', fontWeight: '500' }}>{entry.changes.duration.to}</span>
                    </div>
                  )}
                  {entry.changes.time && (
                    <div style={{ marginBottom: '4px', paddingLeft: '8px' }}>
                      <span style={{ color: '#6B7280' }}>Время:</span>{' '}
                      <span style={{ textDecoration: 'line-through' }}>{entry.changes.time.from}</span>
                      {' → '}
                      <span style={{ color: '#059669', fontWeight: '500' }}>{entry.changes.time.to}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: '4px',
              color: 'var(--gray)',
              fontSize: '12px'
            }}>
              <AccountCircle style={{ fontSize: '16px' }} />
              {entry.userName || 'Администратор'}
            </div>

            {entry.note && entry.action !== 'edited' && (
              <div style={{
                fontSize: '12px',
                color: 'var(--gray)',
                fontStyle: 'italic'
              }}>
                {entry.note}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}