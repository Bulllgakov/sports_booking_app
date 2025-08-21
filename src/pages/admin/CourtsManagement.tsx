import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { PermissionGate } from '../../components/PermissionGate'
import { VenueSelector, VenueSelectorEmpty } from '../../components/VenueSelector'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc,
  getDoc
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { Add, Edit, Delete } from '@mui/icons-material'
import { Alert, AlertTitle } from '@mui/material'
import { SUBSCRIPTION_PLANS } from '../../types/subscription'

interface PriceInterval {
  from: string // время начала HH:00
  to: string   // время окончания HH:00
  price: number
}

interface DayPricing {
  basePrice: number
  intervals?: PriceInterval[]
}

interface HolidayPricing {
  date: string // дата в формате MM-DD (например: "03-08" для 8 марта)
  price: number
  name?: string // название праздника для удобства
}

interface Court {
  id: string
  name: string
  type: 'tennis' | 'padel' | 'badminton'
  courtType: 'indoor' | 'outdoor'
  priceWeekday?: number // для обратной совместимости
  priceWeekend?: number // для обратной совместимости
  pricing?: {
    monday?: DayPricing
    tuesday?: DayPricing
    wednesday?: DayPricing
    thursday?: DayPricing
    friday?: DayPricing
    saturday?: DayPricing
    sunday?: DayPricing
  }
  holidayPricing?: HolidayPricing[]
  status: 'active' | 'inactive' | 'maintenance'
  color?: string
  venueId: string
  createdAt: Date
}

// Предопределенные цвета для кортов
const DEFAULT_COURT_COLORS = [
  '#00A86B', // Зеленый
  '#2E86AB', // Синий
  '#FF6B6B', // Красный
  '#F39C12', // Оранжевый
  '#8E44AD', // Фиолетовый
  '#E91E63', // Розовый
  '#00BCD4', // Бирюзовый
  '#795548', // Коричневый
  '#607D8B', // Серо-синий
  '#FF5722', // Глубокий оранжевый
  '#009688', // Тил
  '#3F51B5', // Индиго
  '#FFEB3B', // Желтый
  '#4CAF50', // Светло-зеленый
  '#FF9800', // Янтарный
]

export default function CourtsManagement() {
  const { admin, club } = useAuth()
  const { isSuperAdmin, canManageCourts } = usePermission()
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [success, setSuccess] = useState(false)
  const [editingCourt, setEditingCourt] = useState<Court | null>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [limitExceeded, setLimitExceeded] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'padel' as Court['type'],
    courtType: 'indoor' as Court['courtType'],
    pricing: {
      monday: { basePrice: 1900, intervals: [] },
      tuesday: { basePrice: 1900, intervals: [] },
      wednesday: { basePrice: 1900, intervals: [] },
      thursday: { basePrice: 1900, intervals: [] },
      friday: { basePrice: 1900, intervals: [] },
      saturday: { basePrice: 2400, intervals: [] },
      sunday: { basePrice: 2400, intervals: [] },
    },
    holidayPricing: [] as HolidayPricing[],
    status: 'active' as Court['status'],
    color: '#00A86B',
  })

  useEffect(() => {
    if (isSuperAdmin) {
      const venueId = localStorage.getItem('selectedVenueId')
      if (venueId) {
        setSelectedVenueId(venueId)
        fetchCourts(venueId)
      }
    } else if (admin?.venueId) {
      fetchCourts(admin.venueId)
    }
  }, [admin, isSuperAdmin])

  const handleVenueChange = (venueId: string) => {
    setSelectedVenueId(venueId)
    localStorage.setItem('selectedVenueId', venueId)
    if (venueId) {
      fetchCourts(venueId)
    }
  }

  const fetchCourts = async (venueId: string) => {
    if (!venueId) return

    try {
      setLoading(true)
      // Загружаем корты из подколлекции venues/{venueId}/courts
      const q = query(collection(db, 'venues', venueId, 'courts'))
      const snapshot = await getDocs(q)
      const courtsData = snapshot.docs.map((doc, index) => {
        const data = doc.data()
        // Если у корта нет цвета, назначаем цвет из палитры
        if (!data.color) {
          const colorIndex = index % DEFAULT_COURT_COLORS.length
          data.color = DEFAULT_COURT_COLORS[colorIndex]
          // Обновляем корт в базе данных с новым цветом
          updateDoc(doc.ref, { color: data.color })
        }
        return {
          id: doc.id,
          ...data
        }
      }) as Court[]
      setCourts(courtsData)
      
      // Загружаем подписку и проверяем лимит кортов
      const subQuery = query(
        collection(db, 'subscriptions'),
        where('venueId', '==', venueId),
        where('status', 'in', ['active', 'trial'])
      )
      const subSnapshot = await getDocs(subQuery)
      if (!subSnapshot.empty) {
        const subData = subSnapshot.docs[0].data()
        setSubscription(subData)
        
        // Проверяем лимит для тарифа START
        if (subData.plan === 'start') {
          const maxCourts = SUBSCRIPTION_PLANS.start.limits.maxCourts
          if (courtsData.length >= maxCourts) {
            setLimitExceeded(true)
          } else {
            setLimitExceeded(false)
          }
        } else {
          setLimitExceeded(false)
        }
      }
    } catch (error) {
      console.error('Error fetching courts:', error)
    } finally {
      setLoading(false)
    }
  }

  // Функция для получения следующего доступного цвета
  const getNextAvailableColor = () => {
    // Получаем все используемые цвета
    const usedColors = courts.map(court => court.color).filter(Boolean)
    
    // Находим первый неиспользованный цвет из палитры
    for (const color of DEFAULT_COURT_COLORS) {
      if (!usedColors.includes(color)) {
        return color
      }
    }
    
    // Если все цвета использованы, возвращаем цвет с наименьшим количеством использований
    const colorCounts = DEFAULT_COURT_COLORS.reduce((acc, color) => {
      acc[color] = usedColors.filter(c => c === color).length
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(colorCounts).sort((a, b) => a[1] - b[1])[0][0]
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('price') ? Number(value) : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const venueId = isSuperAdmin ? selectedVenueId : admin?.venueId
    if (!venueId) return

    try {
      // Создаем безопасную версию данных для отправки
      const safeFormData = {
        ...formData,
        holidayPricing: Array.isArray(formData.holidayPricing) ? formData.holidayPricing : [],
        pricing: {
          monday: {
            basePrice: formData.pricing.monday?.basePrice || 1900,
            intervals: Array.isArray(formData.pricing.monday?.intervals) ? formData.pricing.monday.intervals : []
          },
          tuesday: {
            basePrice: formData.pricing.tuesday?.basePrice || 1900,
            intervals: Array.isArray(formData.pricing.tuesday?.intervals) ? formData.pricing.tuesday.intervals : []
          },
          wednesday: {
            basePrice: formData.pricing.wednesday?.basePrice || 1900,
            intervals: Array.isArray(formData.pricing.wednesday?.intervals) ? formData.pricing.wednesday.intervals : []
          },
          thursday: {
            basePrice: formData.pricing.thursday?.basePrice || 1900,
            intervals: Array.isArray(formData.pricing.thursday?.intervals) ? formData.pricing.thursday.intervals : []
          },
          friday: {
            basePrice: formData.pricing.friday?.basePrice || 1900,
            intervals: Array.isArray(formData.pricing.friday?.intervals) ? formData.pricing.friday.intervals : []
          },
          saturday: {
            basePrice: formData.pricing.saturday?.basePrice || 2400,
            intervals: Array.isArray(formData.pricing.saturday?.intervals) ? formData.pricing.saturday.intervals : []
          },
          sunday: {
            basePrice: formData.pricing.sunday?.basePrice || 2400,
            intervals: Array.isArray(formData.pricing.sunday?.intervals) ? formData.pricing.sunday.intervals : []
          }
        }
      }

      if (editingCourt) {
        // Обновление существующего корта
        await updateDoc(doc(db, 'venues', venueId, 'courts', editingCourt.id), {
          ...safeFormData,
          updatedAt: new Date()
        })
      } else {
        // Создание нового корта
        await addDoc(collection(db, 'venues', venueId, 'courts'), {
          ...safeFormData,
          createdAt: new Date()
        })
      }
      
      setShowModal(false)
      setEditingCourt(null)
      const nextColor = getNextAvailableColor()
      setFormData({
        name: '',
        type: 'padel',
        courtType: 'indoor',
        pricing: {
          monday: { basePrice: 1900, intervals: [] },
          tuesday: { basePrice: 1900, intervals: [] },
          wednesday: { basePrice: 1900, intervals: [] },
          thursday: { basePrice: 1900, intervals: [] },
          friday: { basePrice: 1900, intervals: [] },
          saturday: { basePrice: 2400, intervals: [] },
          sunday: { basePrice: 2400, intervals: [] },
        },
        holidayPricing: [],
        status: 'active',
        color: nextColor,
      })
      
      fetchCourts(venueId)
      
      // Показать сообщение об успехе
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving court:', error)
    }
  }

  const handleEdit = (court: Court) => {
    setEditingCourt(court)
    // Подготавливаем pricing с гарантированными intervals
    const defaultPricing = {
      monday: { basePrice: 1900, intervals: [] },
      tuesday: { basePrice: 1900, intervals: [] },
      wednesday: { basePrice: 1900, intervals: [] },
      thursday: { basePrice: 1900, intervals: [] },
      friday: { basePrice: 1900, intervals: [] },
      saturday: { basePrice: 2400, intervals: [] },
      sunday: { basePrice: 2400, intervals: [] },
    }
    
    // Безопасно создаем pricing объект
    const safePricing = {
      monday: court.pricing?.monday ? 
        { basePrice: court.pricing.monday.basePrice || 1900, intervals: court.pricing.monday.intervals || [] } : 
        defaultPricing.monday,
      tuesday: court.pricing?.tuesday ? 
        { basePrice: court.pricing.tuesday.basePrice || 1900, intervals: court.pricing.tuesday.intervals || [] } : 
        defaultPricing.tuesday,
      wednesday: court.pricing?.wednesday ? 
        { basePrice: court.pricing.wednesday.basePrice || 1900, intervals: court.pricing.wednesday.intervals || [] } : 
        defaultPricing.wednesday,
      thursday: court.pricing?.thursday ? 
        { basePrice: court.pricing.thursday.basePrice || 1900, intervals: court.pricing.thursday.intervals || [] } : 
        defaultPricing.thursday,
      friday: court.pricing?.friday ? 
        { basePrice: court.pricing.friday.basePrice || 1900, intervals: court.pricing.friday.intervals || [] } : 
        defaultPricing.friday,
      saturday: court.pricing?.saturday ? 
        { basePrice: court.pricing.saturday.basePrice || 2400, intervals: court.pricing.saturday.intervals || [] } : 
        defaultPricing.saturday,
      sunday: court.pricing?.sunday ? 
        { basePrice: court.pricing.sunday.basePrice || 2400, intervals: court.pricing.sunday.intervals || [] } : 
        defaultPricing.sunday,
    }
    
    setFormData({
      name: court.name,
      type: court.type,
      courtType: court.courtType,
      pricing: safePricing,
      holidayPricing: court.holidayPricing || [],
      status: court.status,
      color: court.color || '#00A86B',
    })
    setShowModal(true)
  }

  const handleDelete = async (courtId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот корт?')) {
      try {
        const venueId = isSuperAdmin ? selectedVenueId : admin?.venueId
        if (!venueId) return
        
        await deleteDoc(doc(db, 'venues', venueId, 'courts', courtId))
        fetchCourts(venueId)
        
        // Показать сообщение об успешном удалении
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } catch (error) {
        console.error('Error deleting court:', error)
      }
    }
  }

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

  if (loading) {
    return <div>Загрузка...</div>
  }

  if (!canManageCourts()) {
    return (
      <Alert severity="error">
        <AlertTitle>Доступ запрещен</AlertTitle>
        У вас недостаточно прав для управления кортами.
      </Alert>
    )
  }

  if (isSuperAdmin && !selectedVenueId) {
    return <VenueSelectorEmpty title="Выберите клуб для управления кортами" />
  }

  return (
    <PermissionGate permission={['manage_courts', 'manage_all_venues']}>
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
            <h2 className="section-title">Управление кортами</h2>
            <button className="btn btn-primary" onClick={() => {
              // Проверяем лимит кортов для тарифа START
              if (limitExceeded && !isSuperAdmin) {
                alert(`Достигнут лимит кортов для тарифа СТАРТ (максимум ${SUBSCRIPTION_PLANS.start.limits.maxCourts} корта). Для добавления большего количества кортов необходимо улучшить тарифный план.`)
                return
              }
              const nextColor = getNextAvailableColor()
              setFormData(prev => ({ ...prev, color: nextColor }))
              setShowModal(true)
            }}>
              <Add fontSize="small" />
              Добавить корт
            </button>
          </div>
          
          {/* Предупреждение о лимите кортов */}
          {subscription?.plan === 'start' && courts.length >= SUBSCRIPTION_PLANS.start.limits.maxCourts - 1 && !isSuperAdmin && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {courts.length >= SUBSCRIPTION_PLANS.start.limits.maxCourts ? (
                <>
                  <AlertTitle>Достигнут лимит кортов</AlertTitle>
                  Тариф СТАРТ позволяет создать максимум {SUBSCRIPTION_PLANS.start.limits.maxCourts} корта. 
                  Для добавления большего количества кортов необходимо перейти на тариф СТАНДАРТ или ПРОФИ.
                </>
              ) : (
                <>
                  <AlertTitle>Приближается лимит кортов</AlertTitle>
                  У вас осталась возможность добавить еще {SUBSCRIPTION_PLANS.start.limits.maxCourts - courts.length} корт(а) на тарифе СТАРТ.
                </>
              )}
            </Alert>
          )}
          
          {success && (
            <div style={{ 
              marginTop: '16px',
              marginBottom: '16px',
              padding: '12px', 
              background: 'rgba(16, 185, 129, 0.1)', 
              color: 'var(--success)',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              ✅ Корт успешно сохранен
            </div>
          )}
        
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
                    (() => {
                      try {
                        const prices = Object.values(court.pricing)
                          .filter(p => p && p.basePrice)
                          .map(p => p.basePrice)
                        
                        if (prices.length === 0) {
                          return <>Цены не установлены</>
                        }
                        
                        return <>Цены: от {Math.min(...prices)}₽ до {Math.max(...prices)}₽</>
                      } catch (e) {
                        console.error('Error displaying court prices:', e, court)
                        return <>Ошибка отображения цен</>
                      }
                    })()
                  ) : (
                    <>Будни: {court.priceWeekday || 1900}₽ | Вых: {court.priceWeekend || 2400}₽</>
                  )}
                </div>
                <div>Статус: {court.status === 'active' ? 'Активен' : court.status === 'maintenance' ? 'Обслуживание' : 'Неактивен'}</div>
              </div>
              <div className="court-actions">
                <button className="btn btn-secondary" onClick={() => handleEdit(court)}>
                  <Edit fontSize="small" />
                  Редактировать
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleDelete(court.id)}
                  style={{ marginLeft: 'auto' }}
                >
                  <Delete fontSize="small" />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {courts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--gray)' }}>
            <p>У вас пока нет кортов</p>
            <p>Нажмите "Добавить корт", чтобы создать первый</p>
          </div>
        )}
        </div>
      </div>

      {/* Модальное окно для добавления/редактирования корта */}
      <div className={`modal ${showModal ? 'active' : ''}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h3 className="modal-title">
              {editingCourt ? 'Редактировать корт' : 'Добавить корт'}
            </h3>
            <button 
              className="modal-close" 
              onClick={() => {
                setShowModal(false)
                setEditingCourt(null)
                const nextColor = getNextAvailableColor()
                setFormData({
                  name: '',
                  type: 'padel',
                  courtType: 'indoor',
                  pricing: {
                    monday: { basePrice: 1900, intervals: [] },
                    tuesday: { basePrice: 1900, intervals: [] },
                    wednesday: { basePrice: 1900, intervals: [] },
                    thursday: { basePrice: 1900, intervals: [] },
                    friday: { basePrice: 1900, intervals: [] },
                    saturday: { basePrice: 2400, intervals: [] },
                    sunday: { basePrice: 2400, intervals: [] },
                  },
                  holidayPricing: [],
                  status: 'active',
                  color: nextColor,
                })
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Название корта</label>
                <input 
                  type="text" 
                  className="form-input" 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Например: Падел корт 1"
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Вид спорта</label>
                <select 
                  className="form-select"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                >
                  <option value="padel">Падел</option>
                  <option value="tennis">Теннис</option>
                  <option value="badminton">Бадминтон</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Тип корта</label>
                <select 
                  className="form-select"
                  name="courtType"
                  value={formData.courtType}
                  onChange={handleInputChange}
                >
                  <option value="indoor">Крытый</option>
                  <option value="outdoor">Открытый</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Ценовая политика</label>
                <div style={{ marginTop: '16px' }}>
                    {[
                      { key: 'monday', label: 'Понедельник' },
                      { key: 'tuesday', label: 'Вторник' },
                      { key: 'wednesday', label: 'Среда' },
                      { key: 'thursday', label: 'Четверг' },
                      { key: 'friday', label: 'Пятница' },
                      { key: 'saturday', label: 'Суббота' },
                      { key: 'sunday', label: 'Воскресенье' }
                    ].map(day => (
                      <div key={day.key} style={{ marginBottom: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <h4 style={{ margin: 0 }}>{day.label}</h4>
                          <input
                            type="number"
                            className="form-input"
                            style={{ width: '120px' }}
                            value={formData.pricing[day.key as keyof typeof formData.pricing].basePrice}
                            onChange={(e) => {
                              const price = Number(e.target.value)
                              setFormData(prev => ({
                                ...prev,
                                pricing: {
                                  ...prev.pricing,
                                  [day.key]: {
                                    ...prev.pricing[day.key as keyof typeof prev.pricing],
                                    basePrice: price
                                  }
                                }
                              }))
                            }}
                            min="0"
                            placeholder="Базовая цена"
                          />
                          <span style={{ marginLeft: '8px' }}>₽/час</span>
                        </div>
                        
                        <div style={{ marginTop: '12px' }}>
                          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                            Интервалы с особыми ценами:
                          </div>
                          {(() => {
                            const dayPricing = formData.pricing[day.key as keyof typeof formData.pricing]
                            const intervals = dayPricing?.intervals || []
                            
                            return intervals.map((interval, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <input
                                type="time"
                                className="form-input"
                                style={{ width: '140px' }}
                                value={interval.from}
                                onChange={(e) => {
                                  const newIntervals = [...(formData.pricing[day.key as keyof typeof formData.pricing].intervals || [])]
                                  newIntervals[idx].from = e.target.value
                                  setFormData(prev => ({
                                    ...prev,
                                    pricing: {
                                      ...prev.pricing,
                                      [day.key]: {
                                        ...prev.pricing[day.key as keyof typeof prev.pricing],
                                        intervals: newIntervals
                                      }
                                    }
                                  }))
                                }}
                                step="3600"
                              />
                              <span>-</span>
                              <input
                                type="time"
                                className="form-input"
                                style={{ width: '140px' }}
                                value={interval.to}
                                onChange={(e) => {
                                  const newIntervals = [...(formData.pricing[day.key as keyof typeof formData.pricing].intervals || [])]
                                  newIntervals[idx].to = e.target.value
                                  setFormData(prev => ({
                                    ...prev,
                                    pricing: {
                                      ...prev.pricing,
                                      [day.key]: {
                                        ...prev.pricing[day.key as keyof typeof prev.pricing],
                                        intervals: newIntervals
                                      }
                                    }
                                  }))
                                }}
                                step="3600"
                              />
                              <input
                                type="number"
                                className="form-input"
                                style={{ width: '120px' }}
                                value={interval.price}
                                onChange={(e) => {
                                  const newIntervals = [...(formData.pricing[day.key as keyof typeof formData.pricing].intervals || [])]
                                  newIntervals[idx].price = Number(e.target.value)
                                  setFormData(prev => ({
                                    ...prev,
                                    pricing: {
                                      ...prev.pricing,
                                      [day.key]: {
                                        ...prev.pricing[day.key as keyof typeof prev.pricing],
                                        intervals: newIntervals
                                      }
                                    }
                                  }))
                                }}
                                min="0"
                                placeholder="Цена"
                              />
                              <span>₽</span>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px' }}
                                onClick={() => {
                                  const newIntervals = (formData.pricing[day.key as keyof typeof formData.pricing].intervals || []).filter((_, i) => i !== idx)
                                  setFormData(prev => ({
                                    ...prev,
                                    pricing: {
                                      ...prev.pricing,
                                      [day.key]: {
                                        ...prev.pricing[day.key as keyof typeof prev.pricing],
                                        intervals: newIntervals
                                      }
                                    }
                                  }))
                                }}
                              >
                                Удалить
                              </button>
                            </div>
                          ))
                          })()}
                          <button
                            type="button"
                            className="btn btn-link"
                            style={{ padding: '4px 8px', fontSize: '14px' }}
                            onClick={() => {
                              const newIntervals = [
                                ...(formData.pricing[day.key as keyof typeof formData.pricing].intervals || []),
                                { from: '09:00', to: '11:00', price: formData.pricing[day.key as keyof typeof formData.pricing].basePrice * 1.5 }
                              ]
                              setFormData(prev => ({
                                ...prev,
                                pricing: {
                                  ...prev.pricing,
                                  [day.key]: {
                                    ...prev.pricing[day.key as keyof typeof prev.pricing],
                                    intervals: newIntervals
                                  }
                                }
                              }))
                            }}
                          >
                            + Добавить интервал
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
              </div>

              <div className="form-group">
                <label className="form-label">Праздничные дни</label>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                  В праздничные дни действует фиксированная цена, независимо от дня недели и временных интервалов
                </div>
                <div>
                  {(() => {
                    const holidays = formData.holidayPricing || []
                    
                    return holidays.map((holiday, idx) => (
                    <div key={idx} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      marginBottom: '12px',
                      padding: '12px',
                      background: '#f8f9fa',
                      borderRadius: '8px'
                    }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ width: '100px' }}
                        placeholder="ММ-ДД"
                        value={holiday.date}
                        onChange={(e) => {
                          const newHolidays = [...(formData.holidayPricing || [])]
                          newHolidays[idx].date = e.target.value
                          setFormData(prev => ({
                            ...prev,
                            holidayPricing: newHolidays
                          }))
                        }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        style={{ flex: 1 }}
                        placeholder="Название праздника (необязательно)"
                        value={holiday.name || ''}
                        onChange={(e) => {
                          const newHolidays = [...(formData.holidayPricing || [])]
                          newHolidays[idx].name = e.target.value
                          setFormData(prev => ({
                            ...prev,
                            holidayPricing: newHolidays
                          }))
                        }}
                      />
                      <input
                        type="number"
                        className="form-input"
                        style={{ width: '120px' }}
                        placeholder="Цена"
                        value={holiday.price}
                        onChange={(e) => {
                          const newHolidays = [...(formData.holidayPricing || [])]
                          newHolidays[idx].price = Number(e.target.value)
                          setFormData(prev => ({
                            ...prev,
                            holidayPricing: newHolidays
                          }))
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px' }}
                        onClick={() => {
                          const newHolidays = (formData.holidayPricing || []).filter((_, i) => i !== idx)
                          setFormData(prev => ({
                            ...prev,
                            holidayPricing: newHolidays
                          }))
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                  })()}
                  <button
                    type="button"
                    className="btn btn-link"
                    style={{ padding: '4px 8px', fontSize: '14px' }}
                    onClick={() => {
                      const newHolidays = [
                        ...(formData.holidayPricing || []),
                        { date: '', price: 3000, name: '' }
                      ]
                      setFormData(prev => ({
                        ...prev,
                        holidayPricing: newHolidays
                      }))
                    }}
                  >
                    + Добавить праздничный день
                  </button>
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Статус</label>
                <select 
                  className="form-select"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="active">Активен</option>
                  <option value="maintenance">На обслуживании</option>
                  <option value="inactive">Неактивен</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Цвет корта</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input 
                    type="color" 
                    className="form-input" 
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    style={{ width: '80px', height: '48px', padding: '4px', cursor: 'pointer' }}
                  />
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="#00A86B"
                    style={{ flex: 1 }}
                  />
                </div>
                <div className="form-hint">Этот цвет будет использоваться для визуального отображения корта в календаре</div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowModal(false)
                  setEditingCourt(null)
                }}
              >
                Отмена
              </button>
              <button type="submit" className="btn btn-primary">
                {editingCourt ? 'Сохранить изменения' : 'Добавить корт'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PermissionGate>
  )
}