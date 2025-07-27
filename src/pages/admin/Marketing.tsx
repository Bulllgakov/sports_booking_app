import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { VenueSelector, VenueSelectorEmpty } from '../../components/VenueSelector'
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  updateDoc,
  getDoc
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { 
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress
} from '@mui/material'
import { 
  Campaign,
  Notifications,
  Email,
  Sms,
  Delete,
  Add,
  QrCode,
  Share
} from '@mui/icons-material'

export default function Marketing() {
  const { admin } = useAuth()
  const { isSuperAdmin } = usePermission()
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [marketingSettings, setMarketingSettings] = useState({
    smsEnabled: false,
    emailEnabled: false,
    pushEnabled: false,
    promotions: [] as any[]
  })
  const [promotionDialog, setPromotionDialog] = useState(false)
  const [newPromotion, setNewPromotion] = useState({
    name: '',
    description: '',
    discount: 10,
    validUntil: '',
    active: true
  })

  useEffect(() => {
    if (isSuperAdmin) {
      const venueId = localStorage.getItem('selectedVenueId')
      if (venueId) {
        setSelectedVenueId(venueId)
        loadMarketingData(venueId)
      } else {
        setLoading(false)
      }
    } else if (admin?.venueId) {
      loadMarketingData(admin.venueId)
    }
  }, [admin, isSuperAdmin])

  const handleVenueChange = (venueId: string) => {
    setSelectedVenueId(venueId)
    localStorage.setItem('selectedVenueId', venueId)
    if (venueId) {
      loadMarketingData(venueId)
    }
  }

  const loadMarketingData = async (venueId?: string) => {
    const targetVenueId = venueId || admin?.venueId
    if (!targetVenueId) return

    try {
      setLoading(true)
      
      const venueDoc = await getDoc(doc(db, 'venues', targetVenueId))
      if (venueDoc.exists()) {
        const data = venueDoc.data()
        setMarketingSettings({
          smsEnabled: data.marketingSms || false,
          emailEnabled: data.marketingEmail || false,
          pushEnabled: data.marketingPush || false,
          promotions: data.promotions || []
        })
      }
    } catch (error) {
      console.error('Error loading marketing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleNotification = async (type: string) => {
    const venueId = isSuperAdmin ? selectedVenueId : admin?.venueId
    if (!venueId) return

    const newValue = !marketingSettings[type as keyof typeof marketingSettings]
    
    try {
      await updateDoc(doc(db, 'venues', venueId), {
        [`marketing${type.charAt(0).toUpperCase() + type.slice(1).replace('Enabled', '')}`]: newValue
      })
      
      setMarketingSettings(prev => ({
        ...prev,
        [type]: newValue
      }))
    } catch (error) {
      console.error('Error updating notification settings:', error)
    }
  }

  const handleCreatePromotion = async () => {
    const venueId = isSuperAdmin ? selectedVenueId : admin?.venueId
    if (!venueId) return

    const promotion = {
      ...newPromotion,
      id: Date.now().toString(),
      createdAt: new Date()
    }

    try {
      const updatedPromotions = [...marketingSettings.promotions, promotion]
      
      await updateDoc(doc(db, 'venues', venueId), {
        promotions: updatedPromotions
      })
      
      setMarketingSettings(prev => ({
        ...prev,
        promotions: updatedPromotions
      }))
      
      setPromotionDialog(false)
      setNewPromotion({
        name: '',
        description: '',
        discount: 10,
        validUntil: '',
        active: true
      })
    } catch (error) {
      console.error('Error creating promotion:', error)
    }
  }

  const handleDeletePromotion = async (promotionId: string) => {
    const venueId = isSuperAdmin ? selectedVenueId : admin?.venueId
    if (!venueId) return

    try {
      const updatedPromotions = marketingSettings.promotions.filter(p => p.id !== promotionId)
      
      await updateDoc(doc(db, 'venues', venueId), {
        promotions: updatedPromotions
      })
      
      setMarketingSettings(prev => ({
        ...prev,
        promotions: updatedPromotions
      }))
    } catch (error) {
      console.error('Error deleting promotion:', error)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (isSuperAdmin && !selectedVenueId) {
    return <VenueSelectorEmpty title="Выберите клуб для управления маркетингом" />
  }

  return (
    <Box>
      {/* Селектор клуба для суперадмина */}
      {isSuperAdmin && (
        <VenueSelector
          selectedVenueId={selectedVenueId}
          onVenueChange={handleVenueChange}
        />
      )}
      
      <Typography variant="h5" component="h2" gutterBottom>
        Маркетинг и продвижение
      </Typography>

      <Grid container spacing={3}>
        {/* Notification Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h3" gutterBottom>
                Каналы коммуникации
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemText
                    primary="SMS-рассылки"
                    secondary="Отправка СМС клиентам о акциях и напоминаниях"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={marketingSettings.smsEnabled}
                      onChange={() => handleToggleNotification('smsEnabled')}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Email-рассылки"
                    secondary="Отправка писем с новостями и предложениями"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={marketingSettings.emailEnabled}
                      onChange={() => handleToggleNotification('emailEnabled')}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Push-уведомления"
                    secondary="Мгновенные уведомления в мобильном приложении"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={marketingSettings.pushEnabled}
                      onChange={() => handleToggleNotification('pushEnabled')}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h3" gutterBottom>
                Быстрые действия
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<QrCode />}
                    sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                  >
                    Генерировать QR-код клуба
                  </Button>
                </Grid>
                
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Share />}
                    sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                  >
                    Поделиться ссылкой на клуб
                  </Button>
                </Grid>
                
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Campaign />}
                    sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                  >
                    Создать рассылку
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Promotions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" component="h3">
                  Активные акции
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setPromotionDialog(true)}
                >
                  Создать акцию
                </Button>
              </Box>
              
              {marketingSettings.promotions.length === 0 ? (
                <Alert severity="info">
                  У вас пока нет активных акций. Создайте первую акцию для привлечения клиентов.
                </Alert>
              ) : (
                <List>
                  {marketingSettings.promotions.map((promotion) => (
                    <ListItem key={promotion.id}>
                      <ListItemText
                        primary={promotion.name}
                        secondary={
                          <Box>
                            <Typography variant="body2">{promotion.description}</Typography>
                            <Box mt={1}>
                              <Chip
                                size="small"
                                label={`-${promotion.discount}%`}
                                color="primary"
                                sx={{ mr: 1 }}
                              />
                              {promotion.validUntil && (
                                <Chip
                                  size="small"
                                  label={`До ${new Date(promotion.validUntil).toLocaleDateString('ru-RU')}`}
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton onClick={() => handleDeletePromotion(promotion.id)}>
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create Promotion Dialog */}
      <Dialog open={promotionDialog} onClose={() => setPromotionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Создать акцию</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Название акции"
            fullWidth
            variant="outlined"
            value={newPromotion.name}
            onChange={(e) => setNewPromotion(prev => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Описание"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newPromotion.description}
            onChange={(e) => setNewPromotion(prev => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Размер скидки (%)"
            type="number"
            fullWidth
            variant="outlined"
            value={newPromotion.discount}
            onChange={(e) => setNewPromotion(prev => ({ ...prev, discount: parseInt(e.target.value) || 0 }))}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Действует до"
            type="date"
            fullWidth
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            value={newPromotion.validUntil}
            onChange={(e) => setNewPromotion(prev => ({ ...prev, validUntil: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromotionDialog(false)}>Отмена</Button>
          <Button onClick={handleCreatePromotion} variant="contained">Создать</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}