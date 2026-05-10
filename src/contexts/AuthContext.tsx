import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchMe, loginApi, logoutApi } from '../lib/authApi'
import { clearToken, getToken } from '../lib/api'
import type { AuthUser } from '../lib/authApi'

type AuthState = {
  user: AuthUser | null
  permissions: string[]
  isLoading: boolean
  isAuthenticated: boolean
}

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    permissions: [],
    isLoading: true,
    isAuthenticated: false,
  })

  const isMounted = useRef(true)

  // On mount: try to restore session from existing token
  useEffect(() => {
    isMounted.current = true

    const token = getToken()
    if (!token) {
      setState((s) => ({ ...s, isLoading: false }))
      return
    }

    fetchMe()
      .then(({ user, permissions }) => {
        if (!isMounted.current) return
        setState({ user, permissions, isLoading: false, isAuthenticated: true })
      })
      .catch(() => {
        if (!isMounted.current) return
        clearToken()
        setState({ user: null, permissions: [], isLoading: false, isAuthenticated: false })
      })

    return () => {
      isMounted.current = false
    }
  }, [])

  // Listen for 401 dispatched by apiFetch
  useEffect(() => {
    const handler = () => {
      clearToken()
      setState({ user: null, permissions: [], isLoading: false, isAuthenticated: false })
    }
    window.addEventListener('auth:unauthorized', handler)
    return () => window.removeEventListener('auth:unauthorized', handler)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { user, permissions } = await loginApi(email, password)
    setState({ user, permissions, isLoading: false, isAuthenticated: true })
  }, [])

  const logout = useCallback(async () => {
    await logoutApi()
    setState({ user: null, permissions: [], isLoading: false, isAuthenticated: false })
  }, [])

  const hasPermission = useCallback(
    (permission: string) => {
      return state.permissions.includes('*') || state.permissions.includes(permission)
    },
    [state.permissions],
  )

  return (
    <AuthContext.Provider value={{ ...state, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

/**
 * Returns granular page-level permission flags for a given module.
 * Module examples: 'catalog', 'inbound', 'outbound', 'production',
 *   'purchase', 'warehouse', 'opening-stock', 'reports', 'users'
 */
export function usePagePermissions(module: string) {
  const { hasPermission } = useAuth()
  return {
    canView:   hasPermission(`${module}:view`),
    canDetail: hasPermission(`${module}:detail`),
    canWrite:  hasPermission(`${module}:write`),
    canDelete: hasPermission(`${module}:delete`),
  }
}
