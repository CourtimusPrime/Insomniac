import {
  CheckCircle2, AlertCircle, Circle, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { useLayoutStore } from '../../stores/layout';
import { useProjectsStore } from '../../stores/projects';
import { useDecisions, useResolveDecision } from '../../api/decisions';
import type { Decision } from '../../api/decisions';
import { useActiveAgents } from '../../api/agents';

const TIMELINE = [
  { label: 'Initialize repo', done: true },
  { label: 'Architecture draft', done: true },
  { label: 'Core logic sync', current: true },
  { label: 'Load balancing', done: false },
  { label: 'Security audit', done: false },
];

function DecisionCard({ decision, projectId }: { decision: Decision; projectId: string }) {
  const resolveDecision = useResolveDecision(projectId);
  const options = (decision.options as string[] | null) ?? [];

  const handleResolve = (resolution: string, autoDecide?: boolean) => {
    resolveDecision.mutate({ decisionId: decision.id, resolution, autoDecide });
  };

  return (
    <div className="p-4 border-b border-border-default">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle size={12} className="text-status-warning" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-status-warning/80">Decision needed</span>
      </div>
      <p className="text-[11px] text-text-default leading-relaxed mb-3">
        {decision.question}
      </p>
      <div className="space-y-1.5">
        {options.map((opt: string) => (
          <button
            key={opt}
            disabled={resolveDecision.isPending}
            onClick={() => handleResolve(opt)}
            className="w-full text-left text-[11px] px-3 py-2 rounded border border-border-muted hover:border-accent-primary/50 hover:bg-accent-primary/5 text-text-default transition disabled:opacity-50"
          >
            {opt}
          </button>
        ))}
        <button
          disabled={resolveDecision.isPending}
          onClick={() => handleResolve(options[0] ?? "auto", true)}
          className="w-full text-left text-[11px] px-3 py-2 rounded border border-border-muted/50 hover:border-border-default text-text-faint hover:text-text-muted transition disabled:opacity-50"
        >
          Let agent decide
        </button>
      </div>
    </div>
  );
}

export function RightSidebar() {
  const collapsed = useLayoutStore((s) => s.collapsedPanels.rightSidebar);
  const togglePanel = useLayoutStore((s) => s.togglePanel);
  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const { data: decisions, isLoading, isError } = useDecisions(activeProjectId);
  const { data: activeAgents } = useActiveAgents();

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
      {isLoading && (
        <div className="p-4 border-b border-border-default flex items-center justify-center">
          <Loader2 size={16} className="animate-spin text-text-faint" />
        </div>
      )}
      {isError && (
        <div className="p-4 border-b border-border-default">
          <p className="text-[11px] text-status-error">Failed to load decisions</p>
        </div>
      )}
      {!isLoading && !isError && decisions && decisions.length > 0 && activeProjectId && (
        decisions.map((decision) => (
          <DecisionCard key={decision.id} decision={decision} projectId={activeProjectId} />
        ))
      )}
      {!isLoading && !isError && (!decisions || decisions.length === 0) && (
        <div className="p-4 border-b border-border-default">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={12} className="text-status-success" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">No decisions pending</span>
          </div>
        </div>
      )}

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
        {(!activeAgents || activeAgents.length === 0) && (
          <div className="text-[10px] text-text-faint">No active agents</div>
        )}
        {activeAgents?.map(agent => {
          const statusColor = agent.status === "error" ? "text-status-error" : agent.status === "paused" ? "text-status-warning" : "text-status-success";
          const statusLabel = agent.status === "error" ? "error" : agent.status === "paused" ? "blocked" : "running";
          return (
            <div key={agent.id} className="px-3 py-2 rounded-lg bg-bg-base border border-border-default">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-medium text-text-primary">{agent.name}</span>
                <span className={`text-[10px] ${statusColor}`}>
                  {statusLabel}
                </span>
              </div>
              <div className="text-[10px] text-text-faint mt-0.5">{agent.currentTask ?? 'No task'} · {agent.model ?? 'Unknown'}</div>
              {agent.progress > 0 && (
                <div className="mt-2 h-0.5 bg-bg-hover rounded-full overflow-hidden">
                  <div className="h-full bg-accent-primary rounded-full" style={{ width: `${agent.progress}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
      )}
    </aside>
  );
}
