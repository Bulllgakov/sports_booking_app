import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { PermissionGate } from '../../components/PermissionGate'
import { VenueSelector, VenueSelectorEmpty } from '../../components/VenueSelector'
import { doc, updateDoc, getDoc, GeoPoint } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../services/firebase'
import { Alert, AlertTitle } from '@mui/material'

export default function ClubManagement() {
  const navigate = useNavigate()
  const { club, admin, refreshClubData } = useAuth()
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
    timezone: 'Europe/Moscow', // Добавляем часовой пояс по умолчанию
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
    legalName: '',
    ogrn: '',
    kpp: '',
    legalAddress: '',
    bankName: '',
    bankBik: '',
    bankCorrespondentAccount: '',
    directorName: '',
    directorPosition: '',
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
        bankAccount: club.bankAccount || '',
        legalName: club.legalName || '',
        ogrn: club.ogrn || '',
        kpp: club.kpp || '',
        legalAddress: club.legalAddress || '',
        bankName: club.bankName || '',
        bankBik: club.bankBik || '',
        bankCorrespondentAccount: club.bankCorrespondentAccount || '',
        directorName: club.directorName || '',
        directorPosition: club.directorPosition || '',
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
          latitude: venueData.location?._lat?.toString() || venueData.location?.latitude?.toString() || '',
          longitude: venueData.location?._long?.toString() || venueData.location?.longitude?.toString() || '',
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
          bankAccount: venueData.bankAccount || '',
          legalName: venueData.legalName || '',
          ogrn: venueData.ogrn || '',
          kpp: venueData.kpp || '',
          legalAddress: venueData.legalAddress || '',
          bankName: venueData.bankName || '',
          bankBik: venueData.bankBik || '',
          bankCorrespondentAccount: venueData.bankCorrespondentAccount || '',
          directorName: venueData.directorName || '',
          directorPosition: venueData.directorPosition || '',
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

    // Check total photos limit
    if (photos.length + files.length > 5) {
      setError('Максимальное количество фотографий - 5')
      return
    }

    try {
      setUploadingPhoto(true)
      const uploadPromises: Promise<string>[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          setError(`Файл ${file.name} превышает максимальный размер 5 МБ`)
          continue
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
          setError(`Файл ${file.name} не является изображением`)
          continue
        }

        const timestamp = Date.now()
        const fileName = `photo_${timestamp}_${i}.${file.name.split('.').pop()}`
        const storageRef = ref(storage, `clubs/${venueId}/photos/${fileName}`)
        
        uploadPromises.push(
          uploadBytes(storageRef, file).then(async (snapshot) => {
            return await getDownloadURL(snapshot.ref)
          })
        )
      }

      const uploadedUrls = await Promise.all(uploadPromises)
      const newPhotos = [...photos, ...uploadedUrls]
      
      setPhotos(newPhotos)
      await updateDoc(doc(db, 'venues', venueId), { photos: newPhotos })
      
      // Update local state for superadmin
      if (isSuperAdmin && selectedVenue) {
        setSelectedVenue({ ...selectedVenue, photos: newPhotos })
      } else {
        // For regular admins, refresh club data from AuthContext
        await refreshClubData()
      }
      
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error uploading photos:', error)
      setError('Ошибка при загрузке фотографий')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleLogoDelete = async () => {
    const venueId = isSuperAdmin ? selectedVenueId : admin?.venueId
    if (!venueId) {
      setError('Не выбран клуб')
      return
    }

    try {
      setLoading(true)
      await updateDoc(doc(db, 'venues', venueId), { logoUrl: null })
      
      // Update local state to remove the logo immediately
      if (isSuperAdmin && selectedVenue) {
        setSelectedVenue({ ...selectedVenue, logoUrl: null })
      } else {
        // For regular admins, refresh club data from AuthContext
        await refreshClubData()
      }
      
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error deleting logo:', error)
      setError('Ошибка при удалении логотипа')
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoDelete = async (photoUrl: string, index: number) => {
    const venueId = isSuperAdmin ? selectedVenueId : admin?.venueId
    if (!venueId) {
      setError('Не выбран клуб')
      return
    }

    try {
      setLoading(true)
      const newPhotos = photos.filter((_, i) => i !== index)
      setPhotos(newPhotos)
      await updateDoc(doc(db, 'venues', venueId), { photos: newPhotos })
      
      // Update local state for superadmin
      if (isSuperAdmin && selectedVenue) {
        setSelectedVenue({ ...selectedVenue, photos: newPhotos })
      } else {
        // For regular admins, refresh club data from AuthContext
        await refreshClubData()
      }
      
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
      
      const amenitiesList = Object.entries(formData.amenities)
        .filter(([_, value]) => value)
        .map(([key]) => key)

      const updateData: any = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        description: formData.description,
        timezone: formData.timezone,
        amenities: amenitiesList,
        workingHours: formData.workingHours,
        bookingDurations: formData.bookingDurations,
        bookingSlotInterval: formData.bookingSlotInterval,
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
      console.error('Error updating club:', error)
      setError('Ошибка при сохранении данных')
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
        bankAccount: formData.bankAccount,
        legalName: formData.legalName,
        ogrn: formData.ogrn,
        kpp: formData.kpp,
        legalAddress: formData.legalAddress,
        bankName: formData.bankName,
        bankBik: formData.bankBik,
        bankCorrespondentAccount: formData.bankCorrespondentAccount,
        directorName: formData.directorName,
        directorPosition: formData.directorPosition,
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
      console.error('Error updating requisites:', error)
      setError('Ошибка при сохранении реквизитов')
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
    return <VenueSelectorEmpty title="Выберите клуб для управления" />
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
              <div 
                className="logo-preview" 
                style={{
                  width: '120px',
                  height: '120px',
                  border: '2px dashed var(--extra-light-gray)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  background: 'var(--background)',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  const deleteBtn = e.currentTarget.querySelector('button')
                  if (deleteBtn) deleteBtn.style.opacity = '1'
                }}
                onMouseLeave={(e) => {
                  const deleteBtn = e.currentTarget.querySelector('button')
                  if (deleteBtn) deleteBtn.style.opacity = '0'
                }}>
                {currentClub?.logoUrl ? (
                  <>
                    <img src={currentClub.logoUrl} alt={currentClub.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={handleLogoDelete}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.9)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        opacity: 0,
                        transition: 'opacity 0.2s'
                      }}
                      disabled={loading}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#dc2626">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </>
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

          {/* Photo Gallery */}
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
              accept="image/*" 
              multiple
              style={{ display: 'none' }} 
              onChange={handlePhotoUpload}
              disabled={uploadingPhoto || photos.length >= 5}
            />
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
            <p className="form-hint" style={{ marginTop: '8px' }}>
              Выберите, какие длительности бронирования будут доступны клиентам
            </p>
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
                  legalName: currentClub.legalName || '',
                  ogrn: currentClub.ogrn || '',
                  kpp: currentClub.kpp || '',
                  legalAddress: currentClub.legalAddress || '',
                  bankName: currentClub.bankName || '',
                  bankBik: currentClub.bankBik || '',
                  bankCorrespondentAccount: currentClub.bankCorrespondentAccount || '',
                  directorName: currentClub.directorName || '',
                  directorPosition: currentClub.directorPosition || '',
                  workingHours: currentClub.workingHours || {
                    monday: '07:00-23:00',
                    tuesday: '07:00-23:00',
                    wednesday: '07:00-23:00',
                    thursday: '07:00-23:00',
                    friday: '07:00-23:00',
                    saturday: '08:00-22:00',
                    sunday: '08:00-22:00'
                  },
                  bookingDurations: currentClub.bookingDurations || {
                    60: true,
                    90: true,
                    120: true
                  },
                  bookingSlotInterval: currentClub.bookingSlotInterval || 60
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
        <h2 className="section-title">Реквизиты организации</h2>
        
        <form onSubmit={handleRequisitesSubmit}>
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
              <option value="АО">АО</option>
              <option value="НКО">НКО</option>
              <option value="Самозанятый">Самозанятый</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Юридическое наименование</label>
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
              <label className="form-label">ИНН</label>
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
            <label className="form-label">ОГРН / ОГРНИП</label>
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
            <label className="form-label">Юридический адрес</label>
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
            <label className="form-label">Наименование банка</label>
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
              <label className="form-label">БИК банка</label>
              <input 
                type="text" 
                className="form-input" 
                name="bankBik"
                value={formData.bankBik}
                onChange={handleInputChange}
                placeholder="044525225"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Корр. счет</label>
              <input 
                type="text" 
                className="form-input" 
                name="bankCorrespondentAccount"
                value={formData.bankCorrespondentAccount}
                onChange={handleInputChange}
                placeholder="30101810400000000225"
              />
            </div>
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
      </div>
      </div>
    </PermissionGate>
  )
}