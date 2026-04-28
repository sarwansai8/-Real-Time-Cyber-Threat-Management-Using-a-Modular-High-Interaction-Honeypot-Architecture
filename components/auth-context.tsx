'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { PublicUser } from '@/lib/types'

export type PatientProfile = PublicUser

interface AuthContextType {
  user: PatientProfile | null
  isLoggedIn: boolean
  isLoading: boolean
  setUser: (user: PatientProfile | null) => void
  login: (email: string, password: string) => Promise<PatientProfile>
  register: (
    email: string,
    password: string,
    profile: Omit<PatientProfile, 'id' | 'registeredDate' | 'email' | 'role' | 'verified'>
  ) => Promise<PatientProfile>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PatientProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    void checkAuth()
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
    return data.user
  }

  const register = async (
    email: string,
    password: string,
    profile: Omit<PatientProfile, 'id' | 'registeredDate' | 'email' | 'role' | 'verified'>
  ) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        ...profile
      })
    })

    if (!response.ok) {
      const error = await response.json()
      const errorMessage = error.details
        ? `${error.error}: ${error.details.join(', ')}`
        : error.error || 'Registration failed'
      throw new Error(errorMessage)
    }

    const data = await response.json()
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    }

    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, isLoading, setUser, login, register, logout }}>
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
