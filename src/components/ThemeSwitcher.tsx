import { Check, Palette } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { getThemeById, mapVSCodeColors } from '../themes';

export function ThemeSwitcher() {
  const { themeId, setThemeId, themes } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <div
        className={`p-2 rounded-lg cursor-pointer transition ${open ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'}`}
        title="Theme"
        onClick={() => setOpen(!open)}
      >
        <Palette size={20} />
      </div>

      {open && (
        <div className="absolute left-14 bottom-0 z-50 w-56 bg-bg-surface border border-border-default rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 text-xs font-bold uppercase text-text-muted tracking-wider">
            Theme
          </div>
          {themes.map((theme) => {
            const active = theme.id === themeId;
            const colors = getThemeById(theme.id);
            const mapped = colors ? mapVSCodeColors(colors.colors) : null;
            return (
              <div
                key={theme.id}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition ${active ? 'bg-accent-primary/10 text-text-primary' : 'text-text-default hover:bg-bg-hover'}`}
                onClick={() => {
                  setThemeId(theme.id);
                  setOpen(false);
                }}
              >
                {mapped && (
                  <div className="flex gap-1">
                    {(
                      [
                        'bg-base',
                        'bg-default',
                        'accent-primary',
                        'text-default',
                      ] as const
                    ).map((key) => (
                      <div
                        key={key}
                        className="w-3 h-3 rounded-full border border-border-subtle"
                        style={{ backgroundColor: mapped[key] }}
                      />
                    ))}
                  </div>
                )}
                <span className="text-sm flex-1">{theme.name}</span>
                {active && <Check size={14} className="text-accent-primary" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
