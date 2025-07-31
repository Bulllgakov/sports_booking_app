import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './layouts/AdminLayout'
import Login from './pages/admin/Login'
import RegisterClub from './pages/admin/RegisterClub'
import Dashboard from './pages/admin/Dashboard'
import ClubManagement from './pages/admin/ClubManagement'
import CourtsManagement from './pages/admin/CourtsManagement'
import BookingsManagement from './pages/admin/BookingsManagement'
import CustomersManagement from './pages/admin/CustomersManagement'
import Home from './pages/Home'
import AdminsManagement from './pages/admin/AdminsManagement'
import VenuesManagement from './pages/admin/VenuesManagement'
import Subscription from './pages/admin/Subscription'
import SubscriptionManagement from './pages/admin/SubscriptionManagement'
import PaymentSettings from './pages/admin/PaymentSettings'
import BillingSettings from './pages/admin/BillingSettings'
import Finance from './pages/admin/Finance'
import Marketing from './pages/admin/Marketing'
import Settings from './pages/admin/Settings'
import Debug from './pages/admin/Debug'
import ErrorBoundary from './components/ErrorBoundary'
// Public pages
import ClubPage from './pages/public/ClubPage'
import DateSelectionPage from './pages/public/DateSelectionPage'
import TimeSelectionPage from './pages/public/TimeSelectionPage'
import GameTypeSelectionPage from './pages/public/GameTypeSelectionPage'
import BookingConfirmationPage from './pages/public/BookingConfirmationPage'
import UnifiedBookingPage from './pages/public/UnifiedBookingPage'
import UserAgreement from './pages/public/UserAgreement'

const theme = createTheme({
  palette: {
    primary: {
      main: '#00A86B', // Основной цвет Все Корты
    },
    secondary: {
      main: '#1A1F36', // Темный из дизайн-системы
    },
    success: {
      main: '#10B981',
    },
    warning: {
      main: '#F59E0B',
    },
    error: {
      main: '#EF4444',
    },
    background: {
      default: '#F8F9FA',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
  },
})

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <AuthProvider>
          <Router>
            <Routes>
            {/* Перенаправление с корня на дашборд */}
            <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
            
            {/* Страница для информации (доступна всем) */}
            <Route path="/info" element={<Home />} />
            
            {/* Публичные страницы бронирования */}
            <Route path="/club/:clubId" element={<ClubPage />} />
            <Route path="/club/:clubId/court/:courtId/booking" element={<UnifiedBookingPage />} />
            <Route path="/club/:clubId/court/:courtId/date" element={<DateSelectionPage />} />
            <Route path="/club/:clubId/court/:courtId/time" element={<TimeSelectionPage />} />
            <Route path="/club/:clubId/court/:courtId/game-type" element={<GameTypeSelectionPage />} />
            <Route path="/club/:clubId/booking-confirmation/:bookingId" element={<BookingConfirmationPage />} />
            <Route path="/club/:clubId/user-agreement" element={<UserAgreement />} />
            
            {/* Публичные маршруты */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RegisterClub />} />
            
            {/* Редиректы для обратной совместимости */}
            <Route path="/admin/login" element={<Navigate to="/login" replace />} />
            <Route path="/admin/register" element={<Navigate to="/register" replace />} />
            
            {/* Защищенные админские маршруты */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="venues" element={<VenuesManagement />} />
              <Route path="billing-settings" element={<BillingSettings />} />
              <Route path="admins" element={<AdminsManagement />} />
              <Route path="club" element={<ClubManagement />} />
              <Route path="subscription" element={<SubscriptionManagement />} />
              <Route path="payment-settings" element={<PaymentSettings />} />
              <Route path="courts" element={<CourtsManagement />} />
              <Route path="bookings" element={<BookingsManagement />} />
              <Route path="finance" element={<Finance />} />
              <Route path="customers" element={<CustomersManagement />} />
              <Route path="marketing" element={<Marketing />} />
              <Route path="settings" element={<Settings />} />
              <Route path="debug" element={<Debug />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
    </ThemeProvider>
  )
}

export default App