import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { doc, getDoc, collection, getDocs, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { styles, mobileStyles, desktopStyles } from './ClubPage.styles'
import OptimizedImage from '../../components/OptimizedImage'
import '../../styles/flutter-theme.css'

// Import BookingModal directly to avoid dynamic import issues
import BookingModal from '../../components/BookingModal'

interface Venue {
  id: string
  name: string
  address: string
  phone: string
  email: string
  description?: string
  logoUrl?: string
  photos?: string[]
  amenities?: string[]
  workingHours?: {
    [key: string]: { open: string; close: string }
  }
  rating?: number
  reviewsCount?: number
  city?: string
  location?: {
    latitude: number
    longitude: number
  }
  paymentEnabled?: boolean
  paymentProvider?: string
  paymentTestMode?: boolean
  paymentCredentials?: any
  status?: string
}

interface Court {
  id: string
  name: string
  type: 'padel' | 'tennis' | 'badminton'
  pricePerHour?: number
  priceWeekday?: number
  priceWeekend?: number
  pricing?: {
    [key: string]: {
      basePrice: number
      intervals?: Array<{
        from: string
        to: string
        price: number
      }>
    }
  }
  surface?: string
  indoor?: boolean
  courtType?: string
  status: 'active' | 'maintenance' | 'inactive'
}

const sportColors = {
  padel: '#3B82F6',
  tennis: '#00D632',
  badminton: '#F59E0B'
}

const sportLabels = {
  padel: 'Падел',
  tennis: 'Теннис',
  badminton: 'Бадминтон'
}

const amenityIcons: { [key: string]: string } = {
  parking: '🚗',
  showers: '🚿',
  cafe: '☕',
  lockers: '🔒',
  shop: '🛍️',
  wifi: '📶',
  changing_rooms: '👔',
  equipment_rental: '🎾'
}

const amenityNames: { [key: string]: string } = {
  parking: 'Парковка',
  showers: 'Душевые',
  cafe: 'Кафе',
  lockers: 'Шкафчики',
  shop: 'Магазин',
  wifi: 'Wi-Fi',
  changing_rooms: 'Раздевалки',
  equipment_rental: 'Прокат снаряжения'
}

export default function ClubPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  
  const [venue, setVenue] = useState<Venue | null>(null)
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)

  // Preload hero image for better performance
  useEffect(() => {
    if (venue?.photos?.[0]) {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = venue.photos[0]
      document.head.appendChild(link)
      return () => {
        document.head.removeChild(link)
      }
    }
  }, [venue?.photos])

  useEffect(() => {
    const startTime = performance.now()
    loadVenueAndCourts().then(() => {
      const loadTime = performance.now() - startTime
      console.log(`ClubPage loaded in ${loadTime.toFixed(0)}ms`)
    })
    
    // Подписываемся на обновления кортов для real-time обновления цен
    if (clubId) {
      const unsubscribe = onSnapshot(
        query(
          collection(db, 'venues', clubId, 'courts'),
          where('status', '==', 'active')
        ),
        (snapshot) => {
          const courtsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Court[]
          setCourts(courtsData)
        },
        (error) => {
          console.error('Error listening to courts updates:', error)
        }
      )
      
      return () => unsubscribe()
    }
  }, [clubId])

  useEffect(() => {
    if (showPhotoModal) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closePhotoModal()
        } else if (e.key === 'ArrowLeft') {
          navigatePhoto('prev')
        } else if (e.key === 'ArrowRight') {
          navigatePhoto('next')
        }
      }

      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [showPhotoModal])

  const loadVenueAndCourts = async () => {
    if (!clubId) {
      setError('ID клуба не указан')
      setLoading(false)
      return
    }

    try {
      // Загружаем данные параллельно для улучшения производительности
      const [venueDoc, courtsSnapshot] = await Promise.all([
        getDoc(doc(db, 'venues', clubId)),
        getDocs(query(
          collection(db, 'venues', clubId, 'courts'),
          where('status', '==', 'active')
        ))
      ])

      if (!venueDoc.exists()) {
        setError('Клуб не найден')
        setLoading(false)
        return
      }

      const venueData = {
        id: venueDoc.id,
        ...venueDoc.data()
      } as Venue

      if (venueDoc.data().status !== 'active') {
        setError('Клуб временно недоступен')
        setLoading(false)
        return
      }

      console.log('Loaded venue data:', venueData)
      console.log('Payment settings:', {
        paymentEnabled: venueData.paymentEnabled,
        paymentProvider: venueData.paymentProvider,
        paymentTestMode: venueData.paymentTestMode
      })

      const courtsData = courtsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Court[]

      setVenue(venueData)
      setCourts(courtsData)
      setLoading(false)
    } catch (err) {
      console.error('Error loading venue:', err)
      setError('Ошибка при загрузке данных клуба')
      setLoading(false)
    }
  }

  const handleCourtSelect = (court: Court) => {
    setSelectedCourt(court)
  }

  // Функция для получения диапазона цен корта
  const getCourtPriceRange = (court: Court): { min: number; max: number; display: string } => {
    if (court.pricing) {
      const allPrices: number[] = []
      
      // Собираем все цены из всех дней
      Object.values(court.pricing).forEach((dayPricing: any) => {
        if (dayPricing && dayPricing.basePrice) {
          allPrices.push(dayPricing.basePrice)
          
          // Добавляем цены из интервалов
          if (dayPricing.intervals && Array.isArray(dayPricing.intervals)) {
            dayPricing.intervals.forEach((interval: any) => {
              if (interval.price) {
                allPrices.push(interval.price)
              }
            })
          }
        }
      })
      
      if (allPrices.length > 0) {
        const min = Math.min(...allPrices)
        const max = Math.max(...allPrices)
        
        if (min === max) {
          return { min, max, display: `${min}₽` }
        } else {
          return { min, max, display: `от ${min}₽` }
        }
      }
    }
    
    // Fallback на старую систему
    const price = court.pricePerHour || court.priceWeekday || 0
    return { min: price, max: price, display: `${price}₽` }
  }

  const handleContinue = () => {
    if (selectedCourt) {
      // Проверяем статус клуба перед открытием модального окна
      if (!isClubActive) {
        alert('Этот клуб находится на модерации и временно недоступен для бронирования.')
        return
      }
      console.log('Opening booking modal, venue:', venue, 'court:', selectedCourt)
      setShowBookingModal(true)
    }
  }

  const openPhotoModal = (index: number) => {
    setSelectedPhotoIndex(index)
    setShowPhotoModal(true)
  }

  const closePhotoModal = () => {
    setShowPhotoModal(false)
  }

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (!venue?.photos) return
    
    if (direction === 'prev') {
      setSelectedPhotoIndex((prev) => 
        prev === 0 ? venue.photos!.length - 1 : prev - 1
      )
    } else {
      setSelectedPhotoIndex((prev) => 
        prev === venue.photos!.length - 1 ? 0 : prev + 1
      )
    }
  }

  // Styles object
  const styles: any = {
    loadingContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' },
    loadingContent: { textAlign: 'center' },
    spinner: { marginBottom: '16px' },
    errorContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' },
    errorCard: { maxWidth: '400px', textAlign: 'center', padding: '40px' },
    errorIcon: { fontSize: '48px', marginBottom: '16px' },
    errorTitle: { marginBottom: '12px' },
    errorText: { color: 'var(--gray)' },
    pageContainer: { minHeight: '100vh', background: 'var(--background)' },
    heroImage: { width: '100%', height: '300px', objectFit: 'cover', cursor: 'pointer' },
    heroPlaceholder: { width: '100%', height: '300px', background: 'var(--extra-light-gray)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
    heroPlaceholderIcon: { fontSize: '48px', marginBottom: '8px' },
    heroPlaceholderText: { color: 'var(--gray)' },
    desktopGallery: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' },
    galleryImage: { width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', transition: 'transform 0.2s' },
    mobileGallery: { display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '16px', paddingBottom: '8px' },
    mobileGalleryImage: { width: '120px', height: '90px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0, cursor: 'pointer' },
    clubInfoWrapper: { padding: '20px' },
    clubTitle: { marginBottom: '16px' },
    clubInfoItems: { display: 'flex', flexDirection: 'column', gap: '12px' },
    infoItem: { display: 'flex', alignItems: 'center', gap: '8px' },
    infoIcon: { fontSize: '18px' },
    courtsWrapper: { padding: '20px' },
    courtsWrapperDesktop: { marginTop: '32px' },
    courtsTitle: { marginBottom: '16px' },
    noCourtsCard: { padding: '40px', textAlign: 'center' },
    noCourtsIcon: { fontSize: '48px', marginBottom: '8px', display: 'block' },
    noCourtsText: { color: 'var(--gray)' },
    courtCardContent: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
    courtInfo: { flex: 1 },
    courtName: { marginBottom: '8px' },
    courtDetails: { display: 'flex', alignItems: 'center', gap: '8px' },
    courtIndoor: { color: 'var(--gray)' },
    courtSurface: { color: 'var(--gray)' },
    courtPricing: { textAlign: 'right' },
    courtPrice: { color: 'var(--primary)', marginBottom: '4px' },
    courtPriceUnit: { color: 'var(--gray)' },
    sidebarBookingCard: { position: 'sticky', top: '20px' },
    selectedCourtSection: { marginBottom: '8px' },
    selectedCourtDetails: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    selectedCourtType: { color: 'var(--gray)' },
    selectedCourtPrice: { color: 'var(--primary)' }
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div className="spinner" style={styles.spinner}></div>
          <p className="body-small">Загрузка...</p>
        </div>
        <style>
          {`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div className="flutter-card" style={styles.errorCard}>
          <div style={styles.errorIcon}>❌</div>
          <h2 className="h2" style={styles.errorTitle}>Ошибка</h2>
          <p className="body" style={styles.errorText}>{error}</p>
        </div>
      </div>
    )
  }

  if (!venue) return null

  const isDesktop = window.innerWidth > 768
  const isClubActive = venue.status === 'active'

  return (
    <div style={styles.pageContainer}>
      {/* Status warning for pending clubs */}
      {!isClubActive && (
        <div style={{
          backgroundColor: '#fff3cd',
          borderBottom: '1px solid #ffeaa7',
          padding: 'var(--spacing-lg)',
          textAlign: 'center'
        }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h3 className="h3" style={{ color: '#856404', marginBottom: 'var(--spacing-sm)' }}>
              Клуб находится на модерации
            </h3>
            <p className="body" style={{ color: '#856404' }}>
              Данный клуб еще не прошел проверку и временно недоступен для бронирования. 
              Страница будет активирована после проверки администратором.
            </p>
          </div>
        </div>
      )}

      {/* Hero section with image - DESKTOP ONLY */}
      {isDesktop && (
        <div className="hero-image">
          {venue.photos && venue.photos.length > 0 ? (
            <OptimizedImage 
              loading="eager"
              src={venue.photos[0]} 
              alt={venue.name}
              style={styles.heroImage}
              onClick={() => openPhotoModal(0)}
            />
          ) : (
            <div style={styles.heroPlaceholder}>
              <span style={styles.heroPlaceholderIcon}>🏸</span>
              <span className="body-small" style={styles.heroPlaceholderText}>Фото клуба</span>
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <div style={isDesktop ? desktopStyles.container : mobileStyles.contentPadding}>
        <div style={isDesktop ? desktopStyles.mainContent : {}}>
          {/* Image gallery for desktop */}
          {isDesktop && venue.photos && venue.photos.length > 0 && (
            <div style={styles.desktopGallery}>
              {venue.photos.map((photo, index) => (
                <OptimizedImage 
                  key={index}
                  loading="lazy"
                  src={photo} 
                  alt={`${venue.name} - фото ${index + 1}`}
                  className="gallery-image"
                  style={styles.galleryImage}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  onClick={() => openPhotoModal(index)}
                />
              ))}
            </div>
          )}

          {/* Mobile only - Image gallery */}
          {!isDesktop && venue.photos && venue.photos.length > 0 && (
            <div style={styles.mobileGallery}>
              {venue.photos.map((photo, index) => (
                <OptimizedImage 
                  key={index}
                  loading="lazy"
                  src={photo} 
                  alt={`${venue.name} - фото ${index + 1}`}
                  style={styles.mobileGalleryImage}
                  onClick={() => openPhotoModal(index)}
                />
              ))}
            </div>
          )}

          {/* Club info */}
          <div style={styles.clubInfoWrapper}>
            <h1 className="h1" style={styles.clubTitle}>{venue.name}</h1>
            
            <div style={styles.clubInfoItems}>
              <div style={styles.infoItem}>
                <span style={styles.infoIcon}>📍</span>
                <span className="body">{venue.address}</span>
              </div>
              
              {venue.phone && (
                <div style={styles.infoItem}>
                  <span style={styles.infoIcon}>📞</span>
                  <span className="body">{venue.phone}</span>
                </div>
              )}
              
            </div>
          </div>

          {/* Mobile only - Courts section BEFORE About */}
          {!isDesktop && (
            <div style={styles.courtsWrapper}>
              <h3 className="h2" style={styles.courtsTitle}>Доступные корты</h3>
              
              {courts.length === 0 ? (
                <div className="flutter-card" style={styles.noCourtsCard}>
                  <span style={styles.noCourtsIcon}>🎾</span>
                  <p className="body" style={styles.noCourtsText}>
                    Нет доступных кортов
                  </p>
                </div>
              ) : (
                <div>
                  {courts.map((court) => {
                    const isSelected = selectedCourt?.id === court.id
                    return (
                      <div
                        key={court.id}
                        className={`court-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleCourtSelect(court)}
                      >
                        <div style={styles.courtCardContent}>
                          <div style={styles.courtInfo}>
                            <h4 className="body-bold" style={styles.courtName}>
                              {court.name}
                            </h4>
                            <div style={styles.courtDetails}>
                              <span 
                                className={`sport-chip ${court.type}`}
                                style={{ backgroundColor: sportColors[court.type] }}
                              >
                                {sportLabels[court.type]}
                              </span>
                              {court.indoor && (
                                <span className="caption" style={styles.courtIndoor}>Крытый</span>
                              )}
                              {court.surface && (
                                <span className="caption" style={styles.courtSurface}>• {court.surface}</span>
                              )}
                            </div>
                          </div>
                          <div style={styles.courtPricing}>
                            <div className="h3" style={styles.courtPrice}>
                              {getCourtPriceRange(court).display}
                            </div>
                            <div className="caption" style={styles.courtPriceUnit}>за час</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Description - only on desktop in main content, on mobile in regular flow */}
          {!isDesktop && venue.description && (
            <div className="info-section">
              <h3 className="info-section-title">О клубе</h3>
              <p className="body" style={{ color: 'var(--gray)', lineHeight: 1.6 }}>
                {venue.description}
              </p>
            </div>
          )}

          {/* Mobile only - Working Hours and Amenities */}
          {!isDesktop && (
            <>
              
              {/* Working hours */}
              {venue.workingHours && (
                <div className="info-section" style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <h3 className="info-section-title">Часы работы</h3>
                  <div style={{ display: 'grid', gap: 'var(--spacing-xs)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="body">Будние дни (пн-пт)</span>
                      <span className="body" style={{ color: 'var(--gray)' }}>
                        {venue.workingHours.weekday || '07:00-23:00'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="body">Выходные (сб-вс)</span>
                      <span className="body" style={{ color: 'var(--gray)' }}>
                        {venue.workingHours.weekend || '08:00-22:00'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Amenities */}
              {venue.amenities && venue.amenities.length > 0 && (
                <div className="info-section" style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <h3 className="info-section-title">Удобства</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    {venue.amenities.map((amenity) => (
                      <div key={amenity} className="amenity-item">
                        <span className="check-icon">✓</span>
                        <span className="body">{amenityNames[amenity] || amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}


          {/* Courts section - Desktop only */}
          {isDesktop && (
            <div style={styles.courtsWrapperDesktop}>
              <h3 className="h2" style={styles.courtsTitle}>Доступные корты</h3>
              
              {courts.length === 0 ? (
                <div className="flutter-card" style={styles.noCourtsCard}>
                  <span style={styles.noCourtsIcon}>🎾</span>
                  <p className="body" style={styles.noCourtsText}>
                    Нет доступных кортов
                  </p>
                </div>
              ) : (
                <div className="courts-grid">
                  {courts.map((court) => {
                    const isSelected = selectedCourt?.id === court.id
                    return (
                      <div
                        key={court.id}
                        className={`court-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleCourtSelect(court)}
                      >
                        <div style={styles.courtCardContent}>
                          <div style={styles.courtInfo}>
                            <h4 className="body-bold" style={styles.courtName}>
                              {court.name}
                            </h4>
                            <div style={styles.courtDetails}>
                              <span 
                                className={`sport-chip ${court.type}`}
                                style={{ backgroundColor: sportColors[court.type] }}
                              >
                                {sportLabels[court.type]}
                              </span>
                              {court.indoor && (
                                <span className="caption" style={styles.courtIndoor}>Крытый</span>
                              )}
                              {court.surface && (
                                <span className="caption" style={styles.courtSurface}>• {court.surface}</span>
                              )}
                            </div>
                          </div>
                          <div style={styles.courtPricing}>
                            <div className="h3" style={styles.courtPrice}>
                              {getCourtPriceRange(court).display}
                            </div>
                            <div className="caption" style={styles.courtPriceUnit}>за час</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Description - Desktop only - now AFTER courts */}
          {isDesktop && venue.description && (
            <div className="info-section" style={{ marginTop: 'var(--spacing-2xl)' }}>
              <h3 className="info-section-title">О клубе</h3>
              <p className="body" style={{ color: 'var(--gray)', lineHeight: 1.6 }}>
                {venue.description}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar for desktop */}
        {isDesktop && (
          <div style={desktopStyles.sidebar}>
            {/* Booking card */}
            <div className="sticky-bottom-bar" style={styles.sidebarBookingCard}>
              {selectedCourt && (
                <div className="selected-court-summary">
                  <h4 className="body-bold" style={styles.selectedCourtSection}>
                    {selectedCourt.name}
                  </h4>
                  <div style={styles.selectedCourtDetails}>
                    <span className="body-small" style={styles.selectedCourtType}>
                      {sportLabels[selectedCourt.type]}
                    </span>
                    <span className="body-bold" style={styles.selectedCourtPrice}>
                      {getCourtPriceRange(selectedCourt).display}/час
                    </span>
                  </div>
                </div>
              )}
              
              <button
                className="flutter-button"
                style={{ width: '100%', marginBottom: 'var(--spacing-md)' }}
                onClick={handleContinue}
                disabled={!selectedCourt}
              >
                {selectedCourt 
                  ? `Выбрать время`
                  : 'Выберите корт'
                }
              </button>
              
            </div>

            {/* Working hours */}
            {venue.workingHours && (
              <div className="info-section" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 className="info-section-title">Часы работы</h3>
                <div style={{ display: 'grid', gap: 'var(--spacing-xs)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="caption">Будние дни (пн-пт)</span>
                    <span className="caption" style={{ color: 'var(--gray)' }}>
                      {venue.workingHours.weekday || '07:00-23:00'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="caption">Выходные (сб-вс)</span>
                    <span className="caption" style={{ color: 'var(--gray)' }}>
                      {venue.workingHours.weekend || '08:00-22:00'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Amenities */}
            {venue.amenities && venue.amenities.length > 0 && (
              <div className="info-section">
                <h3 className="info-section-title">Удобства</h3>
                <div style={{ display: 'grid', gap: 'var(--spacing-xs)' }}>
                  {venue.amenities.map((amenity) => (
                    <div key={amenity} className="amenity-item" style={{ 
                      background: 'transparent', 
                      padding: 'var(--spacing-xs) 0',
                      margin: 0 
                    }}>
                      <span className="check-icon">✓</span>
                      <span className="caption">{amenityNames[amenity] || amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky bottom bar for mobile and tablet */}
      {!isDesktop && (
        <div className="sticky-bottom-bar">
          <button
            className="flutter-button"
            style={{ width: '100%' }}
            onClick={handleContinue}
            disabled={!selectedCourt}
          >
            {selectedCourt 
              ? `Выбрать время для ${selectedCourt.name}`
              : 'Выберите корт'
            }
          </button>
        </div>
      )}



      {/* Booking Modal */}
      {selectedCourt && venue && (
        <BookingModal
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          court={selectedCourt}
          venue={venue}
        />
      )}

      {/* Photo Gallery Modal */}
      {showPhotoModal && venue?.photos && (
        <div 
          className="modal-backdrop"
          onClick={closePhotoModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--spacing-xl)'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Close button */}
            <button
              onClick={closePhotoModal}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '28px',
                cursor: 'pointer',
                padding: '8px',
                zIndex: 10,
                lineHeight: 1
              }}
              aria-label="Закрыть"
            >
              ✕
            </button>

            {/* Previous button */}
            {venue.photos.length > 1 && (
              <button
                onClick={() => navigatePhoto('prev')}
                style={{
                  position: 'absolute',
                  left: window.innerWidth > 768 ? '-50px' : '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: 'white',
                  fontSize: '24px',
                  cursor: 'pointer',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                  zIndex: 5
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                aria-label="Предыдущее фото"
              >
                ←
              </button>
            )}

            {/* Photo */}
            <img
              src={venue.photos[selectedPhotoIndex]}
              alt={`${venue.name} - фото ${selectedPhotoIndex + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: 'var(--radius-md)'
              }}
            />

            {/* Next button */}
            {venue.photos.length > 1 && (
              <button
                onClick={() => navigatePhoto('next')}
                style={{
                  position: 'absolute',
                  right: window.innerWidth > 768 ? '-50px' : '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: 'white',
                  fontSize: '24px',
                  cursor: 'pointer',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                  zIndex: 5
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                aria-label="Следующее фото"
              >
                →
              </button>
            )}

            {/* Photo counter */}
            {venue.photos.length > 1 && (
              <div style={{
                position: 'absolute',
                bottom: '-30px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {selectedPhotoIndex + 1} / {venue.photos.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer with user agreement link */}
      <div style={{
        borderTop: '1px solid var(--divider)',
        padding: '24px',
        marginTop: '40px',
        paddingBottom: !isDesktop ? 'calc(140px + 24px)' : '24px',
        textAlign: 'center',
        backgroundColor: 'var(--background)'
      }}>
        <Link 
          to={`/club/${clubId}/user-agreement`} 
          style={{
            color: 'var(--text-secondary)',
            fontSize: '14px',
            textDecoration: 'none',
            borderBottom: '1px dashed var(--text-secondary)',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--primary)';
            e.currentTarget.style.borderBottomColor = 'var(--primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.borderBottomColor = 'var(--text-secondary)';
          }}
        >
          Пользовательское соглашение
        </Link>
        
        {venue?.legalName && (
          <div style={{
            marginTop: '12px',
            fontSize: '12px',
            color: 'var(--text-disabled)'
          }}>
            © {new Date().getFullYear()} {venue.legalName}
          </div>
        )}
      </div>
    </div>
  )
}