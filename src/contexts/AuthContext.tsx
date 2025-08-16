import React, { createContext, useContext, useState, useEffect } from 'react'
import { onAuthStateChanged, signOut, User } from 'firebase/auth'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '../services/firebase'

interface AdminData {
  name: string
  email: string
  role: 'superadmin' | 'admin' | 'manager' | 'trainer'
  venueId?: string
  permissions: string[]
  trainerId?: string // ID связанного профиля тренера
}

interface ClubData {
  id: string
  name: string
  address: string
  phone: string
  email: string
  city?: string
  location?: any
  description?: string
  logoUrl?: string
  photos?: string[]
  amenities?: string[]
  organizationType?: string
  inn?: string
  bankAccount?: string
  legalName?: string
  ogrn?: string
  kpp?: string
  legalAddress?: string
  bankName?: string
  bankBik?: string
  bankCorrespondentAccount?: string
  directorName?: string
  directorPosition?: string
  workingHours?: any
  bookingDurations?: any
  bookingSlotInterval?: number
}

interface AuthContextType {
  user: User | null
  admin: AdminData | null
  club: ClubData | null
  loading: boolean
  logout: () => Promise<void>
  refreshClubData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [admin, setAdmin] = useState<AdminData | null>(null)
  const [club, setClub] = useState<ClubData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔄 Auth state changed:', user?.email || 'no user', 'at', new Date().toLocaleTimeString())
      
      // Добавляем логирование состояния аутентификации
      if (user) {
        console.log('🔐 User authenticated:', {
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          providerId: user.providerId,
          metadata: user.metadata
        })
      } else {
        console.log('🚪 User signed out or session expired')
        // Проверяем, есть ли токен в localStorage
        const token = localStorage.getItem('authToken')
        console.log('📦 Local storage auth token:', token ? 'exists' : 'not found')
      }
      
      if (user) {
        // Проверяем, является ли пользователь админом
        try {
          console.log('🔍 Searching for admin with email:', user.email)
          
          // Ищем админа по email
          const adminQuery = query(collection(db, 'admins'), where('email', '==', user.email))
          const adminSnapshot = await getDocs(adminQuery)
          
          console.log('📊 Admin search result:', adminSnapshot.empty ? 'not found' : 'found')
          
          if (!adminSnapshot.empty) {
            const adminDoc = adminSnapshot.docs[0]
            const adminData = { id: adminDoc.id, ...adminDoc.data() } as AdminData
            console.log('✅ Admin data loaded:', adminData)
            setUser(user)
            setAdmin(adminData)
            
            // Загружаем данные клуба (только для admin и manager)
            if (adminData.venueId) {
              const clubDoc = await getDoc(doc(db, 'venues', adminData.venueId))
              if (clubDoc.exists()) {
                setClub({ id: clubDoc.id, ...clubDoc.data() } as ClubData)
              }
            } else if (adminData.role === 'superadmin') {
              // Для суперадмина клуб не загружаем
              setClub(null)
            }
          } else {
            // Если не админ, просто сохраняем пользователя без админских прав
            console.warn('Admin not found for user:', user.email)
            setUser(user)
            setAdmin(null)
            setClub(null)
          }
        } catch (error) {
          console.error('Error fetching admin data:', error)
          setUser(null)
          setAdmin(null)
          setClub(null)
        }
      } else {
        setUser(null)
        setAdmin(null)
        setClub(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const logout = async () => {
    try {
      await signOut(auth)
      setUser(null)
      setAdmin(null)
      setClub(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const refreshClubData = async () => {
    if (admin?.venueId) {
      try {
        console.log('Refreshing club data for venue:', admin.venueId)
        const venueDoc = await getDoc(doc(db, 'venues', admin.venueId))
        if (venueDoc.exists()) {
          const venueData = venueDoc.data()
          console.log('Loaded venue data:', venueData)
          setClub({
            id: venueDoc.id,
            name: venueData.name || '',
            address: venueData.address || '',
            phone: venueData.phone || '',
            email: venueData.email || '',
            city: venueData.city || '',
            location: venueData.location,
            description: venueData.description,
            logoUrl: venueData.logoUrl,
            photos: venueData.photos || [],
            amenities: venueData.amenities,
            organizationType: venueData.organizationType,
            inn: venueData.inn,
            bankAccount: venueData.bankAccount,
            legalName: venueData.legalName,
            ogrn: venueData.ogrn,
            kpp: venueData.kpp,
            legalAddress: venueData.legalAddress,
            bankName: venueData.bankName,
            bankBik: venueData.bankBik,
            bankCorrespondentAccount: venueData.bankCorrespondentAccount,
            directorName: venueData.directorName,
            directorPosition: venueData.directorPosition,
            workingHours: venueData.workingHours,
            bookingDurations: venueData.bookingDurations,
            bookingSlotInterval: venueData.bookingSlotInterval,
          })
        }
      } catch (error) {
        console.error('Error refreshing club data:', error)
      }
    }
  }

  const value = {
    user,
    admin,
    club,
    loading,
    logout,
    refreshClubData,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}