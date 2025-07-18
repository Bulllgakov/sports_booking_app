import React, { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Typography,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress
} from '@mui/material'
import { Edit, Delete, LocationOn, Phone, Email, Add } from '@mui/icons-material'
import { collection, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useNavigate } from 'react-router-dom'
import { usePermission } from '../../hooks/usePermission'
import { PermissionGate } from '../../components/PermissionGate'

interface Venue {
  id: string
  name: string
  address: string
  phone: string
  email: string
  description?: string
  logoUrl?: string
  amenities?: string[]
  organizationType?: string
  inn?: string
  bankAccount?: string
  status: 'active' | 'inactive'
  createdAt: Date
  location?: {
    latitude: number
    longitude: number
  }
  city?: string
}

export default function VenuesManagement() {
  const navigate = useNavigate()
  const { isSuperAdmin } = usePermission()
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadVenues()
  }, [])

  const loadVenues = async () => {
    try {
      const venuesSnapshot = await getDocs(collection(db, 'venues'))
      const venuesData = venuesSnapshot.docs.map(doc => {
        const data = doc.data()
        // Преобразуем GeoPoint в обычный объект для отображения
        if (data.location && data.location._lat !== undefined) {
          data.location = {
            latitude: data.location._lat,
            longitude: data.location._long
          }
        }
        return {
          id: doc.id,
          ...data
        }
      }) as Venue[]
      
      setVenues(venuesData)
      setLoading(false)
    } catch (error) {
      console.error('Error loading venues:', error)
      setLoading(false)
    }
  }

  const handleSelectVenue = (venue: Venue) => {
    // Сохраняем выбранный клуб в localStorage
    localStorage.setItem('selectedVenueId', venue.id)
    // Перенаправляем на управление клубом
    navigate('/admin/club')
  }

  const handleStatusToggle = async (venue: Venue) => {
    try {
      const newStatus = venue.status === 'active' ? 'inactive' : 'active'
      await updateDoc(doc(db, 'venues', venue.id), {
        status: newStatus,
        updatedAt: new Date()
      })
      loadVenues()
    } catch (error) {
      console.error('Error updating venue status:', error)
    }
  }

  const handleDelete = async (venueId: string) => {
    if (confirm('Вы уверены, что хотите удалить этот клуб? Это действие необратимо.')) {
      try {
        await deleteDoc(doc(db, 'venues', venueId))
        loadVenues()
      } catch (error) {
        console.error('Error deleting venue:', error)
      }
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <PermissionGate role="superadmin">
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h2">
            Управление клубами
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/admin/club/new')}
          >
            Добавить клуб
          </Button>
        </Box>

        {venues.length === 0 ? (
          <Alert severity="info">
            Клубы не найдены. Создайте первый клуб для начала работы.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {venues.map((venue) => (
              <Grid item xs={12} md={6} lg={4} key={venue.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Typography variant="h6" component="h3">
                        {venue.name}
                      </Typography>
                      <Chip
                        label={venue.status === 'active' ? 'Активен' : 'Неактивен'}
                        color={venue.status === 'active' ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>

                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <LocationOn fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {venue.address}
                      </Typography>
                    </Box>

                    {venue.city && (
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 3 }}>
                          {venue.city}
                        </Typography>
                      </Box>
                    )}

                    {venue.location ? (
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 3, fontSize: '0.75rem' }}>
                          📍 {venue.location.latitude?.toFixed(6)}, {venue.location.longitude?.toFixed(6)}
                        </Typography>
                      </Box>
                    ) : (
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="body2" color="warning.main" sx={{ ml: 3, fontSize: '0.75rem', fontStyle: 'italic' }}>
                          ⚠️ Координаты не указаны
                        </Typography>
                      </Box>
                    )}

                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Phone fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {venue.phone}
                      </Typography>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1}>
                      <Email fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {venue.email}
                      </Typography>
                    </Box>

                    {venue.description && (
                      <Typography variant="body2" color="text.secondary" mt={2}>
                        {venue.description}
                      </Typography>
                    )}
                  </CardContent>

                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => handleSelectVenue(venue)}
                      startIcon={<Edit fontSize="small" />}
                    >
                      Редактировать
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleStatusToggle(venue)}
                    >
                      {venue.status === 'active' ? 'Деактивировать' : 'Активировать'}
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(venue.id)}
                    >
                      <Delete />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </PermissionGate>
  )
}