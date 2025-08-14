import React, { useState } from 'react'
import { Alert } from '@mui/material'
import '../../styles/admin.css'

export default function DemoPaymentSettings() {
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    onlinePaymentEnabled: true,
    yookassaShopId: '123456',
    paymentMethods: {
      cash: true,
      card_on_site: true,
      online: true,
      sberbank_card: false,
      tbank_card: false,
      vtb_card: false
    },
    autoConfirmPayment: true,
    paymentTimeout: 15,
    refundPolicy: 'full_24h',
    testMode: false
  })

  const handleMethodToggle = (method: string) => {
    setFormData(prev => ({
      ...prev,
      paymentMethods: {
        ...prev.paymentMethods,
        [method]: !prev.paymentMethods[method as keyof typeof prev.paymentMethods]
      }
    }))
  }

  const handleSave = () => {
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const stats = {
    todayRevenue: 45600,
    weekRevenue: 285400,
    monthRevenue: 1234500,
    onlinePaymentPercentage: 68,
    averageCheck: 2500
  }

  return (
    <div>
      {success && (
        <Alert severity="success" style={{ marginBottom: '24px' }}>
          Настройки оплаты сохранены (демо режим)
        </Alert>
      )}

      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-label">Выручка сегодня</div>
          <div className="stat-value">{stats.todayRevenue.toLocaleString('ru-RU')} ₽</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Выручка за неделю</div>
          <div className="stat-value">{stats.weekRevenue.toLocaleString('ru-RU')} ₽</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Выручка за месяц</div>
          <div className="stat-value">{stats.monthRevenue.toLocaleString('ru-RU')} ₽</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Онлайн платежи</div>
          <div className="stat-value">{stats.onlinePaymentPercentage}%</div>
        </div>
      </div>

      <div className="section-card">
        <h2 className="section-title">Способы оплаты</h2>
        
        <div className="payment-methods-grid">
          {Object.entries({
            cash: { label: 'Наличные', icon: '💵' },
            card_on_site: { label: 'Карта на месте', icon: '💳' },
            online: { label: 'Онлайн оплата', icon: '🌐' },
            sberbank_card: { label: 'Перевод на карту Сбербанк', icon: '🏦' },
            tbank_card: { label: 'Перевод на карту Т-Банк', icon: '🏦' },
            vtb_card: { label: 'Перевод на карту ВТБ', icon: '🏦' }
          }).map(([key, info]) => (
            <div key={key} className="payment-method-card" style={{
              border: '1px solid var(--extra-light-gray)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: formData.paymentMethods[key as keyof typeof formData.paymentMethods] ? 'var(--background)' : 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>{info.icon}</span>
                <span style={{ fontWeight: '500' }}>{info.label}</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={formData.paymentMethods[key as keyof typeof formData.paymentMethods]}
                  onChange={() => handleMethodToggle(key)}
                />
                <span className="slider"></span>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="section-card">
        <h3 className="section-title">Онлайн платежи (ЮKassa)</h3>
        
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Shop ID</label>
            <input
              type="text"
              className="form-input"
              name="yookassaShopId"
              value={formData.yookassaShopId}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Секретный ключ</label>
            <input
              type="password"
              className="form-input"
              value="••••••••••••••••"
              readOnly
            />
          </div>

          <div className="form-group">
            <label className="form-label">Таймаут оплаты (минут)</label>
            <input
              type="number"
              className="form-input"
              name="paymentTimeout"
              value={formData.paymentTimeout}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Политика возврата</label>
            <select
              className="form-select"
              name="refundPolicy"
              value={formData.refundPolicy}
              onChange={handleInputChange}
            >
              <option value="no_refund">Без возврата</option>
              <option value="full_24h">Полный возврат за 24 часа</option>
              <option value="full_48h">Полный возврат за 48 часов</option>
              <option value="partial_24h">Частичный возврат за 24 часа</option>
            </select>
          </div>
        </div>

        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="autoConfirmPayment"
              checked={formData.autoConfirmPayment}
              onChange={handleInputChange}
            />
            <span>Автоматическое подтверждение платежей</span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              name="testMode"
              checked={formData.testMode}
              onChange={handleInputChange}
            />
            <span>Тестовый режим</span>
          </label>
        </div>
      </div>

      <div className="section-card">
        <h3 className="section-title">Последние транзакции</h3>
        
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Дата и время</th>
                <th>Клиент</th>
                <th>Способ оплаты</th>
                <th>Сумма</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>15.08.2025 14:30</td>
                <td>Иван Петров</td>
                <td>Онлайн оплата</td>
                <td>3 000 ₽</td>
                <td><span className="badge badge-success">Оплачено</span></td>
              </tr>
              <tr>
                <td>15.08.2025 12:15</td>
                <td>Мария Сидорова</td>
                <td>Карта на месте</td>
                <td>2 500 ₽</td>
                <td><span className="badge badge-success">Оплачено</span></td>
              </tr>
              <tr>
                <td>15.08.2025 10:00</td>
                <td>Алексей Козлов</td>
                <td>Наличные</td>
                <td>2 000 ₽</td>
                <td><span className="badge badge-success">Оплачено</span></td>
              </tr>
              <tr>
                <td>14.08.2025 18:45</td>
                <td>Елена Новикова</td>
                <td>Онлайн оплата</td>
                <td>4 500 ₽</td>
                <td><span className="badge badge-warning">Ожидает</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" onClick={handleSave}>
          Сохранить настройки
        </button>
      </div>
    </div>
  )
}