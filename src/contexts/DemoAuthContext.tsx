import React, { createContext, useContext } from 'react'
import { User } from 'firebase/auth'
import { DEMO_ADMIN, DEMO_CLUB } from '../data/demoData'

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
  isDemo: boolean
}

const DemoAuthContext = createContext<AuthContextType | undefined>(undefined)

export const useDemoAuth = () => {
  const context = useContext(DemoAuthContext)
  if (context === undefined) {
    throw new Error('useDemoAuth must be used within a DemoAuthProvider')
  }
  return context
}

export const DemoAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Создаем фейкового пользователя для демо
  const demoUser = {
    uid: 'demo-user',
    email: DEMO_ADMIN.email,
    displayName: DEMO_ADMIN.name,
    photoURL: null,
    emailVerified: true
  } as unknown as User

  const logout = async () => {
    // В демо-режиме просто перенаправляем на главную
    window.location.href = '/'
  }

  const value = {
    user: demoUser,
    admin: DEMO_ADMIN,
    club: DEMO_CLUB as ClubData,
    loading: false,
    logout,
    isDemo: true
  }

  return <DemoAuthContext.Provider value={value}>{children}</DemoAuthContext.Provider>
}