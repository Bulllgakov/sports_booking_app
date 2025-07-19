import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { ru } from 'date-fns/locale'
import { format, addDays, startOfToday } from 'date-fns'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import '../../styles/flutter-theme.css'

interface Court {
  id: string
  name: string
  type: 'padel' | 'tennis' | 'badminton'
  venueId: string
}

interface Venue {
  id: string
  name: string
  workingHours?: {
    [key: string]: { open: string; close: string }
  }
}

export default function DateSelectionPage() {
  const { clubId, courtId } = useParams<{ clubId: string; courtId: string }>()
  const navigate = useNavigate()
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(startOfToday())
  const [court, setCourt] = useState<Court | null>(null)
  const [venue, setVenue] = useState<Venue | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadCourtAndVenue()
  }, [clubId, courtId])

  const loadCourtAndVenue = async () => {
    if (!clubId || !courtId) {
      setError('Некорректные параметры')
      setLoading(false)
      return
    }

    try {
      const courtDoc = await getDoc(doc(db, 'courts', courtId))
      if (!courtDoc.exists()) {
        setError('Корт не найден')
        setLoading(false)
        return
      }

      const courtData = {
        id: courtDoc.id,
        ...courtDoc.data()
      } as Court

      if (courtData.venueId !== clubId) {
        setError('Корт не принадлежит указанному клубу')
        setLoading(false)
        return
      }

      setCourt(courtData)

      const venueDoc = await getDoc(doc(db, 'venues', clubId))
      if (venueDoc.exists()) {
        setVenue({
          id: venueDoc.id,
          ...venueDoc.data()
        } as Venue)
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Ошибка при загрузке данных')
      setLoading(false)
    }
  }

  const handleDateSelect = () => {
    if (!selectedDate) return
    navigate(`/club/${clubId}/court/${courtId}/time?date=${format(selectedDate, 'yyyy-MM-dd')}`)
  }

  const shouldDisableDate = (date: Date) => {
    const today = startOfToday()
    if (date < today) return true
    
    const maxDate = addDays(today, 30)
    if (date > maxDate) return true
    
    if (venue?.workingHours) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayOfWeek = days[date.getDay()]
      const hours = venue.workingHours[dayOfWeek]
      
      if (!hours || (!hours.open && !hours.close)) {
        return true
      }
    }
    
    return false
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
          <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-md)' }}>❌</div>
          <h2 className="h2" style={{ marginBottom: 'var(--spacing-sm)' }}>Ошибка</h2>
          <p className="body" style={{ color: 'var(--text-secondary)' }}>{error}</p>
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
        boxShadow: 'var(--shadow-sm)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '8px',
            marginLeft: '-8px',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--extra-light-gray)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          ←
        </button>
      </div>

      <div style={{ padding: 'var(--spacing-xl)' }}>
        <h1 className="h2" style={{ marginBottom: 'var(--spacing-sm)' }}>
          Выберите дату
        </h1>
        
        {court && venue && (
          <p className="body-small" style={{ marginBottom: 'var(--spacing-xl)' }}>
            {venue.name} • {court.name}
          </p>
        )}

        {/* Calendar */}
        <div className="flutter-card" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
            <DateCalendar
              value={selectedDate}
              onChange={(newValue) => setSelectedDate(newValue)}
              shouldDisableDate={shouldDisableDate}
              disablePast
              sx={{
                width: '100%',
                '.MuiDayCalendar-weekContainer': {
                  justifyContent: 'space-around'
                },
                '.MuiPickersDay-root': {
                  fontSize: 'var(--text-body)',
                  '&:hover': {
                    backgroundColor: 'var(--primary-light)'
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'var(--primary)',
                    '&:hover': {
                      backgroundColor: 'var(--primary-dark)'
                    }
                  }
                },
                '.MuiPickersCalendarHeader-label': {
                  fontSize: 'var(--text-body)',
                  fontWeight: 600
                },
                '.MuiPickersArrowSwitcher-button': {
                  color: 'var(--primary)'
                }
              }}
            />
          </LocalizationProvider>
        </div>

        {/* Selected date info */}
        {selectedDate && (
          <div className="info-section" style={{ marginBottom: 'var(--spacing-xl)' }}>
            <p className="body-small" style={{ marginBottom: 'var(--spacing-xs)' }}>
              Выбранная дата:
            </p>
            <h3 className="h3">
              {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
            </h3>
          </div>
        )}

        {/* Info */}
        <div style={{ 
          backgroundColor: 'var(--info)', 
          color: 'white',
          padding: 'var(--spacing-md)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'calc(80px + var(--spacing-xl))'
        }}>
          <p className="caption" style={{ color: 'white' }}>
            ℹ️ Бронирование доступно на 30 дней вперед. Серым цветом отмечены дни, когда клуб не работает.
          </p>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="sticky-bottom-bar">
        <button
          className="flutter-button"
          style={{ width: '100%' }}
          onClick={handleDateSelect}
          disabled={!selectedDate}
        >
          Выбрать время →
        </button>
      </div>
    </div>
  )
}