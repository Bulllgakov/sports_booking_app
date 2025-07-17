import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './layouts/AdminLayout'
import Login from './pages/admin/Login'
import Dashboard from './pages/admin/Dashboard'
import ClubManagement from './pages/admin/ClubManagement'
import CourtsManagement from './pages/admin/CourtsManagement'
import BookingsManagement from './pages/admin/BookingsManagement'
import CustomersManagement from './pages/admin/CustomersManagement'
import Home from './pages/Home'
import AdminsManagement from './pages/admin/AdminsManagement'
import VenuesManagement from './pages/admin/VenuesManagement'

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
      <AuthProvider>
        <Router>
          <Routes>
            {/* Перенаправление с корня на админку */}
            <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
            
            {/* Страница для информации (доступна всем) */}
            <Route path="/info" element={<Home />} />
            
            {/* Админские маршруты */}
            <Route path="/admin/login" element={<Login />} />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="venues" element={<VenuesManagement />} />
              <Route path="admins" element={<AdminsManagement />} />
              <Route path="club" element={<ClubManagement />} />
              <Route path="courts" element={<CourtsManagement />} />
              <Route path="bookings" element={<BookingsManagement />} />
              <Route path="finance" element={<div>Финансы</div>} />
              <Route path="customers" element={<CustomersManagement />} />
              <Route path="marketing" element={<div>Маркетинг</div>} />
              <Route path="settings" element={<div>Настройки</div>} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App