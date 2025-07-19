import { useState, useEffect } from 'react'
import {
  CalendarMonth,
  AttachMoney,
  People,
  TrendingUp,
  ArrowUpward,
  ArrowDownward,
  QrCode2,
  ContentCopy,
  Check,
  Share,
} from '@mui/icons-material'
import { useAuth } from '../../contexts/AuthContext'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { QRCodeSVG } from 'qrcode.react'
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


export default function Dashboard() {
  const { currentUser } = useAuth()
  const [venueId, setVenueId] = useState<string | null>(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const loadVenueId = async () => {
      // Для суперадмина берем из localStorage
      const selectedVenueId = localStorage.getItem('selectedVenueId')
      if (selectedVenueId) {
        setVenueId(selectedVenueId)
        return
      }

      // Для обычного админа получаем из профиля
      if (currentUser) {
        const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid))
        if (adminDoc.exists()) {
          const adminData = adminDoc.data()
          if (adminData.venueId) {
            setVenueId(adminData.venueId)
          }
        }
      }
    }

    loadVenueId()
  }, [currentUser])

  const getBookingUrl = () => {
    if (!venueId) return ''
    return `https://allcourt.ru/club/${venueId}`
  }

  const handleCopyLink = () => {
    const url = getBookingUrl()
    if (url) {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShare = async () => {
    const url = getBookingUrl()
    if (!url) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Забронировать корт',
          text: 'Забронируйте корт в нашем клубе',
          url: url,
        })
      } catch (err) {
        console.log('Share failed:', err)
      }
    } else {
      handleCopyLink()
    }
  }

  return (
    <div>
      {/* Блок с QR кодом и ссылкой для бронирования */}
      {venueId && (
        <div className="section-card" style={{ marginBottom: '24px' }}>
          <div className="section-header">
            <h2 className="section-title">Ссылка для бронирования</h2>
          </div>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div 
              onClick={() => setShowQRModal(true)}
              style={{ 
                cursor: 'pointer',
                padding: '8px',
                border: '1px solid var(--extra-light-gray)',
                borderRadius: '8px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
            >
              <QRCodeSVG 
                value={getBookingUrl()} 
                size={120}
                level="M"
                includeMargin={true}
              />
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <button className="btn btn-secondary btn-icon">
                  <QrCode2 fontSize="small" />
                  <span>Увеличить</span>
                </button>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '14px', color: 'var(--gray)', display: 'block', marginBottom: '4px' }}>
                  Отправьте эту ссылку клиентам:
                </label>
                <div style={{ 
                  display: 'flex', 
                  gap: '8px',
                  padding: '12px',
                  background: 'var(--background)',
                  borderRadius: '8px',
                  alignItems: 'center'
                }}>
                  <input 
                    type="text" 
                    value={getBookingUrl()} 
                    readOnly
                    style={{
                      flex: 1,
                      border: 'none',
                      background: 'transparent',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <button 
                    className="btn btn-primary btn-icon"
                    onClick={handleCopyLink}
                  >
                    {copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
                    <span>{copied ? 'Скопировано' : 'Копировать'}</span>
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-secondary"
                  onClick={handleShare}
                >
                  <Share fontSize="small" />
                  <span>Поделиться</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Модальное окно с QR кодом */}
      {showQRModal && (
        <div 
          className="modal active" 
          onClick={() => setShowQRModal(false)}
          style={{ 
            display: 'flex',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              textAlign: 'center'
            }}
          >
            <div className="modal-header" style={{ marginBottom: '24px' }}>
              <h2 className="modal-title">QR код для бронирования</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowQRModal(false)}
                style={{
                  position: 'absolute',
                  right: '24px',
                  top: '24px',
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <QRCodeSVG 
                value={getBookingUrl()} 
                size={256}
                level="H"
                includeMargin={true}
              />
              <p style={{ marginTop: '16px', color: 'var(--gray)', fontSize: '14px' }}>
                Клиенты могут отсканировать этот QR код,<br />
                чтобы забронировать корт
              </p>
              <div style={{ marginTop: '24px' }}>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    const canvas = document.querySelector('svg');
                    if (canvas) {
                      const svgData = new XMLSerializer().serializeToString(canvas);
                      const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
                      const svgUrl = URL.createObjectURL(svgBlob);
                      const downloadLink = document.createElement('a');
                      downloadLink.href = svgUrl;
                      downloadLink.download = `qr-code-booking-${venueId}.svg`;
                      document.body.appendChild(downloadLink);
                      downloadLink.click();
                      document.body.removeChild(downloadLink);
                    }
                  }}
                >
                  Скачать QR код
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}