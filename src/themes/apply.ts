import type { AppTheme } from './types';

/** Maps ShadCN variable names to the AppTheme key they should mirror. */
const SHADCN_BRIDGE: Record<string, keyof AppTheme> = {
  '--color-background': 'bg-default',
  '--color-foreground': 'text-default',
  '--color-card': 'bg-surface',
  '--color-card-foreground': 'text-primary',
  '--color-popover': 'bg-surface',
  '--color-popover-foreground': 'text-primary',
  '--color-primary': 'accent-primary',
  '--color-secondary': 'bg-surface',
  '--color-secondary-foreground': 'text-default',
  '--color-muted': 'bg-hover',
  '--color-muted-foreground': 'text-muted',
  '--color-accent': 'bg-hover',
  '--color-accent-foreground': 'text-primary',
  '--color-destructive': 'status-error',
  '--color-border': 'border-default',
  '--color-input': 'border-default',
  '--color-ring': 'accent-primary',
  '--color-sidebar': 'bg-base',
  '--color-sidebar-foreground': 'text-default',
  '--color-sidebar-primary': 'accent-primary',
  '--color-sidebar-accent': 'bg-hover',
  '--color-sidebar-accent-foreground': 'text-primary',
  '--color-sidebar-border': 'border-default',
  '--color-sidebar-ring': 'accent-primary',
};

export function applyTheme(theme: AppTheme): void {
  const root = document.documentElement;

  // Set existing --color-* variables
  for (const [key, value] of Object.entries(theme)) {
    root.style.setProperty(`--color-${key}`, value);
  }

  // Set ShadCN bridge variables so theme switching works for ShadCN components
  for (const [cssVar, themeKey] of Object.entries(SHADCN_BRIDGE)) {
    root.style.setProperty(cssVar, theme[themeKey]);
  }
}
