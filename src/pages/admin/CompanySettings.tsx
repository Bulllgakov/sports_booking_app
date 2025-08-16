import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material'
import { Save, Business, AccountBalance, ContactMail } from '@mui/icons-material'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { usePermission } from '../../hooks/usePermission'

interface CompanyDetails {
  // Основные реквизиты
  companyType: string
  fullName: string
  shortName: string
  inn: string
  kpp?: string
  ogrn: string
  
  // Юридический адрес
  legalAddress: {
    postcode: string
    region: string
    city: string
    street: string
    building: string
    office?: string
  }
  
  // Банковские реквизиты
  bank: {
    name: string
    bik: string
    correspondentAccount: string
    checkingAccount: string
    bankAddress: string
  }
  
  // Контактная информация
  contacts: {
    phone: string
    email: string
    website: string
    supportEmail: string
  }
  
  // Руководитель
  director: {
    fullName: string
    position: string
    basedOn: string // на основании чего действует
  }
}

const defaultCompanyDetails: CompanyDetails = {
  companyType: 'ИП',
  fullName: 'ИП ТЕН КРИСТИНА ВАДИМОВНА',
  shortName: 'ИП Тен К.В.',
  inn: '026401027275',
  ogrn: '313028000082460',
  legalAddress: {
    postcode: '420000',
    region: 'Республика Татарстан',
    city: 'г. Казань',
    street: 'ул. Павлюхина',
    building: 'д. 114, кв. 39',
  },
  bank: {
    name: 'АО "ТБанк"',
    bik: '044525974',
    correspondentAccount: '30101810145250000974',
    checkingAccount: '40802810800000000779',
    bankAddress: 'Москва, 123060, 1-й Волоколамский проезд, д. 10, стр. 1'
  },
  contacts: {
    phone: '+7 (999) 123-45-67',
    email: 'info@allcourt.ru',
    website: 'https://allcourt.ru',
    supportEmail: 'admin@allcourt.ru'
  },
  director: {
    fullName: 'Тен Кристина Вадимовна',
    position: 'Индивидуальный предприниматель',
    basedOn: 'Свидетельства о государственной регистрации'
  }
}

export default function CompanySettings() {
  const { isSuperAdmin } = usePermission()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>(defaultCompanyDetails)
  const [editMode, setEditMode] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadCompanyDetails()
  }, [])

  const loadCompanyDetails = async () => {
    try {
      const docRef = doc(db, 'settings', 'company')
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        setCompanyDetails(docSnap.data() as CompanyDetails)
      }
    } catch (error) {
      console.error('Error loading company details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const docRef = doc(db, 'settings', 'company')
      await setDoc(docRef, {
        ...companyDetails,
        updatedAt: new Date()
      })
      
      setEditMode(false)
      setMessage({ type: 'success', text: 'Реквизиты компании сохранены' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error saving company details:', error)
      setMessage({ type: 'error', text: 'Ошибка при сохранении реквизитов' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditMode(false)
    loadCompanyDetails()
  }

  if (!isSuperAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          У вас нет доступа к настройкам компании
        </Alert>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Реквизиты компании-владельца платформы
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Эти реквизиты используются в публичной оферте, договорах и официальных документах платформы
      </Alert>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {/* Основные реквизиты */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Business color="primary" />
              <Typography variant="h6">Основные реквизиты</Typography>
            </Box>
            {!editMode ? (
              <Button variant="outlined" onClick={() => setEditMode(true)}>
                Редактировать
              </Button>
            ) : (
              <Box>
                <Button onClick={handleCancel} sx={{ mr: 1 }}>
                  Отмена
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </Box>
            )}
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Форма собственности"
                value={companyDetails.companyType}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  companyType: e.target.value
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Краткое наименование"
                value={companyDetails.shortName}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  shortName: e.target.value
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Полное наименование"
                value={companyDetails.fullName}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  fullName: e.target.value
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="ИНН"
                value={companyDetails.inn}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  inn: e.target.value
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="КПП"
                value={companyDetails.kpp || '—'}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  kpp: e.target.value
                })}
                fullWidth
                disabled={!editMode}
                helperText="Для ИП не требуется"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="ОГРН/ОГРНИП"
                value={companyDetails.ogrn}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  ogrn: e.target.value
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Юридический адрес */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Юридический адрес
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={2}>
              <TextField
                label="Индекс"
                value={companyDetails.legalAddress.postcode}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  legalAddress: {
                    ...companyDetails.legalAddress,
                    postcode: e.target.value
                  }
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Регион"
                value={companyDetails.legalAddress.region}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  legalAddress: {
                    ...companyDetails.legalAddress,
                    region: e.target.value
                  }
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Город"
                value={companyDetails.legalAddress.city}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  legalAddress: {
                    ...companyDetails.legalAddress,
                    city: e.target.value
                  }
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Улица"
                value={companyDetails.legalAddress.street}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  legalAddress: {
                    ...companyDetails.legalAddress,
                    street: e.target.value
                  }
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Дом, корпус, квартира"
                value={companyDetails.legalAddress.building}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  legalAddress: {
                    ...companyDetails.legalAddress,
                    building: e.target.value
                  }
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Офис/помещение"
                value={companyDetails.legalAddress.office || ''}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  legalAddress: {
                    ...companyDetails.legalAddress,
                    office: e.target.value
                  }
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Банковские реквизиты */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <AccountBalance color="primary" />
            <Typography variant="h6">Банковские реквизиты</Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Наименование банка"
                value={companyDetails.bank.name}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  bank: {
                    ...companyDetails.bank,
                    name: e.target.value
                  }
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="БИК"
                value={companyDetails.bank.bik}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  bank: {
                    ...companyDetails.bank,
                    bik: e.target.value
                  }
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Расчетный счет"
                value={companyDetails.bank.checkingAccount}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  bank: {
                    ...companyDetails.bank,
                    checkingAccount: e.target.value
                  }
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Корреспондентский счет"
                value={companyDetails.bank.correspondentAccount}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  bank: {
                    ...companyDetails.bank,
                    correspondentAccount: e.target.value
                  }
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Адрес банка"
                value={companyDetails.bank.bankAddress}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  bank: {
                    ...companyDetails.bank,
                    bankAddress: e.target.value
                  }
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Контактная информация */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <ContactMail color="primary" />
            <Typography variant="h6">Контактная информация</Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Телефон"
                value={companyDetails.contacts.phone}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  contacts: {
                    ...companyDetails.contacts,
                    phone: e.target.value
                  }
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                value={companyDetails.contacts.email}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  contacts: {
                    ...companyDetails.contacts,
                    email: e.target.value
                  }
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Сайт"
                value={companyDetails.contacts.website}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  contacts: {
                    ...companyDetails.contacts,
                    website: e.target.value
                  }
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Email поддержки"
                value={companyDetails.contacts.supportEmail}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  contacts: {
                    ...companyDetails.contacts,
                    supportEmail: e.target.value
                  }
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Руководитель */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Руководитель
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="ФИО"
                value={companyDetails.director.fullName}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  director: {
                    ...companyDetails.director,
                    fullName: e.target.value
                  }
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Должность"
                value={companyDetails.director.position}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  director: {
                    ...companyDetails.director,
                    position: e.target.value
                  }
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Действует на основании"
                value={companyDetails.director.basedOn}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  director: {
                    ...companyDetails.director,
                    basedOn: e.target.value
                  }
                })}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  )
}