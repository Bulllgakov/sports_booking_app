import React, { useState } from 'react'
import { useDemoAuth } from '../../contexts/DemoAuthContext'
import { Alert } from '@mui/material'
import '../../styles/admin.css'

export default function DemoClubManagement() {
  const { club } = useDemoAuth()
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    name: club?.name || 'Padel Club Moscow',
    phone: club?.phone || '+7 (495) 123-45-67',
    address: club?.address || 'ул. Спортивная, 1',
    city: club?.city || 'Москва',
    description: 'Современный спортивный клуб с кортами для падел-тенниса, большого тенниса и бадминтона',
    timezone: club?.timezone || 'Europe/Moscow',
    amenities: {
      showers: true,
      parking: true,
      cafe: true,
      proshop: false,
      lockers: true,
    },
    workingHours: {
      monday: '07:00-23:00',
      tuesday: '07:00-23:00',
      wednesday: '07:00-23:00',
      thursday: '07:00-23:00',
      friday: '07:00-23:00',
      saturday: '08:00-22:00',
      sunday: '08:00-22:00'
    },
    organizationType: 'ООО',
    inn: '7701234567',
    legalName: 'ООО "Спортивный клуб"'
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAmenityChange = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        [amenity]: !prev.amenities[amenity as keyof typeof prev.amenities]
      }
    }))
  }

  const handleSave = () => {
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div>
      {success && (
        <Alert severity="success" style={{ marginBottom: '24px' }}>
          Настройки клуба успешно сохранены (демо режим)
        </Alert>
      )}

      <div className="section-card">
        <h2 className="section-title">Основная информация</h2>
        
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Название клуба</label>
            <input
              type="text"
              className="form-input"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Телефон</label>
            <input
              type="text"
              className="form-input"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Город</label>
            <input
              type="text"
              className="form-input"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Адрес</label>
            <input
              type="text"
              className="form-input"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Часовой пояс</label>
            <select
              className="form-select"
              name="timezone"
              value={formData.timezone}
              onChange={handleInputChange}
            >
              <option value="Europe/Kaliningrad">Калининград (UTC+2)</option>
              <option value="Europe/Moscow">Москва (UTC+3)</option>
              <option value="Europe/Samara">Самара (UTC+4)</option>
              <option value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</option>
              <option value="Asia/Omsk">Омск (UTC+6)</option>
              <option value="Asia/Krasnoyarsk">Красноярск (UTC+7)</option>
              <option value="Asia/Irkutsk">Иркутск (UTC+8)</option>
              <option value="Asia/Yakutsk">Якутск (UTC+9)</option>
              <option value="Asia/Vladivostok">Владивосток (UTC+10)</option>
              <option value="Asia/Magadan">Магадан (UTC+11)</option>
              <option value="Asia/Kamchatka">Камчатка (UTC+12)</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Описание</label>
          <textarea
            className="form-textarea"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
          />
        </div>
      </div>

      <div className="section-card">
        <h3 className="section-title">Удобства</h3>
        
        <div className="checkbox-grid">
          {Object.entries({
            showers: 'Душевые',
            parking: 'Парковка',
            cafe: 'Кафе',
            proshop: 'Магазин',
            lockers: 'Раздевалки'
          }).map(([key, label]) => (
            <label key={key} className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.amenities[key as keyof typeof formData.amenities]}
                onChange={() => handleAmenityChange(key)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="section-card">
        <h3 className="section-title">Время работы</h3>
        
        <div className="form-grid">
          {Object.entries({
            monday: 'Понедельник',
            tuesday: 'Вторник',
            wednesday: 'Среда',
            thursday: 'Четверг',
            friday: 'Пятница',
            saturday: 'Суббота',
            sunday: 'Воскресенье'
          }).map(([day, label]) => (
            <div key={day} className="form-group">
              <label className="form-label">{label}</label>
              <input
                type="text"
                className="form-input"
                value={formData.workingHours[day as keyof typeof formData.workingHours]}
                readOnly
              />
            </div>
          ))}
        </div>
      </div>

      <div className="section-card">
        <h3 className="section-title">Юридическая информация</h3>
        
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Тип организации</label>
            <select
              className="form-select"
              name="organizationType"
              value={formData.organizationType}
              onChange={handleInputChange}
            >
              <option value="ООО">ООО</option>
              <option value="ИП">ИП</option>
              <option value="АО">АО</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">ИНН</label>
            <input
              type="text"
              className="form-input"
              name="inn"
              value={formData.inn}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Юридическое название</label>
            <input
              type="text"
              className="form-input"
              name="legalName"
              value={formData.legalName}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" onClick={handleSave}>
          Сохранить изменения
        </button>
      </div>
    </div>
  )
}