import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { THEMES, DEFAULT_THEME_ID, getThemeById, mapVSCodeColors, applyTheme } from '../themes'
import type { ThemeMeta } from '../themes'

const STORAGE_KEY = 'insomniac-theme'

interface ThemeContextValue {
  themeId: string
  setThemeId: (id: string) => void
  themes: ThemeMeta[]
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function loadAndApply(id: string) {
  const theme = getThemeById(id)
  if (!theme) return
  const mapped = mapVSCodeColors(theme.colors)
  applyTheme(mapped)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved && getThemeById(saved) ? saved : DEFAULT_THEME_ID
  })

  const setThemeId = (id: string) => {
    setThemeIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  useEffect(() => {
    loadAndApply(themeId)
  }, [themeId])

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
