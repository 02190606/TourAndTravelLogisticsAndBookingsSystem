import { createContext } from 'react'
import type { AuthSession as Session } from '@supabase/supabase-js'
import type { User, UserRole } from '@/types'

export interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  error: string | null
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasRole: (roles: UserRole[]) => boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
