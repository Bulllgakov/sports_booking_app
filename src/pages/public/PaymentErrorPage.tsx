import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import '../../styles/flutter-theme.css'

interface Venue {
  name: string
  phone?: string
  email?: string
}

export default function PaymentErrorPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const [venue, setVenue] = useState<Venue | null>(null)
  const [loading, setLoading] = useState(true)
  
  const fromPayment = searchParams.get('paymentError') === 'true'

  useEffect(() => {
    loadVenueData()
  }, [clubId])

  const loadVenueData = async () => {
    if (!clubId) {
      setLoading(false)
      return
    }

    try {
      const venueDoc = await getDoc(doc(db, 'venues', clubId))
      if (venueDoc.exists()) {
        setVenue(venueDoc.data() as Venue)
      }
      setLoading(false)
    } catch (err) {
      console.error('Error loading venue:', err)
      setLoading(false)
    }
  }

  const formatPhone = (phone: string) => {
    // Format phone for display
    if (phone.startsWith('+7')) {
      const digits = phone.replace(/\D/g, '')
      if (digits.length === 11) {
        return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
      }
    }
    return phone
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)' }}>
      {/* Error header */}
      <div style={{
        backgroundColor: 'var(--error)',
        padding: 'var(--spacing-3xl) var(--spacing-xl)',
        textAlign: 'center',
        color: 'white'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          backgroundColor: 'white',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--spacing-lg)',
          fontSize: '40px'
        }}>
          ❌
        </div>
        <h1 className="h2" style={{ color: 'white', marginBottom: 'var(--spacing-sm)' }}>
          Ошибка оплаты
        </h1>
        <p className="body" style={{ color: 'white', opacity: 0.9 }}>
          Платеж не был завершен успешно
        </p>
      </div>

      <div style={{ 
        padding: 'var(--spacing-xl)',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        {/* Error explanation */}
        <div className="flutter-card" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h3 className="body-bold" style={{ marginBottom: 'var(--spacing-md)' }}>
            Что произошло?
          </h3>
          <p className="body" style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
            Без успешной оплаты бронирование не может быть подтверждено. 
            Это может произойти по следующим причинам:
          </p>
          <ul style={{ 
            marginLeft: 'var(--spacing-lg)', 
            color: 'var(--text-secondary)',
            marginBottom: 'var(--spacing-md)'
          }}>
            <li>Недостаточно средств на карте</li>
            <li>Превышен лимит по карте</li>
            <li>Платеж был отменен</li>
            <li>Технические проблемы с платежной системой</li>
          </ul>
        </div>

        {/* What to do next */}
        <div className="flutter-card" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h3 className="body-bold" style={{ marginBottom: 'var(--spacing-md)' }}>
            Что делать дальше?
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-start' }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'var(--primary-light)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: 'var(--primary)'
              }}>
                1
              </div>
              <div>
                <p className="body-bold" style={{ marginBottom: 'var(--spacing-xxs)' }}>
                  Попробуйте забронировать снова
                </p>
                <p className="body-small" style={{ color: 'var(--text-secondary)' }}>
                  Проверьте баланс карты и повторите попытку бронирования
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-start' }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'var(--primary-light)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: 'var(--primary)'
              }}>
                2
              </div>
              <div>
                <p className="body-bold" style={{ marginBottom: 'var(--spacing-xxs)' }}>
                  Свяжитесь с администратором
                </p>
                <p className="body-small" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                  Позвоните в клуб для бронирования по телефону
                </p>
                {venue?.phone && (
                  <a 
                    href={`tel:${venue.phone}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-xs)',
                      padding: 'var(--spacing-sm) var(--spacing-md)',
                      backgroundColor: 'var(--primary-light)',
                      borderRadius: 'var(--radius-sm)',
                      textDecoration: 'none',
                      color: 'var(--primary)',
                      fontWeight: 600,
                      fontSize: 'var(--text-body)'
                    }}
                  >
                    📞 {formatPhone(venue.phone)}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <button
            className="flutter-button"
            onClick={() => navigate(`/club/${clubId}`)}
            style={{ width: '100%' }}
          >
            Попробовать снова
          </button>
          
          {venue?.phone && (
            <a
              href={`tel:${venue.phone}`}
              className="flutter-button-secondary"
              style={{ 
                width: '100%', 
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--spacing-xs)'
              }}
            >
              <span>📞</span>
              Позвонить в клуб
            </a>
          )}
        </div>
      </div>
    </div>
  )
}