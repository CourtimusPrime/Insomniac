import { Check, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '../hooks/useTheme';
import { getThemeById, mapVSCodeColors } from '../themes';

export function ThemeSwitcher() {
  const { themeId, setThemeId, themes } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover data-[state=open]:bg-accent-primary/10 data-[state=open]:text-accent-primary"
          title="Theme"
        >
          <Palette size={20} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="right"
        align="end"
        className="w-56 bg-bg-surface border-border-default"
      >
        <div className="p-2 text-xs font-bold uppercase text-text-muted tracking-wider">
          Theme
        </div>
        {themes.map((theme) => {
          const active = theme.id === themeId;
          const colors = getThemeById(theme.id);
          const mapped = colors ? mapVSCodeColors(colors.colors) : null;
          return (
            <DropdownMenuItem
              key={theme.id}
              className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${active ? 'bg-accent-primary/10 text-text-primary' : 'text-text-default'}`}
              onClick={() => setThemeId(theme.id)}
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
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
