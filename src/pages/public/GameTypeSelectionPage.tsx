import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { format, parse, addMinutes } from 'date-fns'
import { ru } from 'date-fns/locale'
import { addDoc, collection, doc, getDoc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import '../../styles/flutter-theme.css'

interface GameTypeOption {
  id: string
  title: string
  subtitle: string
  icon: string
  iconColor: string
  tags: string[]
  available: boolean
  playersCount?: number
  price?: number
  pricePerPlayer?: number
}

interface Court {
  id: string
  name: string
  pricePerHour: number
}

export default function GameTypeSelectionPage() {
  const { clubId, courtId } = useParams<{ clubId: string; courtId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const dateParam = searchParams.get('date')
  const timeParam = searchParams.get('time')
  const durationParam = searchParams.get('duration')
  
  const [selectedGameType, setSelectedGameType] = useState<string>('open')
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [court, setCourt] = useState<Court | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadCourt()
  }, [courtId])
  
  const loadCourt = async () => {
    if (!courtId) return
    
    try {
      const courtDoc = await getDoc(doc(db, 'venues', clubId!, 'courts', courtId))
      if (courtDoc.exists()) {
        setCourt({ id: courtDoc.id, ...courtDoc.data() } as Court)
      }
    } catch (error) {
      console.error('Error loading court:', error)
    } finally {
      setLoading(false)
    }
  }
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    comment: ''
  })
  const [formErrors, setFormErrors] = useState<any>({})
  const [submitting, setSubmitting] = useState(false)

  const gameTypes: GameTypeOption[] = [
    {
      id: 'private',
      title: 'Приватная игра',
      subtitle: 'Только для вас и ваших друзей',
      icon: '🔒',
      iconColor: 'var(--primary)',
      tags: ['Только для вас', 'Без посторонних'],
      available: true
    },
    {
      id: 'open',
      title: 'Открытая игра',
      subtitle: 'Найдите партнёров для игры',
      icon: '👥',
      iconColor: 'var(--success)',
      tags: ['Найти партнёров', 'Разделить оплату'],
      available: false
    },
    {
      id: 'find',
      title: 'Найти игру',
      subtitle: 'Присоединитесь к существующей игре',
      icon: '🔍',
      iconColor: 'var(--gray)',
      tags: ['12 открытых игр'],
      available: false
    }
  ]

  const handleGameTypeSelect = (gameType: GameTypeOption) => {
    if (gameType.available) {
      // Calculate price based on court and duration
      const pricePerHour = court?.pricePerHour || 0
      const price = Math.round((pricePerHour / 60) * parseInt(durationParam || '60'))
      
      // Navigate to payment page with all parameters
      const params = new URLSearchParams({
        date: dateParam || '',
        time: timeParam || '',
        duration: durationParam || '60',
        gameType: gameType.id,
        playersCount: (gameType.playersCount || 1).toString(),
        price: price.toString(),
        pricePerPlayer: (gameType.pricePerPlayer || price).toString()
      })
      
      navigate(`/club/${clubId}/court/${courtId}/payment?${params.toString()}`)
    } else {
      // Show app download dialog
      const shouldDownload = window.confirm(
        `Функция "${gameType.title}" доступна только в мобильном приложении "Все корты".\n\nПерейти в приложение?`
      )
      
      if (shouldDownload) {
        window.location.href = `allcourts://club/${clubId}/court/${courtId}?date=${dateParam}&time=${timeParam}&duration=${durationParam}`
      }
    }
  }

  const validateForm = () => {
    const errors: any = {}
    
    if (!formData.name.trim()) {
      errors.name = 'Укажите ваше имя'
    }
    
    if (!formData.phone.trim()) {
      errors.phone = 'Укажите номер телефона'
    } else if (!/^[\d\s\+\-\(\)]+$/.test(formData.phone)) {
      errors.phone = 'Неверный формат телефона'
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Неверный формат email'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    
    // Calculate price based on court and duration
    const pricePerHour = court?.pricePerHour || 0
    const price = Math.round((pricePerHour / 60) * parseInt(durationParam!))
    
    // Navigate to payment page with all necessary data
    const params = new URLSearchParams({
      date: dateParam!,
      time: timeParam!,
      duration: durationParam!,
      gameType: selectedGameType,
      playersCount: '1',
      price: price.toString(),
      pricePerPlayer: price.toString()
    })
    
    navigate(`/club/${clubId}/court/${courtId}/payment?${params.toString()}`)
  }

  // Remove the booking form - always redirect to payment page
  if (false && showBookingForm) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)' }}>
        {/* Header */}
        <div style={{
          backgroundColor: 'var(--white)',
          padding: 'var(--spacing-md) var(--spacing-xl)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <button
              onClick={() => setShowBookingForm(false)}
              style={{
                width: '40px',
                height: '40px',
                background: 'var(--divider)',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}
            >
              ←
            </button>
            <div>
              <h1 className="h3">Оформление бронирования</h1>
            </div>
          </div>
        </div>

        <div style={{ padding: 'var(--spacing-xl)' }}>
          {/* Booking summary */}
          <div className="info-section" style={{ marginBottom: 'var(--spacing-xl)' }}>
            <h3 className="body-bold" style={{ marginBottom: 'var(--spacing-md)' }}>
              Детали бронирования
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              <div>
                <span className="caption">Дата:</span>
                <span className="body" style={{ marginLeft: 'var(--spacing-xs)' }}>
                  {dateParam && format(parse(dateParam, 'yyyy-MM-dd', new Date()), 'd MMMM yyyy', { locale: ru })}
                </span>
              </div>
              <div>
                <span className="caption">Время:</span>
                <span className="body" style={{ marginLeft: 'var(--spacing-xs)' }}>
                  {timeParam} - {durationParam && format(addMinutes(parse(timeParam!, 'HH:mm', new Date()), parseInt(durationParam)), 'HH:mm')}
                </span>
              </div>
              <div>
                <span className="caption">Тип игры:</span>
                <span className="body" style={{ marginLeft: 'var(--spacing-xs)' }}>
                  Открытая игра
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div style={{ marginBottom: 'calc(80px + var(--spacing-xl))' }}>
            <h3 className="body-bold" style={{ marginBottom: 'var(--spacing-md)' }}>
              Контактные данные
            </h3>
            
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label className="caption" style={{ display: 'block', marginBottom: 'var(--spacing-xs)' }}>
                Ваше имя *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-md)',
                  border: `2px solid ${formErrors.name ? 'var(--error)' : 'var(--extra-light-gray)'}`,
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-body)',
                  transition: 'border-color 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = formErrors.name ? 'var(--error)' : 'var(--extra-light-gray)'}
              />
              {formErrors.name && (
                <span className="caption" style={{ color: 'var(--error)', marginTop: 'var(--spacing-xs)' }}>
                  {formErrors.name}
                </span>
              )}
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label className="caption" style={{ display: 'block', marginBottom: 'var(--spacing-xs)' }}>
                Телефон *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
                style={{
                  width: '100%',
                  padding: 'var(--spacing-md)',
                  border: `2px solid ${formErrors.phone ? 'var(--error)' : 'var(--extra-light-gray)'}`,
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-body)',
                  transition: 'border-color 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = formErrors.phone ? 'var(--error)' : 'var(--extra-light-gray)'}
              />
              {formErrors.phone && (
                <span className="caption" style={{ color: 'var(--error)', marginTop: 'var(--spacing-xs)' }}>
                  {formErrors.phone}
                </span>
              )}
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label className="caption" style={{ display: 'block', marginBottom: 'var(--spacing-xs)' }}>
                Email (необязательно)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-md)',
                  border: `2px solid ${formErrors.email ? 'var(--error)' : 'var(--extra-light-gray)'}`,
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-body)',
                  transition: 'border-color 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = formErrors.email ? 'var(--error)' : 'var(--extra-light-gray)'}
              />
              {formErrors.email && (
                <span className="caption" style={{ color: 'var(--error)', marginTop: 'var(--spacing-xs)' }}>
                  {formErrors.email}
                </span>
              )}
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label className="caption" style={{ display: 'block', marginBottom: 'var(--spacing-xs)' }}>
                Комментарий (необязательно)
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                rows={3}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-md)',
                  border: '2px solid var(--extra-light-gray)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-body)',
                  transition: 'border-color 0.2s',
                  outline: 'none',
                  resize: 'vertical'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--extra-light-gray)'}
              />
            </div>

            <div style={{ 
              backgroundColor: 'var(--info)', 
              color: 'white',
              padding: 'var(--spacing-md)',
              borderRadius: 'var(--radius-md)'
            }}>
              <p className="caption" style={{ color: 'white' }}>
                ℹ️ После отправки заявки с вами свяжется менеджер клуба для подтверждения бронирования
              </p>
            </div>
          </div>
        </div>

        {/* Sticky bottom bar */}
        <div className="sticky-bottom-bar">
          <button
            className="flutter-button"
            style={{ width: '100%' }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Отправка...' : 'Отправить заявку'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'var(--white)',
        padding: 'var(--spacing-md) var(--spacing-xl)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: '40px',
              height: '40px',
              background: 'var(--divider)',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}
          >
            ←
          </button>
          <div>
            <h1 className="h3">Выберите формат игры</h1>
          </div>
        </div>
      </div>

      <div style={{ padding: 'var(--spacing-xl)' }}>
        {gameTypes.map((gameType) => (
          <div
            key={gameType.id}
            onClick={() => handleGameTypeSelect(gameType)}
            style={{
              backgroundColor: 'var(--white)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--spacing-lg)',
              marginBottom: 'var(--spacing-md)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: `2px solid ${
                selectedGameType === gameType.id && gameType.available 
                  ? 'var(--primary)' 
                  : 'transparent'
              }`,
              boxShadow: selectedGameType === gameType.id && gameType.available
                ? '0 2px 10px rgba(0, 211, 50, 0.1)'
                : 'none',
              opacity: gameType.available ? 1 : 0.7,
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              if (gameType.available) {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = 'var(--shadow-md)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {!gameType.available && (
              <div style={{
                position: 'absolute',
                top: 'var(--spacing-sm)',
                right: 'var(--spacing-sm)',
                backgroundColor: 'var(--secondary)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-tiny)',
                fontWeight: 600
              }}>
                В приложении
              </div>
            )}
            
            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: selectedGameType === gameType.id && gameType.available
                  ? 'var(--primary)'
                  : 'var(--divider)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                flexShrink: 0
              }}>
                <span style={{
                  filter: selectedGameType === gameType.id && gameType.available
                    ? 'brightness(0) invert(1)'
                    : 'none'
                }}>
                  {gameType.icon}
                </span>
              </div>
              
              <div style={{ flex: 1 }}>
                <h3 className="body-bold" style={{ marginBottom: 'var(--spacing-xxs)' }}>
                  {gameType.title}
                </h3>
                <p className="caption" style={{ marginBottom: 'var(--spacing-sm)' }}>
                  {gameType.subtitle}
                </p>
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                  {gameType.tags.map((tag, index) => (
                    <span
                      key={index}
                      style={{
                        padding: '4px 16px',
                        backgroundColor: selectedGameType === gameType.id && gameType.available
                          ? 'var(--primary-light)'
                          : 'var(--divider)',
                        color: selectedGameType === gameType.id && gameType.available
                          ? 'var(--primary-dark)'
                          : 'var(--gray)',
                        borderRadius: 'var(--radius-xl)',
                        fontSize: 'var(--text-caption)',
                        fontWeight: 600
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Info */}
        <div style={{ 
          backgroundColor: 'var(--warning)', 
          color: 'white',
          padding: 'var(--spacing-md)',
          borderRadius: 'var(--radius-md)',
          marginTop: 'var(--spacing-xl)'
        }}>
          <p className="caption" style={{ color: 'white' }}>
            ⚠️ В веб-версии доступна только "Открытая игра". Для доступа ко всем типам игр скачайте мобильное приложение "Все корты".
          </p>
        </div>
      </div>
    </div>
  )
}