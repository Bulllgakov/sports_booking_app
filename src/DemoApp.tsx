import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, createTheme, CssBaseline, Alert, Box, IconButton } from '@mui/material'
import { Close } from '@mui/icons-material'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { ru } from 'date-fns/locale'
import { DemoAuthProvider } from './contexts/DemoAuthContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DemoBookingCalendar from './pages/DemoBookingCalendar'
import Courts from './pages/Courts'
import Customers from './pages/Customers'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import VenueSettings from './pages/admin/VenueSettings'
import DemoClubManagement from './pages/admin/DemoClubManagement'
import DemoSubscriptionManagement from './pages/admin/DemoSubscriptionManagement'
import DemoPaymentSettings from './pages/admin/DemoPaymentSettings'
import DemoFinance from './pages/admin/DemoFinance'
import DemoMarketing from './pages/admin/DemoMarketing'
import { DEMO_NOTIFICATION } from './data/demoData'

const theme = createTheme({
  palette: {
    primary: {
      main: '#00A86B',
      light: '#33C18A',
      dark: '#007A4D',
    },
    secondary: {
      main: '#2E86AB',
      light: '#5BA3C3',
      dark: '#1E5F7B',
    },
    background: {
      default: '#F8F9FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1F36',
      secondary: '#6B7280',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '1.75rem',
      fontWeight: 700,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '0.875rem',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          borderRadius: 12,
        },
      },
    },
  },
})

const DemoApp: React.FC = () => {
  const [showNotification, setShowNotification] = useState(DEMO_NOTIFICATION.show)

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
        <DemoAuthProvider>
          <Router basename="/demo">
            {showNotification && (
              <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
                <Alert 
                  severity={DEMO_NOTIFICATION.type as any} 
                  sx={{ borderRadius: 0, pr: 6 }}
                  action={
                    <IconButton
                      aria-label="close"
                      color="inherit"
                      size="small"
                      onClick={() => setShowNotification(false)}
                      sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                      <Close fontSize="inherit" />
                    </IconButton>
                  }
                >
                  {DEMO_NOTIFICATION.message}
                </Alert>
              </Box>
            )}
            <Box sx={{ pt: showNotification ? 6 : 0, transition: 'padding-top 0.3s' }}>
              <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="calendar" element={<DemoBookingCalendar />} />
                <Route path="club" element={<DemoClubManagement />} />
                <Route path="subscription" element={<DemoSubscriptionManagement />} />
                <Route path="payment-settings" element={<DemoPaymentSettings />} />
                <Route path="courts" element={<Courts />} />
                <Route path="customers" element={<Customers />} />
                <Route path="finance" element={<DemoFinance />} />
                <Route path="marketing" element={<DemoMarketing />} />
                <Route path="settings" element={<Settings />} />
                <Route path="venue-settings" element={<VenueSettings />} />
              </Route>
            </Routes>
            </Box>
          </Router>
        </DemoAuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  )
}

export default DemoApp