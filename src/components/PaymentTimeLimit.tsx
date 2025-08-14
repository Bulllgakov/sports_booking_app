import React, { useState, useEffect } from 'react'
import { AccessTime, Warning } from '@mui/icons-material'

interface PaymentTimeLimitProps {
  createdAt: Date
  paymentMethod: string
  paymentStatus?: string
}

export default function PaymentTimeLimit({ 
  createdAt, 
  paymentMethod, 
  paymentStatus 
}: PaymentTimeLimitProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    // Если уже оплачено или отменено, не показываем таймер
    if (paymentStatus === 'paid' || paymentStatus === 'cancelled') {
      return
    }

    // Для этих способов оплаты нет ограничения по времени
    if (paymentMethod === 'transfer' || 
        paymentMethod === 'cash' || 
        paymentMethod === 'card_on_site') {
      return
    }

    const calculateTimeLeft = () => {
      const now = new Date()
      const created = new Date(createdAt)
      const diffInMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60))
      
      let limitMinutes = 30 // По умолчанию 30 минут
      if (paymentMethod === 'online') {
        limitMinutes = 15 // Для онлайн оплаты 15 минут
      }
      
      const remainingMinutes = limitMinutes - diffInMinutes
      
      if (remainingMinutes <= 0) {
        setIsExpired(true)
        setTimeLeft(0)
      } else {
        setIsExpired(false)
        setTimeLeft(remainingMinutes)
      }
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 30000) // Обновляем каждые 30 секунд

    return () => clearInterval(interval)
  }, [createdAt, paymentMethod, paymentStatus])

  // Не показываем для оплаченных, отмененных или способов оплаты без ограничения по времени
  if (paymentStatus === 'paid' || 
      paymentStatus === 'cancelled' || 
      paymentMethod === 'transfer' ||
      paymentMethod === 'cash' || 
      paymentMethod === 'card_on_site') {
    return null
  }

  // Не показываем если нет ограничения по времени
  if (timeLeft === 0 && !isExpired) {
    return null
  }

  const getTimeDisplay = () => {
    if (isExpired) {
      return 'Время истекло'
    }
    
    if (timeLeft <= 5) {
      return `${timeLeft} мин`
    }
    
    return `${timeLeft} мин`
  }

  const getColorStyle = () => {
    if (isExpired) {
      return { color: 'var(--danger)', fontWeight: '600' }
    }
    if (timeLeft <= 5) {
      return { color: 'var(--warning)', fontWeight: '600' }
    }
    return { color: 'var(--gray)' }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '12px',
      ...getColorStyle()
    }}>
      {isExpired ? <Warning style={{ fontSize: '16px' }} /> : <AccessTime style={{ fontSize: '16px' }} />}
      <span>{getTimeDisplay()}</span>
    </div>
  )
}