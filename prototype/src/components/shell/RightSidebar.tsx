import {
  CheckCircle2, AlertCircle, Circle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useLayoutStore } from '../../stores/layout';

const TIMELINE = [
  { label: 'Initialize repo', done: true },
  { label: 'Architecture draft', done: true },
  { label: 'Core logic sync', current: true },
  { label: 'Load balancing', done: false },
  { label: 'Security audit', done: false },
];

const AGENTS = [
  { name: 'Claude Code', task: 'Implementing gc.rs', pct: 67, model: 'Sonnet 4' },
  { name: 'Auditor', task: 'Awaiting decision', pct: 0, model: 'Sonnet 4', blocked: true },
];

export function RightSidebar() {
  const collapsed = useLayoutStore((s) => s.collapsedPanels.rightSidebar);
  const togglePanel = useLayoutStore((s) => s.togglePanel);

  return (
    <aside className={`border-l border-border-default flex flex-col shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out ${
      collapsed ? 'w-8' : 'w-72'
    }`}>
      {collapsed ? (
        <div className="w-8 flex flex-col items-center pt-3">
          <button
            onClick={() => togglePanel('rightSidebar')}
            className="p-1 rounded text-text-faint hover:text-text-default hover:bg-bg-hover transition"
            title="Expand sidebar"
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      ) : (
      <div className="w-72 min-w-[18rem] flex flex-col overflow-hidden h-full">

      {/* Collapse button */}
      <div className="flex items-center justify-end px-2 pt-1">
        <button
          onClick={() => togglePanel('rightSidebar')}
          className="p-1 rounded text-text-faint hover:text-text-default hover:bg-bg-hover transition"
          title="Collapse sidebar"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Decision queue */}
      <div className="p-4 border-b border-border-default">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={12} className="text-status-warning" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-status-warning/80">Decision needed</span>
        </div>
        <p className="text-[11px] text-text-default leading-relaxed mb-3">
          Hash collision detected in <span className="font-mono text-status-warning">aether_mem</span>. Switch algorithm to proceed with security audit.
        </p>
        <div className="space-y-1.5">
          {['Switch to SHA-256', 'Use Argon2 + salt', 'Defer (low risk)'].map(opt => (
            <button key={opt} className="w-full text-left text-[11px] px-3 py-2 rounded border border-border-muted hover:border-accent-primary/50 hover:bg-accent-primary/5 text-text-default transition">
              {opt}
            </button>
          ))}
          <button className="w-full text-left text-[11px] px-3 py-2 rounded border border-border-muted/50 hover:border-border-default text-text-faint hover:text-text-muted transition">
            Let agent decide
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-3">Pipeline stages</div>
        <ul className="space-y-2.5">
          {TIMELINE.map((item, i) => (
            <li key={i} className="flex items-center gap-3">
              {item.done
                ? <CheckCircle2 size={13} className="text-status-success shrink-0" />
                : item.current
                  ? <Circle size={13} className="text-accent-primary fill-accent-primary shrink-0 animate-pulse" />
                  : <Circle size={13} className="text-text-faint shrink-0" />
              }
              <span className={`text-[11px] ${item.done ? 'line-through text-text-faint' : item.current ? 'text-text-primary font-medium' : 'text-text-faint'}`}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Agent status strip */}
      <div className="p-4 border-t border-border-default space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Active agents</div>
        {AGENTS.map(agent => (
          <div key={agent.name} className="px-3 py-2 rounded-lg bg-bg-base border border-border-default">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-medium text-text-primary">{agent.name}</span>
              <span className={`text-[10px] ${agent.blocked ? 'text-status-warning' : 'text-status-success'}`}>
                {agent.blocked ? 'blocked' : 'running'}
              </span>
            </div>
            <div className="text-[10px] text-text-faint mt-0.5">{agent.task} · {agent.model}</div>
            {agent.pct > 0 && (
              <div className="mt-2 h-0.5 bg-bg-hover rounded-full overflow-hidden">
                <div className="h-full bg-accent-primary rounded-full" style={{ width: `${agent.pct}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>
      </div>
      )}
    </aside>
  );
}
