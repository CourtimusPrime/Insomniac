import type { AppTheme } from './types'

export function applyTheme(theme: AppTheme): void {
  const root = document.documentElement
  for (const [key, value] of Object.entries(theme)) {
    root.style.setProperty(`--color-${key}`, value)
  }
}
