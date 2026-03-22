import { Sparkles, Play } from 'lucide-react';
import { useProjectsStore } from '../../stores/projects';
import { useProjects } from '../../api/projects';

const BACKSEAT = [
  { type: 'security', severity: 'critical', file: 'src/auth/hash.rs', msg: 'SHA-1 collision risk in password hashing. Recommend SHA-256 or Argon2.' },
  { type: 'performance', severity: 'warning', file: 'src/mem/gc.rs', msg: 'Garbage collector called synchronously in hot path. Consider async scheduling.' },
  { type: 'coverage', severity: 'info', file: 'src/net/socket.rs', msg: '4 exported functions have no test coverage.' },
];

const severityColor = (s: string) => ({
  critical: 'text-status-error bg-status-error/10 border-status-error/30',
  warning: 'text-status-warning bg-status-warning/10 border-status-warning/30',
  info: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
}[s]);

export function BackseatView() {
  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const { data: projects } = useProjects();
  const activeProject = projects?.find(p => p.id === activeProjectId);

  return (
    <div className="p-5 space-y-3 max-w-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={14} className="text-accent-secondary" />
        <span className="text-xs text-text-secondary">Monitoring <span className="text-text-primary">{activeProject?.name ?? 'No project'}</span> · Last scan 2m ago · {BACKSEAT.length} recommendations</span>
      </div>
      {BACKSEAT.map((r, i) => (
        <div key={i} className={`rounded-lg border px-4 py-3 ${severityColor(r.severity)}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold border ${severityColor(r.severity)}`}>{r.severity}</span>
                <span className="text-[10px] text-text-muted">{r.type}</span>
                <span className="text-[10px] font-mono text-text-muted">{r.file}</span>
              </div>
              <p className="text-xs text-text-default">{r.msg}</p>
            </div>
            <button className="shrink-0 px-3 py-1.5 text-[11px] bg-bg-hover hover:bg-bg-surface text-text-default rounded border border-border-muted transition flex items-center gap-1.5">
              <Play size={10} />
              Run this
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
