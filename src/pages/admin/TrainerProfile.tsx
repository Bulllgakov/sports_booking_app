import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { Trainer, SportType, DaySchedule, VacationPeriod } from '../../types/trainer'
import { ArrowBack, Save } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

export default function TrainerProfile() {
  const { admin } = useAuth()
  const navigate = useNavigate()
  const [trainer, setTrainer] = useState<Trainer | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'schedule' | 'vacations'>('info')
  const [formData, setFormData] = useState<Partial<Trainer>>({})

  useEffect(() => {
    if (admin?.trainerId) {
      fetchTrainerData()
    } else {
      // Если нет trainerId, перенаправляем на дашборд
      navigate('/admin/dashboard')
    }
  }, [admin])

  const fetchTrainerData = async () => {
    if (!admin?.trainerId) return

    try {
      const trainerDoc = await getDoc(doc(db, 'trainers', admin.trainerId))
      if (trainerDoc.exists()) {
        const data = { id: trainerDoc.id, ...trainerDoc.data() } as Trainer
        setTrainer(data)
        setFormData(data)
      }
    } catch (error) {
      console.error('Error fetching trainer data:', error)
    } finally {
      setLoading(false)
    }
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
          ...prev.schedule![day],
          [field]: value
        }
      }
    }))
  }

  const handleAddVacation = () => {
    const newVacation: VacationPeriod = {
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

  const handleSave = async () => {
    if (!admin?.trainerId || !formData) return

    setSaving(true)
    try {
      // Исключаем поля, которые тренер не может редактировать
      const { firstName, lastName, phone, ...updatableData } = formData
      
      await updateDoc(doc(db, 'trainers', admin.trainerId), {
        ...updatableData,
        updatedAt: new Date()
      })
      
      alert('Профиль успешно обновлен')
      await fetchTrainerData()
    } catch (error) {
      console.error('Error updating trainer:', error)
      alert('Ошибка при сохранении профиля')
    } finally {
      setSaving(false)
    }
  }

  const dayNames: { [key: string]: string } = {
    monday: 'Понедельник',
    tuesday: 'Вторник',
    wednesday: 'Среда',
    thursday: 'Четверг',
    friday: 'Пятница',
    saturday: 'Суббота',
    sunday: 'Воскресенье'
  }

  if (loading) {
    return <div className="section-card">Загрузка...</div>
  }

  if (!trainer) {
    return <div className="section-card">Профиль тренера не найден</div>
  }

  return (
    <div className="container">
      <div className="section-card">
        <div className="section-header">
          <h1 className="section-title">Мой профиль</h1>
          <button 
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            <Save style={{ fontSize: '20px', marginRight: '8px' }} />
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>

        {/* Отображаем имя и телефон (только для чтения) */}
        <div style={{ 
          padding: '16px', 
          background: '#f3f4f6', 
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            Основная информация
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label className="form-label">Имя</label>
              <input 
                type="text" 
                className="form-input" 
                value={trainer.firstName}
                disabled
                style={{ background: 'white', cursor: 'not-allowed' }}
              />
            </div>
            <div>
              <label className="form-label">Фамилия</label>
              <input 
                type="text" 
                className="form-input" 
                value={trainer.lastName}
                disabled
                style={{ background: 'white', cursor: 'not-allowed' }}
              />
            </div>
            <div>
              <label className="form-label">Телефон</label>
              <input 
                type="text" 
                className="form-input" 
                value={trainer.phone}
                disabled
                style={{ background: 'white', cursor: 'not-allowed' }}
              />
            </div>
          </div>
        </div>

        {/* Табы */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'info' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'info' ? 'var(--primary)' : '#6b7280',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Профессиональные данные
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
            Отпуска и выходные
          </button>
        </div>

        {/* Профессиональные данные */}
        {activeTab === 'info' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Опыт работы (лет)</label>
                <input
                  type="number"
                  name="experience"
                  value={formData.experience || 0}
                  onChange={handleInputChange}
                  min="0"
                  max="50"
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">Специализация</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {(['tennis', 'padel', 'badminton'] as SportType[]).map(sport => (
                  <label key={sport} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.specialization?.includes(sport) || false}
                      onChange={() => handleSpecializationChange(sport)}
                      style={{ marginRight: '6px' }}
                    />
                    <span style={{ textTransform: 'capitalize' }}>{sport}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">О себе</label>
              <textarea
                name="bio"
                value={formData.bio || ''}
                onChange={handleInputChange}
                className="form-input"
                rows={4}
                placeholder="Расскажите о своем опыте, достижениях, методике тренировок..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Стоимость часа (₽)</label>
                <input
                  type="number"
                  name="pricePerHour"
                  value={formData.pricePerHour || 0}
                  onChange={handleInputChange}
                  min="0"
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Стоимость группового занятия (₽)</label>
                <input
                  type="number"
                  name="groupPrice"
                  value={formData.groupPrice || 0}
                  onChange={handleInputChange}
                  min="0"
                  className="form-input"
                />
              </div>
            </div>
          </div>
        )}

        {/* Расписание */}
        {activeTab === 'schedule' && (
          <div>
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
                    checked={formData.schedule?.[day]?.enabled || false}
                    onChange={(e) => handleScheduleChange(day, 'enabled', e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ fontWeight: 500 }}>{dayNames[day]}</span>
                </label>
                
                {formData.schedule?.[day]?.enabled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="time"
                      value={formData.schedule?.[day]?.start || '09:00'}
                      onChange={(e) => handleScheduleChange(day, 'start', e.target.value)}
                      className="form-input"
                      style={{ width: '140px' }}
                    />
                    <span>—</span>
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

            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginTop: '16px' }}>
              <input
                type="checkbox"
                name="worksOnHolidays"
                checked={formData.worksOnHolidays || false}
                onChange={handleInputChange}
                style={{ marginRight: '8px' }}
              />
              <span>Работаю в праздничные дни</span>
            </label>
          </div>
        )}

        {/* Отпуска и выходные */}
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
                          <label className="form-label" style={{ fontSize: '12px' }}>Причина</label>
                          <input
                            type="text"
                            className="form-input"
                            value={vacation.reason || ''}
                            onChange={(e) => handleUpdateVacation(vacation.id!, 'reason', e.target.value)}
                            placeholder="Например: Отпуск, болезнь"
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
                          Удалить
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
                          padding: 0
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}