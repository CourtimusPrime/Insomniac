import { CheckCircle2, AlertCircle, Circle, ArrowRight } from 'lucide-react';

const PIPELINE_STAGES = [
  { name: 'Scaffold architecture', agent: 'Prototyper', model: 'Gemini Flash', status: 'done', note: 'Component tree and data models generated.' },
  { name: 'Implement core logic', agent: 'Claude Code', model: 'Claude Sonnet 4', status: 'running', note: 'Building memory management module. 67% complete.' },
  { name: 'Write test suite', agent: 'Claude Code', model: 'Claude Sonnet 4', status: 'queued', note: 'Waiting for implementation to complete.' },
  { name: 'Security audit', agent: 'Auditor', model: 'Claude Sonnet 4', status: 'needs-you', note: 'Hash algorithm collision flagged. Decision required.' },
  { name: 'Deploy preview', agent: 'Vercel MCP', model: '—', status: 'queued', note: 'Will deploy to preview URL on test pass.' },
];

const stageColor = (s: string) => ({
  done: 'border-status-success/30 bg-status-success/5',
  running: 'border-accent-primary/50 bg-accent-primary/8',
  queued: 'border-border-muted bg-transparent opacity-50',
  'needs-you': 'border-status-warning/60 bg-status-warning/8',
}[s]);

const stageIcon = (s: string) => {
  if (s === 'done') return <CheckCircle2 size={14} className="text-status-success shrink-0" />;
  if (s === 'running') return <Circle size={14} className="text-accent-primary shrink-0 animate-pulse fill-accent-primary" />;
  if (s === 'needs-you') return <AlertCircle size={14} className="text-status-warning shrink-0" />;
  return <Circle size={14} className="text-text-faint shrink-0" />;
};

export function PipelineView() {
  return (
    <div className="p-5 space-y-2 max-w-2xl">
      {PIPELINE_STAGES.map((stage, i) => (
        <div key={i} className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${stageColor(stage.status)}`}>
          <div className="mt-0.5">{stageIcon(stage.status)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-primary">{stage.name}</span>
              {stage.status === 'needs-you' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-status-warning/20 text-status-warning border border-status-warning/30">needs you</span>
              )}
              {stage.status === 'running' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-primary/20 text-accent-primary border border-accent-primary/30">running</span>
              )}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">{stage.agent} · {stage.model}</div>
            <div className="text-[11px] text-text-secondary mt-1">{stage.note}</div>
          </div>
          {stage.status === 'needs-you' && (
            <button className="shrink-0 px-2.5 py-1 text-[10px] bg-status-warning/20 hover:bg-status-warning/30 text-status-warning rounded border border-status-warning/30 transition">
              Decide
            </button>
          )}
        </div>
      ))}
      {/* Steering input */}
      <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-lg border border-border-muted bg-bg-base">
        <ArrowRight size={13} className="text-accent-primary shrink-0" />
        <input
          className="flex-1 bg-transparent text-xs text-text-default placeholder-text-faint outline-none"
          placeholder="Steer the pipeline — 'skip Stripe for now', 'add dark mode first'…"
        />
      </div>
    </div>
  );
}
