import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../services/firebase'
import BookingModal from '../../components/BookingModal'
import '../../styles/flutter-theme.css'

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
}

interface Court {
  id: string
  name: string
  type: 'padel' | 'tennis' | 'badminton'
  pricePerHour?: number
  priceWeekday?: number
  priceWeekend?: number
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

  useEffect(() => {
    loadVenueAndCourts()
  }, [clubId])

  const loadVenueAndCourts = async () => {
    if (!clubId) {
      setError('ID клуба не указан')
      setLoading(false)
      return
    }

    try {
      const venueDoc = await getDoc(doc(db, 'venues', clubId))
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
      setVenue(venueData)

      // Загружаем корты из подколлекции venues/{venueId}/courts
      const courtsQuery = query(
        collection(db, 'venues', clubId, 'courts'),
        where('status', '==', 'active')
      )
      const courtsSnapshot = await getDocs(courtsQuery)
      const courtsData = courtsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Court[]

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

  const handleContinue = () => {
    if (selectedCourt) {
      if (window.innerWidth > 768) {
        console.log('Opening booking modal, venue:', venue, 'court:', selectedCourt)
        setShowBookingModal(true)
      } else {
        navigate(`/club/${clubId}/court/${selectedCourt.id}/date`)
      }
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: 'var(--background)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--extra-light-gray)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
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
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: 'var(--background)',
        padding: 'var(--spacing-xl)'
      }}>
        <div className="flutter-card" style={{ 
          maxWidth: '600px', 
          margin: '0 auto',
          textAlign: 'center',
          padding: 'var(--spacing-2xl)'
        }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: 'var(--spacing-md)' 
          }}>❌</div>
          <h2 className="h2" style={{ marginBottom: 'var(--spacing-sm)' }}>Ошибка</h2>
          <p className="body" style={{ color: 'var(--text-secondary)' }}>{error}</p>
        </div>
      </div>
    )
  }

  if (!venue) return null

  const isDesktop = window.innerWidth > 768

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)' }}>
      {/* Hero section with image */}
      <div className="hero-image">
        {venue.photos && venue.photos.length > 0 && !venue.photos[0].includes('unsplash') ? (
          <img src={venue.photos[0]} alt={venue.name} />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '8px',
            backgroundColor: 'var(--extra-light-gray)'
          }}>
            <span style={{ fontSize: '48px', color: 'var(--light-gray)' }}>🏸</span>
            <span className="body-small" style={{ color: 'var(--gray)' }}>Фото клуба</span>
          </div>
        )}
        
        <button 
          className="back-button"
          onClick={() => window.history.back()}
          aria-label="Назад"
        >
          ←
        </button>
      </div>

      {/* Main content */}
      <div className={isDesktop ? 'desktop-container' : ''} style={{ padding: isDesktop ? '' : 'var(--spacing-xl)' }}>
        <div className={isDesktop ? 'desktop-main-content' : ''}>
          {/* Image gallery for desktop */}
          {isDesktop && venue.photos && venue.photos.length > 1 && (
            <div className="image-gallery">
              {venue.photos
                .filter(photo => !photo.includes('unsplash'))
                .map((photo, index) => (
                  <img 
                    key={index}
                    src={photo} 
                    alt={`${venue.name} - фото ${index + 1}`}
                    className="gallery-image"
                    onClick={() => window.open(photo, '_blank')}
                  />
                ))}
            </div>
          )}

          {/* Club info */}
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <h1 className="h1" style={{ marginBottom: 'var(--spacing-sm)' }}>{venue.name}</h1>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <span style={{ color: 'var(--gray)', fontSize: 'var(--icon-size-md)' }}>📍</span>
                <span className="body">{venue.address}</span>
              </div>
              
              {venue.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                  <span style={{ color: 'var(--gray)', fontSize: 'var(--icon-size-md)' }}>📞</span>
                  <span className="body">{venue.phone}</span>
                </div>
              )}
              
              {venue.rating && (
                <div className="rating-chip">
                  <span className="star-icon">⭐</span>
                  <span className="caption-bold" style={{ color: 'var(--primary-dark)' }}>
                    {venue.rating.toFixed(1)}
                  </span>
                  {venue.reviewsCount && (
                    <span className="caption" style={{ color: 'var(--gray)' }}>
                      ({venue.reviewsCount} отзывов)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Description - only on desktop in main content, on mobile in regular flow */}
          {venue.description && (
            <div className="info-section" style={{ marginBottom: 'var(--spacing-lg)' }}>
              <h3 className="info-section-title">О клубе</h3>
              <p className="body" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {venue.description}
              </p>
            </div>
          )}

          {/* Mobile only - Amenities and Working Hours */}
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

          {/* Courts section */}
          <div style={{ marginBottom: isDesktop ? '0' : 'calc(140px + var(--spacing-xl))' }}>
            <h3 className="h2" style={{ marginBottom: 'var(--spacing-lg)' }}>Доступные корты</h3>
            
            {courts.length === 0 ? (
              <div className="flutter-card" style={{ 
                textAlign: 'center', 
                padding: 'var(--spacing-3xl)'
              }}>
                <span style={{ fontSize: '48px', color: 'var(--light-gray)' }}>🎾</span>
                <p className="body" style={{ color: 'var(--gray)', marginTop: 'var(--spacing-md)' }}>
                  Нет доступных кортов
                </p>
              </div>
            ) : (
              <div className={isDesktop ? 'courts-grid' : ''}>
                {courts.map((court) => {
                  const isSelected = selectedCourt?.id === court.id
                  return (
                    <div
                      key={court.id}
                      className={`court-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleCourtSelect(court)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <h4 className="body-bold" style={{ marginBottom: 'var(--spacing-xs)' }}>
                            {court.name}
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                            <span 
                              className={`sport-chip ${court.type}`}
                              style={{ backgroundColor: sportColors[court.type] }}
                            >
                              {sportLabels[court.type]}
                            </span>
                            {court.indoor && (
                              <span className="caption" style={{ color: 'var(--gray)' }}>Крытый</span>
                            )}
                            {court.surface && (
                              <span className="caption" style={{ color: 'var(--gray)' }}>• {court.surface}</span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: '120px' }}>
                          <div className="h3" style={{ color: 'var(--primary)' }}>
                            {court.pricePerHour || court.priceWeekday || 0}₽
                          </div>
                          <div className="caption" style={{ color: 'var(--gray)' }}>за час</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar for desktop */}
        {isDesktop && (
          <div className="desktop-sidebar">
            {/* Booking card */}
            <div className="sticky-bottom-bar" style={{ marginBottom: 'var(--spacing-lg)' }}>
              {selectedCourt && (
                <div className="selected-court-summary">
                  <h4 className="body-bold" style={{ marginBottom: 'var(--spacing-xs)' }}>
                    {selectedCourt.name}
                  </h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="body-small" style={{ color: 'var(--gray)' }}>
                      {sportLabels[selectedCourt.type]}
                    </span>
                    <span className="body-bold" style={{ color: 'var(--primary)' }}>
                      {selectedCourt.pricePerHour || selectedCourt.priceWeekday || 0}₽/час
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
              
              <div style={{ 
                textAlign: 'center', 
                padding: 'var(--spacing-md)', 
                backgroundColor: 'var(--background)',
                borderRadius: 'var(--radius-md)',
                marginTop: 'var(--spacing-lg)'
              }}>
                <p className="caption" style={{ color: 'var(--gray)', marginBottom: 'var(--spacing-sm)' }}>
                  Удобнее в приложении
                </p>
                <button
                  style={{
                    background: 'var(--secondary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: 'var(--spacing-xs) var(--spacing-md)',
                    fontSize: 'var(--text-caption)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)'
                  }}
                  onClick={() => {
                    window.location.href = `allcourts://club/${clubId}`
                  }}
                >
                  📱 Открыть в приложении
                </button>
              </div>
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

      {/* Mobile app promo for mobile only */}
      {!isDesktop && (
        <div className="mobile-app-promo" style={{ 
          position: 'fixed',
          bottom: '140px',
          right: '20px',
          zIndex: 99
        }}>
          <button
            style={{
              background: 'var(--secondary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              fontSize: 'var(--text-caption)',
              fontWeight: '600',
              boxShadow: 'var(--shadow-lg)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)'
            }}
            onClick={() => {
              window.location.href = `allcourts://club/${clubId}`
            }}
          >
            📱 Открыть в приложении
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
    </div>
  )
}