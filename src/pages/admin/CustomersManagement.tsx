import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { VenueSelector, VenueSelectorEmpty } from '../../components/VenueSelector'
import { 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { FileDownload, History } from '@mui/icons-material'

interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  bookingsCount: number
  lastVisit?: Date
  totalSpent: number
  hasApp: boolean
  venueId: string
  createdAt: Date
  birthday?: string // Формат MM-DD (месяц-день)
}

interface CustomerBooking {
  id: string
  date: Date
  courtName: string
  startTime: string
  endTime: string
  amount: number
  status: string
  paymentStatus?: string
}

export default function CustomersManagement() {
  const { admin } = useAuth()
  const { isSuperAdmin } = usePermission()
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showHistory, setShowHistory] = useState<string | null>(null)
  const [customerBookings, setCustomerBookings] = useState<CustomerBooking[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showBirthdayModal, setShowBirthdayModal] = useState<string | null>(null)
  const [birthdayInput, setBirthdayInput] = useState({ day: '', month: '' })

  useEffect(() => {
    if (isSuperAdmin) {
      const venueId = localStorage.getItem('selectedVenueId')
      if (venueId) {
        setSelectedVenueId(venueId)
        fetchCustomers(venueId)
      } else {
        setLoading(false)
      }
    } else if (admin?.venueId) {
      fetchCustomers(admin.venueId)
    }
  }, [admin, isSuperAdmin])

  const handleVenueChange = (venueId: string) => {
    setSelectedVenueId(venueId)
    localStorage.setItem('selectedVenueId', venueId)
    if (venueId) {
      fetchCustomers(venueId)
    }
  }

  const fetchCustomers = async (venueId?: string) => {
    const targetVenueId = venueId || admin?.venueId
    if (!targetVenueId) return

    try {
      setLoading(true)
      // В реальном приложении клиенты бы хранились в отдельной коллекции
      // Сейчас мы соберем их из бронирований
      // Используем простой запрос без сортировки, чтобы избежать создания индекса
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('venueId', '==', targetVenueId),
        limit(1000) // Увеличиваем лимит для получения всех клиентов
      )
      
      const snapshot = await getDocs(bookingsQuery)
      const customerMap = new Map<string, Customer>()
      
      snapshot.docs.forEach(doc => {
        const booking = doc.data()
        
        // Проверяем оба варианта полей - старые (clientName/clientPhone) и новые (customerName/customerPhone)
        const customerPhone = booking.customerPhone || booking.clientPhone
        const customerName = booking.customerName || booking.clientName
        
        if (!customerPhone || !customerName) return // Пропускаем записи без имени или телефона
        
        const customerId = customerPhone // Используем телефон как ID
        
        // Определяем, учитывать ли это бронирование в статистике
        const isNotCancelled = booking.status !== 'cancelled'
        
        if (customerMap.has(customerId)) {
          const existing = customerMap.get(customerId)!
          // Всегда обновляем имя на самое свежее
          existing.name = customerName
          
          // Обновляем статус "В приложении" если есть userId (означает авторизацию)
          if (booking.userId && booking.userId.trim() !== '') {
            existing.hasApp = true
          }
          
          // Статистику обновляем только для не отмененных бронирований
          if (isNotCancelled) {
            existing.bookingsCount++
            existing.totalSpent += booking.amount || booking.totalPrice || booking.price || 0
            const bookingDate = booking.date?.toDate ? booking.date.toDate() : new Date(booking.date)
            if (!existing.lastVisit || bookingDate > existing.lastVisit) {
              existing.lastVisit = bookingDate
            }
          }
        } else {
          const bookingDate = booking.date?.toDate ? booking.date.toDate() : new Date(booking.date)
          const createdDate = booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt || new Date())
          customerMap.set(customerId, {
            id: customerId,
            name: customerName,
            phone: customerPhone,
            email: booking.customerEmail || booking.clientEmail,
            bookingsCount: isNotCancelled ? 1 : 0,
            lastVisit: isNotCancelled ? bookingDate : undefined,
            totalSpent: isNotCancelled ? (booking.amount || booking.totalPrice || booking.price || 0) : 0,
            hasApp: (booking.userId && booking.userId.trim() !== '') || booking.paymentMethod === 'app' || booking.paymentMethod === 'mobile', // Проверяем userId ИЛИ paymentMethod для обратной совместимости
            venueId: targetVenueId,
            createdAt: createdDate
          })
        }
      })
      
      // Сортируем клиентов по последнему визиту (самые недавние первыми)
      const sortedCustomers = Array.from(customerMap.values()).sort((a, b) => {
        if (!a.lastVisit) return 1
        if (!b.lastVisit) return -1
        return b.lastVisit.getTime() - a.lastVisit.getTime()
      })
      setCustomers(sortedCustomers)
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  )

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarColor = (name: string) => {
    const colors = ['var(--primary)', 'var(--padel)', 'var(--badminton)', 'var(--tennis)']
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  const formatDate = (date?: Date) => {
    if (!date) return 'Нет данных'
    
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Сегодня'
    if (diffDays === 1) return 'Вчера'
    if (diffDays < 7) return `${diffDays} дней назад`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} недель назад`
    return date.toLocaleDateString('ru-RU')
  }

  const formatBirthday = (birthday: string) => {
    // birthday в формате MM-DD
    const [month, day] = birthday.split('-')
    const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
    return `${parseInt(day)} ${months[parseInt(month) - 1]}`
  }

  const openBirthdayModal = (customerId: string) => {
    setShowBirthdayModal(customerId)
    setBirthdayInput({ day: '', month: '' })
  }

  const saveBirthday = async () => {
    if (!showBirthdayModal || !birthdayInput.day || !birthdayInput.month) return
    
    const birthday = `${birthdayInput.month.padStart(2, '0')}-${birthdayInput.day.padStart(2, '0')}`
    
    // Обновляем локальное состояние
    setCustomers(prev => prev.map(c => 
      c.id === showBirthdayModal ? { ...c, birthday } : c
    ))
    
    // TODO: Сохранить в Firebase когда будет отдельная коллекция customers
    // await updateDoc(doc(db, 'customers', showBirthdayModal), { birthday })
    
    setShowBirthdayModal(null)
    setBirthdayInput({ day: '', month: '' })
  }

  const handleExport = () => {
    const csvContent = [
      ['Имя', 'Телефон', 'Количество бронирований', 'Потрачено', 'Последний визит'].join(','),
      ...filteredCustomers.map(customer => [
        customer.name,
        customer.phone,
        customer.bookingsCount,
        customer.totalSpent,
        customer.lastVisit?.toLocaleDateString('ru-RU') || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `customers_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const loadCustomerHistory = async (customerId: string) => {
    const customer = customers.find(c => c.id === customerId)
    if (!customer) return

    try {
      setLoadingHistory(true)
      setShowHistory(customerId)
      
      const targetVenueId = isSuperAdmin ? selectedVenueId : admin?.venueId
      if (!targetVenueId) return

      // Загружаем историю бронирований клиента
      // Нужно проверять оба поля - customerPhone и clientPhone
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('venueId', '==', targetVenueId),
        limit(100)
      )
      
      const snapshot = await getDocs(bookingsQuery)
      const bookings: CustomerBooking[] = []
      
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        
        // Проверяем, что это бронирование принадлежит нужному клиенту
        const bookingPhone = data.customerPhone || data.clientPhone
        if (bookingPhone !== customer.phone) return
        
        bookings.push({
          id: doc.id,
          date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
          courtName: data.courtName || 'Корт',
          startTime: data.startTime,
          endTime: data.endTime,
          amount: data.amount || data.totalPrice || data.price || 0,
          status: data.status || 'confirmed',
          paymentStatus: data.paymentStatus
        })
      })
      
      // Сортируем бронирования по дате (самые новые первыми)
      const sortedBookings = bookings.sort((a, b) => b.date.getTime() - a.date.getTime())
      setCustomerBookings(sortedBookings)
    } catch (error) {
      console.error('Error loading customer history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  if (loading) {
    return <div>Загрузка...</div>
  }

  if (isSuperAdmin && !selectedVenueId) {
    return <VenueSelectorEmpty title="Выберите клуб для просмотра клиентов" />
  }

  return (
    <div>
      {/* Селектор клуба для суперадмина */}
      {isSuperAdmin && (
        <VenueSelector
          selectedVenueId={selectedVenueId}
          onVenueChange={handleVenueChange}
        />
      )}
      <div className="section-card">
        <div className="section-header">
          <h2 className="section-title">База клиентов</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="search" 
              className="form-input" 
              placeholder="Поиск по имени или телефону" 
              style={{ width: '300px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button 
              className="btn btn-secondary" 
              onClick={() => fetchCustomers(isSuperAdmin ? selectedVenueId : admin?.venueId)}
              title="Обновить список клиентов"
            >
              🔄
            </button>
            <button className="btn btn-secondary" onClick={handleExport}>
              <FileDownload fontSize="small" />
              Экспорт
            </button>
          </div>
        </div>
        
        {/* Информация об ограничениях тарифа */}
        <div style={{
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
          borderLeft: '3px solid var(--primary)',
          marginBottom: '16px',
          borderRadius: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--dark)' }}>
              📊 Ограничения тарифа
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--gray)', margin: 0 }}>
            В бесплатном тарифе доступно отображение до <strong>1000 клиентов</strong>. 
            Всего найдено: <strong>{customers.length}</strong> клиентов.
            {customers.length >= 1000 && (
              <span style={{ color: 'var(--warning)', marginLeft: '8px' }}>
                ⚠️ Достигнут лимит отображения
              </span>
            )}
          </p>
        </div>
        
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Клиент</th>
                <th>Телефон</th>
                <th>Бронирований</th>
                <th>Потрачено</th>
                <th>
                  <div>
                    Последний визит
                    <div style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--gray)', marginTop: '2px' }}>
                      Последнее не отмененное бронирование
                    </div>
                  </div>
                </th>
                <th>День рождения</th>
                <th>Статус в приложении</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--gray)' }}>
                    Клиенты не найдены
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => (
                  <tr key={customer.id}>
                    <td>
                      <div className="customer-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="customer-avatar" style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: getAvatarColor(customer.name),
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '600',
                          fontSize: '16px'
                        }}>
                          {getInitials(customer.name)}
                        </div>
                        <div>
                          <div className="customer-name" style={{ fontWeight: '600', color: 'var(--dark)' }}>
                            {customer.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{customer.phone}</td>
                    <td>{customer.bookingsCount}</td>
                    <td>{customer.totalSpent.toLocaleString('ru-RU')}₽</td>
                    <td>{formatDate(customer.lastVisit)}</td>
                    <td>
                      {customer.birthday ? (
                        <span>{formatBirthday(customer.birthday)}</span>
                      ) : (
                        <button 
                          className="btn btn-link" 
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => openBirthdayModal(customer.id)}
                        >
                          Добавить
                        </button>
                      )}
                    </td>
                    <td>
                      {customer.hasApp ? (
                        <span style={{ color: 'var(--success)' }}>✅ Установлено</span>
                      ) : (
                        <span style={{ color: 'var(--warning)' }}>📱 Не установлено</span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => loadCustomerHistory(customer.id)}
                        title="История бронирований"
                      >
                        <History fontSize="small" />
                        История
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="section-card">
        <h2 className="section-title">Статистика по клиентам</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--primary)' }}>
              {customers.length}
            </div>
            <div style={{ color: 'var(--gray)', fontSize: '14px' }}>Всего клиентов</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--primary)' }}>
              {customers.filter(c => c.hasApp).length}
            </div>
            <div style={{ color: 'var(--gray)', fontSize: '14px' }}>С приложением</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--primary)' }}>
              {customers.length > 0 ? Math.round(customers.filter(c => c.hasApp).length / customers.length * 100) : 0}%
            </div>
            <div style={{ color: 'var(--gray)', fontSize: '14px' }}>Конверсия в приложение</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--primary)' }}>
              {customers.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString('ru-RU')}₽
            </div>
            <div style={{ color: 'var(--gray)', fontSize: '14px' }}>Общий доход</div>
          </div>
        </div>
      </div>

      {/* Модальное окно истории бронирований */}
      {showHistory && (
        <div className={`modal ${showHistory ? 'active' : ''}`}>
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                История бронирований: {customers.find(c => c.id === showHistory)?.name}
              </h3>
              <button 
                className="modal-close" 
                onClick={() => {
                  setShowHistory(null)
                  setCustomerBookings([])
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            
            <div className="modal-body">
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '48px' }}>
                  Загрузка истории...
                </div>
              ) : customerBookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--gray)' }}>
                  История бронирований пуста
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Дата и время</th>
                        <th>Корт</th>
                        <th>Сумма</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerBookings.map(booking => (
                        <tr key={booking.id}>
                          <td>
                            {booking.date.toLocaleDateString('ru-RU')}{' '}
                            {booking.startTime} - {booking.endTime}
                          </td>
                          <td>{booking.courtName}</td>
                          <td>{booking.amount.toLocaleString('ru-RU')}₽</td>
                          <td>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              background: booking.status === 'confirmed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                              color: booking.status === 'confirmed' ? 'var(--success)' : 'var(--warning)'
                            }}>
                              {booking.status === 'confirmed' ? 'Подтверждено' : 
                               booking.status === 'cancelled' ? 'Отменено' : 'В ожидании'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div style={{ marginTop: '24px', padding: '16px', background: 'var(--background)', borderRadius: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '18px' }}>
                      {customerBookings.length}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--gray)' }}>Всего бронирований</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '18px' }}>
                      {customerBookings.reduce((sum, b) => sum + b.amount, 0).toLocaleString('ru-RU')}₽
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--gray)' }}>Общая сумма</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '18px' }}>
                      {customerBookings.length > 0 ? 
                        Math.round(customerBookings.reduce((sum, b) => sum + b.amount, 0) / customerBookings.length).toLocaleString('ru-RU') : 0}₽
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--gray)' }}>Средний чек</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для ввода дня рождения */}
      {showBirthdayModal && (
        <div className="modal active">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Добавить день рождения</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowBirthdayModal(null)
                  setBirthdayInput({ day: '', month: '' })
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            
            <div className="modal-body">
              <p style={{ marginBottom: '20px', color: 'var(--gray)' }}>
                Укажите день и месяц рождения клиента (год не требуется)
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">День</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="1-31"
                    min="1"
                    max="31"
                    value={birthdayInput.day}
                    onChange={(e) => setBirthdayInput(prev => ({ ...prev, day: e.target.value }))}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Месяц</label>
                  <select
                    className="form-select"
                    value={birthdayInput.month}
                    onChange={(e) => setBirthdayInput(prev => ({ ...prev, month: e.target.value }))}
                  >
                    <option value="">Выберите месяц</option>
                    <option value="01">Январь</option>
                    <option value="02">Февраль</option>
                    <option value="03">Март</option>
                    <option value="04">Апрель</option>
                    <option value="05">Май</option>
                    <option value="06">Июнь</option>
                    <option value="07">Июль</option>
                    <option value="08">Август</option>
                    <option value="09">Сентябрь</option>
                    <option value="10">Октябрь</option>
                    <option value="11">Ноябрь</option>
                    <option value="12">Декабрь</option>
                  </select>
                </div>
              </div>
              
              <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowBirthdayModal(null)
                    setBirthdayInput({ day: '', month: '' })
                  }}
                >
                  Отмена
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={saveBirthday}
                  disabled={!birthdayInput.day || !birthdayInput.month}
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}