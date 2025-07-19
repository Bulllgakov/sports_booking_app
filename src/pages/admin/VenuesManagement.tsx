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
  CircularProgress,
  Tooltip,
  Divider
} from '@mui/material'
import { Edit, Delete, LocationOn, Phone, Email, Add, CardMembership, Warning, ContentCopy, Link, Check, QrCode2 } from '@mui/icons-material'
import { collection, getDocs, updateDoc, deleteDoc, doc, query, where, addDoc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useNavigate } from 'react-router-dom'
import { usePermission } from '../../hooks/usePermission'
import { PermissionGate } from '../../components/PermissionGate'
import { SUBSCRIPTION_PLANS, SubscriptionPlan, ClubSubscription } from '../../types/subscription'
import { Select, MenuItem, FormControl, InputLabel, List, ListItem, ListItemText } from '@mui/material'
import { QRCodeSVG } from 'qrcode.react'

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
  subscription?: ClubSubscription
}

export default function VenuesManagement() {
  const navigate = useNavigate()
  const { isSuperAdmin } = usePermission()
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('start')
  const [error, setError] = useState('')
  const [copiedVenueId, setCopiedVenueId] = useState<string | null>(null)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrVenue, setQrVenue] = useState<Venue | null>(null)

  useEffect(() => {
    loadVenues()
  }, [])

  const loadVenues = async () => {
    try {
      const venuesSnapshot = await getDocs(collection(db, 'venues'))
      const venuesData = await Promise.all(
        venuesSnapshot.docs.map(async (venueDoc) => {
          const data = venueDoc.data()
          
          // Преобразуем GeoPoint в обычный объект для отображения
          if (data.location && data.location._lat !== undefined) {
            data.location = {
              latitude: data.location._lat,
              longitude: data.location._long
            }
          }
          
          // Загружаем подписку для каждого клуба
          const subscriptionQuery = query(
            collection(db, 'subscriptions'),
            where('venueId', '==', venueDoc.id),
            where('status', 'in', ['active', 'trial'])
          )
          const subscriptionSnapshot = await getDocs(subscriptionQuery)
          
          let subscription = null
          if (!subscriptionSnapshot.empty) {
            const subData = subscriptionSnapshot.docs[0].data()
            subscription = {
              id: subscriptionSnapshot.docs[0].id,
              ...subData,
              startDate: subData.startDate?.toDate(),
              endDate: subData.endDate?.toDate(),
              trialEndDate: subData.trialEndDate?.toDate(),
              nextBillingDate: subData.nextBillingDate?.toDate(),
              usage: {
                ...subData.usage,
                lastUpdated: subData.usage?.lastUpdated?.toDate()
              }
            }
          }
          
          return {
            id: venueDoc.id,
            ...data,
            subscription
          }
        })
      )
      
      setVenues(venuesData as Venue[])
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

  const getBookingUrl = (venueId: string) => {
    return `https://allcourt.ru/club/${venueId}`
  }

  const handleCopyLink = (venueId: string) => {
    const url = getBookingUrl(venueId)
    navigator.clipboard.writeText(url)
    setCopiedVenueId(venueId)
    setTimeout(() => setCopiedVenueId(null), 2000)
  }

  const handleShowQR = (venue: Venue) => {
    setQrVenue(venue)
    setQrDialogOpen(true)
  }

  const handleOpenSubscriptionDialog = (venue: Venue) => {
    setSelectedVenue(venue)
    setSelectedPlan(venue.subscription?.plan || 'start')
    setSubscriptionDialogOpen(true)
  }

  const handleUpdateSubscription = async () => {
    if (!selectedVenue) return

    try {
      const subscriptionData = {
        venueId: selectedVenue.id,
        plan: selectedPlan,
        status: 'active',
        startDate: new Date(),
        endDate: null, // Будет установлено в зависимости от типа подписки
        updatedAt: new Date(),
        updatedBy: 'superadmin',
        usage: selectedVenue.subscription?.usage || {
          courtsCount: 0,
          bookingsThisMonth: 0,
          smsEmailsSent: 0,
          lastUpdated: new Date()
        }
      }

      if (selectedVenue.subscription?.id) {
        // Обновляем существующую подписку
        await updateDoc(doc(db, 'subscriptions', selectedVenue.subscription.id), {
          plan: selectedPlan,
          updatedAt: new Date(),
          updatedBy: 'superadmin'
        })
      } else {
        // Создаем новую подписку
        await addDoc(collection(db, 'subscriptions'), subscriptionData)
      }

      setSubscriptionDialogOpen(false)
      loadVenues()
    } catch (error) {
      console.error('Error updating subscription:', error)
      setError('Ошибка при обновлении подписки')
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
            onClick={() => {
              // Очищаем выбранный клуб и переходим к управлению
              localStorage.removeItem('selectedVenueId')
              navigate('/admin/club')
            }}
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

                    {/* Информация о подписке */}
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <CardMembership fontSize="small" color="primary" />
                        <Typography variant="subtitle2" color="primary">
                          Тариф: {venue.subscription ? SUBSCRIPTION_PLANS[venue.subscription.plan].name : 'Не определен'}
                        </Typography>
                      </Box>
                      {venue.subscription && (
                        <Typography variant="caption" color="text.secondary">
                          {SUBSCRIPTION_PLANS[venue.subscription.plan].price === 0 
                            ? 'Бесплатный' 
                            : `${SUBSCRIPTION_PLANS[venue.subscription.plan].price.toLocaleString('ru-RU')} ₽/мес`}
                        </Typography>
                      )}
                      {!venue.subscription && (
                        <Typography variant="caption" color="warning.main">
                          <Warning fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                          Требуется настройка подписки
                        </Typography>
                      )}
                    </Box>

                    {/* Ссылка для бронирования */}
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Link fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          Ссылка для клиентов:
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            flex: 1, 
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                            p: 0.5,
                            bgcolor: 'white',
                            borderRadius: 0.5
                          }}
                        >
                          {getBookingUrl(venue.id)}
                        </Typography>
                        <Tooltip title={copiedVenueId === venue.id ? "Скопировано!" : "Копировать ссылку"}>
                          <IconButton 
                            size="small" 
                            onClick={() => handleCopyLink(venue.id)}
                            color={copiedVenueId === venue.id ? "success" : "default"}
                          >
                            {copiedVenueId === venue.id ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Показать QR код">
                          <IconButton 
                            size="small" 
                            onClick={() => handleShowQR(venue)}
                          >
                            <QrCode2 fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </CardContent>

                  <CardActions sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                    <Button
                      size="small"
                      onClick={() => handleSelectVenue(venue)}
                      startIcon={<Edit fontSize="small" />}
                    >
                      Редактировать
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleOpenSubscriptionDialog(venue)}
                      startIcon={<CardMembership fontSize="small" />}
                      color="secondary"
                    >
                      Тариф
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

      {/* QR код диалог */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} maxWidth="sm">
        <DialogTitle>
          QR код для {qrVenue?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', p: 2 }}>
            <QRCodeSVG 
              value={qrVenue ? getBookingUrl(qrVenue.id) : ''} 
              size={256}
              level="H"
              includeMargin={true}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Клиенты могут отсканировать этот QR код для бронирования
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
              {qrVenue && getBookingUrl(qrVenue.id)}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>
            Закрыть
          </Button>
          <Button 
            variant="contained"
            onClick={() => {
              if (qrVenue) {
                handleCopyLink(qrVenue.id)
              }
            }}
          >
            Копировать ссылку
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог изменения тарифа */}
      <Dialog open={subscriptionDialogOpen} onClose={() => setSubscriptionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Изменение тарифа для {selectedVenue?.name}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Тарифный план</InputLabel>
              <Select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value as SubscriptionPlan)}
                label="Тарифный план"
              >
                {Object.entries(SUBSCRIPTION_PLANS)
                  .filter(([key]) => key !== 'premium') // Премиум только по запросу
                  .map(([key, plan]) => (
                    <MenuItem key={key} value={key}>
                      <Box>
                        <Typography variant="body1">
                          {plan.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {plan.price === 0 ? 'Бесплатно' : `${plan.price.toLocaleString('ru-RU')} ₽/месяц`}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {selectedPlan && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Возможности тарифа {SUBSCRIPTION_PLANS[selectedPlan].name}:
                </Typography>
                <List dense>
                  {SUBSCRIPTION_PLANS[selectedPlan].features.slice(0, 5).map((feature, index) => (
                    <ListItem key={index} disablePadding>
                      <ListItemText 
                        primary={feature} 
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            <Alert severity="info" sx={{ mt: 2 }}>
              Изменение тарифа вступит в силу немедленно. Клуб будет уведомлен об изменении.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubscriptionDialogOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleUpdateSubscription} variant="contained">
            Применить
          </Button>
        </DialogActions>
      </Dialog>
    </PermissionGate>
  )
}