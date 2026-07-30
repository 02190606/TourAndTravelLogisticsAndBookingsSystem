import { useContext } from 'react'
import { AuthContext } from '@/context/auth'
import type { AuthContextType } from '@/context/auth'

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
