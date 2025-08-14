import React, { useState, useEffect } from 'react'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  Timestamp,
  orderBy
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { Trainer, SportType } from '../../types/trainer'
import TrainerModal from '../../components/TrainerModal'
import { 
  Person as UserIcon,
  Search,
  Add,
  Edit,
  Delete,
  CalendarMonth,
  AttachMoney,
  Schedule,
  School
} from '@mui/icons-material'
import { Alert, AlertTitle } from '@mui/material'

interface Venue {
  id: string
  name: string
}

const TrainersManagement: React.FC = () => {
  const { admin, club } = useAuth()
  const { isSuperAdmin } = usePermission()
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSport, setFilterSport] = useState<'all' | SportType>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null)
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isSuperAdmin) {
      // Загружаем список клубов для суперадмина
      fetchVenues()
      const venueId = localStorage.getItem('selectedVenueId')
      if (venueId) {
        setSelectedVenueId(venueId)
        fetchTrainers(venueId)
      } else {
        setLoading(false)
      }
    } else if (admin?.venueId) {
      // Для обычного админа используем его клуб
      fetchTrainers(admin.venueId)
    } else if (club?.id) {
      // Fallback на club.id если admin.venueId нет
      fetchTrainers(club.id)
    } else {
      setLoading(false)
    }
  }, [admin, club, isSuperAdmin])

  const fetchVenues = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'venues'))
      const venuesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Venue[]
      setVenues(venuesData)
    } catch (error) {
      console.error('Error fetching venues:', error)
    }
  }

  const handleVenueChange = (venueId: string) => {
    setSelectedVenueId(venueId)
    localStorage.setItem('selectedVenueId', venueId)
    fetchTrainers(venueId)
  }

  const fetchTrainers = async (venueId: string) => {
    if (!venueId) return

    setLoading(true)
    try {
      const q = query(
        collection(db, 'trainers'),
        where('clubId', '==', venueId),
        orderBy('firstName')
      )
      const querySnapshot = await getDocs(q)
      const trainersData: Trainer[] = []
      
      querySnapshot.forEach((doc) => {
        trainersData.push({ id: doc.id, ...doc.data() } as Trainer)
      })
      
      setTrainers(trainersData)
    } catch (error) {
      console.error('Error fetching trainers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTrainer = () => {
    setEditingTrainer(null)
    setIsModalOpen(true)
  }

  const handleEditTrainer = (trainer: Trainer) => {
    setEditingTrainer(trainer)
    setIsModalOpen(true)
  }

  const handleDeleteTrainer = async (trainerId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого тренера?')) {
      return
    }

    try {
      await deleteDoc(doc(db, 'trainers', trainerId))
      const venueId = isSuperAdmin ? selectedVenueId : (admin?.venueId || club?.id)
      if (venueId) {
        await fetchTrainers(venueId)
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error deleting trainer:', error)
      alert('Ошибка при удалении тренера')
    }
  }

  const handleSaveTrainer = async (trainerData: Partial<Trainer>) => {
    const venueId = isSuperAdmin ? selectedVenueId : (admin?.venueId || club?.id)
    if (!venueId) return

    try {
      if (editingTrainer?.id) {
        // Обновление существующего тренера
        await updateDoc(doc(db, 'trainers', editingTrainer.id), {
          ...trainerData,
          updatedAt: Timestamp.now()
        })
      } else {
        // Создание нового тренера
        await addDoc(collection(db, 'trainers'), {
          ...trainerData,
          clubId: venueId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        })
      }
      
      await fetchTrainers(venueId)
      setIsModalOpen(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving trainer:', error)
      alert('Ошибка при сохранении тренера')
    }
  }

  const filteredTrainers = trainers.filter(trainer => {
    const matchesSearch = trainer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          trainer.lastName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSport = filterSport === 'all' || trainer.specialization.includes(filterSport)
    return matchesSearch && matchesSport
  })

  const getSportEmoji = (sport: SportType) => {
    switch(sport) {
      case 'tennis': return '🎾'
      case 'padel': return '🏓'
      case 'badminton': return '🏸'
      default: return '🎾'
    }
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active': 
        return <span style={{
          padding: '4px 8px',
          fontSize: '12px',
          fontWeight: 500,
          backgroundColor: '#10B981',
          color: 'white',
          borderRadius: '12px'
        }}>Активен</span>
      case 'vacation':
        return <span style={{
          padding: '4px 8px',
          fontSize: '12px',
          fontWeight: 500,
          backgroundColor: '#F59E0B',
          color: 'white',
          borderRadius: '12px'
        }}>В отпуске</span>
      case 'inactive':
        return <span style={{
          padding: '4px 8px',
          fontSize: '12px',
          fontWeight: 500,
          backgroundColor: '#6B7280',
          color: 'white',
          borderRadius: '12px'
        }}>Неактивен</span>
      default:
        return null
    }
  }

  const getWorkScheduleSummary = (trainer: Trainer) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    const workDays = days.filter(day => trainer.schedule?.[day]?.enabled)
    
    if (workDays.length === 0) return 'Не указано'
    if (workDays.length === 7) return 'Ежедневно'
    if (workDays.length === 5 && !trainer.schedule?.saturday?.enabled && !trainer.schedule?.sunday?.enabled) {
      return 'Пн-Пт'
    }
    
    const dayNames: { [key: string]: string } = {
      monday: 'Пн', tuesday: 'Вт', wednesday: 'Ср', 
      thursday: 'Чт', friday: 'Пт', saturday: 'Сб', sunday: 'Вс'
    }
    
    if (workDays.length === 1) {
      return dayNames[workDays[0]]
    }
    
    return `${dayNames[workDays[0]]}-${dayNames[workDays[workDays.length - 1]]}`
  }

  const currentVenueId = isSuperAdmin ? selectedVenueId : (admin?.venueId || club?.id)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Выбор клуба для суперадмина */}
      {isSuperAdmin && (
        <div className="section-card" style={{ marginBottom: '24px' }}>
          <div className="section-header">
            <h2 className="section-title">Управление клубом</h2>
          </div>
          <div className="form-group">
            <select
              value={selectedVenueId || ''}
              onChange={(e) => handleVenueChange(e.target.value)}
              className="form-select"
            >
              <option value="">Выберите клуб</option>
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Уведомление об успехе */}
      {success && (
        <Alert severity="success" style={{ marginBottom: '24px' }}>
          <AlertTitle>Успешно</AlertTitle>
          Операция выполнена успешно
        </Alert>
      )}

      {/* Основной контент */}
      {!currentVenueId ? (
        <div className="section-card">
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <School style={{ fontSize: 64, color: '#9CA3AF', marginBottom: '16px' }} />
            <p style={{ fontSize: '18px', color: '#6B7280' }}>
              {isSuperAdmin ? 'Выберите клуб для просмотра тренеров' : 'Клуб не найден'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Заголовок и фильтры */}
          <div className="section-card">
            <div className="section-header">
              <h2 className="section-title">Тренеры</h2>
              <button
                onClick={handleAddTrainer}
                className="btn btn-primary"
              >
                <Add fontSize="small" />
                Добавить тренера
              </button>
            </div>

            {/* Фильтры */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                <Search style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: '#6B7280',
                  fontSize: '20px'
                }} />
                <input
                  type="text"
                  placeholder="Поиск по имени..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
              
              <select
                value={filterSport}
                onChange={(e) => setFilterSport(e.target.value as 'all' | SportType)}
                className="form-select"
                style={{ width: 'auto' }}
              >
                <option value="all">Все виды спорта</option>
                <option value="tennis">Теннис</option>
                <option value="padel">Падел</option>
                <option value="badminton">Бадминтон</option>
              </select>
            </div>
          </div>

          {/* Список тренеров */}
          {filteredTrainers.length > 0 ? (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
              gap: '24px',
              marginTop: '24px'
            }}>
              {filteredTrainers.map((trainer) => (
                <div key={trainer.id} className="section-card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: trainer.color || '#00A86B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '18px'
                      }}>
                        {trainer.firstName[0]}{trainer.lastName[0]}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                          {trainer.firstName} {trainer.lastName}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          {trainer.specialization.map((sport) => (
                            <span key={sport} style={{ fontSize: '18px' }}>
                              {getSportEmoji(sport)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(trainer.status)}
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '8px',
                    fontSize: '14px',
                    color: '#6B7280',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CalendarMonth style={{ fontSize: '16px' }} />
                      <span>{getWorkScheduleSummary(trainer)}</span>
                      {trainer.schedule && Object.keys(trainer.schedule).find(day => trainer.schedule[day]?.enabled) && (
                        <span style={{ color: '#9CA3AF' }}>
                          {trainer.schedule[Object.keys(trainer.schedule).find(day => trainer.schedule[day]?.enabled) || 'monday']?.start} - 
                          {trainer.schedule[Object.keys(trainer.schedule).find(day => trainer.schedule[day]?.enabled) || 'monday']?.end}
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AttachMoney style={{ fontSize: '16px' }} />
                      <span>{trainer.pricePerHour}₽/час</span>
                      {trainer.groupPrice && (
                        <span style={{ color: '#9CA3AF' }}>• Группа: {trainer.groupPrice}₽</span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Schedule style={{ fontSize: '16px' }} />
                      <span>{trainer.experience} лет опыта</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleEditTrainer(trainer)}
                      className="btn btn-secondary"
                      style={{ flex: 1 }}
                    >
                      <Edit fontSize="small" />
                      Изменить
                    </button>
                    <button
                      onClick={() => handleDeleteTrainer(trainer.id)}
                      className="btn btn-danger"
                    >
                      <Delete fontSize="small" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="section-card" style={{ marginTop: '24px' }}>
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <UserIcon style={{ fontSize: 64, color: '#9CA3AF', marginBottom: '16px' }} />
                <p style={{ fontSize: '18px', color: '#6B7280', marginBottom: '8px' }}>
                  Тренеры не найдены
                </p>
                {trainers.length === 0 && (
                  <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
                    Добавьте первого тренера вашего клуба
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Модальное окно */}
      {isModalOpen && (
        <TrainerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTrainer}
          trainer={editingTrainer}
        />
      )}
    </div>
  )
}

export default TrainersManagement