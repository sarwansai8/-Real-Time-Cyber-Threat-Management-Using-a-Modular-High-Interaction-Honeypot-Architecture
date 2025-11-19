'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export interface PatientProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  bloodType: string
  emergencyContact: string
  registeredDate: string
}

interface AuthContextType {
  user: PatientProfile | null
  isLoggedIn: boolean
  setUser: (user: PatientProfile | null) => void
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, profile: Omit<PatientProfile, 'id' | 'registeredDate'>) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PatientProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load user session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Login failed')
    }

    const data = await response.json()
    setUser(data.user)
    
    // Keep localStorage backup for backward compatibility
    localStorage.setItem('medicalPortalUser', JSON.stringify(data.user))
  }

  const register = async (email: string, password: string, profile: Omit<PatientProfile, 'id' | 'registeredDate'>) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password,
        ...profile
      })
    })

    if (!response.ok) {
      const error = await response.json()
      // Include validation details if available
      const errorMessage = error.details 
        ? `${error.error}: ${error.details.join(', ')}`
        : error.error || 'Registration failed'
      throw new Error(errorMessage)
    }

    const data = await response.json()
    setUser(data.user)
    
    // Keep localStorage backup for backward compatibility
    localStorage.setItem('medicalPortalUser', JSON.stringify(data.user))
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    }
    
    setUser(null)
    localStorage.removeItem('medicalPortalUser')
  }

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, setUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
