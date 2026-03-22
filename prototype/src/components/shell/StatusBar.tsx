import { Cpu, HardDrive, Coins, Clock, Zap } from 'lucide-react';
import { useSystemMetrics, useSessionUsage } from '../../api/metrics';

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

export function StatusBar() {
  const { data: metrics } = useSystemMetrics();
  const { data: usage } = useSessionUsage();

  const cpu = metrics?.cpu ?? 0;
  const ram = metrics?.ram ?? 0;
  const uptime = metrics?.uptime ?? 0;
  const tokens = usage?.totalTokens ?? 0;
  const cost = usage?.estimatedCost ?? 0;

  return (
    <div className="h-6 shrink-0 flex items-center gap-4 px-3 border-t border-border-default bg-bg-base text-[10px] text-text-muted select-none">
      <span className="flex items-center gap-1">
        <Clock size={10} className="text-text-faint" />
        <span className="text-text-secondary">{formatUptime(uptime)}</span>
      </span>

      <span className="flex items-center gap-1">
        <Cpu size={10} className="text-text-faint" />
        <span>CPU</span>
        <span className="text-text-secondary">{cpu}%</span>
      </span>

      <span className="flex items-center gap-1">
        <HardDrive size={10} className="text-text-faint" />
        <span>RAM</span>
        <span className="text-text-secondary">{ram} MB</span>
      </span>

      <div className="ml-auto flex items-center gap-4">
        <span className="flex items-center gap-1">
          <Zap size={10} className="text-text-faint" />
          <span>Tokens</span>
          <span className="text-text-secondary">{formatTokens(tokens)}</span>
        </span>

        <span className="flex items-center gap-1">
          <Coins size={10} className="text-text-faint" />
          <span>Est.</span>
          <span className="text-accent-primary">${cost.toFixed(2)}</span>
        </span>
      </div>
    </div>
  );
}
