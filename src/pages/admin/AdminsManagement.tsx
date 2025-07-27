import React, { useState, useEffect } from 'react'
import { 
  Box, 
  Button, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  FormGroup,
  FormLabel
} from '@mui/material'
import { Edit, Delete, Add } from '@mui/icons-material'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { db, auth } from '../../services/firebase'
import { usePermission } from '../../hooks/usePermission'
import { PermissionGate } from '../../components/PermissionGate'
import ResetPasswordButton from '../../components/ResetPasswordButton'

interface Admin {
  id: string
  name: string
  email: string
  password?: string
  role: 'superadmin' | 'admin' | 'manager'
  venueId?: string
  venueName?: string
  permissions: string[]
}

interface Venue {
  id: string
  name: string
}

const allPermissions = [
  { value: 'manage_all_venues', label: 'Управление всеми клубами' },
  { value: 'manage_all_bookings', label: 'Управление всеми бронированиями' },
  { value: 'manage_all_users', label: 'Управление всеми пользователями' },
  { value: 'manage_platform_settings', label: 'Управление настройками платформы' },
  { value: 'view_all_reports', label: 'Просмотр всех отчетов' },
  { value: 'manage_finance', label: 'Управление финансами' },
  { value: 'manage_admins', label: 'Управление администраторами' },
  { value: 'manage_bookings', label: 'Управление бронированиями' },
  { value: 'manage_courts', label: 'Управление кортами' },
  { value: 'manage_club', label: 'Управление клубом' },
  { value: 'view_reports', label: 'Просмотр отчетов' },
  { value: 'view_bookings', label: 'Просмотр бронирований' },
  { value: 'create_bookings', label: 'Создание бронирований' }
]

const rolePermissions = {
  superadmin: [
    'manage_all_venues',
    'manage_all_bookings',
    'manage_all_users',
    'manage_platform_settings',
    'view_all_reports',
    'manage_finance',
    'manage_admins'
  ],
  admin: [
    'manage_bookings',
    'manage_courts',
    'manage_club',
    'view_reports'
  ],
  manager: [
    'view_bookings',
    'create_bookings',
    'view_reports'
  ]
}

export default function AdminsManagement() {
  const { isSuperAdmin } = usePermission()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'manager' as 'admin' | 'manager',
    venueId: '',
    permissions: [] as string[]
  })
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Загружаем администраторов
      const adminsSnapshot = await getDocs(collection(db, 'admins'))
      const adminsData: Admin[] = []
      
      for (const doc of adminsSnapshot.docs) {
        const data = doc.data()
        let venueName = ''
        
        if (data.venueId) {
          const venueDoc = await getDocs(query(collection(db, 'venues'), where('__name__', '==', data.venueId)))
          if (!venueDoc.empty) {
            venueName = venueDoc.docs[0].data().name
          }
        }
        
        adminsData.push({
          id: doc.id,
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
          venueId: data.venueId,
          venueName,
          permissions: data.permissions || []
        })
      }
      
      setAdmins(adminsData)

      // Загружаем клубы
      const venuesSnapshot = await getDocs(collection(db, 'venues'))
      const venuesData = venuesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }))
      setVenues(venuesData)

      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    }
  }

  const handleOpen = (admin?: Admin) => {
    if (admin) {
      setEditingAdmin(admin)
      setFormData({
        name: admin.name,
        email: admin.email,
        password: '',
        role: admin.role as 'admin' | 'manager',
        venueId: admin.venueId || '',
        permissions: admin.permissions
      })
    } else {
      setEditingAdmin(null)
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'manager',
        venueId: '',
        permissions: rolePermissions.manager
      })
    }
    setDialogOpen(true)
    setError('')
  }

  const handleClose = () => {
    setDialogOpen(false)
    setEditingAdmin(null)
    setError('')
  }

  const handleRoleChange = (role: 'admin' | 'manager') => {
    setFormData({
      ...formData,
      role,
      permissions: rolePermissions[role]
    })
  }

  const handlePermissionToggle = (permission: string) => {
    const newPermissions = formData.permissions.includes(permission)
      ? formData.permissions.filter(p => p !== permission)
      : [...formData.permissions, permission]
    
    setFormData({ ...formData, permissions: newPermissions })
  }

  const handleSubmit = async () => {
    try {
      setError('')

      if (editingAdmin) {
        // Обновляем существующего админа
        const updateData: any = {
          name: formData.name,
          role: formData.role,
          venueId: formData.venueId || null,
          permissions: formData.permissions,
          updatedAt: new Date()
        }
        
        // Пароли больше не хранятся в Firestore - только в Firebase Auth
        
        await updateDoc(doc(db, 'admins', editingAdmin.id), updateData)
      } else {
        // Создаем нового админа
        if (!formData.password) {
          setError('Пароль обязателен для нового администратора')
          return
        }

        // Создаем пользователя в Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
        
        // Создаем документ админа
        await addDoc(collection(db, 'admins'), {
          uid: userCredential.user.uid,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          venueId: formData.venueId || null,
          permissions: formData.permissions,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }

      handleClose()
      loadData()
    } catch (error: any) {
      console.error('Error saving admin:', error)
      if (error.code === 'auth/email-already-in-use') {
        setError('Пользователь с таким email уже существует')
      } else if (error.code === 'auth/weak-password') {
        setError('Пароль должен содержать минимум 6 символов')
      } else {
        setError('Ошибка при сохранении администратора')
      }
    }
  }

  const handleDelete = async (adminId: string) => {
    if (confirm('Вы уверены, что хотите удалить этого администратора?')) {
      try {
        await deleteDoc(doc(db, 'admins', adminId))
        loadData()
      } catch (error) {
        console.error('Error deleting admin:', error)
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
          <h2>Управление администраторами</h2>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpen()}
          >
            Добавить администратора
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Имя</TableCell>
                <TableCell>Email</TableCell>
                {isSuperAdmin && <TableCell>Пароль</TableCell>}
                <TableCell>Роль</TableCell>
                <TableCell>Клуб</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>{admin.name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={admin.role} 
                      color={admin.role === 'superadmin' ? 'error' : admin.role === 'admin' ? 'primary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{admin.venueName || '-'}</TableCell>
                  <TableCell align="right">
                    {admin.role !== 'superadmin' && (
                      <>
                        <ResetPasswordButton email={admin.email} />
                        <IconButton onClick={() => handleOpen(admin)}>
                          <Edit />
                        </IconButton>
                        <IconButton onClick={() => handleDelete(admin.id)} color="error">
                          <Delete />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingAdmin ? 'Редактировать администратора' : 'Добавить администратора'}
          </DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <TextField
              fullWidth
              label="Имя"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              margin="normal"
              disabled={!!editingAdmin}
            />
            
            {!editingAdmin && (
              <TextField
                fullWidth
                label="Пароль"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                margin="normal"
                required
              />
            )}
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Роль</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) => handleRoleChange(e.target.value as 'admin' | 'manager')}
              >
                <MenuItem value="admin">Администратор</MenuItem>
                <MenuItem value="manager">Менеджер</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Клуб</InputLabel>
              <Select
                value={formData.venueId}
                onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
              >
                <MenuItem value="">Не выбран</MenuItem>
                {venues.map(venue => (
                  <MenuItem key={venue.id} value={venue.id}>{venue.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl component="fieldset" margin="normal">
              <FormLabel component="legend">Права доступа</FormLabel>
              <FormGroup>
                {allPermissions.map(perm => (
                  <FormControlLabel
                    key={perm.value}
                    control={
                      <Checkbox
                        checked={formData.permissions.includes(perm.value)}
                        onChange={() => handlePermissionToggle(perm.value)}
                        disabled={rolePermissions[formData.role].includes(perm.value)}
                      />
                    }
                    label={perm.label}
                  />
                ))}
              </FormGroup>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Отмена</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingAdmin ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PermissionGate>
  )
}