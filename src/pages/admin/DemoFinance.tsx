import React, { useState } from 'react'
import { TrendingUp, TrendingDown } from '@mui/icons-material'
import '../../styles/admin.css'

export default function DemoFinance() {
  const [period, setPeriod] = useState('month')
  
  const stats = {
    revenue: {
      current: 1234500,
      previous: 985600,
      change: 25.2
    },
    bookings: {
      current: 487,
      previous: 402,
      change: 21.1
    },
    averageCheck: {
      current: 2535,
      previous: 2453,
      change: 3.3
    },
    occupancy: {
      current: 68,
      previous: 61,
      change: 11.5
    }
  }

  const monthlyData = [
    { month: 'Январь', revenue: 856000, bookings: 342, occupancy: 55 },
    { month: 'Февраль', revenue: 923000, bookings: 378, occupancy: 58 },
    { month: 'Март', revenue: 978000, bookings: 402, occupancy: 60 },
    { month: 'Апрель', revenue: 1045000, bookings: 425, occupancy: 63 },
    { month: 'Май', revenue: 1123000, bookings: 456, occupancy: 65 },
    { month: 'Июнь', revenue: 1189000, bookings: 478, occupancy: 67 },
    { month: 'Июль', revenue: 1234500, bookings: 487, occupancy: 68 }
  ]

  const topCourts = [
    { name: 'Корт №1', revenue: 456000, bookings: 156, utilization: 78 },
    { name: 'Корт №2', revenue: 398000, bookings: 142, utilization: 72 },
    { name: 'Теннисный корт', revenue: 289000, bookings: 118, utilization: 65 },
    { name: 'Бадминтон', revenue: 91500, bookings: 71, utilization: 45 }
  ]

  const paymentMethods = [
    { method: 'Онлайн оплата', amount: 839460, percentage: 68 },
    { method: 'Карта на месте', amount: 234555, percentage: 19 },
    { method: 'Наличные', amount: 123450, percentage: 10 },
    { method: 'Перевод на карту', amount: 37035, percentage: 3 }
  ]

  return (
    <div>
      <div className="period-selector" style={{ marginBottom: '24px' }}>
        <button 
          className={`btn ${period === 'week' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setPeriod('week')}
        >
          Неделя
        </button>
        <button 
          className={`btn ${period === 'month' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setPeriod('month')}
        >
          Месяц
        </button>
        <button 
          className={`btn ${period === 'year' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setPeriod('year')}
        >
          Год
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Выручка</span>
            <span className={`stat-change ${stats.revenue.change > 0 ? 'positive' : 'negative'}`}>
              {stats.revenue.change > 0 ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
              {Math.abs(stats.revenue.change)}%
            </span>
          </div>
          <div className="stat-value">{stats.revenue.current.toLocaleString('ru-RU')} ₽</div>
          <div className="stat-subtitle">
            {stats.revenue.previous.toLocaleString('ru-RU')} ₽ в прошлом периоде
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Бронирования</span>
            <span className={`stat-change ${stats.bookings.change > 0 ? 'positive' : 'negative'}`}>
              {stats.bookings.change > 0 ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
              {Math.abs(stats.bookings.change)}%
            </span>
          </div>
          <div className="stat-value">{stats.bookings.current}</div>
          <div className="stat-subtitle">
            {stats.bookings.previous} в прошлом периоде
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Средний чек</span>
            <span className={`stat-change ${stats.averageCheck.change > 0 ? 'positive' : 'negative'}`}>
              {stats.averageCheck.change > 0 ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
              {Math.abs(stats.averageCheck.change)}%
            </span>
          </div>
          <div className="stat-value">{stats.averageCheck.current.toLocaleString('ru-RU')} ₽</div>
          <div className="stat-subtitle">
            {stats.averageCheck.previous.toLocaleString('ru-RU')} ₽ в прошлом периоде
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Загрузка</span>
            <span className={`stat-change ${stats.occupancy.change > 0 ? 'positive' : 'negative'}`}>
              {stats.occupancy.change > 0 ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
              {Math.abs(stats.occupancy.change)}%
            </span>
          </div>
          <div className="stat-value">{stats.occupancy.current}%</div>
          <div className="stat-subtitle">
            {stats.occupancy.previous}% в прошлом периоде
          </div>
        </div>
      </div>

      <div className="section-card">
        <h3 className="section-title">Динамика выручки</h3>
        
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', minWidth: '600px', height: '300px', padding: '20px 0' }}>
            {monthlyData.map((data, index) => {
              const maxRevenue = Math.max(...monthlyData.map(d => d.revenue))
              const height = (data.revenue / maxRevenue) * 250
              
              return (
                <div key={data.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: '100%',
                    height: `${height}px`,
                    background: index === monthlyData.length - 1 ? 'var(--primary)' : 'var(--light-gray)',
                    borderRadius: '4px 4px 0 0',
                    position: 'relative',
                    transition: 'all 0.3s'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '-25px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap'
                    }}>
                      {(data.revenue / 1000).toFixed(0)}K
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '8px', color: 'var(--gray)' }}>
                    {data.month.slice(0, 3)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="section-card">
          <h3 className="section-title">Топ кортов по выручке</h3>
          
          <div className="space-y-3">
            {topCourts.map((court, index) => (
              <div key={court.name} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      background: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'var(--light-gray)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: index < 3 ? 'white' : 'var(--dark)'
                    }}>
                      {index + 1}
                    </span>
                    <span style={{ fontWeight: '500' }}>{court.name}</span>
                  </div>
                  <span style={{ fontWeight: 'bold' }}>{court.revenue.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div style={{
                  height: '8px',
                  background: 'var(--extra-light-gray)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${court.utilization}%`,
                    height: '100%',
                    background: 'var(--primary)',
                    borderRadius: '4px'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '12px', color: 'var(--gray)' }}>
                  <span>{court.bookings} бронирований</span>
                  <span>Загрузка: {court.utilization}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="section-card">
          <h3 className="section-title">Способы оплаты</h3>
          
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div key={method.method} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px' }}>{method.method}</span>
                  <span style={{ fontWeight: 'bold' }}>{method.percentage}%</span>
                </div>
                <div style={{
                  height: '24px',
                  background: 'var(--extra-light-gray)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div style={{
                    width: `${method.percentage}%`,
                    height: '100%',
                    background: method.method === 'Онлайн оплата' ? '#10B981' : 
                               method.method === 'Карта на месте' ? '#3B82F6' :
                               method.method === 'Наличные' ? '#F59E0B' : '#8B5CF6',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '8px'
                  }}>
                    <span style={{ fontSize: '12px', color: 'white', fontWeight: '500' }}>
                      {method.amount.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="section-title" style={{ marginBottom: 0 }}>Экспорт отчетов</h3>
          <button className="btn btn-primary">
            Скачать отчет
          </button>
        </div>
        
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Период</label>
            <select className="form-select">
              <option>Текущий месяц</option>
              <option>Прошлый месяц</option>
              <option>Текущий квартал</option>
              <option>Текущий год</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Тип отчета</label>
            <select className="form-select">
              <option>Полный финансовый отчет</option>
              <option>Отчет по бронированиям</option>
              <option>Отчет по кортам</option>
              <option>Отчет по клиентам</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Формат</label>
            <select className="form-select">
              <option>Excel (.xlsx)</option>
              <option>PDF</option>
              <option>CSV</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}