import type { VSCodeThemeColors, AppTheme } from './types'

interface TokenMapping {
  cssVar: keyof AppTheme
  sources: string[]
  fallback: string
}

const TOKEN_MAP: TokenMapping[] = [
  { cssVar: 'bg-base',          sources: ['sideBar.background', 'activityBar.background', 'terminal.background'], fallback: '#010409' },
  { cssVar: 'bg-default',       sources: ['editor.background', 'background'],                                     fallback: '#0d1117' },
  { cssVar: 'bg-surface',       sources: ['editorWidget.background', 'dropdown.background', 'input.background'],  fallback: '#161b22' },
  { cssVar: 'bg-hover',         sources: ['list.hoverBackground', 'toolbar.hoverBackground'],                     fallback: '#1f2937' },
  { cssVar: 'border-default',   sources: ['panel.border', 'sideBar.border', 'editorGroup.border'],                fallback: '#30363d' },
  { cssVar: 'border-muted',     sources: ['tab.border', 'editorGroupHeader.tabsBorder'],                          fallback: '#21262d' },
  { cssVar: 'border-subtle',    sources: ['input.border', 'checkbox.border'],                                     fallback: '#484f58' },
  { cssVar: 'text-primary',     sources: ['titleBar.activeForeground', 'editor.foreground', 'foreground'],        fallback: '#ffffff' },
  { cssVar: 'text-default',     sources: ['editor.foreground', 'foreground'],                                     fallback: '#c9d1d9' },
  { cssVar: 'text-secondary',   sources: ['descriptionForeground', 'editorLineNumber.foreground'],                fallback: '#8b949e' },
  { cssVar: 'text-muted',       sources: ['sideBar.foreground', 'titleBar.inactiveForeground'],                   fallback: '#6e7681' },
  { cssVar: 'text-faint',       sources: ['disabledForeground', 'editorWhitespace.foreground'],                   fallback: '#484f58' },
  { cssVar: 'accent-primary',   sources: ['focusBorder', 'button.background', 'progressBar.background'],          fallback: '#6366f1' },
  { cssVar: 'accent-secondary', sources: ['textLink.foreground', 'textLink.activeForeground'],                    fallback: '#818cf8' },
  { cssVar: 'status-success',   sources: ['testing.iconPassed', 'gitDecoration.addedResourceForeground', 'terminal.ansiGreen'], fallback: '#22c55e' },
  { cssVar: 'status-error',     sources: ['testing.iconFailed', 'errorForeground', 'terminal.ansiRed'],           fallback: '#ef4444' },
  { cssVar: 'status-warning',   sources: ['editorWarning.foreground', 'list.warningForeground', 'terminal.ansiYellow'], fallback: '#f59e0b' },
]

export function mapVSCodeColors(vscodeColors: VSCodeThemeColors): AppTheme {
  const result = {} as AppTheme
  for (const { cssVar, sources, fallback } of TOKEN_MAP) {
    const value = sources.find(s => vscodeColors[s])
    result[cssVar] = value ? vscodeColors[value] : fallback
  }
  return result
}
