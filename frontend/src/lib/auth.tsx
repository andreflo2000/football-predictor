'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase, OxianoUser, getCurrentUserWithRole } from './supabase'
import { Session } from '@supabase/supabase-js'

interface AuthContextValue {
  user: OxianoUser | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<OxianoUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session) {
        const u = await getCurrentUserWithRole()
        setUser(u)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session) {
        const u = await getCurrentUserWithRole()
        setUser(u)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function canAccessAnalyst(role: string) {
  return ['analyst', 'pro', 'owner'].includes(role)
}

export function canAccessPro(role: string) {
  return ['pro', 'owner'].includes(role)
}
