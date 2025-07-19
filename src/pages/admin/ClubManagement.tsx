import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { PermissionGate } from '../../components/PermissionGate'
import { doc, updateDoc, getDoc, GeoPoint } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../services/firebase'
import { Alert, AlertTitle } from '@mui/material'

export default function ClubManagement() {
  const navigate = useNavigate()
  const { club, admin } = useAuth()
  const { isSuperAdmin, canManageClub } = usePermission()
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [selectedVenue, setSelectedVenue] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    latitude: '',
    longitude: '',
    description: '',
    amenities: {
      showers: false,
      parking: false,
      cafe: false,
      proshop: false,
      lockers: false,
    },
    organizationType: '',
    inn: '',
    bankAccount: '',
    workingHours: {
      weekday: '07:00-23:00',
      weekend: '08:00-22:00'
    },
    bookingDurations: {
      60: true,
      90: true,
      120: true
    }
  })

  useEffect(() => {
    // Для суперадмина проверяем выбранный клуб
    if (isSuperAdmin) {
      const venueId = localStorage.getItem('selectedVenueId')
      if (venueId) {
        setSelectedVenueId(venueId)
        loadVenueData(venueId)
      }
    } else if (club) {
      // Для обычных админов используем их клуб
      setFormData({
        name: club.name || '',
        phone: club.phone || '',
        address: club.address || '',
        city: club.city || '',
        latitude: club.location?._lat?.toString() || club.location?.latitude?.toString() || '',
        longitude: club.location?._long?.toString() || club.location?.longitude?.toString() || '',
        description: club.description || '',
        amenities: {
          showers: Array.isArray(club.amenities) && club.amenities.includes('showers') || false,
          parking: Array.isArray(club.amenities) && club.amenities.includes('parking') || false,
          cafe: Array.isArray(club.amenities) && club.amenities.includes('cafe') || false,
          proshop: Array.isArray(club.amenities) && club.amenities.includes('proshop') || false,
          lockers: Array.isArray(club.amenities) && club.amenities.includes('lockers') || false,
        },
        organizationType: club.organizationType || '',
        inn: club.inn || '',
        bankAccount: club.bankAccount || '',
        workingHours: club.workingHours || {
          weekday: '07:00-23:00',
          weekend: '08:00-22:00'
        },
        bookingDurations: club.bookingDurations || {
          60: true,
          90: true,
          120: true
        }
      })
    }
  }, [club, isSuperAdmin])

  const loadVenueData = async (venueId: string) => {
    try {
      console.log('Loading venue data for:', venueId)
      const venueDoc = await getDoc(doc(db, 'venues', venueId))
      if (venueDoc.exists()) {
        const venueData = venueDoc.data()
        console.log('Venue data loaded:', venueData)
        setSelectedVenue({ id: venueDoc.id, ...venueData })
        setFormData({
          name: venueData.name || '',
          phone: venueData.phone || '',
          address: venueData.address || '',
          city: venueData.city || '',
          latitude: venueData.location?._lat?.toString() || venueData.location?.latitude?.toString() || '',
          longitude: venueData.location?._long?.toString() || venueData.location?.longitude?.toString() || '',
          description: venueData.description || '',
          amenities: {
            showers: Array.isArray(venueData.amenities) && venueData.amenities.includes('showers') || false,
            parking: Array.isArray(venueData.amenities) && venueData.amenities.includes('parking') || false,
            cafe: Array.isArray(venueData.amenities) && venueData.amenities.includes('cafe') || false,
            proshop: Array.isArray(venueData.amenities) && venueData.amenities.includes('proshop') || false,
            lockers: Array.isArray(venueData.amenities) && venueData.amenities.includes('lockers') || false,
          },
          organizationType: venueData.organizationType || '',
          inn: venueData.inn || '',
          bankAccount: venueData.bankAccount || '',
          workingHours: venueData.workingHours || {
            weekday: '07:00-23:00',
            weekend: '08:00-22:00'
          },
          bookingDurations: venueData.bookingDurations || {
            60: true,
            90: true,
            120: true
          }
        })
      }
    } catch (error) {
      console.error('Error loading venue:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAmenityChange = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        [amenity]: !prev.amenities[amenity as keyof typeof prev.amenities]
      }
    }))
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const venueId = isSuperAdmin ? selectedVenueId : admin?.venueId
    if (!venueId) {
      setError('Не выбран клуб')
      return
    }

    try {
      setLoading(true)
      const storageRef = ref(storage, `clubs/${venueId}/logo.${file.name.split('.').pop()}`)
      const snapshot = await uploadBytes(storageRef, file)
      const logoUrl = await getDownloadURL(snapshot.ref)
      
      await updateDoc(doc(db, 'venues', venueId), { logoUrl })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error uploading logo:', error)
      setError('Ошибка при загрузке логотипа')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const venueId = isSuperAdmin ? selectedVenueId : admin?.venueId
    if (!venueId) return

    try {
      setLoading(true)
      
      const amenitiesList = Object.entries(formData.amenities)
        .filter(([_, value]) => value)
        .map(([key]) => key)

      const updateData: any = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        description: formData.description,
        amenities: amenitiesList,
        organizationType: formData.organizationType,
        inn: formData.inn,
        bankAccount: formData.bankAccount,
        workingHours: formData.workingHours,
        bookingDurations: formData.bookingDurations,
        updatedAt: new Date(),
      }

      // Добавляем координаты, если они указаны
      if (formData.latitude && formData.longitude) {
        updateData.location = new GeoPoint(
          parseFloat(formData.latitude),
          parseFloat(formData.longitude)
        )
      }

      await updateDoc(doc(db, 'venues', venueId), updateData)

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error updating club:', error)
      setError('Ошибка при сохранении данных')
    } finally {
      setLoading(false)
    }
  }

  if (!canManageClub()) {
    return (
      <Alert severity="error">
        <AlertTitle>Доступ запрещен</AlertTitle>
        У вас недостаточно прав для управления клубом.
      </Alert>
    )
  }

  if (isSuperAdmin && !selectedVenueId) {
    return (
      <Alert severity="info">
        <AlertTitle>Выберите клуб</AlertTitle>
        Перейдите в раздел "Все клубы" и выберите клуб для управления.
      </Alert>
    )
  }

  const currentClub = isSuperAdmin ? selectedVenue : club

  return (
    <PermissionGate permission={['manage_club', 'manage_all_venues']}>
      <div>
        <div className="section-card">
          <h2 className="section-title">
            Информация о клубе
            {isSuperAdmin && selectedVenue && (
              <span style={{ fontSize: '16px', color: 'var(--gray)', marginLeft: '16px' }}>
                {selectedVenue.name}
              </span>
            )}
          </h2>

          {/* Подсказка для получения координат */}
          <div style={{ 
            backgroundColor: '#e3f2fd', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            fontSize: '14px',
            color: '#1976d2'
          }}>
            <strong>💡 Как получить координаты:</strong><br />
            1. Откройте <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" style={{color: '#1976d2'}}>Google Maps</a><br />
            2. Найдите ваш клуб на карте<br />
            3. Кликните правой кнопкой мыши на нужное место<br />
            4. Скопируйте координаты (первое число - широта, второе - долгота)
          </div>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          <div className="form-group">
            <label className="form-label">Логотип клуба</label>
            <div className="logo-uploader" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div className="logo-preview" style={{
                width: '120px',
                height: '120px',
                border: '2px dashed var(--extra-light-gray)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                background: 'var(--background)'
              }}>
                {currentClub?.logoUrl ? (
                  <img src={currentClub.logoUrl} alt={currentClub.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--gray)' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--light-gray)">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                    </svg>
                    <p style={{ fontSize: '12px', marginTop: '8px' }}>Нажмите для загрузки</p>
                  </div>
                )}
              </div>
              <div>
                <button 
                  type="button"
                  className="btn btn-primary" 
                  onClick={() => document.getElementById('logoInput')?.click()}
                  disabled={loading}
                >
                  Загрузить логотип
                </button>
                <input 
                  type="file" 
                  id="logoInput" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handleLogoUpload}
                />
                <p className="form-hint">Рекомендуемый размер: 500x500px<br/>Максимум 2MB. PNG, JPG или SVG</p>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="form-group">
              <label className="form-label">Название клуба</label>
              <input 
                type="text" 
                className="form-input" 
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Телефон</label>
              <input 
                type="tel" 
                className="form-input" 
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Адрес</label>
            <input 
              type="text" 
              className="form-input" 
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Город</label>
            <input 
              type="text" 
              className="form-input" 
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="Например: Москва"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="form-group">
              <label className="form-label">Широта (Latitude)</label>
              <input 
                type="number" 
                step="0.000001"
                className="form-input" 
                name="latitude"
                value={formData.latitude}
                onChange={handleInputChange}
                placeholder="55.755831"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Долгота (Longitude)</label>
              <input 
                type="number" 
                step="0.000001"
                className="form-input" 
                name="longitude"
                value={formData.longitude}
                onChange={handleInputChange}
                placeholder="37.617673"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Описание</label>
            <textarea 
              className="form-textarea"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Удобства</label>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.amenities.showers}
                  onChange={() => handleAmenityChange('showers')}
                /> 
                Душевые
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.amenities.parking}
                  onChange={() => handleAmenityChange('parking')}
                /> 
                Парковка
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.amenities.cafe}
                  onChange={() => handleAmenityChange('cafe')}
                /> 
                Кафе
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.amenities.proshop}
                  onChange={() => handleAmenityChange('proshop')}
                /> 
                Pro Shop
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.amenities.lockers}
                  onChange={() => handleAmenityChange('lockers')}
                /> 
                Раздевалки
              </label>
            </div>
          </div>

          <div style={{ marginTop: '32px' }}>
            <h3 className="section-subtitle">Режим работы</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label">Будние дни (пн-пт)</label>
                <input
                  type="text"
                  className="form-input"
                  name="workingHours.weekday"
                  value={formData.workingHours.weekday}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    workingHours: {
                      ...prev.workingHours,
                      weekday: e.target.value
                    }
                  }))}
                  placeholder="07:00-23:00"
                />
                <span className="form-hint">Формат: ЧЧ:ММ-ЧЧ:ММ</span>
              </div>
              <div className="form-group">
                <label className="form-label">Выходные дни (сб-вс)</label>
                <input
                  type="text"
                  className="form-input"
                  name="workingHours.weekend"
                  value={formData.workingHours.weekend}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    workingHours: {
                      ...prev.workingHours,
                      weekend: e.target.value
                    }
                  }))}
                  placeholder="08:00-22:00"
                />
                <span className="form-hint">Формат: ЧЧ:ММ-ЧЧ:ММ</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '32px' }}>
            <h3 className="section-subtitle">Доступные длительности бронирования</h3>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.bookingDurations[60]}
                  onChange={() => setFormData(prev => ({
                    ...prev,
                    bookingDurations: {
                      ...prev.bookingDurations,
                      60: !prev.bookingDurations[60]
                    }
                  }))}
                /> 
                1 час
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.bookingDurations[90]}
                  onChange={() => setFormData(prev => ({
                    ...prev,
                    bookingDurations: {
                      ...prev.bookingDurations,
                      90: !prev.bookingDurations[90]
                    }
                  }))}
                /> 
                1.5 часа
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.bookingDurations[120]}
                  onChange={() => setFormData(prev => ({
                    ...prev,
                    bookingDurations: {
                      ...prev.bookingDurations,
                      120: !prev.bookingDurations[120]
                    }
                  }))}
                /> 
                2 часа
              </label>
            </div>
            <p className="form-hint" style={{ marginTop: '8px' }}>
              Выберите, какие длительности бронирования будут доступны клиентам
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => {
              // Сбрасываем форму к исходным значениям
              const currentClub = isSuperAdmin ? selectedVenue : club
              if (currentClub) {
                setFormData({
                  name: currentClub.name || '',
                  phone: currentClub.phone || '',
                  address: currentClub.address || '',
                  city: currentClub.city || '',
                  latitude: currentClub.location?._lat?.toString() || currentClub.location?.latitude?.toString() || '',
                  longitude: currentClub.location?._long?.toString() || currentClub.location?.longitude?.toString() || '',
                  description: currentClub.description || '',
                  amenities: {
                    showers: Array.isArray(currentClub.amenities) && currentClub.amenities.includes('showers') || false,
                    parking: Array.isArray(currentClub.amenities) && currentClub.amenities.includes('parking') || false,
                    cafe: Array.isArray(currentClub.amenities) && currentClub.amenities.includes('cafe') || false,
                    proshop: Array.isArray(currentClub.amenities) && currentClub.amenities.includes('proshop') || false,
                    lockers: Array.isArray(currentClub.amenities) && currentClub.amenities.includes('lockers') || false,
                  },
                  organizationType: currentClub.organizationType || '',
                  inn: currentClub.inn || '',
                  bankAccount: currentClub.bankAccount || '',
                  workingHours: currentClub.workingHours || {
                    weekday: '07:00-23:00',
                    weekend: '08:00-22:00'
                  },
                  bookingDurations: currentClub.bookingDurations || {
                    60: true,
                    90: true,
                    120: true
                  }
                })
              }
            }}>
              Отмена
            </button>
          </div>
          
          {success && (
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              background: 'rgba(16, 185, 129, 0.1)', 
              color: 'var(--success)',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              ✅ Изменения успешно сохранены
            </div>
          )}
        </form>
        </div>
        
        <div className="section-card">
        <h2 className="section-title">Настройки платежей</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginTop: '24px' }}>
            <label className="form-label">Тип организации</label>
            <select 
              className="form-select"
              name="organizationType"
              value={formData.organizationType}
              onChange={handleInputChange}
            >
              <option value="">Выберите тип</option>
              <option value="ИП">ИП</option>
              <option value="ООО">ООО</option>
              <option value="Самозанятый">Самозанятый</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">ИНН</label>
            <input 
              type="text" 
              className="form-input" 
              name="inn"
              value={formData.inn}
              onChange={handleInputChange}
              placeholder="Введите ИНН"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Расчетный счет</label>
            <input 
              type="text" 
              className="form-input" 
              name="bankAccount"
              value={formData.bankAccount}
              onChange={handleInputChange}
              placeholder="40702810900000123456"
            />
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Сохранение...' : 'Сохранить платежные данные'}
          </button>
        </form>
        
        <div style={{ 
          marginTop: '24px',
          padding: '16px', 
          background: 'var(--background)', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '14px', color: 'var(--gray)', marginBottom: '12px' }}>
            Для настройки приема платежей от клиентов
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/admin/payment-settings')}
            style={{ width: 'auto' }}
          >
            Перейти к настройкам эквайринга
          </button>
        </div>
      </div>
      </div>
    </PermissionGate>
  )
}