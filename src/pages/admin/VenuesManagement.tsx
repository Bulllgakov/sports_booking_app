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
import { Edit, Delete, LocationOn, Phone, Email, Add, CardMembership, Warning, ContentCopy, Link, Check, QrCode2, CheckCircle } from '@mui/icons-material'
import { collection, getDocs, updateDoc, deleteDoc, doc, query, where, addDoc } from 'firebase/firestore'
import { db, auth } from '../../services/firebase'
import { useNavigate } from 'react-router-dom'
import { usePermission } from '../../hooks/usePermission'
import { PermissionGate } from '../../components/PermissionGate'
import { useAuth } from '../../contexts/AuthContext'
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
  const { admin } = useAuth()
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  // Удалены состояния для диалога изменения тарифа - теперь это делается в разделе Подписка
  // const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false)
  // const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('start')
  const [error, setError] = useState('')
  const [copiedVenueId, setCopiedVenueId] = useState<string | null>(null)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrVenue, setQrVenue] = useState<Venue | null>(null)
  const [addClubDialogOpen, setAddClubDialogOpen] = useState(false)
  const [newClub, setNewClub] = useState({
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    description: '',
    organizationType: 'ИП',
    inn: '',
    bankAccount: ''
  })

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
    try {
      // Проверяем наличие администраторов и менеджеров для этого клуба
      const adminsQuery = query(collection(db, 'admins'), where('venueId', '==', venueId))
      const adminsSnapshot = await getDocs(adminsQuery)
      
      if (!adminsSnapshot.empty) {
        const adminCount = adminsSnapshot.size
        const adminsList = adminsSnapshot.docs.map(doc => {
          const data = doc.data()
          return `- ${data.name} (${data.email}) - ${data.role === 'admin' ? 'Администратор' : 'Менеджер'}`
        }).join('\n')
        
        alert(`Невозможно удалить клуб!\n\nВ клубе есть ${adminCount} сотрудник(ов):\n${adminsList}\n\nСначала удалите всех сотрудников клуба в разделе "Администраторы".`)
        return
      }
      
      // Если сотрудников нет, запрашиваем подтверждение
      const venue = venues.find(v => v.id === venueId)
      if (!venue) return
      
      const confirmMessage = `Вы уверены, что хотите удалить клуб "${venue.name}"?\n\nЭто действие необратимо и удалит:\n- Все данные клуба\n- Все корты\n- Все бронирования\n- Всю историю`
      
      if (confirm(confirmMessage)) {
        // Удаляем клуб
        await deleteDoc(doc(db, 'venues', venueId))
        
        // TODO: В будущем добавить удаление связанных данных (кортов, бронирований и т.д.)
        
        await loadVenues()
        alert(`Клуб "${venue.name}" успешно удален`)
      }
    } catch (error) {
      console.error('Error deleting venue:', error)
      alert('Ошибка при удалении клуба')
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

  // Функции изменения тарифа удалены - теперь это делается в разделе Подписка
  // Для изменения тарифа используйте раздел "Подписка" в админ-панели

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
        <Alert severity="info" sx={{ mb: 3 }}>
          Данный раздел доступен только суперадминистраторам системы
        </Alert>
        
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h2">
            Управление клубами
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddClubDialogOpen(true)}
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

                    {/* Статус модерации */}
                    {venue.status === 'pending' && (
                      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'warning.light', borderRadius: 1 }}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Warning fontSize="small" color="warning" />
                          <Typography variant="subtitle2" color="warning.dark">
                            Ожидает модерации
                          </Typography>
                        </Box>
                        <Button
                          variant="contained"
                          size="small"
                          color="success"
                          onClick={async () => {
                            try {
                              await updateDoc(doc(db, 'venues', venue.id), {
                                status: 'active',
                                moderatedAt: new Date(),
                                moderatedBy: auth.currentUser?.uid || 'superadmin'
                              })
                              loadVenues()
                            } catch (error) {
                              console.error('Error activating venue:', error)
                            }
                          }}
                        >
                          Активировать клуб
                        </Button>
                      </Box>
                    )}

                    {/* Статус активного клуба - только для суперадмина */}
                    {venue.status === 'active' && isSuperAdmin && (
                      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'success.light', borderRadius: 1 }}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <CheckCircle fontSize="small" color="success" />
                          <Typography variant="subtitle2" color="success.dark">
                            Активный клуб
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          size="small"
                          color="warning"
                          onClick={async () => {
                            if (window.confirm('Вы уверены, что хотите отправить клуб на модерацию? Это заблокирует возможность бронирования.')) {
                              try {
                                await updateDoc(doc(db, 'venues', venue.id), {
                                  status: 'pending',
                                  moderatedAt: null,
                                  moderatedBy: null
                                })
                                loadVenues()
                              } catch (error) {
                                console.error('Error deactivating venue:', error)
                              }
                            }
                          }}
                        >
                          Отправить на модерацию
                        </Button>
                      </Box>
                    )}

                    {/* Информация о подписке */}
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <CardMembership fontSize="small" color="primary" />
                        <Typography variant="subtitle2" color="primary">
                          Тариф: {venue.subscription && SUBSCRIPTION_PLANS[venue.subscription.plan] ? SUBSCRIPTION_PLANS[venue.subscription.plan].name : 'Не определен'}
                        </Typography>
                      </Box>
                      {venue.subscription && SUBSCRIPTION_PLANS[venue.subscription.plan] && (
                        <Typography variant="caption" color="text.secondary">
                          {SUBSCRIPTION_PLANS[venue.subscription.plan].price === 0 
                            ? 'Бесплатный' 
                            : SUBSCRIPTION_PLANS[venue.subscription.plan].pricePerCourt 
                              ? `${SUBSCRIPTION_PLANS[venue.subscription.plan].pricePerCourt!.toLocaleString('ru-RU')} ₽/корт в месяц`
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

      {/* Диалог изменения тарифа удален - используйте раздел "Подписка" для управления тарифами */}

      {/* Диалог добавления клуба */}
      <Dialog open={addClubDialogOpen} onClose={() => setAddClubDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Добавить новый клуб
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Название клуба"
              value={newClub.name}
              onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
              fullWidth
              required
            />
            
            <TextField
              label="Адрес"
              value={newClub.address}
              onChange={(e) => setNewClub({ ...newClub, address: e.target.value })}
              fullWidth
              required
            />
            
            <TextField
              label="Город"
              value={newClub.city}
              onChange={(e) => setNewClub({ ...newClub, city: e.target.value })}
              fullWidth
              required
            />
            
            <TextField
              label="Телефон"
              value={newClub.phone}
              onChange={(e) => setNewClub({ ...newClub, phone: e.target.value })}
              fullWidth
              required
              placeholder="+7 (900) 123-45-67"
            />
            
            <TextField
              label="Email"
              value={newClub.email}
              onChange={(e) => setNewClub({ ...newClub, email: e.target.value })}
              fullWidth
              required
              type="email"
            />
            
            <TextField
              label="Описание"
              value={newClub.description}
              onChange={(e) => setNewClub({ ...newClub, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            
            <FormControl fullWidth>
              <InputLabel>Форма организации</InputLabel>
              <Select
                value={newClub.organizationType}
                onChange={(e) => setNewClub({ ...newClub, organizationType: e.target.value })}
                label="Форма организации"
              >
                <MenuItem value="ИП">ИП</MenuItem>
                <MenuItem value="ООО">ООО</MenuItem>
                <MenuItem value="Самозанятый">Самозанятый</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="ИНН"
              value={newClub.inn}
              onChange={(e) => setNewClub({ ...newClub, inn: e.target.value })}
              fullWidth
            />
            
            <TextField
              label="Расчетный счет"
              value={newClub.bankAccount}
              onChange={(e) => setNewClub({ ...newClub, bankAccount: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAddClubDialogOpen(false)
            setError('')
            setNewClub({
              name: '',
              address: '',
              city: '',
              phone: '',
              email: '',
              description: '',
              organizationType: 'ИП',
              inn: '',
              bankAccount: ''
            })
          }}>
            Отмена
          </Button>
          <Button 
            onClick={async () => {
              try {
                // Валидация обязательных полей
                if (!newClub.name || !newClub.address || !newClub.city || !newClub.phone || !newClub.email) {
                  setError('Заполните все обязательные поля')
                  return
                }
                
                // Проверяем, не существует ли уже клуб с таким email
                const venuesQuery = query(collection(db, 'venues'), where('email', '==', newClub.email))
                const venuesSnapshot = await getDocs(venuesQuery)
                if (!venuesSnapshot.empty) {
                  setError('Клуб с таким email уже существует')
                  return
                }
                
                // Создаем новый клуб
                const venueData = {
                  name: newClub.name,
                  address: newClub.address,
                  city: newClub.city,
                  phone: newClub.phone,
                  email: newClub.email,
                  description: newClub.description || '',
                  organizationType: newClub.organizationType,
                  inn: newClub.inn || '',
                  bankAccount: newClub.bankAccount || '',
                  status: 'pending', // Все новые клубы требуют модерации
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  logoUrl: '',
                  amenities: [],
                  location: null,
                  moderatedAt: null,
                  moderatedBy: null,
                  courts: [],
                  workingHours: {
                    weekday: { start: '07:00', end: '23:00' },
                    weekend: { start: '08:00', end: '22:00' }
                  }
                }
                
                if (!auth.currentUser) {
                  setError('Необходимо авторизоваться')
                  return
                }
                
                if (!isSuperAdmin) {
                  setError('Только суперадминистратор может создавать клубы')
                  return
                }
                
                console.log('Creating venue with data:', venueData)
                console.log('Firebase auth current user:', auth.currentUser)
                
                const docRef = await addDoc(collection(db, 'venues'), venueData)
                console.log('Venue created with ID:', docRef.id)
                
                // Создаем бесплатную подписку для нового клуба
                await addDoc(collection(db, 'subscriptions'), {
                  venueId: docRef.id,
                  plan: 'start',
                  status: 'active',
                  startDate: new Date(),
                  endDate: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  usage: {
                    courtsCount: 0,
                    bookingsThisMonth: 0,
                    smsEmailsSent: 0,
                    lastUpdated: new Date()
                  }
                })
                
                // Создаем администратора для клуба
                await addDoc(collection(db, 'admins'), {
                  name: 'Администратор',
                  email: newClub.email,
                  password: '123456', // Временный пароль
                  role: 'admin',
                  venueId: docRef.id,
                  permissions: ['manage_bookings', 'manage_courts', 'manage_clients', 'manage_settings'],
                  createdAt: new Date(),
                  updatedAt: new Date()
                })
                
                setAddClubDialogOpen(false)
                setError('')
                setNewClub({
                  name: '',
                  address: '',
                  city: '',
                  phone: '',
                  email: '',
                  description: '',
                  organizationType: 'ИП',
                  inn: '',
                  bankAccount: ''
                })
                loadVenues()
                
                // Показываем сообщение об успешном создании
                alert(`Клуб "${newClub.name}" успешно создан! Администратор: ${newClub.email}, пароль: 123456`)
              } catch (error: any) {
                console.error('Error creating venue:', error)
                console.error('Error details:', {
                  code: error?.code,
                  message: error?.message,
                  stack: error?.stack
                })
                setError('Ошибка при создании клуба: ' + (error?.message || 'Неизвестная ошибка'))
              }
            }}
            variant="contained"
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    </PermissionGate>
  )
}