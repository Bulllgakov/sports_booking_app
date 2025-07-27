import React, { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../services/firebase'

interface Venue {
  id: string
  name: string
}

interface VenueSelectorProps {
  selectedVenueId: string | null
  onVenueChange: (venueId: string) => void
  label?: string
  showHint?: boolean
}

export const VenueSelector: React.FC<VenueSelectorProps> = ({
  selectedVenueId,
  onVenueChange,
  label = 'Управление клубом',
  showHint = false
}) => {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVenues()
  }, [])

  const fetchVenues = async () => {
    try {
      const venuesQuery = query(
        collection(db, 'venues'),
        where('status', '==', 'active')
      )
      const snapshot = await getDocs(venuesQuery)
      const venuesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Venue[]
      setVenues(venuesData)
    } catch (error) {
      console.error('Error fetching venues:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Загрузка клубов...</div>
  }

  return (
    <div className="section-card" style={{ marginBottom: '24px' }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">{label}</label>
        <select 
          className="form-select"
          value={selectedVenueId || ''}
          onChange={(e) => onVenueChange(e.target.value)}
          style={{ maxWidth: '400px' }}
        >
          <option value="">Выберите клуб</option>
          {venues.map(venue => (
            <option key={venue.id} value={venue.id}>{venue.name}</option>
          ))}
        </select>
        {showHint && (
          <p className="form-hint">Выберите клуб для управления</p>
        )}
      </div>
    </div>
  )
}

// Компонент для отображения пустого состояния, когда клуб не выбран
export const VenueSelectorEmpty: React.FC<{ title: string }> = ({ title }) => {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVenues()
  }, [])

  const fetchVenues = async () => {
    try {
      const venuesQuery = query(
        collection(db, 'venues'),
        where('status', '==', 'active')
      )
      const snapshot = await getDocs(venuesQuery)
      const venuesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Venue[]
      setVenues(venuesData)
    } catch (error) {
      console.error('Error fetching venues:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVenueChange = (venueId: string) => {
    if (venueId) {
      localStorage.setItem('selectedVenueId', venueId)
      window.location.reload() // Перезагружаем страницу для обновления данных
    }
  }

  if (loading) {
    return <div>Загрузка...</div>
  }

  return (
    <div>
      <div className="section-card">
        <div className="section-header">
          <h2 className="section-title">{title}</h2>
        </div>
        <div className="form-group" style={{ maxWidth: '400px' }}>
          <label className="form-label">Клуб</label>
          <select 
            className="form-select"
            value=""
            onChange={(e) => handleVenueChange(e.target.value)}
          >
            <option value="">Выберите клуб для управления</option>
            {venues.map(venue => (
              <option key={venue.id} value={venue.id}>{venue.name}</option>
            ))}
          </select>
          <p className="form-hint">Выберите клуб для просмотра и управления</p>
        </div>
      </div>
    </div>
  )
}