import { useState, useEffect } from 'react';
import { Cpu, HardDrive, Coins, Clock, Zap } from 'lucide-react';

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function StatusBar() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="h-6 shrink-0 flex items-center gap-4 px-3 border-t border-border-default bg-bg-base text-[10px] text-text-muted select-none">
      <span className="flex items-center gap-1">
        <Clock size={10} className="text-text-faint" />
        <span className="text-text-secondary">{formatUptime(elapsed)}</span>
      </span>

      <span className="flex items-center gap-1">
        <Cpu size={10} className="text-text-faint" />
        <span>CPU</span>
        <span className="text-text-secondary">12%</span>
      </span>

      <span className="flex items-center gap-1">
        <HardDrive size={10} className="text-text-faint" />
        <span>RAM</span>
        <span className="text-text-secondary">384 MB</span>
      </span>

      <div className="ml-auto flex items-center gap-4">
        <span className="flex items-center gap-1">
          <Zap size={10} className="text-text-faint" />
          <span>Tokens</span>
          <span className="text-text-secondary">128,441</span>
        </span>

        <span className="flex items-center gap-1">
          <Coins size={10} className="text-text-faint" />
          <span>Est.</span>
          <span className="text-accent-primary">$0.42</span>
        </span>
      </div>
    </div>
  );
}
