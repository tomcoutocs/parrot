"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { AuthUser, getCurrentUser, setCurrentUser } from '@/lib/auth'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (user: AuthUser) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load user from localStorage on mount
    const currentUser = getCurrentUser()
    setUser(currentUser)
    setLoading(false)
  }, [])

  const signIn = (authUser: AuthUser) => {
    setUser(authUser)
    setCurrentUser(authUser)
  }

  const signOut = () => {
    setUser(null)
    setCurrentUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// For backward compatibility with existing components
export function SessionProvider({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

// Hook to mimic next-auth's useSession
export function useSession() {
  const auth = useAuth()
  const sessionData = auth.user ? {
    user: {
      id: auth.user.id,
      email: auth.user.email,
      name: auth.user.name,
      role: auth.user.role,
      assignedManagerId: auth.user.assignedManagerId,
      company_id: auth.user.companyId,
      tab_permissions: auth.user.tab_permissions || []
    }
  } : null
  
  return {
    data: sessionData,
    status: auth.loading ? 'loading' : auth.user ? 'authenticated' : 'unauthenticated'
  }
} 