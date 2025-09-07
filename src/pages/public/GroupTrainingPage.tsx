import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, collection, addDoc, updateDoc, query, where, getDocs, Timestamp, increment, deleteDoc } from 'firebase/firestore'
import { db, functions } from '../../services/firebase'
import { httpsCallable } from 'firebase/functions'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import '../../styles/flutter-theme.css'

interface GroupTraining {
  id: string
  venueId: string
  venueName: string
  courtId: string
  courtName: string
  trainerId: string
  trainerName: string
  trainerPrice: number
  amount: number // Стоимость корта
  date: any // Timestamp
  startTime: string
  duration: number
  bookingType: 'group'
  maxParticipants: number
  currentParticipants: number
  visibility: 'public' | 'private'
  status: string
  pricePerPerson?: number // Цена с человека (если уже рассчитана)
  paymentMethod?: 'cash' | 'card_on_site' | 'transfer' | 'online' | 'sberbank_card' | 'tbank_card' | 'vtb_card'
}

interface Venue {
  id: string
  name: string
  address?: string
  phone?: string
  paymentEnabled?: boolean
  paymentProvider?: string
}

export default function GroupTrainingPage() {
  const { clubId, trainingId } = useParams<{ clubId: string; trainingId: string }>()
  const navigate = useNavigate()
  
  const [training, setTraining] = useState<GroupTraining | null>(null)
  const [venue, setVenue] = useState<Venue | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  // Form fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('+7')
  const [email, setEmail] = useState('')
  
  const [participants, setParticipants] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [clubId, trainingId])

  const loadData = async () => {
    if (!clubId || !trainingId) {
      setError('Некорректные параметры')
      setLoading(false)
      return
    }

    try {
      // Загружаем данные о групповой тренировке
      console.log('Loading training:', trainingId)
      const trainingDoc = await getDoc(doc(db, 'bookings', trainingId))
      if (!trainingDoc.exists()) {
        setError('Групповая тренировка не найдена')
        setLoading(false)
        return
      }

      const trainingData = {
        id: trainingDoc.id,
        ...trainingDoc.data()
      } as GroupTraining
      
      console.log('Training data loaded:', trainingData)

      // Проверяем, что это действительно групповая тренировка
      if (trainingData.bookingType !== 'group') {
        setError('Это не групповая тренировка')
        setLoading(false)
        return
      }

      // Проверяем статус
      if (trainingData.status === 'cancelled') {
        setError('Тренировка отменена')
        setLoading(false)
        return
      }

      // Рассчитываем цену с человека
      const courtPrice = trainingData.amount || 0
      const courtPricePerPerson = Math.round(courtPrice / trainingData.maxParticipants)
      const trainerPricePerPerson = trainingData.trainerPrice ? 
        Math.round(trainingData.trainerPrice / trainingData.maxParticipants) : 0
      const totalPricePerPerson = courtPricePerPerson + trainerPricePerPerson
      
      setTraining({
        ...trainingData,
        pricePerPerson: totalPricePerPerson
      })

      // Загружаем данные о клубе
      const venueDoc = await getDoc(doc(db, 'venues', clubId))
      if (venueDoc.exists()) {
        setVenue({
          id: venueDoc.id,
          ...venueDoc.data()
        } as Venue)
      }

      // Загружаем список участников (всех, не только оплаченных)
      console.log('Loading participants for training:', trainingId)
      const participantsQuery = query(
        collection(db, 'groupParticipants'),
        where('groupTrainingId', '==', trainingId)
      )
      const participantsSnapshot = await getDocs(participantsQuery)
      const participantsList = participantsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      console.log('Participants loaded:', participantsList)
      setParticipants(participantsList)

    } catch (err) {
      console.error('Error loading data:', err)
      setError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name || !phone) {
      alert('Заполните обязательные поля')
      return
    }

    if (!training || !venue) {
      alert('Ошибка загрузки данных')
      return
    }

    // Проверяем, есть ли свободные места
    if (training.currentParticipants >= training.maxParticipants) {
      alert('К сожалению, все места заняты')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Проверяем, нет ли уже участника с таким номером телефона
      const existingParticipantQuery = query(
        collection(db, 'groupParticipants'),
        where('groupTrainingId', '==', trainingId),
        where('phone', '==', phone.trim())
      )
      const existingParticipantSnapshot = await getDocs(existingParticipantQuery)
      
      if (!existingParticipantSnapshot.empty) {
        alert('Участник с таким номером телефона уже зарегистрирован на эту тренировку')
        setSubmitting(false)
        return
      }

      // Создаем запись участника
      const participantData = {
        groupTrainingId: trainingId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        paymentStatus: 'pending',
        paymentAmount: training.pricePerPerson,
        registeredAt: Timestamp.now()
      }

      const participantRef = await addDoc(collection(db, 'groupParticipants'), participantData)

      // Если выбрана онлайн оплата, инициализируем платеж
      if (training.paymentMethod === 'online' && venue.paymentEnabled && venue.paymentProvider) {
        try {
          const initPayment = httpsCallable(functions, 'initGroupParticipantPayment')
          const result = await initPayment({
            participantId: participantRef.id,
            groupTrainingId: trainingId,
            amount: training.pricePerPerson,
            customerName: name,
            customerPhone: phone,
            customerEmail: email,
            description: `Оплата участия в групповой тренировке ${format(training.date.toDate(), 'dd.MM.yyyy', { locale: ru })} в ${training.startTime}`,
            returnUrl: `${window.location.origin}/club/${clubId}/group/${trainingId}/success`
          })

          const paymentData = result.data as any
          if (paymentData.success && paymentData.paymentUrl) {
            // Сохраняем ID платежа
            await updateDoc(participantRef, {
              paymentId: paymentData.paymentId
            })
            
            // Перенаправляем на страницу оплаты
            window.location.href = paymentData.paymentUrl
          } else {
            throw new Error(paymentData.error || 'Ошибка инициализации платежа')
          }
        } catch (paymentError: any) {
          console.error('Payment initialization error:', paymentError)
          // Удаляем запись участника если платеж не удался инициализировать
          await deleteDoc(participantRef)
          throw new Error('Не удалось инициализировать платеж: ' + paymentError.message)
        }
      } else {
        // Если не онлайн оплата, регистрируем с ожиданием оплаты
        const finalPaymentStatus = training.paymentMethod && training.paymentMethod !== 'online' ? 'pending' : 'paid'
        await updateDoc(participantRef, {
          paymentStatus: finalPaymentStatus
        })
        
        // Увеличиваем счетчик участников
        await updateDoc(doc(db, 'bookings', trainingId!), {
          currentParticipants: increment(1)
        })
        
        if (training.paymentMethod && training.paymentMethod !== 'online') {
          alert('Вы успешно записались на тренировку! Оплатите участие выбранным способом.')
        } else {
          alert('Вы успешно записались на тренировку!')
        }
        // Перезагружаем страницу вместо перехода на страницу клуба
        window.location.reload()
      }
    } catch (err: any) {
      console.error('Registration error:', err)
      setError(err.message || 'Ошибка при регистрации')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: 'var(--background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--extra-light-gray)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>
          {`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    )
  }

  if (error && !training) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: 'var(--background)',
        padding: 'var(--spacing-xl)'
      }}>
        <div className="flutter-card" style={{ 
          maxWidth: '600px', 
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <h2 className="h2" style={{ marginBottom: 'var(--spacing-md)' }}>Ошибка</h2>
          <p className="body" style={{ 
            color: 'var(--text-secondary)',
            marginBottom: 'var(--spacing-xl)'
          }}>{error}</p>
          <button 
            className="flutter-button"
            style={{ minWidth: '200px' }}
            onClick={() => navigate(`/club/${clubId}`)}
          >
            Вернуться к клубу
          </button>
        </div>
      </div>
    )
  }

  if (!training || !venue) {
    return null
  }

  const availableSpots = training.maxParticipants - training.currentParticipants
  const isFull = availableSpots <= 0

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--background)',
      padding: 'var(--spacing-xl)'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="flutter-card" style={{ 
          marginBottom: 'var(--spacing-lg)',
          textAlign: 'center'
        }}>
          <h1 className="h2">{venue.name}</h1>
          <p className="body" style={{ color: 'var(--text-secondary)' }}>Групповая тренировка</p>
        </div>

        <div className="flutter-card" style={{ marginBottom: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
            <span className="body-small" style={{ color: 'var(--text-secondary)' }}>Тренер:</span>
            <span className="body-bold">{training.trainerName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
            <span className="body-small" style={{ color: 'var(--text-secondary)' }}>Дата:</span>
            <span className="body-bold">
              {format(training.date.toDate(), 'dd MMMM yyyy', { locale: ru })}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
            <span className="body-small" style={{ color: 'var(--text-secondary)' }}>Время:</span>
            <span className="body-bold">
              {training.startTime} ({training.duration} мин)
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
            <span className="body-small" style={{ color: 'var(--text-secondary)' }}>Корт:</span>
            <span className="body-bold">{training.courtName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
            <span className="body-small" style={{ color: 'var(--text-secondary)' }}>Стоимость с человека:</span>
            <span className="body-bold" style={{ color: 'var(--primary)', fontSize: 'var(--text-body-large)' }}>
              {training.pricePerPerson} ₽
            </span>
          </div>
          {/* Показываем расшифровку цены */}
          {training.pricePerPerson && training.amount && (
            <div style={{ 
              paddingLeft: 'var(--spacing-lg)', 
              fontSize: 'var(--text-body-small)', 
              color: 'var(--text-secondary)',
              marginBottom: 'var(--spacing-sm)'
            }}>
              <div>• Корт: {Math.round(training.amount / training.maxParticipants)} ₽</div>
              {training.trainerPrice > 0 && (
                <div>• Тренер: {Math.round(training.trainerPrice / training.maxParticipants)} ₽</div>
              )}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="body-small" style={{ color: 'var(--text-secondary)' }}>Участники:</span>
            <span className="body-bold">
              {training.currentParticipants} / {training.maxParticipants}
            </span>
          </div>
        </div>

        {/* Список участников */}
        <div className="flutter-card" style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h3 className="h3" style={{ marginBottom: 'var(--spacing-md)' }}>
            Зарегистрированные участники ({participants.length})
          </h3>
          {participants.length > 0 ? (
            <div style={{ display: 'grid', gap: 'var(--spacing-xs)' }}>
              {participants.map((p, index) => (
                <div key={p.id} style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                  padding: 'var(--spacing-sm)',
                  backgroundColor: 'var(--background)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--primary-dark)'
                  }}>
                    {index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {p.paymentStatus === 'paid' ? '✓ Оплачено' : 'Ожидает оплаты'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              padding: 'var(--spacing-lg)',
              textAlign: 'center',
              color: 'var(--text-secondary)'
            }}>
              Пока никто не записался
            </div>
          )}
        </div>

        {!isFull ? (
          <form onSubmit={handleSubmit} className="flutter-card" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <h3 className="h3" style={{ marginBottom: 'var(--spacing-lg)' }}>Регистрация на тренировку</h3>
            
            <div className="form-group">
              <label className="form-label">Ваше имя *</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Иванов"
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Телефон *</label>
              <input
                type="tel"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (999) 123-45-67"
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                disabled={submitting}
              />
            </div>

            {error && (
              <div style={{ 
                padding: 'var(--spacing-sm)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--error)',
                marginBottom: 'var(--spacing-md)'
              }}>{error}</div>
            )}

            <button 
              type="submit" 
              className="flutter-button"
              style={{ width: '100%' }}
              disabled={submitting}
            >
              {submitting ? 'Обработка...' : 
                training.paymentMethod === 'online' ? 
                  `Зарегистрироваться и оплатить ${training.pricePerPerson} ₽` : 
                  'Зарегистрироваться на тренировку'
              }
            </button>
          </form>
        ) : (
          <div className="flutter-card" style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
            <h3 className="h3" style={{ marginBottom: 'var(--spacing-sm)' }}>Регистрация закрыта</h3>
            <p className="body" style={{ color: 'var(--text-secondary)' }}>Все места на тренировку заняты</p>
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <button 
            className="flutter-button-outlined"
            style={{ minWidth: '200px' }}
            onClick={() => navigate(`/club/${clubId}`)}
          >
            Вернуться к клубу
          </button>
        </div>
      </div>
    </div>
  )
}