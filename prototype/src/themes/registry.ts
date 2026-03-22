import type { BundledTheme } from './types'
import githubDark from './data/github-dark.json'
import oneDarkPro from './data/one-dark-pro.json'
import catppuccinMocha from './data/catppuccin-mocha.json'
import dracula from './data/dracula.json'
import tokyoNight from './data/tokyo-night.json'

export const DEFAULT_THEME_ID = 'github-dark'

export const THEMES: BundledTheme[] = [
  { id: 'github-dark',      name: 'GitHub Dark',      type: 'dark', colors: githubDark },
  { id: 'one-dark-pro',     name: 'One Dark Pro',     type: 'dark', colors: oneDarkPro },
  { id: 'catppuccin-mocha', name: 'Catppuccin Mocha', type: 'dark', colors: catppuccinMocha },
  { id: 'dracula',          name: 'Dracula',          type: 'dark', colors: dracula },
  { id: 'tokyo-night',      name: 'Tokyo Night',      type: 'dark', colors: tokyoNight },
]

export function getThemeById(id: string) {
  return THEMES.find(t => t.id === id)
}
