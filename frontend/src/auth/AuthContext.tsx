import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { supabaseCommunity } from '../lib/supabaseCommunity'
import { Database } from '../lib/database.types'

type Member = Database['public']['Tables']['members']['Row']

interface AuthContextType {
  member: Member | null
  isLoading: boolean
  isAuthenticated: boolean
  logout: () => Promise<void>
  refreshMember: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [member, setMember] = useState<Member | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchMember = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabaseCommunity
        .from('members')
        .select('*')
        .eq('auth_uid', userId)
        .single()

      if (!error && data) {
        setMember(data)
      } else {
        setMember(null)
      }
    } catch (err) {
      console.error('Error fetching member:', err)
      setMember(null)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> => {
      return Promise.race([
        p,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
        ),
      ])
    }

    const initSession = async () => {
      console.log('[Auth] init: calling getSession()')
      try {
        const { data: { session } } = await withTimeout(
          supabaseCommunity.auth.getSession(),
          3000,
          'getSession'
        )
        if (!mounted) return
        console.log('[Auth] init: got session', session?.user?.id ? 'user=' + session.user.id : 'null')

        if (session?.user) {
          try {
            await withTimeout(fetchMember(session.user.id), 4000, 'fetchMember')
          } catch (err) {
            console.error('[Auth] fetchMember failed/timed out:', err)
            setMember(null)
          }
        } else {
          setMember(null)
        }
      } catch (err) {
        console.error('[Auth] init failed:', err)
        try {
          await supabaseCommunity.auth.signOut()
        } catch (signOutErr) {
          console.error('[Auth] signOut cleanup failed:', signOutErr)
        }
        if (mounted) setMember(null)
      } finally {
        if (mounted) {
          console.log('[Auth] init: clearing isLoading')
          setIsLoading(false)
        }
      }
    }

    initSession()

    const { data: { subscription } } = supabaseCommunity.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] onAuthStateChange:', event, session?.user?.id || 'no-user')
      if (event === 'INITIAL_SESSION') return
      if (!mounted) return

      try {
        if (session?.user) {
          await withTimeout(fetchMember(session.user.id), 4000, 'fetchMember(event)')
        } else {
          setMember(null)
        }
      } catch (err) {
        console.error('[Auth] state-change handler failed:', err)
        if (mounted) setMember(null)
      } finally {
        if (mounted) setIsLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchMember])

  const logout = useCallback(async () => {
    setMember(null)
    await supabaseCommunity.auth.signOut()
  }, [])

  const refreshMember = useCallback(async () => {
    const { data: { session } } = await supabaseCommunity.auth.getSession()
    if (session?.user) {
      await fetchMember(session.user.id)
    }
  }, [fetchMember])

  return (
    <AuthContext.Provider value={{
      member,
      isLoading,
      isAuthenticated: !!member,
      logout,
      refreshMember,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
