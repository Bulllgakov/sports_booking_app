import React from 'react'
import { History, AccountCircle } from '@mui/icons-material'

interface PaymentHistoryEntry {
  timestamp: any // Firestore Timestamp
  action: 'created' | 'paid' | 'cancelled'
  userId: string
  userName?: string
  note?: string
}

interface PaymentHistoryProps {
  history?: PaymentHistoryEntry[]
}

const actionLabels = {
  created: 'Создано бронирование',
  paid: 'Оплачено',
  cancelled: 'Отменено'
}

const actionColors = {
  created: '#6B7280',
  paid: '#10B981',
  cancelled: '#EF4444'
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
        История платежей
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
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: actionColors[entry.action],
              flexShrink: 0
            }} />
            
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

            {entry.note && (
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