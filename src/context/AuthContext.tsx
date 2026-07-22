import { createContext, useContext, useReducer, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useMobileAutoLogout } from '@/hooks/useMobileAutoLogout'
import type { User, UserRole } from '@/types'

interface AuthState {
  user: User | null
  session: any | null
  isLoading: boolean
  error: string | null
}

type AuthAction =
  | { type: 'SET_USER'; payload: { user: User; session: any } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'LOGOUT' }

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasRole: (roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload.user, session: action.payload.session, isLoading: false, error: null }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    case 'LOGOUT':
      return { user: null, session: null, isLoading: false, error: null }
    default:
      return state
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    session: null,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUser(session.user.id, session)
      } else {
        dispatch({ type: 'LOGOUT' })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUser(session.user.id, session)
      } else {
        dispatch({ type: 'LOGOUT' })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchUser(userId: string, session: any) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      if (data) {
        dispatch({ type: 'SET_USER', payload: { user: data as User, session } })
      }
    } catch {
      dispatch({ type: 'LOGOUT' })
    }
  }

  async function login(email: string, password: string) {
    dispatch({ type: 'SET_LOADING', payload: true })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
      throw error
    }
    if (data.session) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (userData) {
        await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', data.user.id)
        dispatch({ type: 'SET_USER', payload: { user: userData as User, session: data.session } })
      }
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    dispatch({ type: 'LOGOUT' })
  }

  const logoutRef = useRef(logout)
  logoutRef.current = logout

  const stableLogout = useCallback(() => { logoutRef.current() }, [])
  useMobileAutoLogout(stableLogout)

  function hasRole(roles: UserRole[]): boolean {
    if (!state.user) return false
    return roles.includes(state.user.role)
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
