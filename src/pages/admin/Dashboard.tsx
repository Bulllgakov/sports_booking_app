import {
  CalendarMonth,
  AttachMoney,
  People,
  TrendingUp,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material'
import { useAuth } from '../../contexts/AuthContext'
import '../../styles/admin.css'

// Статистическая карточка
const StatCard = ({ title, value, icon, change, isPositive }: any) => (
  <div className="stat-card">
    <div className="stat-header">
      <span className="stat-label">{title}</span>
      <div className="stat-icon">{icon}</div>
    </div>
    <div className="stat-value">{value}</div>
    <div className={`stat-change ${!isPositive ? 'negative' : ''}`}>
      {isPositive ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />}
      {change}
    </div>
  </div>
)

// Компонент приветственного баннера
const WelcomeBanner = () => (
  <div 
    className="section-card" 
    style={{ 
      background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', 
      color: 'white',
      marginBottom: '32px'
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>🎉 Платформа полностью БЕСПЛАТНА!</h3>
        <p style={{ opacity: 0.9, fontSize: '14px' }}>
          Никакой абонентской платы. Комиссия всего 4.5% с бронирований через приложение.
        </p>
      </div>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
        <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
      </svg>
    </div>
  </div>
)

export default function Dashboard() {
  const { } = useAuth()

  return (
    <div>
      <WelcomeBanner />

      {/* Статистика */}
      <div className="stats-grid">
        <StatCard
          title="Бронирований сегодня"
          value="24"
          icon={<CalendarMonth />}
          change="+12% от вчера"
          isPositive={true}
        />
        <StatCard
          title="Доход за сегодня"
          value="48,500₽"
          icon={<AttachMoney />}
          change="+8% от вчера"
          isPositive={true}
        />
        <StatCard
          title="Загрузка кортов"
          value="73%"
          icon={<TrendingUp />}
          change="-5% от вчера"
          isPositive={false}
        />
        <StatCard
          title="Активных клиентов"
          value="342"
          icon={<People />}
          change="+15 новых"
          isPositive={true}
        />
      </div>

      {/* Последние бронирования */}
      <div className="section-card">
        <div className="section-header">
          <h2 className="section-title">Последние бронирования</h2>
          <button className="btn btn-secondary">Все бронирования</button>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Клиент</th>
                <th>Корт</th>
                <th>Дата и время</th>
                <th>Статус</th>
                <th>Сумма</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Иван Петров</td>
                <td>Падел корт 1</td>
                <td>16.07.2025, 18:00-19:30</td>
                <td><span style={{ color: 'var(--success)' }}>✅ Подтверждено</span></td>
                <td>2,850₽</td>
              </tr>
              <tr>
                <td>Мария Сидорова</td>
                <td>Падел корт 2</td>
                <td>16.07.2025, 17:00-18:00</td>
                <td><span style={{ color: 'var(--success)' }}>✅ Подтверждено</span></td>
                <td>1,900₽</td>
              </tr>
              <tr>
                <td>Алексей Козлов</td>
                <td>Падел корт 3</td>
                <td>17.07.2025, 10:00-11:30</td>
                <td><span style={{ color: 'var(--warning)' }}>⏳ Ожидает оплаты</span></td>
                <td>2,850₽</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}