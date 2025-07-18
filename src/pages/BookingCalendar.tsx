import React from 'react'
import { Box, Typography, Alert } from '@mui/material'

const BookingCalendar: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Календарь бронирований
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        В демо-версии календарь показывает тестовые бронирования. В полной версии вы сможете управлять реальными бронированиями.
      </Alert>
      <Box sx={{ 
        height: 600, 
        background: 'linear-gradient(180deg, #f5f5f5 0%, #e0e0e0 100%)',
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Typography variant="h6" color="text.secondary">
          Календарь с расписанием кортов
        </Typography>
      </Box>
    </Box>
  )
}

export default BookingCalendar