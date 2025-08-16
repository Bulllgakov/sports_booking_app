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
import { usePermission } from '../../hooks/usePermission'
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { QRCodeSVG } from 'qrcode.react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import '../../styles/admin.css'

// Статистическая карточка с поддержкой описания
const StatCard = ({ title, value, icon, change, isPositive, description }: any) => (
  <div className="stat-card" style={{ position: 'relative' }}>
    <div className="stat-header">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span className="stat-label">{title}</span>
        {description && (
          <span style={{ 
            fontSize: '11px', 
            color: 'var(--light-gray)',
            lineHeight: '1.3',
            maxWidth: '200px'
          }}>
            {description}
          </span>
        )}
      </div>
      <div className="stat-icon">{icon}</div>
    </div>
    <div className="stat-value">{value}</div>
    {change !== null && change !== undefined && (
      <div className={`stat-change ${!isPositive ? 'negative' : ''}`}>
        {isPositive ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />}
        {change}
      </div>
    )}
  </div>
)


interface Booking {
  id: string
  clientName: string
  courtName: string
  date: Date
  startTime: string
  endTime: string
  status: 'confirmed' | 'pending' | 'cancelled'
  paymentStatus?: 'awaiting_payment' | 'paid' | 'online_payment' | 'cancelled' | 'not_required'
  amount: number
}

interface Stats {
  todayBookings: number
  todayRevenue: number
  todayIncome: number // Новое поле для поступлений
  utilization: number
  activeCustomers: number
  bookingsChange: number
  revenueChange: number
  incomeChange: number // Изменение поступлений
  utilizationChange: number
}

interface Venue {
  id: string
  name: string
}

export default function Dashboard() {
  const { currentUser, admin } = useAuth()
  const { isSuperAdmin } = usePermission()
  const [venueId, setVenueId] = useState<string | null>(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [recentBookings, setRecentBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState<Stats>({
    todayBookings: 0,
    todayRevenue: 0,
    todayIncome: 0,
    utilization: 0,
    activeCustomers: 0,
    bookingsChange: 0,
    revenueChange: 0,
    incomeChange: 0,
    utilizationChange: 0
  })
  const [loading, setLoading] = useState(true)
  const [venues, setVenues] = useState<Venue[]>([])
  const [selectedVenueFilter, setSelectedVenueFilter] = useState<string>('all')
  const [currentVenueName, setCurrentVenueName] = useState<string>('')

  useEffect(() => {
    const loadData = async () => {
      if (isSuperAdmin) {
        // Для суперадмина загружаем список всех клубов
        await loadVenues()
        // Загружаем данные в зависимости от фильтра
        if (selectedVenueFilter === 'all') {
          await loadAllVenuesData()
        } else {
          await loadDashboardData(selectedVenueFilter)
        }
      } else if (admin?.venueId) {
        // Для обычного админа загружаем данные его клуба
        setVenueId(admin.venueId)
        // Загружаем информацию о клубе для обычного админа
        try {
          const venueDoc = await getDoc(doc(db, 'venues', admin.venueId))
          if (venueDoc.exists()) {
            const venueData = venueDoc.data()
            setCurrentVenueName(venueData.name || '')
            // Добавляем клуб в массив venues для единообразия
            setVenues([{ id: admin.venueId, name: venueData.name || '' }])
          }
        } catch (error) {
          console.error('Error loading venue data:', error)
        }
        await loadDashboardData(admin.venueId)
      }
      setLoading(false)
    }

    loadData()
  }, [currentUser, admin, isSuperAdmin, selectedVenueFilter])

  const loadVenues = async () => {
    try {
      const venuesQuery = query(
        collection(db, 'venues'),
        where('status', '==', 'active')
      )
      const snapshot = await getDocs(venuesQuery)
      const venuesData = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }))
      setVenues(venuesData)
    } catch (error) {
      console.error('Error loading venues:', error)
    }
  }

  const loadAllVenuesData = async () => {
    try {
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      
      // Сначала загружаем список клубов, если он еще не загружен
      let venuesList = venues
      if (venuesList.length === 0) {
        const venuesQuery = query(
          collection(db, 'venues'),
          where('status', '==', 'active')
        )
        const venuesSnapshot = await getDocs(venuesQuery)
        venuesList = venuesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }))
      }
      
      // Загружаем все бронирования и фильтруем вручную
      const allBookingsQuery = query(
        collection(db, 'bookings')
      )
      
      const allBookingsSnapshot = await getDocs(allBookingsQuery)
      
      // Фильтруем бронирования за сегодня
      const todayBookingsDocs = allBookingsSnapshot.docs.filter(doc => {
        const data = doc.data()
        const bookingDate = data.date?.toDate?.()
        if (!bookingDate) return false
        
        return bookingDate >= startOfToday && 
               bookingDate <= endOfToday && 
               data.status === 'confirmed'
      })
      
      // Подсчитываем только оплаченные бронирования для дохода
      const paidTodayBookings = todayBookingsDocs.filter(doc => {
        const paymentStatus = doc.data().paymentStatus
        return paymentStatus === 'paid'
      })
      
      const todayBookings = todayBookingsDocs.length
      const todayRevenue = paidTodayBookings.reduce((sum, doc) => sum + (doc.data().amount || 0), 0)
      
      // Используем уже загруженные бронирования для последних
      const recentBookingsDocs = allBookingsSnapshot.docs
        .sort((a, b) => {
          const dateA = a.data().createdAt?.toDate?.() || a.data().date?.toDate?.() || new Date(0)
          const dateB = b.data().createdAt?.toDate?.() || b.data().date?.toDate?.() || new Date(0)
          return dateB.getTime() - dateA.getTime()
        })
        .slice(0, 10)
      const bookingsData: Booking[] = []
      
      for (const doc of recentBookingsDocs) {
        const data = doc.data()
        
        // Получаем информацию о клубе
        let venueName = ''
        let courtName = 'Корт'
        
        if (data.venueId) {
          const venue = venuesList.find(v => v.id === data.venueId)
          venueName = venue?.name || ''
          
          // Получаем информацию о корте
          if (data.courtId) {
            try {
              const courtDoc = await getDoc(doc(db, 'venues', data.venueId, 'courts', data.courtId))
              if (courtDoc.exists()) {
                courtName = courtDoc.data().name
              }
            } catch (error) {
              console.error('Error fetching court:', error)
            }
          }
        }
        
        bookingsData.push({
          id: doc.id,
          clientName: data.clientName || data.customerName || 'Неизвестный клиент',
          courtName: venueName ? `${venueName} - ${courtName}` : courtName,
          date: data.date?.toDate() || new Date(),
          startTime: data.startTime || data.time || '',
          endTime: data.endTime || '',
          status: data.status || 'pending',
          paymentStatus: data.paymentStatus,
          amount: data.amount || 0
        })
      }
      
      setRecentBookings(bookingsData)
      
      // Расчет общей загрузки
      let totalCourts = 0
      for (const venue of venuesList) {
        const courtsQuery = query(
          collection(db, 'venues', venue.id, 'courts'),
          where('status', '==', 'active')
        )
        const courtsSnapshot = await getDocs(courtsQuery)
        totalCourts += courtsSnapshot.size
      }
      
      const maxSlots = totalCourts * 16 // максимум слотов в день
      const utilization = maxSlots > 0 ? Math.round((todayBookings / maxSlots) * 100) : 0
      
      // Загружаем уникальных клиентов за последние 30 дней
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      // Используем уже загруженные бронирования
      const last30DaysBookings = allBookingsSnapshot.docs.filter(doc => {
        const data = doc.data()
        const bookingDate = data.date?.toDate?.()
        return bookingDate && bookingDate >= thirtyDaysAgo
      })
      
      const uniqueCustomers = new Set(last30DaysBookings.map(doc => doc.data().clientPhone || doc.data().customerPhone))
      
      // Подсчет поступлений за сегодня (платежи, совершенные сегодня)
      const todayIncome = allBookingsSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data()
        const paymentHistory = data.paymentHistory || []
        
        // Проверяем историю платежей на наличие оплаты сегодня
        const paidToday = paymentHistory.some((entry: any) => {
          if (entry.action === 'paid' || entry.action === 'payment_completed') {
            const paymentDate = entry.timestamp?.toDate?.() || new Date(entry.timestamp)
            return paymentDate >= startOfToday && paymentDate <= endOfToday
          }
          return false
        })
        
        // Если в истории нет записи об оплате, проверяем основные поля
        // (для совместимости со старыми записями)
        if (!paidToday && data.paymentStatus === 'paid') {
          const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt)
          if (createdAt >= startOfToday && createdAt <= endOfToday) {
            return sum + (data.amount || 0)
          }
        }
        
        return paidToday ? sum + (data.amount || 0) : sum
      }, 0)

      setStats({
        todayBookings,
        todayRevenue,
        todayIncome,
        utilization,
        activeCustomers: uniqueCustomers.size,
        bookingsChange: 15, // В реальном приложении нужно сравнивать с вчерашним днем
        revenueChange: 10,
        incomeChange: 8,
        utilizationChange: -3
      })
      
    } catch (error) {
      console.error('Error loading all venues data:', error)
    }
  }

  const loadDashboardData = async (venueId: string) => {
    try {
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      
      // Загружаем последние бронирования
      // Упрощенный запрос без orderBy чтобы избежать проблем с индексами
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('venueId', '==', venueId)
      )
      
      const bookingsSnapshot = await getDocs(bookingsQuery)
      
      // Сортируем и ограничиваем результаты вручную
      const allBookings = bookingsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || a.date?.toDate?.() || new Date(0)
          const dateB = b.createdAt?.toDate?.() || b.date?.toDate?.() || new Date(0)
          return dateB.getTime() - dateA.getTime()
        })
        .slice(0, 5)
      
      const bookingsData: Booking[] = []
      
      for (const data of allBookings) {
        // Получаем информацию о корте
        let courtName = data.courtName || 'Корт'
        if (data.courtId && !data.courtName) {
          try {
            const courtDoc = await getDoc(doc(db, 'venues', venueId, 'courts', data.courtId))
            if (courtDoc.exists()) {
              courtName = courtDoc.data().name
            }
          } catch (error) {
            console.error('Error fetching court:', error)
          }
        }
        
        bookingsData.push({
          id: data.id,
          clientName: data.clientName || data.customerName || 'Неизвестный клиент',
          courtName,
          date: data.date?.toDate?.() || new Date(),
          startTime: data.startTime || data.time || '',
          endTime: data.endTime || '',
          status: data.status || 'pending',
          paymentStatus: data.paymentStatus,
          amount: data.amount || 0
        })
      }
      
      setRecentBookings(bookingsData)
      
      // Загружаем статистику за сегодня
      // Упрощенный запрос - загружаем все бронирования клуба и фильтруем вручную
      const allVenueBookingsQuery = query(
        collection(db, 'bookings'),
        where('venueId', '==', venueId)
      )
      
      const allBookingsSnapshot = await getDocs(allVenueBookingsQuery)
      
      // Фильтруем бронирования за сегодня вручную
      const todayBookingsDocs = allBookingsSnapshot.docs.filter(doc => {
        const data = doc.data()
        const bookingDate = data.date?.toDate?.()
        if (!bookingDate) return false
        
        return bookingDate >= startOfToday && 
               bookingDate <= endOfToday && 
               data.status === 'confirmed'
      })
      
      // Подсчитываем только оплаченные бронирования для дохода
      const paidTodayBookings = todayBookingsDocs.filter(doc => {
        const paymentStatus = doc.data().paymentStatus
        return paymentStatus === 'paid'
      })
      
      const todayBookings = todayBookingsDocs.length
      const todayRevenue = paidTodayBookings.reduce((sum, doc) => sum + (doc.data().amount || 0), 0)
      
      // Загружаем количество кортов для расчета загрузки
      const courtsQuery = query(
        collection(db, 'venues', venueId, 'courts'),
        where('status', '==', 'active')
      )
      const courtsSnapshot = await getDocs(courtsQuery)
      const courtsCount = courtsSnapshot.size
      
      // Расчет загрузки (упрощенный - считаем что клуб работает 16 часов)
      const maxSlots = courtsCount * 16 // максимум слотов в день
      const utilization = maxSlots > 0 ? Math.round((todayBookings / maxSlots) * 100) : 0
      
      // Загружаем уникальных клиентов за последние 30 дней
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      // Используем уже загруженные бронирования и фильтруем за последние 30 дней
      const last30DaysBookings = allBookingsSnapshot.docs.filter(doc => {
        const data = doc.data()
        const bookingDate = data.date?.toDate?.()
        return bookingDate && bookingDate >= thirtyDaysAgo
      })
      
      const uniqueCustomers = new Set(last30DaysBookings.map(doc => doc.data().clientPhone || doc.data().customerPhone))
      
      // Подсчет поступлений за сегодня (платежи, совершенные сегодня)
      const todayIncome = allBookingsSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data()
        const paymentHistory = data.paymentHistory || []
        
        // Проверяем историю платежей на наличие оплаты сегодня
        const paidToday = paymentHistory.some((entry: any) => {
          if (entry.action === 'paid' || entry.action === 'payment_completed') {
            const paymentDate = entry.timestamp?.toDate?.() || new Date(entry.timestamp)
            return paymentDate >= startOfToday && paymentDate <= endOfToday
          }
          return false
        })
        
        // Если в истории нет записи об оплате, проверяем основные поля
        // (для совместимости со старыми записями)
        if (!paidToday && data.paymentStatus === 'paid') {
          const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt)
          if (createdAt >= startOfToday && createdAt <= endOfToday) {
            return sum + (data.amount || 0)
          }
        }
        
        return paidToday ? sum + (data.amount || 0) : sum
      }, 0)

      setStats({
        todayBookings,
        todayRevenue,
        todayIncome,
        utilization,
        activeCustomers: uniqueCustomers.size,
        bookingsChange: 12, // В реальном приложении нужно сравнивать с вчерашним днем
        revenueChange: 8,
        incomeChange: 5,
        utilizationChange: -5
      })
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const getBookingUrl = () => {
    // Для суперадмина используем выбранный клуб
    const currentVenueId = isSuperAdmin ? selectedVenueFilter : venueId
    if (!currentVenueId || currentVenueId === 'all') return ''
    return `https://allcourt.ru/club/${currentVenueId}`
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div>Загрузка...</div>
      </div>
    )
  }

  return (
    <div>
      {/* Фильтр по клубам для суперадмина */}
      {isSuperAdmin && (
        <div className="section-card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <label style={{ fontWeight: '600' }}>Фильтр по клубу:</label>
              <select 
                className="form-select" 
                style={{ maxWidth: '300px' }}
                value={selectedVenueFilter}
                onChange={(e) => setSelectedVenueFilter(e.target.value)}
              >
                <option value="all">Все клубы</option>
                {venues.map(venue => (
                  <option key={venue.id} value={venue.id}>{venue.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Блок с QR кодом и ссылкой для бронирования */}
      {((venueId && !isSuperAdmin) || (isSuperAdmin && selectedVenueFilter !== 'all')) && (
        <div className="section-card" style={{ marginBottom: '24px' }}>
          <div className="section-header">
            <h2 className="section-title">
              Ссылка для бронирования
              {isSuperAdmin && selectedVenueFilter !== 'all' && (
                <span style={{ fontSize: '16px', color: 'var(--gray)', marginLeft: '8px' }}>
                  ({venues.find(v => v.id === selectedVenueFilter)?.name})
                </span>
              )}
            </h2>
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

      {/* Заголовок для суперадмина */}
      {isSuperAdmin && (
        <h2 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: '700' }}>
          {selectedVenueFilter === 'all' 
            ? 'Общая статистика по всем клубам' 
            : `Статистика клуба "${venues.find(v => v.id === selectedVenueFilter)?.name}"`
          }
        </h2>
      )}

      {/* Статистика */}
      <div className="stats-grid">
        <StatCard
          title="Бронирований сегодня"
          value={stats.todayBookings}
          icon={<CalendarMonth />}
          change={`${stats.bookingsChange > 0 ? '+' : ''}${stats.bookingsChange}% от вчера`}
          isPositive={stats.bookingsChange > 0}
          description="Количество игр на сегодня"
        />
        <StatCard
          title="Поступления за сегодня"
          value={`${stats.todayIncome.toLocaleString('ru-RU')}₽`}
          icon={<AttachMoney />}
          change={`${stats.incomeChange > 0 ? '+' : ''}${stats.incomeChange}% от вчера`}
          isPositive={stats.incomeChange > 0}
          description="Все платежи, пришедшие сегодня (независимо от даты игры)"
        />
        <StatCard
          title="Доход за сегодня"
          value={`${stats.todayRevenue.toLocaleString('ru-RU')}₽`}
          icon={<AttachMoney />}
          change={`${stats.revenueChange > 0 ? '+' : ''}${stats.revenueChange}% от вчера`}
          isPositive={stats.revenueChange > 0}
          description="Деньги от игр, состоявшихся сегодня (со статусом оплачен)"
        />
        <StatCard
          title="Загрузка кортов"
          value={`${stats.utilization}%`}
          icon={<TrendingUp />}
          change={`${stats.utilizationChange > 0 ? '+' : ''}${stats.utilizationChange}% от вчера`}
          isPositive={stats.utilizationChange > 0}
          description="Процент занятых слотов от максимума"
        />
        <StatCard
          title="Активных клиентов"
          value={stats.activeCustomers}
          icon={<People />}
          change="за последние 30 дней"
          isPositive={true}
          description="Уникальные клиенты за месяц"
        />
      </div>

      {/* Последние бронирования */}
      <div className="section-card">
        <div className="section-header">
          <h2 className="section-title">Последние бронирования</h2>
          <button className="btn btn-secondary" onClick={() => window.location.href = '/admin/bookings'}>
            Все бронирования
          </button>
        </div>
        <div className="table-wrapper">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Загрузка...</div>
          ) : recentBookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)' }}>
              Пока нет бронирований
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Клиент</th>
                  <th>{isSuperAdmin && selectedVenueFilter === 'all' ? 'Клуб / Корт' : 'Корт'}</th>
                  <th>Дата и время</th>
                  <th>Статус</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>{booking.clientName}</td>
                    <td>{booking.courtName}</td>
                    <td>
                      {booking.date.toLocaleDateString('ru-RU')}, {booking.startTime}
                      {booking.endTime && `-${booking.endTime}`}
                    </td>
                    <td>
                      {booking.status === 'confirmed' && (
                        <>
                          {booking.paymentStatus === 'paid' && (
                            <span style={{ color: 'var(--success)' }}>✅ Оплачено</span>
                          )}
                          {booking.paymentStatus === 'awaiting_payment' && (
                            <span style={{ color: 'var(--warning)' }}>⏳ Ожидает оплаты</span>
                          )}
                          {booking.paymentStatus === 'not_required' && (
                            <span style={{ color: 'var(--success)' }}>✅ Подтверждено</span>
                          )}
                          {!booking.paymentStatus && (
                            <span style={{ color: 'var(--success)' }}>✅ Подтверждено</span>
                          )}
                        </>
                      )}
                      {booking.status === 'pending' && (
                        <span style={{ color: 'var(--warning)' }}>⏳ Ожидает подтверждения</span>
                      )}
                      {booking.status === 'cancelled' && (
                        <span style={{ color: 'var(--danger)' }}>❌ Отменено</span>
                      )}
                    </td>
                    <td>{booking.amount.toLocaleString('ru-RU')}₽</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
                id="modal-qr-code"
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
                  onClick={async () => {
                    try {
                      // Находим SVG элемент QR кода
                      const qrCodeSvg = document.getElementById('modal-qr-code');
                      if (!qrCodeSvg) {
                        console.error('QR code SVG element not found');
                        alert('Не удалось найти QR код. Попробуйте еще раз.');
                        return;
                      }

                      // Создаем временный контейнер для большого QR кода
                      const tempContainer = document.createElement('div');
                      tempContainer.style.position = 'absolute';
                      tempContainer.style.left = '-9999px';
                      tempContainer.style.top = '-9999px';
                      tempContainer.style.backgroundColor = 'white';
                      tempContainer.style.width = '1600px';
                      tempContainer.style.height = '1600px';
                      tempContainer.style.display = 'flex';
                      tempContainer.style.alignItems = 'center';
                      tempContainer.style.justifyContent = 'center';
                      document.body.appendChild(tempContainer);

                      // Создаем большой QR код для PDF
                      const bigQRContainer = document.createElement('div');
                      bigQRContainer.style.width = '1600px';
                      bigQRContainer.style.height = '1600px';
                      bigQRContainer.innerHTML = `
                        <svg width="1600" height="1600" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
                          ${qrCodeSvg.innerHTML}
                        </svg>
                      `;
                      tempContainer.appendChild(bigQRContainer);

                      // Создаем canvas из SVG с высоким разрешением
                      const canvas = await html2canvas(tempContainer, {
                        backgroundColor: 'white',
                        scale: 1,
                        width: 1600,
                        height: 1600
                      });

                      // Создаем PDF документ A4
                      const pdf = new jsPDF({
                        orientation: 'portrait',
                        unit: 'mm',
                        format: 'a4'
                      });

                      // A4 размеры: 210mm x 297mm
                      const pageWidth = 210;
                      const pageHeight = 297;
                      
                      // QR код занимает 2/3 ширины страницы (увеличиваем до 180mm для лучшей видимости)
                      const qrSize = 180; // Увеличиваем размер QR кода
                      
                      // Центрируем QR код на странице
                      const x = (pageWidth - qrSize) / 2; // Центрируем по горизонтали
                      const y = (pageHeight - qrSize) / 2; // Центрируем по вертикали

                      // Добавляем QR код на страницу
                      const imgData = canvas.toDataURL('image/png');
                      pdf.addImage(imgData, 'PNG', x, y, qrSize, qrSize);

                      // Имя файла
                      const clubName = isSuperAdmin 
                        ? venues.find(v => v.id === selectedVenueFilter)?.name 
                        : currentVenueName;
                      const fileName = `qr-code-${clubName || 'booking'}-${new Date().getTime()}.pdf`;
                      
                      // Скачиваем PDF
                      pdf.save(fileName);

                      // Удаляем временный контейнер
                      document.body.removeChild(tempContainer);
                    } catch (error) {
                      console.error('Error downloading QR code:', error);
                      alert('Ошибка при скачивании QR кода. Попробуйте еще раз.');
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