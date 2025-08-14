import React, { useState } from 'react'
import { Alert } from '@mui/material'
import '../../styles/admin.css'

export default function DemoMarketing() {
  const [showAlert, setShowAlert] = useState(false)
  const [activeTab, setActiveTab] = useState('promotions')

  const handleAction = () => {
    setShowAlert(true)
    setTimeout(() => setShowAlert(false), 3000)
  }

  const promotions = [
    {
      id: 1,
      name: 'Скидка 20% новым клиентам',
      type: 'discount',
      value: 20,
      status: 'active',
      usageCount: 45,
      startDate: '01.08.2025',
      endDate: '31.08.2025'
    },
    {
      id: 2,
      name: 'Утренние часы -30%',
      type: 'time_discount',
      value: 30,
      status: 'active',
      usageCount: 128,
      startDate: '15.07.2025',
      endDate: '15.09.2025'
    },
    {
      id: 3,
      name: 'Пригласи друга',
      type: 'referral',
      value: 500,
      status: 'paused',
      usageCount: 23,
      startDate: '01.06.2025',
      endDate: '31.12.2025'
    }
  ]

  const loyaltyProgram = {
    totalMembers: 342,
    activeMembers: 289,
    totalPoints: 45680,
    redeemedPoints: 12340,
    levels: [
      { name: 'Бронза', members: 180, minPoints: 0, discount: 5 },
      { name: 'Серебро', members: 89, minPoints: 1000, discount: 10 },
      { name: 'Золото', members: 56, minPoints: 5000, discount: 15 },
      { name: 'Платина', members: 17, minPoints: 10000, discount: 20 }
    ]
  }

  const emailCampaigns = [
    {
      id: 1,
      name: 'Еженедельная рассылка',
      status: 'sent',
      recipients: 456,
      opened: 234,
      clicked: 89,
      sentDate: '12.08.2025'
    },
    {
      id: 2,
      name: 'Специальное предложение',
      status: 'scheduled',
      recipients: 342,
      opened: 0,
      clicked: 0,
      sentDate: '20.08.2025'
    },
    {
      id: 3,
      name: 'Напоминание о бронировании',
      status: 'draft',
      recipients: 0,
      opened: 0,
      clicked: 0,
      sentDate: '-'
    }
  ]

  return (
    <div>
      {showAlert && (
        <Alert severity="info" style={{ marginBottom: '24px' }}>
          Действие выполнено (демо режим)
        </Alert>
      )}

      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-label">Активные акции</div>
          <div className="stat-value">2</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Участники программы лояльности</div>
          <div className="stat-value">{loyaltyProgram.totalMembers}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Email подписчики</div>
          <div className="stat-value">512</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Конверсия акций</div>
          <div className="stat-value">18.5%</div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: '24px' }}>
        <button 
          className={`tab ${activeTab === 'promotions' ? 'active' : ''}`}
          onClick={() => setActiveTab('promotions')}
        >
          Акции и скидки
        </button>
        <button 
          className={`tab ${activeTab === 'loyalty' ? 'active' : ''}`}
          onClick={() => setActiveTab('loyalty')}
        >
          Программа лояльности
        </button>
        <button 
          className={`tab ${activeTab === 'email' ? 'active' : ''}`}
          onClick={() => setActiveTab('email')}
        >
          Email рассылки
        </button>
      </div>

      {activeTab === 'promotions' && (
        <>
          <div className="section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 className="section-title" style={{ marginBottom: 0 }}>Акции и скидки</h3>
              <button className="btn btn-primary" onClick={handleAction}>
                Создать акцию
              </button>
            </div>
            
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Тип</th>
                    <th>Значение</th>
                    <th>Использований</th>
                    <th>Период</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map(promo => (
                    <tr key={promo.id}>
                      <td>{promo.name}</td>
                      <td>
                        {promo.type === 'discount' && 'Скидка'}
                        {promo.type === 'time_discount' && 'Временная скидка'}
                        {promo.type === 'referral' && 'Реферальная'}
                      </td>
                      <td>
                        {promo.type === 'referral' ? `${promo.value} ₽` : `${promo.value}%`}
                      </td>
                      <td>{promo.usageCount}</td>
                      <td>{promo.startDate} - {promo.endDate}</td>
                      <td>
                        <span className={`badge ${promo.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                          {promo.status === 'active' ? 'Активна' : 'На паузе'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-sm" onClick={handleAction}>
                          {promo.status === 'active' ? 'Пауза' : 'Активировать'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="section-card">
            <h3 className="section-title">Создать промокод</h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Код</label>
                <input type="text" className="form-input" placeholder="SUMMER2025" />
              </div>
              
              <div className="form-group">
                <label className="form-label">Скидка (%)</label>
                <input type="number" className="form-input" placeholder="20" />
              </div>
              
              <div className="form-group">
                <label className="form-label">Лимит использований</label>
                <input type="number" className="form-input" placeholder="100" />
              </div>
              
              <div className="form-group">
                <label className="form-label">Действует до</label>
                <input type="date" className="form-input" />
              </div>
            </div>
            
            <button className="btn btn-primary" onClick={handleAction}>
              Создать промокод
            </button>
          </div>
        </>
      )}

      {activeTab === 'loyalty' && (
        <>
          <div className="section-card">
            <h3 className="section-title">Программа лояльности</h3>
            
            <div className="loyalty-levels" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {loyaltyProgram.levels.map(level => (
                <div key={level.name} style={{
                  border: '1px solid var(--extra-light-gray)',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '24px',
                    marginBottom: '8px',
                    color: level.name === 'Бронза' ? '#CD7F32' :
                           level.name === 'Серебро' ? '#C0C0C0' :
                           level.name === 'Золото' ? '#FFD700' : '#B9F2FF'
                  }}>
                    {level.name === 'Бронза' && '🥉'}
                    {level.name === 'Серебро' && '🥈'}
                    {level.name === 'Золото' && '🥇'}
                    {level.name === 'Платина' && '💎'}
                  </div>
                  <h4 style={{ marginBottom: '8px' }}>{level.name}</h4>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>{level.members}</div>
                  <div style={{ fontSize: '12px', color: 'var(--gray)', marginBottom: '8px' }}>участников</div>
                  <div style={{ fontSize: '14px' }}>
                    <div>от {level.minPoints} баллов</div>
                    <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Скидка {level.discount}%</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--gray)' }}>Всего участников</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{loyaltyProgram.totalMembers}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--gray)' }}>Активные</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{loyaltyProgram.activeMembers}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--gray)' }}>Начислено баллов</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{loyaltyProgram.totalPoints.toLocaleString('ru-RU')}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--gray)' }}>Использовано</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{loyaltyProgram.redeemedPoints.toLocaleString('ru-RU')}</div>
              </div>
            </div>
          </div>

          <div className="section-card">
            <h3 className="section-title">Настройки программы лояльности</h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Баллы за 100 ₽</label>
                <input type="number" className="form-input" defaultValue="10" />
              </div>
              
              <div className="form-group">
                <label className="form-label">Минимум для списания</label>
                <input type="number" className="form-input" defaultValue="100" />
              </div>
              
              <div className="form-group">
                <label className="form-label">Максимум списания (%)</label>
                <input type="number" className="form-input" defaultValue="50" />
              </div>
              
              <div className="form-group">
                <label className="form-label">Срок действия баллов (дней)</label>
                <input type="number" className="form-input" defaultValue="365" />
              </div>
            </div>
            
            <button className="btn btn-primary" onClick={handleAction}>
              Сохранить настройки
            </button>
          </div>
        </>
      )}

      {activeTab === 'email' && (
        <>
          <div className="section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 className="section-title" style={{ marginBottom: 0 }}>Email кампании</h3>
              <button className="btn btn-primary" onClick={handleAction}>
                Создать рассылку
              </button>
            </div>
            
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Статус</th>
                    <th>Получатели</th>
                    <th>Открыто</th>
                    <th>Кликов</th>
                    <th>Дата отправки</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {emailCampaigns.map(campaign => (
                    <tr key={campaign.id}>
                      <td>{campaign.name}</td>
                      <td>
                        <span className={`badge ${
                          campaign.status === 'sent' ? 'badge-success' :
                          campaign.status === 'scheduled' ? 'badge-info' : 'badge-secondary'
                        }`}>
                          {campaign.status === 'sent' ? 'Отправлено' :
                           campaign.status === 'scheduled' ? 'Запланировано' : 'Черновик'}
                        </span>
                      </td>
                      <td>{campaign.recipients || '-'}</td>
                      <td>{campaign.opened ? `${((campaign.opened / campaign.recipients) * 100).toFixed(1)}%` : '-'}</td>
                      <td>{campaign.clicked ? `${((campaign.clicked / campaign.recipients) * 100).toFixed(1)}%` : '-'}</td>
                      <td>{campaign.sentDate}</td>
                      <td>
                        <button className="btn btn-sm" onClick={handleAction}>
                          {campaign.status === 'draft' ? 'Редактировать' : 'Статистика'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="section-card">
            <h3 className="section-title">Шаблоны писем</h3>
            
            <div className="templates-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              {['Приветственное письмо', 'Напоминание о бронировании', 'Специальное предложение', 'День рождения'].map(template => (
                <div key={template} style={{
                  border: '1px solid var(--extra-light-gray)',
                  borderRadius: '8px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={handleAction}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📧</div>
                  <h4 style={{ marginBottom: '8px' }}>{template}</h4>
                  <div style={{ fontSize: '12px', color: 'var(--gray)' }}>
                    Нажмите для редактирования
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}