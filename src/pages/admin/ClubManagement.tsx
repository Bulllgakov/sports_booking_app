import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { PermissionGate } from '../../components/PermissionGate'
import { VenueSelector, VenueSelectorEmpty } from '../../components/VenueSelector'
import { doc, updateDoc, getDoc, GeoPoint } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../services/firebase'
import { 
  Alert, 
  AlertTitle,
  Tabs,
  Tab,
  Box,
  Typography
} from '@mui/material'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`club-tabpanel-${index}`}
      aria-labelledby={`club-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  )
}

export default function ClubManagement() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { club, admin, refreshClubData } = useAuth()
  const { isSuperAdmin, canManageClub } = usePermission()
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [selectedVenue, setSelectedVenue] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    latitude: '',
    longitude: '',
    description: '',
    timezone: 'Europe/Moscow',
    amenities: {
      showers: false,
      parking: false,
      cafe: false,
      proshop: false,
      lockers: false,
    },
    organizationType: '',
    inn: '',
    settlementAccount: '',
    legalName: '',
    ogrn: '',
    kpp: '',
    legalAddress: '',
    bankName: '',
    bik: '',
    correspondentAccount: '',
    directorName: '',
    directorPosition: '',
    financeEmail: '', // Новое поле для Мультирасчетов
    financePhone: '', // Новое поле для Мультирасчетов
    okpo: '', // Новое поле ОКПО
    okved: '', // Новое поле ОКВЭД
    workingHours: {
      monday: '07:00-23:00',
      tuesday: '07:00-23:00',
      wednesday: '07:00-23:00',
      thursday: '07:00-23:00',
      friday: '07:00-23:00',
      saturday: '08:00-22:00',
      sunday: '08:00-22:00'
    },
    bookingDurations: {
      60: true,
      90: true,
      120: true
    },
    bookingSlotInterval: 60 as 30 | 60
  })
  const [photos, setPhotos] = useState<string[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Читаем tab из URL параметров
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'requisites') {
      setActiveTab(1)
    } else if (tab === 'photos') {
      setActiveTab(2)
    } else if (tab === 'settings') {
      setActiveTab(3)
    } else {
      setActiveTab(0)
    }
  }, [searchParams])

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
    // Обновляем URL параметр
    const tabs = ['', 'requisites', 'photos', 'settings']
    if (tabs[newValue]) {
      setSearchParams({ tab: tabs[newValue] })
    } else {
      setSearchParams({})
    }
  }

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
      console.log('Updating form data from club:', club)
      setFormData({
        name: club.name || '',
        phone: club.phone || '',
        address: club.address || '',
        city: club.city || '',
        latitude: club.location?._lat?.toString() || club.location?.latitude?.toString() || '',
        longitude: club.location?._long?.toString() || club.location?.longitude?.toString() || '',
        description: club.description || '',
        timezone: club.timezone || 'Europe/Moscow',
        amenities: {
          showers: Array.isArray(club.amenities) && club.amenities.includes('showers') || false,
          parking: Array.isArray(club.amenities) && club.amenities.includes('parking') || false,
          cafe: Array.isArray(club.amenities) && club.amenities.includes('cafe') || false,
          proshop: Array.isArray(club.amenities) && club.amenities.includes('proshop') || false,
          lockers: Array.isArray(club.amenities) && club.amenities.includes('lockers') || false,
        },
        organizationType: club.organizationType || '',
        inn: club.inn || '',
        settlementAccount: club.settlementAccount || '',
        legalName: club.legalName || '',
        ogrn: club.ogrn || '',
        kpp: club.kpp || '',
        legalAddress: club.legalAddress || '',
        bankName: club.bankName || '',
        bik: club.bik || '',
        correspondentAccount: club.correspondentAccount || '',
        directorName: club.directorName || '',
        directorPosition: club.directorPosition || '',
        financeEmail: club.financeEmail || '',
        financePhone: club.financePhone || '',
        okpo: club.okpo || '',
        okved: club.okved || '',
        workingHours: club.workingHours || {
          monday: '07:00-23:00',
          tuesday: '07:00-23:00',
          wednesday: '07:00-23:00',
          thursday: '07:00-23:00',
          friday: '07:00-23:00',
          saturday: '08:00-22:00',
          sunday: '08:00-22:00'
        },
        bookingDurations: club.bookingDurations || {
          60: true,
          90: true,
          120: true
        },
        bookingSlotInterval: club.bookingSlotInterval || 60
      })
      setPhotos(club.photos || [])
    }
  }, [club, isSuperAdmin])

  const handleVenueChange = (venueId: string) => {
    setSelectedVenueId(venueId)
    localStorage.setItem('selectedVenueId', venueId)
    if (venueId) {
      loadVenueData(venueId)
    }
  }

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
          latitude: venueData.latitude?.toString() || venueData.location?._lat?.toString() || venueData.location?.latitude?.toString() || '',
          longitude: venueData.longitude?.toString() || venueData.location?._long?.toString() || venueData.location?.longitude?.toString() || '',
          description: venueData.description || '',
          timezone: venueData.timezone || 'Europe/Moscow',
          amenities: {
            showers: Array.isArray(venueData.amenities) && venueData.amenities.includes('showers') || false,
            parking: Array.isArray(venueData.amenities) && venueData.amenities.includes('parking') || false,
            cafe: Array.isArray(venueData.amenities) && venueData.amenities.includes('cafe') || false,
            proshop: Array.isArray(venueData.amenities) && venueData.amenities.includes('proshop') || false,
            lockers: Array.isArray(venueData.amenities) && venueData.amenities.includes('lockers') || false,
          },
          organizationType: venueData.organizationType || '',
          inn: venueData.inn || '',
          settlementAccount: venueData.settlementAccount || '',
          legalName: venueData.legalName || '',
          ogrn: venueData.ogrn || '',
          kpp: venueData.kpp || '',
          legalAddress: venueData.legalAddress || '',
          bankName: venueData.bankName || '',
          bik: venueData.bik || '',
          correspondentAccount: venueData.correspondentAccount || '',
          directorName: venueData.directorName || '',
          directorPosition: venueData.directorPosition || '',
          financeEmail: venueData.financeEmail || '',
          financePhone: venueData.financePhone || '',
          okpo: venueData.okpo || '',
          okved: venueData.okved || '',
          workingHours: venueData.workingHours || {
            monday: '07:00-23:00',
            tuesday: '07:00-23:00',
            wednesday: '07:00-23:00',
            thursday: '07:00-23:00',
            friday: '07:00-23:00',
            saturday: '08:00-22:00',
            sunday: '08:00-22:00'
          },
          bookingDurations: venueData.bookingDurations || {
            60: true,
            90: true,
            120: true
          },
          bookingSlotInterval: venueData.bookingSlotInterval || 60
        })
        setPhotos(venueData.photos || [])
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
      
      // Update local state to show the logo immediately
      if (isSuperAdmin && selectedVenue) {
        setSelectedVenue({ ...selectedVenue, logoUrl })
      } else {
        // For regular admins, refresh club data from AuthContext
        await refreshClubData()
      }
      
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error uploading logo:', error)
      setError('Ошибка при загрузке логотипа')
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    const venueId = isSuperAdmin ? selectedVenueId : admin?.venueId
    if (!venueId) {
      setError('Не выбран клуб')
      return
    }

    // Check max photos limit
    const remainingSlots = 5 - photos.length
    if (remainingSlots <= 0) {
      setError('Максимум 5 фотографий')
      return
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots)

    try {
      setUploadingPhoto(true)
      const uploadPromises = filesToUpload.map(async (file) => {
        // Check file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`Файл ${file.name} превышает 5 МБ`)
        }

        const fileName = `${Date.now()}_${file.name}`
        const storageRef = ref(storage, `clubs/${venueId}/photos/${fileName}`)
        const snapshot = await uploadBytes(storageRef, file)
        return getDownloadURL(snapshot.ref)
      })

      const newPhotoUrls = await Promise.all(uploadPromises)
      const updatedPhotos = [...photos, ...newPhotoUrls]
      
      await updateDoc(doc(db, 'venues', venueId), { photos: updatedPhotos })
      setPhotos(updatedPhotos)
      
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error: any) {
      console.error('Error uploading photos:', error)
      setError(error.message || 'Ошибка при загрузке фотографий')
      setTimeout(() => setError(null), 5000)
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handlePhotoDelete = async (photoUrl: string, index: number) => {
    const venueId = isSuperAdmin ? selectedVenueId : admin?.venueId
    if (!venueId) return

    try {
      setLoading(true)
      const updatedPhotos = photos.filter((_, i) => i !== index)
      await updateDoc(doc(db, 'venues', venueId), { photos: updatedPhotos })
      setPhotos(updatedPhotos)
      
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error deleting photo:', error)
      setError('Ошибка при удалении фотографии')
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

      // Convert amenities from object to array
      const amenitiesArray = Object.entries(formData.amenities)
        .filter(([_, value]) => value)
        .map(([key, _]) => key)

      // Prepare location data
      let locationData: any = {}
      if (formData.latitude && formData.longitude) {
        locationData.location = new GeoPoint(
          parseFloat(formData.latitude),
          parseFloat(formData.longitude)
        )
        // Also save as separate fields for compatibility
        locationData.latitude = parseFloat(formData.latitude)
        locationData.longitude = parseFloat(formData.longitude)
      }

      const updateData: any = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        description: formData.description,
        timezone: formData.timezone,
        amenities: amenitiesArray,
        ...locationData,
        updatedAt: new Date(),
      }

      await updateDoc(doc(db, 'venues', venueId), updateData)

      // Update local state for superadmin
      if (isSuperAdmin && selectedVenue) {
        await loadVenueData(venueId)
      } else {
        // For regular admins, refresh club data from AuthContext
        await refreshClubData()
        // После обновления данных клуба, данные автоматически обновятся через useEffect
        console.log('Club data refreshed successfully')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving club info:', error)
      setError('Ошибка при сохранении')
    } finally {
      setLoading(false)
    }
  }

  const handleRequisitesSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const venueId = isSuperAdmin ? selectedVenueId : admin?.venueId
    if (!venueId) return

    try {
      setLoading(true)

      const updateData: any = {
        organizationType: formData.organizationType,
        inn: formData.inn,
        settlementAccount: formData.settlementAccount,
        legalName: formData.legalName,
        ogrn: formData.ogrn,
        kpp: formData.kpp,
        legalAddress: formData.legalAddress,
        bankName: formData.bankName,
        bik: formData.bik,
        correspondentAccount: formData.correspondentAccount,
        directorName: formData.directorName,
        directorPosition: formData.directorPosition,
        financeEmail: formData.financeEmail, // Новое поле для Мультирасчетов
        financePhone: formData.financePhone, // Новое поле для Мультирасчетов
        okpo: formData.okpo, // Новое поле ОКПО
        okved: formData.okved, // Новое поле ОКВЭД
        updatedAt: new Date(),
      }

      await updateDoc(doc(db, 'venues', venueId), updateData)

      // Update local state for superadmin
      if (isSuperAdmin && selectedVenue) {
        await loadVenueData(venueId)
      } else {
        // For regular admins, refresh club data from AuthContext
        await refreshClubData()
        // После обновления данных клуба, данные автоматически обновятся через useEffect
        console.log('Club data refreshed successfully')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving requisites:', error)
      setError('Ошибка при сохранении реквизитов')
    } finally {
      setLoading(false)
    }
  }

  const handleBookingSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const venueId = isSuperAdmin ? selectedVenueId : admin?.venueId
    if (!venueId) return

    try {
      setLoading(true)

      const updateData: any = {
        workingHours: formData.workingHours,
        bookingDurations: formData.bookingDurations,
        bookingSlotInterval: formData.bookingSlotInterval,
        updatedAt: new Date(),
      }

      await updateDoc(doc(db, 'venues', venueId), updateData)

      // Update local state for superadmin
      if (isSuperAdmin && selectedVenue) {
        await loadVenueData(venueId)
      } else {
        // For regular admins, refresh club data from AuthContext
        await refreshClubData()
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving booking settings:', error)
      setError('Ошибка при сохранении настроек')
    } finally {
      setLoading(false)
    }
  }

  const currentClub = isSuperAdmin ? selectedVenue : club

  return (
    <PermissionGate permission={['manage_club', 'manage_all_venues']}>
      <div>
        {/* Селектор клуба для суперадмина */}
        {isSuperAdmin && (
          <VenueSelector
            selectedVenueId={selectedVenueId}
            onVenueChange={handleVenueChange}
          />
        )}
        
        <div className="section-card">
          <h2 className="section-title">
            Управление клубом
            {isSuperAdmin && selectedVenue && (
              <span style={{ fontSize: '16px', color: 'var(--gray)', marginLeft: '16px' }}>
                {selectedVenue.name}
              </span>
            )}
          </h2>
          
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={activeTab} onChange={handleTabChange} aria-label="club management tabs">
              <Tab label="Основная информация" />
              <Tab label="Реквизиты" />
              <Tab label="Фотографии" />
              <Tab label="Настройки бронирования" />
            </Tabs>
          </Box>
          
          {/* Вкладка 1: Основная информация */}
          <TabPanel value={activeTab} index={0}>
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
                  {currentClub?.logoUrl ? (
                    <img 
                      src={currentClub.logoUrl} 
                      alt="Club Logo" 
                      style={{ 
                        width: '100px', 
                        height: '100px', 
                        objectFit: 'contain', 
                        borderRadius: '8px',
                        background: 'var(--background)',
                        padding: '8px'
                      }} 
                    />
                  ) : (
                    <div style={{
                      width: '100px',
                      height: '100px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--background)',
                      borderRadius: '8px',
                      border: '1px dashed var(--light-gray)'
                    }}>
                      <span style={{ color: 'var(--gray)', fontSize: '12px' }}>Нет логотипа</span>
                    </div>
                  )}
                  <div>
                    <input 
                      type="file" 
                      id="logoInput"
                      accept="image/*" 
                      onChange={handleLogoUpload}
                      style={{ display: 'none' }}
                    />
                    <button 
                      type="button"
                      onClick={() => document.getElementById('logoInput')?.click()}
                      className="btn btn-secondary"
                      disabled={loading}
                    >
                      {currentClub?.logoUrl ? 'Заменить логотип' : 'Загрузить логотип'}
                    </button>
                    <p className="form-hint" style={{ marginTop: '8px', marginBottom: 0 }}>
                      Рекомендуемый размер: 512x512px, формат PNG или JPG
                    </p>
                  </div>
                </div>
              </div>
              
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
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={currentClub?.email || ''}
                    disabled
                    style={{ background: 'var(--background)', cursor: 'not-allowed' }}
                  />
                  <span className="form-hint">Email нельзя изменить</span>
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
                <label className="form-label">Часовой пояс</label>
                <select
                  className="form-select"
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Europe/Kaliningrad">Калининград (UTC+2)</option>
                  <option value="Europe/Moscow">Москва (UTC+3)</option>
                  <option value="Europe/Samara">Самара (UTC+4)</option>
                  <option value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</option>
                  <option value="Asia/Omsk">Омск (UTC+6)</option>
                  <option value="Asia/Krasnoyarsk">Красноярск (UTC+7)</option>
                  <option value="Asia/Irkutsk">Иркутск (UTC+8)</option>
                  <option value="Asia/Yakutsk">Якутск (UTC+9)</option>
                  <option value="Asia/Vladivostok">Владивосток (UTC+10)</option>
                  <option value="Asia/Magadan">Магадан (UTC+11)</option>
                  <option value="Asia/Kamchatka">Камчатка (UTC+12)</option>
                </select>
                <div style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
                  Выберите часовой пояс, в котором работает ваш клуб. Это важно для корректного отображения времени в уведомлениях.
                </div>
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
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Сохранение...' : 'Сохранить изменения'}
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
          </TabPanel>
          
          {/* Вкладка 2: Реквизиты */}
          <TabPanel value={activeTab} index={1}>
            <div style={{
              padding: '16px',
              backgroundColor: '#e3f2fd',
              borderRadius: '8px',
              marginBottom: '24px',
              border: '1px solid #1976d2'
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#1976d2' }}>
                <strong>Важно для подключения мультирасчетов:</strong> Поля, отмеченные красной звездочкой <span style={{color: 'red'}}>*</span>, являются обязательными для подключения приема платежей через систему мультирасчетов Т-Банка. Убедитесь, что все они заполнены корректно.
              </p>
            </div>
            <form onSubmit={handleRequisitesSubmit}>
              <div className="form-group" style={{ marginTop: '24px' }}>
                <label className="form-label">Тип организации <span style={{color: 'red'}}>*</span></label>
                <select 
                  className="form-select"
                  name="organizationType"
                  value={formData.organizationType}
                  onChange={handleInputChange}
                >
                  <option value="">Выберите тип</option>
                  <option value="ИП">ИП</option>
                  <option value="ООО">ООО</option>
                  <option value="АО">АО</option>
                  <option value="НКО">НКО</option>
                  <option value="Самозанятый">Самозанятый</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Юридическое наименование <span style={{color: 'red'}}>*</span></label>
                <input 
                  type="text" 
                  className="form-input" 
                  name="legalName"
                  value={formData.legalName}
                  onChange={handleInputChange}
                  placeholder="ООО «Название организации»"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">ИНН <span style={{color: 'red'}}>*</span></label>
                  <input 
                    type="text" 
                    className="form-input" 
                    name="inn"
                    value={formData.inn}
                    onChange={handleInputChange}
                    placeholder="1234567890"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">КПП</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    name="kpp"
                    value={formData.kpp}
                    onChange={handleInputChange}
                    placeholder="123456789"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">ОГРН / ОГРНИП <span style={{color: 'red'}}>*</span></label>
                <input 
                  type="text" 
                  className="form-input" 
                  name="ogrn"
                  value={formData.ogrn}
                  onChange={handleInputChange}
                  placeholder="1234567890123"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Юридический адрес <span style={{color: 'red'}}>*</span></label>
                <input 
                  type="text" 
                  className="form-input" 
                  name="legalAddress"
                  value={formData.legalAddress}
                  onChange={handleInputChange}
                  placeholder="123456, г. Москва, ул. Примерная, д. 1, офис 1"
                />
              </div>
              
              <h3 style={{ marginTop: '32px', marginBottom: '16px', fontSize: '18px' }}>Банковские реквизиты</h3>
              
              <div className="form-group">
                <label className="form-label">Наименование банка <span style={{color: 'red'}}>*</span></label>
                <input 
                  type="text" 
                  className="form-input" 
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  placeholder="ПАО Сбербанк"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">БИК банка <span style={{color: 'red'}}>*</span></label>
                  <input 
                    type="text" 
                    className="form-input" 
                    name="bik"
                    value={formData.bik}
                    onChange={handleInputChange}
                    placeholder="044525225"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Корр. счет <span style={{color: 'red'}}>*</span></label>
                  <input 
                    type="text" 
                    className="form-input" 
                    name="correspondentAccount"
                    value={formData.correspondentAccount}
                    onChange={handleInputChange}
                    placeholder="30101810400000000225"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Расчетный счет <span style={{color: 'red'}}>*</span></label>
                <input 
                  type="text" 
                  className="form-input" 
                  name="settlementAccount"
                  value={formData.settlementAccount}
                  onChange={handleInputChange}
                  placeholder="40702810900000123456"
                />
              </div>
              
              <h3 style={{ marginTop: '32px', marginBottom: '16px', fontSize: '18px' }}>Руководитель</h3>
              
              <div className="form-group">
                <label className="form-label">ФИО руководителя</label>
                <input 
                  type="text" 
                  className="form-input" 
                  name="directorName"
                  value={formData.directorName}
                  onChange={handleInputChange}
                  placeholder="Иванов Иван Иванович"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Должность</label>
                <input 
                  type="text" 
                  className="form-input" 
                  name="directorPosition"
                  value={formData.directorPosition}
                  onChange={handleInputChange}
                  placeholder="Генеральный директор"
                />
              </div>
              
              <h3 style={{ marginTop: '32px', marginBottom: '16px', fontSize: '18px' }}>Контакты для финансовых вопросов</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email для финансовых уведомлений <span style={{color: 'red'}}>*</span></label>
                  <input 
                    type="email" 
                    className="form-input" 
                    name="financeEmail"
                    value={formData.financeEmail}
                    onChange={handleInputChange}
                    placeholder="finance@company.ru"
                    required
                  />
                  <span className="form-hint">На этот email будут приходить уведомления о выплатах</span>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Телефон для финансовых вопросов <span style={{color: 'red'}}>*</span></label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    name="financePhone"
                    value={formData.financePhone}
                    onChange={handleInputChange}
                    placeholder="+7 (999) 123-45-67"
                  />
                  <span className="form-hint">Контактный телефон бухгалтерии</span>
                </div>
              </div>
              
              <h3 style={{ marginTop: '32px', marginBottom: '16px', fontSize: '18px' }}>Дополнительные реквизиты</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">ОКПО</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    name="okpo"
                    value={formData.okpo}
                    onChange={handleInputChange}
                    placeholder="12345678"
                  />
                  <span className="form-hint">Код по общероссийскому классификатору</span>
                </div>
                
                <div className="form-group">
                  <label className="form-label">ОКВЭД (основной)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    name="okved"
                    value={formData.okved}
                    onChange={handleInputChange}
                    placeholder="93.11"
                  />
                  <span className="form-hint">Код основного вида деятельности</span>
                </div>
              </div>
              
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Сохранение...' : 'Сохранить реквизиты'}
              </button>
              
              {success && (
                <div style={{ 
                  marginTop: '16px', 
                  padding: '12px', 
                  background: 'rgba(16, 185, 129, 0.1)', 
                  color: 'var(--success)',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}>
                  ✅ Реквизиты успешно сохранены
                </div>
              )}
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
          </TabPanel>
          
          {/* Вкладка 3: Фотографии */}
          <TabPanel value={activeTab} index={2}>
            <div className="form-group">
              <label className="form-label">Фотографии клуба</label>
              <div style={{ marginBottom: '16px' }}>
                <p className="form-hint">Максимум 5 фотографий, до 5 МБ каждая. Рекомендуемый размер: 1920x1080px</p>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                gap: '16px',
                marginBottom: '16px'
              }}>
                {photos.map((photo, index) => (
                  <div key={index} style={{
                    position: 'relative',
                    paddingBottom: '56.25%', // 16:9 aspect ratio
                    overflow: 'hidden',
                    borderRadius: '12px',
                    background: 'var(--extra-light-gray)'
                  }}>
                    <img 
                      src={photo} 
                      alt={`Фото ${index + 1}`} 
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handlePhotoDelete(photo, index)}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.9)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                      disabled={loading}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#dc2626">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>
                ))}
                
                {photos.length < 5 && (
                  <div 
                    onClick={() => document.getElementById('photosInput')?.click()}
                    style={{
                      position: 'relative',
                      paddingBottom: '56.25%',
                      overflow: 'hidden',
                      borderRadius: '12px',
                      border: '2px dashed var(--extra-light-gray)',
                      background: 'var(--background)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)'
                      e.currentTarget.style.background = 'rgba(0, 214, 50, 0.05)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--extra-light-gray)'
                      e.currentTarget.style.background = 'var(--background)'
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                      color: 'var(--gray)'
                    }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--light-gray)">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                      </svg>
                      <p style={{ fontSize: '14px', marginTop: '8px' }}>
                        {uploadingPhoto ? 'Загрузка...' : 'Добавить фото'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <input 
                type="file" 
                id="photosInput"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />
            </div>
          </TabPanel>
          
          {/* Вкладка 4: Настройки бронирования */}
          <TabPanel value={activeTab} index={3}>
            <form onSubmit={handleBookingSettingsSubmit}>
              <div style={{ marginTop: '32px' }}>
                <h3 className="section-subtitle">Режим работы</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
                  {[
                    { key: 'monday', label: 'Понедельник' },
                    { key: 'tuesday', label: 'Вторник' },
                    { key: 'wednesday', label: 'Среда' },
                    { key: 'thursday', label: 'Четверг' },
                    { key: 'friday', label: 'Пятница' },
                    { key: 'saturday', label: 'Суббота' },
                    { key: 'sunday', label: 'Воскресенье' }
                  ].map(day => (
                    <div key={day.key} className="form-group">
                      <label className="form-label">{day.label}</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.workingHours[day.key as keyof typeof formData.workingHours]}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          workingHours: {
                            ...prev.workingHours,
                            [day.key]: e.target.value
                          }
                        }))}
                        placeholder="07:00-23:00"
                      />
                      <span className="form-hint">ЧЧ:ММ-ЧЧ:ММ</span>
                    </div>
                  ))}
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
              </div>

              <div style={{ marginTop: '32px' }}>
                <h3 className="section-subtitle">Интервал временных слотов</h3>
                <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="bookingSlotInterval"
                      value="30"
                      checked={formData.bookingSlotInterval === 30}
                      onChange={() => setFormData(prev => ({
                        ...prev,
                        bookingSlotInterval: 30
                      }))}
                    /> 
                    Каждые 30 минут
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="bookingSlotInterval"
                      value="60"
                      checked={formData.bookingSlotInterval === 60}
                      onChange={() => setFormData(prev => ({
                        ...prev,
                        bookingSlotInterval: 60
                      }))}
                    /> 
                    Только с 00 минут (стандарт)
                  </label>
                </div>
                <p className="form-hint" style={{ marginTop: '8px' }}>
                  Выберите интервал доступных слотов для бронирования. При выборе "Только с 00 минут" клиенты смогут бронировать только с начала часа (например, 10:00, 11:00, 12:00)
                </p>
              </div>
              
              <div style={{ marginTop: '32px' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Сохранение...' : 'Сохранить настройки'}
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
                  ✅ Настройки успешно сохранены
                </div>
              )}
            </form>
          </TabPanel>
        </div>
      </div>
    </PermissionGate>
  )
}