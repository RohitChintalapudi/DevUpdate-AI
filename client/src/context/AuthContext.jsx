/* eslint-disable react-refresh/only-export-components -- context + hook are intentionally co-located */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi, getErrorMessage, initializeCsrf } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initializationError, setInitializationError] = useState('')

  const refreshUser = useCallback(async () => {
    try {
      const data = await authApi.me()
      setUser(data.user)
      return data.user
    } catch {
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    let active = true
    const bootstrap = async () => {
      try {
        await initializeCsrf()
        const data = await authApi.session()
        if (active) setUser(data.user)
      } catch (error) {
        if (active) {
          setUser(null)
          // A failed session check simply means "not signed in"; connectivity
          // issues are surfaced by the individual forms instead.
          if (error?.code === 'ERR_NETWORK') {
            setInitializationError('The API is unavailable. Start the backend to enable sign in.')
          }
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    bootstrap()
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials)
    setUser(data.user)
    return data
  }, [])

  const signup = useCallback(async (payload) => {
    const data = await authApi.signup(payload)
    setUser(data.user)
    return data
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const updateProfile = useCallback(async (payload) => {
    const data = await authApi.updateProfile(payload)
    setUser(data.user)
    return data
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      initializationError,
      isAuthenticated: Boolean(user),
      login,
      signup,
      logout,
      refreshUser,
      updateProfile,
      getErrorMessage,
    }),
    [user, loading, initializationError, login, signup, logout, refreshUser, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside an AuthProvider')
  return context
}
