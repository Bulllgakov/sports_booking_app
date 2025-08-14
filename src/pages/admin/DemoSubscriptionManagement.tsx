import React, { useState } from 'react'
import { Alert } from '@mui/material'
import '../../styles/admin.css'

export default function DemoSubscriptionManagement() {
  const [showUpgradeAlert, setShowUpgradeAlert] = useState(false)

  const courtsCount = 4 // Количество кортов в демо клубе
  
  const currentPlan = {
    name: 'Стандарт',
    pricePerCourt: 990,
    totalPrice: 990 * courtsCount, // 3960 руб/мес
    features: [
      'От 3 кортов',
      'Неограниченные бронирования',
      'Базовая CRM',
      'Аналитика и отчеты',
      'Email поддержка',
      'До 5 администраторов'
    ],
    limits: {
      courts: courtsCount,
      bookings: 'Неограниченно',
      admins: 5
    }
  }

  const plans = [
    {
      name: 'Бесплатный',
      pricePerCourt: 0,
      totalPrice: 0,
      recommended: false,
      features: [
        'До 2 кортов',
        'Неограниченные бронирования',
        'Базовая CRM',
        'Email поддержка',
        'До 2 администраторов',
        'Без комиссий'
      ],
      maxCourts: 2
    },
    {
      name: 'Стандарт',
      pricePerCourt: 990,
      totalPrice: 990 * courtsCount,
      recommended: true,
      current: true,
      features: [
        'От 3 кортов',
        'Неограниченные бронирования',
        'Базовая CRM',
        'Аналитика и отчеты',
        'Email поддержка',
        'До 5 администраторов',
        'Без комиссий'
      ],
      minCourts: 3
    },
    {
      name: 'Профи',
      pricePerCourt: 1990,
      totalPrice: 1990 * courtsCount,
      recommended: false,
      features: [
        'От 1 корта',
        'SMS/Email без лимитов',
        'Персональный менеджер',
        'Приоритетная поддержка',
        'Неограниченно администраторов',
        'Все интеграции',
        'Брендирование',
        'API доступ',
        'Без комиссий'
      ],
      minCourts: 1
    }
  ]

  const usage = {
    courts: courtsCount,
    bookings: 156,
    admins: 3
  }

  const handleUpgrade = (planName: string) => {
    setShowUpgradeAlert(true)
    setTimeout(() => setShowUpgradeAlert(false), 3000)
  }

  return (
    <div>
      {showUpgradeAlert && (
        <Alert severity="info" style={{ marginBottom: '24px' }}>
          В демо режиме изменение тарифа недоступно
        </Alert>
      )}

      <div className="section-card">
        <h2 className="section-title">Текущий тариф</h2>
        
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          padding: '24px',
          color: 'white',
          marginBottom: '24px'
        }}>
          <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>{currentPlan.name}</h3>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
              {currentPlan.totalPrice.toLocaleString('ru-RU')} ₽
              <span style={{ fontSize: '16px', fontWeight: 'normal' }}>/месяц</span>
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '4px' }}>
              {currentPlan.pricePerCourt} ₽ × {courtsCount} кортов
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '24px' }}>
            <div>
              <div style={{ opacity: 0.8, fontSize: '14px' }}>Корты</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                {usage.courts}
              </div>
            </div>
            <div>
              <div style={{ opacity: 0.8, fontSize: '14px' }}>Бронирования в месяц</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                {usage.bookings}
              </div>
            </div>
            <div>
              <div style={{ opacity: 0.8, fontSize: '14px' }}>Администраторы</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                {usage.admins}/{currentPlan.limits.admins}
              </div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '14px', color: 'var(--gray)' }}>
          Следующее списание: 1 сентября 2025
        </div>
      </div>

      <div className="section-card">
        <h3 className="section-title">Доступные тарифы</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {plans.map((plan) => (
            <div key={plan.name} style={{
              border: plan.recommended ? '2px solid var(--primary)' : '1px solid var(--extra-light-gray)',
              borderRadius: '12px',
              padding: '24px',
              position: 'relative',
              background: plan.current ? 'var(--background)' : 'white'
            }}>
              {plan.recommended && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--primary)',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  ТЕКУЩИЙ ТАРИФ
                </div>
              )}
              
              <h4 style={{ fontSize: '20px', marginBottom: '12px' }}>{plan.name}</h4>
              
              {plan.pricePerCourt === 0 ? (
                <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '20px', color: 'var(--primary)' }}>
                  Бесплатно
                </div>
              ) : (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    {plan.totalPrice.toLocaleString('ru-RU')} ₽
                    <span style={{ fontSize: '14px', fontWeight: 'normal' }}>/мес</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--gray)', marginTop: '4px' }}>
                    {plan.pricePerCourt.toLocaleString('ru-RU')} ₽ за корт
                  </div>
                </div>
              )}
              
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '24px' }}>
                {plan.features.map((feature, index) => (
                  <li key={index} style={{ 
                    padding: '8px 0',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: 'var(--primary)', marginRight: '8px' }}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              
              {plan.current ? (
                <button className="btn btn-secondary" style={{ width: '100%' }} disabled>
                  Текущий тариф
                </button>
              ) : (
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  onClick={() => handleUpgrade(plan.name)}
                >
                  {plan.pricePerCourt > currentPlan.pricePerCourt ? 'Улучшить' : 'Изменить'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="section-card">
        <h3 className="section-title">История платежей</h3>
        
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Описание</th>
                <th>Сумма</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>01.08.2025</td>
                <td>Подписка "Стандарт" (4 корта) - Август 2025</td>
                <td>3 960 ₽</td>
                <td><span className="badge badge-success">Оплачено</span></td>
              </tr>
              <tr>
                <td>01.07.2025</td>
                <td>Подписка "Стандарт" (4 корта) - Июль 2025</td>
                <td>3 960 ₽</td>
                <td><span className="badge badge-success">Оплачено</span></td>
              </tr>
              <tr>
                <td>01.06.2025</td>
                <td>Подписка "Стандарт" (4 корта) - Июнь 2025</td>
                <td>3 960 ₽</td>
                <td><span className="badge badge-success">Оплачено</span></td>
              </tr>
              <tr>
                <td>01.05.2025</td>
                <td>Подписка "Стандарт" (4 корта) - Май 2025</td>
                <td>3 960 ₽</td>
                <td><span className="badge badge-success">Оплачено</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}