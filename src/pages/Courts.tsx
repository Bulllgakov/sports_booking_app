import React, { useState } from 'react'
import { Add, Edit, Delete } from '@mui/icons-material'
import { Alert, AlertTitle } from '@mui/material'
import '../styles/admin.css'

interface PriceInterval {
  from: string
  to: string
  price: number
}

interface DayPricing {
  basePrice: number
  intervals?: PriceInterval[]
}

interface Court {
  id: string
  name: string
  type: 'tennis' | 'padel' | 'badminton'
  courtType: 'indoor' | 'outdoor'
  pricing?: {
    monday?: DayPricing
    tuesday?: DayPricing
    wednesday?: DayPricing
    thursday?: DayPricing
    friday?: DayPricing
    saturday?: DayPricing
    sunday?: DayPricing
  }
  status: 'active' | 'inactive' | 'maintenance'
  color?: string
}

// Демо корты
const DEMO_COURTS: Court[] = [
  {
    id: '1',
    name: 'Корт №1',
    type: 'padel',
    courtType: 'indoor',
    pricing: {
      monday: { basePrice: 2000, intervals: [{ from: '18:00', to: '21:00', price: 2500 }] },
      tuesday: { basePrice: 2000, intervals: [{ from: '18:00', to: '21:00', price: 2500 }] },
      wednesday: { basePrice: 2000 },
      thursday: { basePrice: 2000 },
      friday: { basePrice: 2000, intervals: [{ from: '18:00', to: '21:00', price: 2500 }] },
      saturday: { basePrice: 2500 },
      sunday: { basePrice: 2500 }
    },
    status: 'active',
    color: '#00A86B'
  },
  {
    id: '2',
    name: 'Корт №2',
    type: 'padel',
    courtType: 'indoor',
    pricing: {
      monday: { basePrice: 2000 },
      tuesday: { basePrice: 2000 },
      wednesday: { basePrice: 2000 },
      thursday: { basePrice: 2000 },
      friday: { basePrice: 2000 },
      saturday: { basePrice: 2500 },
      sunday: { basePrice: 2500 }
    },
    status: 'active',
    color: '#2E86AB'
  },
  {
    id: '3',
    name: 'Теннисный корт',
    type: 'tennis',
    courtType: 'outdoor',
    pricing: {
      monday: { basePrice: 1500 },
      tuesday: { basePrice: 1500 },
      wednesday: { basePrice: 1500 },
      thursday: { basePrice: 1500 },
      friday: { basePrice: 1500 },
      saturday: { basePrice: 2000 },
      sunday: { basePrice: 2000 }
    },
    status: 'active',
    color: '#FF6B6B'
  },
  {
    id: '4',
    name: 'Бадминтон',
    type: 'badminton',
    courtType: 'indoor',
    pricing: {
      monday: { basePrice: 1000 },
      tuesday: { basePrice: 1000 },
      wednesday: { basePrice: 1000 },
      thursday: { basePrice: 1000 },
      friday: { basePrice: 1000 },
      saturday: { basePrice: 1200 },
      sunday: { basePrice: 1200 }
    },
    status: 'active',
    color: '#F39C12'
  }
]

export default function Courts() {
  const [courts] = useState<Court[]>(DEMO_COURTS)
  const [showNotification, setShowNotification] = useState(false)

  const getTypeColor = (type: Court['type']) => {
    switch (type) {
      case 'tennis': return 'tennis'
      case 'padel': return 'padel'
      case 'badminton': return 'badminton'
      default: return 'padel'
    }
  }

  const getTypeLabel = (type: Court['type']) => {
    switch (type) {
      case 'tennis': return 'Теннис'
      case 'padel': return 'Падел'
      case 'badminton': return 'Бадминтон'
      default: return type
    }
  }

  const handleDemoAction = () => {
    setShowNotification(true)
    setTimeout(() => setShowNotification(false), 3000)
  }

  return (
    <div>
      {showNotification && (
        <Alert severity="info" style={{ marginBottom: '24px' }}>
          <AlertTitle>Демо версия</AlertTitle>
          В демо версии редактирование кортов недоступно
        </Alert>
      )}

      <div className="section-card">
        <div className="section-header">
          <h2 className="section-title">Управление кортами</h2>
          <button className="btn btn-primary" onClick={handleDemoAction}>
            <Add fontSize="small" />
            Добавить корт
          </button>
        </div>
      
        <div className="courts-grid">
          {courts.map(court => (
            <div key={court.id} className="court-card">
              <div className="court-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {court.color && (
                    <div 
                      style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '4px', 
                        backgroundColor: court.color,
                        border: '1px solid #e5e7eb'
                      }} 
                    />
                  )}
                  <div>
                    <div className="court-name">{court.name}</div>
                    <span className={`court-type ${getTypeColor(court.type)}`}>
                      {getTypeLabel(court.type)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="court-details">
                <div>Тип: {court.courtType === 'indoor' ? 'Крытый' : 'Открытый'}</div>
                <div>
                  {court.pricing ? (
                    <>Цены: от {Math.min(
                      ...Object.values(court.pricing)
                        .filter(p => p)
                        .map(p => p!.basePrice)
                    )}₽ до {Math.max(
                      ...Object.values(court.pricing)
                        .filter(p => p)
                        .map(p => p!.basePrice)
                    )}₽</>
                  ) : 'Цены не указаны'}
                </div>
                <div>Статус: {court.status === 'active' ? 'Активен' : court.status === 'maintenance' ? 'Обслуживание' : 'Неактивен'}</div>
              </div>
              <div className="court-actions">
                <button className="btn btn-secondary" onClick={handleDemoAction}>
                  <Edit fontSize="small" />
                  Редактировать
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={handleDemoAction}
                  style={{ marginLeft: 'auto' }}
                >
                  <Delete fontSize="small" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Детальная информация о ценах */}
      <div className="section-card">
        <h3 className="section-title">Детальная информация о ценах</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '800px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Корт</th>
                <th>Понедельник</th>
                <th>Вторник</th>
                <th>Среда</th>
                <th>Четверг</th>
                <th>Пятница</th>
                <th>Суббота</th>
                <th>Воскресенье</th>
              </tr>
            </thead>
            <tbody>
              {courts.map(court => (
                <tr key={court.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {court.color && (
                        <div 
                          style={{ 
                            width: '16px', 
                            height: '16px', 
                            borderRadius: '3px', 
                            backgroundColor: court.color,
                            flexShrink: 0
                          }} 
                        />
                      )}
                      <strong>{court.name}</strong>
                    </div>
                  </td>
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                    const dayPricing = court.pricing?.[day as keyof typeof court.pricing]
                    return (
                      <td key={day} style={{ textAlign: 'center' }}>
                        <div>{dayPricing?.basePrice || '-'}₽</div>
                        {dayPricing?.intervals && dayPricing.intervals.length > 0 && (
                          <div style={{ fontSize: '11px', color: 'var(--gray)', marginTop: '2px' }}>
                            {dayPricing.intervals.map((interval, idx) => (
                              <div key={idx}>
                                {interval.from}-{interval.to}: {interval.price}₽
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}