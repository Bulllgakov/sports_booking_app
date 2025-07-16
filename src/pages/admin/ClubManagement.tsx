import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../services/firebase'

export default function ClubManagement() {
  const { club, admin } = useAuth()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    description: '',
    amenities: {
      showers: false,
      parking: false,
      cafe: false,
      proshop: false,
      lockers: false,
    },
    organizationType: '',
    inn: '',
    bankAccount: '',
  })

  useEffect(() => {
    if (club) {
      setFormData({
        name: club.name || '',
        phone: club.phone || '',
        address: club.address || '',
        description: club.description || '',
        amenities: {
          showers: club.amenities?.includes('showers') || false,
          parking: club.amenities?.includes('parking') || false,
          cafe: club.amenities?.includes('cafe') || false,
          proshop: club.amenities?.includes('proshop') || false,
          lockers: club.amenities?.includes('lockers') || false,
        },
        organizationType: club.organizationType || '',
        inn: club.inn || '',
        bankAccount: club.bankAccount || '',
      })
    }
  }, [club])

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !admin?.venueId) return

    try {
      setLoading(true)
      const storageRef = ref(storage, `clubs/${admin.venueId}/logo.${file.name.split('.').pop()}`)
      const snapshot = await uploadBytes(storageRef, file)
      const logoUrl = await getDownloadURL(snapshot.ref)
      
      await updateDoc(doc(db, 'venues', admin.venueId), { logoUrl })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error uploading logo:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!admin?.venueId) return

    try {
      setLoading(true)
      
      const amenitiesList = Object.entries(formData.amenities)
        .filter(([_, value]) => value)
        .map(([key]) => key)

      await updateDoc(doc(db, 'venues', admin.venueId), {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        description: formData.description,
        amenities: amenitiesList,
        organizationType: formData.organizationType,
        inn: formData.inn,
        bankAccount: formData.bankAccount,
        updatedAt: new Date(),
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error updating club:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="section-card">
        <h2 className="section-title">Информация о клубе</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Логотип клуба</label>
            <div className="logo-uploader" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div className="logo-preview" style={{
                width: '120px',
                height: '120px',
                border: '2px dashed var(--extra-light-gray)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                background: 'var(--background)'
              }}>
                {club?.logoUrl ? (
                  <img src={club.logoUrl} alt={club.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--gray)' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--light-gray)">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                    </svg>
                    <p style={{ fontSize: '12px', marginTop: '8px' }}>Нажмите для загрузки</p>
                  </div>
                )}
              </div>
              <div>
                <button 
                  type="button"
                  className="btn btn-primary" 
                  onClick={() => document.getElementById('logoInput')?.click()}
                  disabled={loading}
                >
                  Загрузить логотип
                </button>
                <input 
                  type="file" 
                  id="logoInput" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handleLogoUpload}
                />
                <p className="form-hint">Рекомендуемый размер: 500x500px<br/>Максимум 2MB. PNG, JPG или SVG</p>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="form-group">
              <label className="form-label">Название клуба</label>
              <input 
                type="text" 
                className="form-input" 
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Телефон</label>
              <input 
                type="tel" 
                className="form-input" 
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Адрес</label>
            <input 
              type="text" 
              className="form-input" 
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              required
            />
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
          
          <div className="form-group">
            <label className="form-label">Удобства</label>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.amenities.showers}
                  onChange={() => handleAmenityChange('showers')}
                /> 
                Душевые
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.amenities.parking}
                  onChange={() => handleAmenityChange('parking')}
                /> 
                Парковка
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.amenities.cafe}
                  onChange={() => handleAmenityChange('cafe')}
                /> 
                Кафе
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.amenities.proshop}
                  onChange={() => handleAmenityChange('proshop')}
                /> 
                Pro Shop
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.amenities.lockers}
                  onChange={() => handleAmenityChange('lockers')}
                /> 
                Раздевалки
              </label>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>
              Отмена
            </button>
          </div>
          
          {success && (
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              background: 'rgba(16, 185, 129, 0.1)', 
              color: 'var(--success)',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              ✅ Изменения успешно сохранены
            </div>
          )}
        </form>
      </div>
      
      <div className="section-card">
        <h2 className="section-title">Настройки платежей</h2>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '16px',
          background: 'var(--background)',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: 'var(--gray)' }}>Ваш доход с каждого платежа:</span>
            <span style={{ fontWeight: '600', color: 'var(--primary)' }}>95.5%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: 'var(--gray)' }}>Комиссия платформы:</span>
            <span style={{ fontWeight: '600' }}>2%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: 'var(--gray)' }}>Комиссия Т-Касса:</span>
            <span style={{ fontWeight: '600' }}>2.5%</span>
          </div>
        </div>
        
        <div className="form-group" style={{ marginTop: '24px' }}>
          <label className="form-label">Тип организации</label>
          <select 
            className="form-select"
            name="organizationType"
            value={formData.organizationType}
            onChange={handleInputChange}
          >
            <option value="">Выберите тип</option>
            <option value="ooo">ООО</option>
            <option value="ip">ИП</option>
            <option value="self">Самозанятый</option>
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
            placeholder="Введите ИНН"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Расчетный счет</label>
          <input 
            type="text" 
            className="form-input" 
            name="bankAccount"
            value={formData.bankAccount}
            onChange={handleInputChange}
            placeholder="40702810900000123456"
          />
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          padding: '16px', 
          background: 'var(--background)', 
          borderRadius: '8px' 
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--success)">
            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
          </svg>
          <div>
            <div style={{ fontWeight: '600', color: 'var(--success)' }}>Платежи подключены</div>
            <div style={{ fontSize: '14px', color: 'var(--gray)' }}>Верификация пройдена 15.01.2025</div>
          </div>
        </div>
      </div>
    </div>
  )
}