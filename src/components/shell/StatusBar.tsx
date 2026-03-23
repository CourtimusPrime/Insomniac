import { Clock, Coins, Cpu, Globe, HardDrive, User, Zap } from 'lucide-react';
import {
  useAuthUser,
  useSessionUsage,
  useSystemInfo,
  useSystemMetrics,
} from '../../api/metrics';

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

const modeBadge = (mode: string) =>
  ({
    local: 'bg-status-success/20 text-status-success border-status-success/30',
    remote: 'bg-accent-primary/20 text-accent-primary border-accent-primary/30',
    hosted: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  })[mode] ?? 'bg-text-faint/20 text-text-faint border-text-faint/30';

const modeLabel = (mode: string) =>
  ({
    local: 'Local',
    remote: 'Remote',
    hosted: 'Hosted',
  })[mode] ?? mode;

export function StatusBar() {
  const { data: metrics } = useSystemMetrics();
  const { data: usage } = useSessionUsage();
  const { data: info } = useSystemInfo();
  const { data: authUser } = useAuthUser(info?.mode === 'hosted');

  const cpu = metrics?.cpu ?? 0;
  const ram = metrics?.ram ?? 0;
  const uptime = metrics?.uptime ?? 0;
  const tokens = usage?.totalTokens ?? 0;
  const cost = usage?.estimatedCost ?? 0;
  const mode = info?.mode ?? 'local';

  return (
    <div className="h-6 shrink-0 flex items-center gap-4 px-3 border-t border-border-default bg-bg-base text-[10px] text-text-muted select-none">
      <span
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${modeBadge(mode)}`}
      >
        {mode === 'local' && (
          <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
        )}
        {mode !== 'local' && <Globe size={9} />}
        <span>{modeLabel(mode)}</span>
      </span>

      {mode === 'hosted' && authUser?.username && (
        <span className="flex items-center gap-1 text-text-secondary">
          <User size={10} className="text-text-faint" />
          <span>{authUser.username}</span>
        </span>
      )}

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
