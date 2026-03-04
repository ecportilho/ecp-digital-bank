import { useState, useEffect, useCallback } from 'react'
import { api, ApiError } from '../services/api'

interface User {
  id: string
  name: string
  email: string
  cpf: string
  phone?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface LoginInput {
  email: string
  password: string
}

interface RegisterInput {
  name: string
  email: string
  cpf: string
  password: string
  phone?: string
}

interface AuthResponse {
  token: string
  user: User
}

const TOKEN_KEY = 'ecp_token'
const USER_KEY = 'ecp_user'

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    const userJson = localStorage.getItem(USER_KEY)
    const user = userJson ? (JSON.parse(userJson) as User) : null

    return {
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading: false,
    }
  })

  const setAuth = useCallback((token: string, user: User) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setState({ user, token, isAuthenticated: true, isLoading: false })
  }, [])

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false })
  }, [])

  const login = useCallback(
    async (input: LoginInput) => {
      setState((s) => ({ ...s, isLoading: true }))
      try {
        const response = await api.post<AuthResponse>('/api/auth/login', input, {
          skipAuth: true,
        })
        setAuth(response.token, response.user)
        return response
      } catch (err) {
        setState((s) => ({ ...s, isLoading: false }))
        throw err
      }
    },
    [setAuth]
  )

  const register = useCallback(
    async (input: RegisterInput) => {
      setState((s) => ({ ...s, isLoading: true }))
      try {
        const response = await api.post<AuthResponse>('/api/auth/register', input, {
          skipAuth: true,
        })
        setAuth(response.token, response.user)
        return response
      } catch (err) {
        setState((s) => ({ ...s, isLoading: false }))
        throw err
      }
    },
    [setAuth]
  )

  const logout = useCallback(() => {
    clearAuth()
  }, [clearAuth])

  // Validate token on mount
  useEffect(() => {
    if (state.token && !state.user) {
      api
        .get<{ user: User }>('/api/auth/me')
        .then((res) => {
          setState((s) => ({ ...s, user: res.user, isAuthenticated: true }))
        })
        .catch(() => {
          clearAuth()
        })
    }
  }, [state.token, state.user, clearAuth])

  return {
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    login,
    register,
    logout,
  }
}
