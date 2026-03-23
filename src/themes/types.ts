export type VSCodeThemeColors = Record<string, string>;

export interface AppTheme {
  'bg-base': string;
  'bg-default': string;
  'bg-surface': string;
  'bg-hover': string;
  'border-default': string;
  'border-muted': string;
  'border-subtle': string;
  'text-primary': string;
  'text-default': string;
  'text-secondary': string;
  'text-muted': string;
  'text-faint': string;
  'accent-primary': string;
  'accent-secondary': string;
  'status-success': string;
  'status-error': string;
  'status-warning': string;
}

export interface ThemeMeta {
  id: string;
  name: string;
  type: 'dark' | 'light';
}

export interface BundledTheme extends ThemeMeta {
  colors: VSCodeThemeColors;
}
