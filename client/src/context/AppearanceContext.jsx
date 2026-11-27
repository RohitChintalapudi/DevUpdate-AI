/* eslint-disable react-refresh/only-export-components -- context + hook are intentionally co-located */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { applyAppearance, readAppearance, saveAppearance } from '../utils/appearanceSettings'

const AppearanceContext = createContext(null)

export function AppearanceProvider({ children }) {
  const [appearance, setAppearance] = useState(() => readAppearance())

  useEffect(() => {
    applyAppearance(appearance)
  }, [appearance])

  const updateAppearance = useCallback((patch) => {
    setAppearance((current) => saveAppearance({ ...current, ...patch }))
  }, [])

  const value = useMemo(() => ({ appearance, updateAppearance }), [appearance, updateAppearance])

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

export function useAppearance() {
  const context = useContext(AppearanceContext)
  if (!context) throw new Error('useAppearance must be used inside an AppearanceProvider')
  return context
}
