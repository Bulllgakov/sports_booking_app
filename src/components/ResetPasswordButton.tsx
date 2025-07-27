import React, { useState } from 'react'
import { Button, CircularProgress, Snackbar, Alert } from '@mui/material'
import { LockReset } from '@mui/icons-material'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../services/firebase'

interface ResetPasswordButtonProps {
  email: string
  size?: 'small' | 'medium' | 'large'
}

export default function ResetPasswordButton({ email, size = 'small' }: ResetPasswordButtonProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleResetPassword = async () => {
    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setMessage({
        type: 'success',
        text: `Ссылка для сброса пароля отправлена на ${email}`
      })
    } catch (error: any) {
      console.error('Error sending password reset email:', error)
      setMessage({
        type: 'error',
        text: 'Ошибка при отправке письма. Попробуйте позже.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outlined"
        size={size}
        startIcon={loading ? <CircularProgress size={16} /> : <LockReset />}
        onClick={handleResetPassword}
        disabled={loading}
      >
        Сбросить пароль
      </Button>

      <Snackbar
        open={!!message}
        autoHideDuration={6000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {message && (
          <Alert 
            onClose={() => setMessage(null)} 
            severity={message.type}
            sx={{ width: '100%' }}
          >
            {message.text}
          </Alert>
        )}
      </Snackbar>
    </>
  )
}