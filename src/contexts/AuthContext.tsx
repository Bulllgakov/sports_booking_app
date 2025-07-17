import React, { createContext, useContext, useState, useEffect } from 'react'
import { onAuthStateChanged, signOut, User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../services/firebase'

interface AdminData {
  name: string
  email: string
  role: 'superadmin' | 'admin' | 'manager'
  venueId?: string
  permissions: string[]
}

interface ClubData {
  id: string
  name: string
  address: string
  phone: string
  email: string
  description?: string
  logoUrl?: string
  amenities?: string[]
  organizationType?: string
  inn?: string
  bankAccount?: string
}

interface AuthContextType {
  user: User | null
  admin: AdminData | null
  club: ClubData | null
  loading: boolean
  logout: () => Promise<void>
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
      if (user) {
        // Проверяем, является ли пользователь админом
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid))
          if (adminDoc.exists()) {
            const adminData = adminDoc.data() as AdminData
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
            // Если не админ, выходим
            await signOut(auth)
            setUser(null)
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

  const value = {
    user,
    admin,
    club,
    loading,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}