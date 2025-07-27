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
import { Add, Edit, Delete, Schedule } from '@mui/icons-material'
import { Alert, AlertTitle } from '@mui/material'

interface Court {
  id: string
  name: string
  type: 'tennis' | 'padel' | 'badminton'
  courtType: 'indoor' | 'outdoor'
  priceWeekday: number
  priceWeekend: number
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
  const { admin } = useAuth()
  const { isSuperAdmin, canManageCourts } = usePermission()
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCourt, setEditingCourt] = useState<Court | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'padel' as Court['type'],
    courtType: 'indoor' as Court['courtType'],
    priceWeekday: 1900,
    priceWeekend: 2400,
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
      if (editingCourt) {
        // Обновление существующего корта
        await updateDoc(doc(db, 'venues', venueId, 'courts', editingCourt.id), {
          ...formData,
          updatedAt: new Date()
        })
      } else {
        // Создание нового корта
        await addDoc(collection(db, 'venues', venueId, 'courts'), {
          ...formData,
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
        priceWeekday: 1900,
        priceWeekend: 2400,
        status: 'active',
        color: nextColor,
      })
      fetchCourts(venueId)
    } catch (error) {
      console.error('Error saving court:', error)
    }
  }

  const handleEdit = (court: Court) => {
    setEditingCourt(court)
    setFormData({
      name: court.name,
      type: court.type,
      courtType: court.courtType,
      priceWeekday: court.priceWeekday,
      priceWeekend: court.priceWeekend,
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
              const nextColor = getNextAvailableColor()
              setFormData(prev => ({ ...prev, color: nextColor }))
              setShowModal(true)
            }}>
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
                <div>Будни: {court.priceWeekday}₽/час</div>
                <div>Выходные: {court.priceWeekend}₽/час</div>
                <div>Статус: {court.status === 'active' ? 'Активен' : court.status === 'maintenance' ? 'Обслуживание' : 'Неактивен'}</div>
              </div>
              <div className="court-actions">
                <button className="btn btn-secondary" onClick={() => handleEdit(court)}>
                  <Edit fontSize="small" />
                  Редактировать
                </button>
                <button className="btn btn-secondary">
                  <Schedule fontSize="small" />
                  Расписание
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
                  priceWeekday: 1900,
                  priceWeekend: 2400,
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
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="form-group">
                  <label className="form-label">Цена за час (будни)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    name="priceWeekday"
                    value={formData.priceWeekday}
                    onChange={handleInputChange}
                    min="0"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Цена за час (выходные)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    name="priceWeekend"
                    value={formData.priceWeekend}
                    onChange={handleInputChange}
                    min="0"
                    required
                  />
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
      </div>
    </PermissionGate>
  )
}