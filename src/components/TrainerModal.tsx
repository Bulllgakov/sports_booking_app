import React, { useState, useEffect } from 'react'
import { Trainer, SportType, DaySchedule, VacationPeriod } from '../types/trainer'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../services/firebase'

interface TrainerModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (trainer: Partial<Trainer>) => void
  trainer?: Trainer | null
  clubId?: string
}

const TrainerModal: React.FC<TrainerModalProps> = ({ isOpen, onClose, onSave, trainer, clubId }) => {
  const [formData, setFormData] = useState<Partial<Trainer>>({
    firstName: '',
    lastName: '',
    phone: '+7',
    email: '',
    specialization: [],
    experience: 0,
    bio: '',
    pricePerHour: 0,
    groupPrice: 0,
    commissionType: 'percent',
    commissionValue: 20,
    schedule: {
      monday: { enabled: false, start: '09:00', end: '18:00' },
      tuesday: { enabled: false, start: '09:00', end: '18:00' },
      wednesday: { enabled: false, start: '09:00', end: '18:00' },
      thursday: { enabled: false, start: '09:00', end: '18:00' },
      friday: { enabled: false, start: '09:00', end: '18:00' },
      saturday: { enabled: false, start: '09:00', end: '18:00' },
      sunday: { enabled: false, start: '09:00', end: '18:00' }
    },
    worksOnHolidays: false,
    maxDailyHours: 8,
    advanceBookingDays: 30,
    availableCourts: [],
    color: '#00A86B',
    status: 'active'
  })

  const [activeTab, setActiveTab] = useState<'basic' | 'schedule' | 'vacations' | 'settings' | 'account'>('basic')
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [accountPassword, setAccountPassword] = useState('')
  const [accountName, setAccountName] = useState('')
  const [hasAccount, setHasAccount] = useState(false)
  const [accountLoading, setAccountLoading] = useState(false)

  useEffect(() => {
    if (trainer) {
      // Форматируем телефон при загрузке
      const formattedPhone = trainer.phone ? formatPhone(trainer.phone) : '+7'
      setFormData({
        ...trainer,
        phone: formattedPhone
      })
      setHasAccount(trainer.hasAccount || false)
      setAccountName(`${trainer.firstName} ${trainer.lastName}`)
    } else {
      // Для нового тренера устанавливаем значения по умолчанию
      setFormData(prev => ({
        ...prev,
        phone: '+7'
      }))
    }
  }, [trainer])

  useEffect(() => {
    if (trainer?.id) {
      checkTrainerAccount()
    }
  }, [trainer?.id])

  const checkTrainerAccount = async () => {
    if (!trainer?.id) return
    
    try {
      const adminsQuery = query(
        collection(db, 'admins'),
        where('trainerId', '==', trainer.id)
      )
      const adminsSnapshot = await getDocs(adminsQuery)
      setHasAccount(!adminsSnapshot.empty)
    } catch (error) {
      console.error('Error checking trainer account:', error)
    }
  }

  const formatPhone = (value: string) => {
    // Удаляем все нецифровые символы
    const digits = value.replace(/\D/g, '')
    
    // Форматируем как российский номер
    if (digits.length <= 1) return digits
    if (digits.length <= 4) return `+7 (${digits.slice(1)})`
    if (digits.length <= 7) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4)}`
    if (digits.length <= 9) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setFormData(prev => ({ ...prev, phone: formatted }))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSpecializationChange = (sport: SportType) => {
    setFormData(prev => ({
      ...prev,
      specialization: prev.specialization?.includes(sport)
        ? prev.specialization.filter(s => s !== sport)
        : [...(prev.specialization || []), sport]
    }))
  }

  const handleScheduleChange = (day: string, field: keyof DaySchedule, value: any) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: {
          enabled: prev.schedule![day]?.enabled || false,
          start: prev.schedule![day]?.start || '09:00',
          end: prev.schedule![day]?.end || '18:00',
          ...prev.schedule![day],
          [field]: value
        }
      }
    }))
  }

  const handleAddVacation = () => {
    const newVacation = {
      id: Date.now().toString(),
      startDate: '',
      endDate: '',
      reason: ''
    }
    setFormData(prev => ({
      ...prev,
      vacations: [...(prev.vacations || []), newVacation]
    }))
  }

  const handleUpdateVacation = (id: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      vacations: prev.vacations?.map(v => 
        v.id === id ? { ...v, [field]: value } : v
      )
    }))
  }

  const handleRemoveVacation = (id: string) => {
    setFormData(prev => ({
      ...prev,
      vacations: prev.vacations?.filter(v => v.id !== id)
    }))
  }

  const handleToggleBlockedDate = (date: string) => {
    setFormData(prev => {
      const blockedDates = prev.blockedDates || []
      if (blockedDates.includes(date)) {
        return { ...prev, blockedDates: blockedDates.filter(d => d !== date) }
      } else {
        return { ...prev, blockedDates: [...blockedDates, date] }
      }
    })
  }

  const handleCreateAccount = async () => {
    // Используем email из основных данных формы
    const trainerEmail = formData.email
    
    if (!trainer?.id || !trainerEmail || !accountPassword || accountPassword.length < 6) {
      if (!trainerEmail) {
        alert('Пожалуйста, укажите email тренера в основных данных')
        setActiveTab('basic')
        return
      }
      return
    }

    setAccountLoading(true)
    try {
      const functions = getFunctions(undefined, 'europe-west1')
      const createTrainerAccount = httpsCallable(functions, 'createTrainerAccount')
      
      const result = await createTrainerAccount({
        trainerId: trainer.id,
        email: trainerEmail,
        password: accountPassword,
        name: accountName || `${trainer.firstName} ${trainer.lastName}`
      })

      if ((result.data as any).success) {
        setHasAccount(true)
        setShowAccountModal(false)
        setAccountPassword('')
        alert('Аккаунт успешно создан! Данные для входа отправлены на email тренера.')
        await checkTrainerAccount()
      }
    } catch (error: any) {
      console.error('Error creating trainer account:', error)
      if (error.code === 'functions/already-exists') {
        alert('Пользователь с таким email уже существует')
      } else if (error.code === 'functions/invalid-argument') {
        alert(error.message || 'Некорректные данные')
      } else {
        alert('Ошибка при создании аккаунта: ' + (error.message || 'Неизвестная ошибка'))
      }
    } finally {
      setAccountLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!trainer?.id) return

    if (!confirm('Вы уверены, что хотите удалить аккаунт тренера? Тренер больше не сможет войти в систему.')) {
      return
    }

    setAccountLoading(true)
    try {
      const functions = getFunctions(undefined, 'europe-west1')
      const deleteTrainerAccount = httpsCallable(functions, 'deleteTrainerAccount')
      
      const result = await deleteTrainerAccount({
        trainerId: trainer.id
      })

      if ((result.data as any).success) {
        setHasAccount(false)
        alert('Аккаунт тренера успешно удален')
        await checkTrainerAccount()
      }
    } catch (error: any) {
      console.error('Error deleting trainer account:', error)
      alert('Ошибка при удалении аккаунта: ' + (error.message || 'Неизвестная ошибка'))
    } finally {
      setAccountLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!trainer?.id || !accountPassword || accountPassword.length < 6) {
      return
    }

    setAccountLoading(true)
    try {
      const functions = getFunctions(undefined, 'europe-west1')
      const resetTrainerPassword = httpsCallable(functions, 'resetTrainerPassword')
      
      const result = await resetTrainerPassword({
        trainerId: trainer.id,
        newPassword: accountPassword
      })

      if ((result.data as any).success) {
        setShowPasswordModal(false)
        setAccountPassword('')
        alert('Пароль успешно изменен! Новые данные для входа отправлены на email тренера.')
      }
    } catch (error: any) {
      console.error('Error resetting trainer password:', error)
      alert('Ошибка при изменении пароля: ' + (error.message || 'Неизвестная ошибка'))
    } finally {
      setAccountLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Валидация
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      alert('Заполните обязательные поля')
      return
    }
    
    if (!formData.specialization || formData.specialization.length === 0) {
      alert('Выберите хотя бы одну специализацию')
      return
    }
    
    // Проверка расписания - должен быть хотя бы один рабочий день
    const hasWorkingDay = formData.schedule && Object.values(formData.schedule).some(day => {
      if (day.enabled) {
        // Проверяем, что указано время начала и окончания
        return day.start && day.end
      }
      return false
    })
    
    if (!hasWorkingDay) {
      alert('Необходимо настроить расписание тренера. Укажите хотя бы один рабочий день с временем начала и окончания работы.')
      // Переключаемся на вкладку расписания
      setActiveTab('schedule')
      return
    }
    
    // Проверка корректности времени в расписании
    const invalidSchedule = formData.schedule && Object.entries(formData.schedule).some(([_, day]) => {
      if (day.enabled && day.start && day.end) {
        const [startHour, startMinute] = day.start.split(':').map(Number)
        const [endHour, endMinute] = day.end.split(':').map(Number)
        const startMinutes = startHour * 60 + startMinute
        const endMinutes = endHour * 60 + endMinute
        return startMinutes >= endMinutes
      }
      return false
    })
    
    if (invalidSchedule) {
      alert('Время окончания работы должно быть позже времени начала')
      setActiveTab('schedule')
      return
    }
    
    onSave(formData)
  }

  if (!isOpen) return null

  const dayNames: { [key: string]: string } = {
    monday: 'Понедельник',
    tuesday: 'Вторник',
    wednesday: 'Среда',
    thursday: 'Четверг',
    friday: 'Пятница',
    saturday: 'Суббота',
    sunday: 'Воскресенье'
  }

  return (
    <div className={`modal ${isOpen ? 'active' : ''}`}>
      <div className="modal-content" style={{ maxWidth: '900px', width: '90%' }}>
        <div className="modal-header">
          <h3 className="modal-title">
            {trainer ? 'Редактировать тренера' : 'Добавить тренера'}
          </h3>
          <button 
            className="modal-close" 
            onClick={onClose}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Табы */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              style={{
                padding: '12px 24px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'basic' ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === 'basic' ? 'var(--primary)' : '#6b7280',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Основные данные
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              style={{
                padding: '12px 24px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'schedule' ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === 'schedule' ? 'var(--primary)' : '#6b7280',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Расписание <span style={{ color: '#EF4444' }}>*</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('vacations')}
              style={{
                padding: '12px 24px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'vacations' ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === 'vacations' ? 'var(--primary)' : '#6b7280',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Отпуска
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              style={{
                padding: '12px 24px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'settings' ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === 'settings' ? 'var(--primary)' : '#6b7280',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Настройки
            </button>
            {trainer && (
              <button
                type="button"
                onClick={() => setActiveTab('account')}
                style={{
                  padding: '12px 24px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'account' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeTab === 'account' ? 'var(--primary)' : '#6b7280',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Аккаунт
              </button>
            )}
          </div>

          <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {/* Основные данные */}
            {activeTab === 'basic' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <div className="form-group">
                    <label className="form-label">Имя *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Фамилия *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Телефон *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      className="form-input"
                      placeholder="+7 (999) 999-99-99"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="trainer@example.com"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Специализация *</label>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.specialization?.includes('tennis')}
                        onChange={() => handleSpecializationChange('tennis')}
                        style={{ marginRight: '8px' }}
                      />
                      <span>🎾 Теннис</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.specialization?.includes('padel')}
                        onChange={() => handleSpecializationChange('padel')}
                        style={{ marginRight: '8px' }}
                      />
                      <span>🏓 Падел</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.specialization?.includes('badminton')}
                        onChange={() => handleSpecializationChange('badminton')}
                        style={{ marginRight: '8px' }}
                      />
                      <span>🏸 Бадминтон</span>
                    </label>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <div className="form-group">
                    <label className="form-label">Опыт работы (лет)</label>
                    <input
                      type="number"
                      name="experience"
                      value={formData.experience}
                      onChange={handleInputChange}
                      min="0"
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Статус</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="active">Активен</option>
                      <option value="vacation">В отпуске</option>
                      <option value="inactive">Неактивен</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">О тренере</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={3}
                    className="form-input"
                    placeholder="Краткое описание, достижения, специализация..."
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <div className="form-group">
                    <label className="form-label">Стоимость индивидуального занятия</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        name="pricePerHour"
                        value={formData.pricePerHour}
                        onChange={handleInputChange}
                        min="0"
                        className="form-input"
                        style={{ flex: 1 }}
                      />
                      <span style={{ color: '#6b7280' }}>₽/час</span>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Стоимость группового занятия</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        name="groupPrice"
                        value={formData.groupPrice}
                        onChange={handleInputChange}
                        min="0"
                        className="form-input"
                        style={{ flex: 1 }}
                      />
                      <span style={{ color: '#6b7280' }}>₽/час</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <div className="form-group">
                    <label className="form-label">Тип комиссии клуба</label>
                    <select
                      name="commissionType"
                      value={formData.commissionType}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="percent">Процент</option>
                      <option value="fixed">Фиксированная сумма</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">
                      {formData.commissionType === 'percent' ? 'Процент комиссии' : 'Сумма комиссии (₽)'}
                    </label>
                    <input
                      type="number"
                      name="commissionValue"
                      value={formData.commissionValue}
                      onChange={handleInputChange}
                      min="0"
                      max={formData.commissionType === 'percent' ? 100 : undefined}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Цвет для календаря</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input 
                      type="color" 
                      className="form-input" 
                      name="color"
                      value={formData.color}
                      onChange={handleInputChange}
                      style={{ width: '80px', height: '48px', padding: '4px', cursor: 'pointer' }}
                    />
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      placeholder="#00A86B"
                      style={{ flex: 1 }}
                    />
                  </div>
                  <div className="form-hint">Этот цвет будет использоваться для визуального отображения тренера в календаре</div>
                </div>
              </div>
            )}

            {/* Расписание */}
            {activeTab === 'schedule' && (
              <div>
                <div style={{ 
                  padding: '12px 16px',
                  background: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <p style={{ 
                    margin: 0,
                    fontSize: '14px',
                    color: '#92400E',
                    fontWeight: 500
                  }}>
                    <strong>Важно:</strong> Расписание является обязательным для заполнения. 
                    Необходимо указать хотя бы один рабочий день с временем начала и окончания работы.
                  </p>
                </div>
                <div style={{ marginBottom: '24px' }}>
                  {Object.keys(dayNames).map((day) => (
                    <div key={day} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '16px', 
                      padding: '16px',
                      marginBottom: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: formData.schedule?.[day]?.enabled ? '#f9fafb' : 'white'
                    }}>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        minWidth: '150px',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={formData.schedule?.[day]?.enabled}
                          onChange={(e) => handleScheduleChange(day, 'enabled', e.target.checked)}
                          style={{ marginRight: '8px' }}
                        />
                        <span style={{ fontWeight: 500 }}>{dayNames[day]}</span>
                      </label>
                      
                      {formData.schedule?.[day]?.enabled && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                          <input
                            type="time"
                            value={formData.schedule?.[day]?.start || ''}
                            onChange={(e) => handleScheduleChange(day, 'start', e.target.value)}
                            className="form-input"
                            style={{ width: '140px' }}
                          />
                          <span style={{ color: '#6b7280' }}>—</span>
                          <input
                            type="time"
                            value={formData.schedule?.[day]?.end || ''}
                            onChange={(e) => handleScheduleChange(day, 'end', e.target.value)}
                            className="form-input"
                            style={{ width: '140px' }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="worksOnHolidays"
                    checked={formData.worksOnHolidays}
                    onChange={handleInputChange}
                    style={{ marginRight: '8px' }}
                  />
                  <span>Работает в праздничные дни</span>
                </label>
              </div>
            )}

            {/* Настройки */}
            {activeTab === 'settings' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <div className="form-group">
                    <label className="form-label">Максимум часов в день</label>
                    <input
                      type="number"
                      name="maxDailyHours"
                      value={formData.maxDailyHours}
                      onChange={handleInputChange}
                      min="1"
                      max="12"
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Бронирование вперед</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        name="advanceBookingDays"
                        value={formData.advanceBookingDays}
                        onChange={handleInputChange}
                        min="1"
                        max="365"
                        className="form-input"
                        style={{ flex: 1 }}
                      />
                      <span style={{ color: '#6b7280' }}>дней</span>
                    </div>
                  </div>
                </div>


                {/* Персональная ссылка для бронирования */}
                {trainer && trainer.id && clubId && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                      Персональная ссылка для бронирования
                    </h3>
                    <div style={{
                      padding: '12px',
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                        Клиенты могут использовать эту ссылку для бронирования с тренером:
                      </div>
                      <div style={{
                        padding: '8px 12px',
                        background: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        wordBreak: 'break-all',
                        userSelect: 'all'
                      }}>
                        https://allcourt.ru/club/{clubId}?trainer={trainer.id}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const url = `https://allcourt.ru/club/${clubId}?trainer=${trainer.id}`
                          navigator.clipboard.writeText(url)
                          alert('Ссылка скопирована в буфер обмена')
                        }}
                        style={{
                          marginTop: '8px',
                          padding: '6px 12px',
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                      >
                        Скопировать ссылку
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ 
                  padding: '16px', 
                  background: 'rgba(59, 130, 246, 0.05)', 
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '8px' 
                }}>
                  <p style={{ fontSize: '14px', color: '#1e40af', margin: 0 }}>
                    <strong>Примечание:</strong> При переходе по персональной ссылке тренер будет автоматически 
                    выбран в форме бронирования, и клиент увидит только те слоты, когда тренер доступен.
                  </p>
                </div>
              </div>
            )}

            {/* Отпуска */}
            {activeTab === 'vacations' && (
              <div>
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                    Периоды отпусков
                  </h3>
                  
                  {formData.vacations && formData.vacations.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {formData.vacations.map((vacation) => (
                        <div key={vacation.id} style={{
                          padding: '16px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          background: '#f9fafb'
                        }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '12px', alignItems: 'center' }}>
                            <div>
                              <label className="form-label" style={{ fontSize: '12px' }}>Начало</label>
                              <input
                                type="date"
                                className="form-input"
                                value={vacation.startDate}
                                onChange={(e) => handleUpdateVacation(vacation.id!, 'startDate', e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                              />
                            </div>
                            <div>
                              <label className="form-label" style={{ fontSize: '12px' }}>Окончание</label>
                              <input
                                type="date"
                                className="form-input"
                                value={vacation.endDate}
                                onChange={(e) => handleUpdateVacation(vacation.id!, 'endDate', e.target.value)}
                                min={vacation.startDate || new Date().toISOString().split('T')[0]}
                              />
                            </div>
                            <div>
                              <label className="form-label" style={{ fontSize: '12px' }}>Причина (необязательно)</label>
                              <input
                                type="text"
                                className="form-input"
                                value={vacation.reason || ''}
                                onChange={(e) => handleUpdateVacation(vacation.id!, 'reason', e.target.value)}
                                placeholder="Например: Отпуск, болезнь, обучение"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveVacation(vacation.id!)}
                              style={{
                                padding: '8px',
                                background: '#fee2e2',
                                border: '1px solid #fca5a5',
                                borderRadius: '6px',
                                color: '#dc2626',
                                cursor: 'pointer',
                                alignSelf: 'flex-end'
                              }}
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>
                      Нет запланированных отпусков
                    </p>
                  )}
                  
                  <button
                    type="button"
                    onClick={handleAddVacation}
                    style={{
                      marginTop: '12px',
                      padding: '8px 16px',
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    + Добавить период отпуска
                  </button>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                    Заблокированные даты
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
                    Выберите отдельные дни, когда тренер не будет доступен (например, разовые выходные)
                  </p>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <input
                      type="date"
                      className="form-input"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleToggleBlockedDate(e.target.value)
                          e.target.value = ''
                        }
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      style={{ maxWidth: '200px' }}
                    />
                  </div>
                  
                  {formData.blockedDates && formData.blockedDates.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {formData.blockedDates.sort().map((date) => (
                        <div key={date} style={{
                          padding: '4px 12px',
                          background: '#fee2e2',
                          border: '1px solid #fca5a5',
                          borderRadius: '16px',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span>{new Date(date + 'T00:00:00').toLocaleDateString('ru-RU')}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleBlockedDate(date)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dc2626',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{
                  padding: '16px',
                  background: 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '8px'
                }}>
                  <p style={{ fontSize: '14px', color: '#1e40af', margin: 0 }}>
                    <strong>Примечание:</strong> В период отпуска или в заблокированные даты тренер не будет доступен для бронирования. 
                    Уже существующие бронирования необходимо отменить или перенести вручную.
                  </p>
                </div>
              </div>
            )}

            {/* Аккаунт */}
            {activeTab === 'account' && trainer && (
              <div>
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                    Управление аккаунтом тренера
                  </h3>
                  
                  {hasAccount ? (
                    <div style={{
                      padding: '20px',
                      background: '#f0fdf4',
                      border: '1px solid #86efac',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          background: '#22c55e',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                        </div>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 600, color: '#15803d' }}>
                            Аккаунт активен
                          </div>
                          <div style={{ fontSize: '14px', color: '#16a34a' }}>
                            Email: {formData.email || trainer?.email}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{
                        padding: '12px',
                        background: 'white',
                        borderRadius: '6px',
                        marginBottom: '12px'
                      }}>
                        <div style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
                          Тренер может войти в систему используя:
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          • Email: <strong>{formData.email || trainer?.email}</strong><br/>
                          • Пароль, который был установлен при создании аккаунта
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                          type="button"
                          onClick={() => setShowPasswordModal(true)}
                          style={{
                            padding: '8px 16px',
                            background: '#e0f2fe',
                            color: '#0369a1',
                            border: '1px solid #7dd3fc',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer'
                          }}
                        >
                          Изменить пароль
                        </button>
                        
                        <button
                          type="button"
                          onClick={handleDeleteAccount}
                          disabled={accountLoading}
                          style={{
                            padding: '8px 16px',
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fca5a5',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: accountLoading ? 'not-allowed' : 'pointer',
                            opacity: accountLoading ? 0.5 : 1
                          }}
                        >
                          {accountLoading ? 'Удаление...' : 'Удалить аккаунт'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '20px',
                      background: '#fef3c7',
                      border: '1px solid #fcd34d',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          background: '#f59e0b',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                        </div>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 600, color: '#92400e' }}>
                            Аккаунт не создан
                          </div>
                          <div style={{ fontSize: '14px', color: '#b45309' }}>
                            Тренер не может войти в систему
                          </div>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          if (!formData.email) {
                            alert('Пожалуйста, сначала укажите email тренера в основных данных')
                            setActiveTab('basic')
                          } else {
                            setShowAccountModal(true)
                          }
                        }}
                        style={{
                          padding: '10px 20px',
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                      >
                        Создать аккаунт
                      </button>
                    </div>
                  )}
                  
                  <div style={{
                    marginTop: '20px',
                    padding: '16px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                      Права доступа тренера:
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#6b7280' }}>
                      <li>Просмотр и редактирование своего профиля (кроме ФИО и телефона)</li>
                      <li>Управление своим расписанием и отпусками</li>
                      <li>Просмотр своих бронирований</li>
                      <li>Доступ только к личному кабинету</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Модальное окно для смены пароля */}
          {showPasswordModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000
            }}>
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '500px',
                width: '90%'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
                  Изменение пароля тренера
                </h3>
                
                <div style={{
                  padding: '12px',
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '13px', color: '#0369a1', marginBottom: '4px' }}>
                    Тренер: <strong>{trainer?.firstName} {trainer?.lastName}</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: '#0369a1' }}>
                    Email: <strong>{formData.email || trainer?.email}</strong>
                  </div>
                </div>
                
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Новый пароль</label>
                  <input
                    type="password"
                    className="form-input"
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                  />
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    После изменения пароля новые данные будут автоматически отправлены на email тренера.
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false)
                      setAccountPassword('')
                    }}
                    disabled={accountLoading}
                    style={{
                      padding: '8px 16px',
                      background: '#f3f4f6',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: accountLoading ? 'not-allowed' : 'pointer',
                      opacity: accountLoading ? 0.5 : 1
                    }}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={accountLoading || !accountPassword || accountPassword.length < 6}
                    style={{
                      padding: '8px 16px',
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: (accountLoading || !accountPassword || accountPassword.length < 6) ? 'not-allowed' : 'pointer',
                      opacity: (accountLoading || !accountPassword || accountPassword.length < 6) ? 0.5 : 1
                    }}
                  >
                    {accountLoading ? 'Изменение...' : 'Изменить пароль'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Модальное окно для создания аккаунта */}
          {showAccountModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000
            }}>
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '500px',
                width: '90%'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
                  Создание аккаунта для тренера
                </h3>
                
                {formData.email ? (
                  <div style={{
                    padding: '12px',
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ fontSize: '13px', color: '#0369a1', marginBottom: '4px' }}>
                      Для входа будет использован email:
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#0c4a6e' }}>
                      {formData.email}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '12px',
                    background: '#fef3c7',
                    border: '1px solid #fcd34d',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ fontSize: '14px', color: '#92400e' }}>
                      ⚠️ Email не указан в основных данных тренера. Пожалуйста, сначала укажите email в основных данных.
                    </div>
                  </div>
                )}
                
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Имя для отображения</label>
                  <input
                    type="text"
                    className="form-input"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Имя Фамилия"
                    disabled
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Пароль</label>
                  <input
                    type="password"
                    className="form-input"
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                  />
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    Пароль должен содержать минимум 6 символов. Сообщите этот пароль тренеру для входа в систему.
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAccountModal(false)
                      setAccountPassword('')
                    }}
                    disabled={accountLoading}
                    style={{
                      padding: '8px 16px',
                      background: '#f3f4f6',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: accountLoading ? 'not-allowed' : 'pointer',
                      opacity: accountLoading ? 0.5 : 1
                    }}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateAccount}
                    disabled={accountLoading || !formData.email || !accountPassword || accountPassword.length < 6}
                    style={{
                      padding: '8px 16px',
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: (accountLoading || !formData.email || !accountPassword || accountPassword.length < 6) ? 'not-allowed' : 'pointer',
                      opacity: (accountLoading || !formData.email || !accountPassword || accountPassword.length < 6) ? 0.5 : 1
                    }}
                  >
                    {accountLoading ? 'Создание...' : 'Создать аккаунт'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
            >
              Отмена
            </button>
            <button type="submit" className="btn btn-primary">
              {trainer ? 'Сохранить изменения' : 'Добавить тренера'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TrainerModal