import React, { useState, useEffect } from 'react'
import { Trainer, SportType, DaySchedule } from '../types/trainer'

interface TrainerModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (trainer: Partial<Trainer>) => void
  trainer?: Trainer | null
}

const TrainerModal: React.FC<TrainerModalProps> = ({ isOpen, onClose, onSave, trainer }) => {
  const [formData, setFormData] = useState<Partial<Trainer>>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    specialization: [],
    experience: 0,
    bio: '',
    pricePerHour: 0,
    groupPrice: 0,
    commissionType: 'percent',
    commissionValue: 20,
    schedule: {
      monday: { enabled: false },
      tuesday: { enabled: false },
      wednesday: { enabled: false },
      thursday: { enabled: false },
      friday: { enabled: false },
      saturday: { enabled: false },
      sunday: { enabled: false }
    },
    worksOnHolidays: false,
    maxDailyHours: 8,
    minBreakMinutes: 15,
    advanceBookingDays: 30,
    cancellationHours: 24,
    availableCourts: [],
    color: '#00A86B',
    status: 'active',
    hasAccess: false,
    canEditProfile: false,
    canViewClients: false
  })

  const [activeTab, setActiveTab] = useState<'basic' | 'schedule' | 'settings'>('basic')

  useEffect(() => {
    if (trainer) {
      setFormData(trainer)
    }
  }, [trainer])

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
          ...prev.schedule![day],
          [field]: value
        }
      }
    }))
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
              Расписание
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
                      onChange={handleInputChange}
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
                            value={formData.schedule?.[day]?.start || '09:00'}
                            onChange={(e) => handleScheduleChange(day, 'start', e.target.value)}
                            className="form-input"
                            style={{ width: '140px' }}
                          />
                          <span style={{ color: '#6b7280' }}>—</span>
                          <input
                            type="time"
                            value={formData.schedule?.[day]?.end || '18:00'}
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
                    <label className="form-label">Минимальный перерыв между занятиями</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        name="minBreakMinutes"
                        value={formData.minBreakMinutes}
                        onChange={handleInputChange}
                        min="0"
                        max="60"
                        className="form-input"
                        style={{ flex: 1 }}
                      />
                      <span style={{ color: '#6b7280' }}>минут</span>
                    </div>
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
                  
                  <div className="form-group">
                    <label className="form-label">Отмена минимум за</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        name="cancellationHours"
                        value={formData.cancellationHours}
                        onChange={handleInputChange}
                        min="0"
                        max="72"
                        className="form-input"
                        style={{ flex: 1 }}
                      />
                      <span style={{ color: '#6b7280' }}>часов</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Права доступа</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        name="hasAccess"
                        checked={formData.hasAccess}
                        onChange={handleInputChange}
                        style={{ marginRight: '8px' }}
                      />
                      <span>Может входить в систему</span>
                    </label>
                    
                    {formData.hasAccess && (
                      <>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginLeft: '24px' }}>
                          <input
                            type="checkbox"
                            name="canEditProfile"
                            checked={formData.canEditProfile}
                            onChange={handleInputChange}
                            style={{ marginRight: '8px' }}
                          />
                          <span>Может редактировать свой профиль</span>
                        </label>
                        
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginLeft: '24px' }}>
                          <input
                            type="checkbox"
                            name="canViewClients"
                            checked={formData.canViewClients}
                            onChange={handleInputChange}
                            style={{ marginRight: '8px' }}
                          />
                          <span>Может видеть имена клиентов</span>
                        </label>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ 
                  padding: '16px', 
                  background: 'rgba(59, 130, 246, 0.05)', 
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '8px' 
                }}>
                  <p style={{ fontSize: '14px', color: '#1e40af', margin: 0 }}>
                    <strong>Примечание:</strong> Онлайн-бронирование тренера клиентами находится в разработке. 
                    Сейчас бронирование с тренером доступно только через администратора клуба.
                  </p>
                </div>
              </div>
            )}
          </div>

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