import { CheckCircle2, AlertCircle, Circle, ArrowRight, Loader2, SkipForward } from 'lucide-react';
import { usePipelines, usePipelineStages } from '../../api/pipelines';
import type { PipelineStage } from '../../api/pipelines';
import { useProjectsStore } from '../../stores/projects';

const stageColor = (s: string) => ({
  done: 'border-status-success/30 bg-status-success/5',
  running: 'border-accent-primary/50 bg-accent-primary/8',
  queued: 'border-border-muted bg-transparent opacity-50',
  'needs-you': 'border-status-warning/60 bg-status-warning/8',
  error: 'border-status-error/50 bg-status-error/8',
  skipped: 'border-border-muted bg-transparent opacity-30',
}[s]);

const stageIcon = (s: string) => {
  if (s === 'done') return <CheckCircle2 size={14} className="text-status-success shrink-0" />;
  if (s === 'running') return <Circle size={14} className="text-accent-primary shrink-0 animate-pulse fill-accent-primary" />;
  if (s === 'needs-you') return <AlertCircle size={14} className="text-status-warning shrink-0" />;
  if (s === 'error') return <AlertCircle size={14} className="text-status-error shrink-0" />;
  if (s === 'skipped') return <SkipForward size={14} className="text-text-faint shrink-0" />;
  return <Circle size={14} className="text-text-faint shrink-0" />;
};

const statusLabel = (s: string) => {
  if (s === 'needs-you') return { text: 'needs you', className: 'bg-status-warning/20 text-status-warning border-status-warning/30' };
  if (s === 'running') return { text: 'running', className: 'bg-accent-primary/20 text-accent-primary border-accent-primary/30' };
  if (s === 'error') return { text: 'error', className: 'bg-status-error/20 text-status-error border-status-error/30' };
  if (s === 'skipped') return { text: 'skipped', className: 'bg-text-faint/20 text-text-faint border-text-faint/30' };
  return null;
};

function StageRow({ stage }: { stage: PipelineStage }) {
  const label = statusLabel(stage.status);
  return (
    <div className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${stageColor(stage.status)}`}>
      <div className="mt-0.5">{stageIcon(stage.status)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-primary">{stage.name}</span>
          {label && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${label.className}`}>{label.text}</span>
          )}
        </div>
        <div className="text-[11px] text-text-muted mt-0.5">
          {stage.agentId ?? 'Agent'} · {stage.model ?? '—'}
        </div>
        {stage.description && (
          <div className="text-[11px] text-text-secondary mt-1">{stage.description}</div>
        )}
      </div>
      {stage.status === 'needs-you' && (
        <button className="shrink-0 px-2.5 py-1 text-[10px] bg-status-warning/20 hover:bg-status-warning/30 text-status-warning rounded border border-status-warning/30 transition">
          Decide
        </button>
      )}
    </div>
  );
}

export function PipelineView() {
  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const { data: pipelines, isLoading: pipelinesLoading, error: pipelinesError } = usePipelines(activeProjectId);

  // Use the first pipeline for the active project
  const activePipeline = pipelines?.[0] ?? null;

  const { data: stages, isLoading: stagesLoading, error: stagesError } = usePipelineStages(activePipeline?.id ?? null);

  const isLoading = pipelinesLoading || stagesLoading;
  const error = pipelinesError || stagesError;

  if (!activeProjectId) {
    return (
      <div className="p-5 text-xs text-text-muted">
        Select a project to view its pipeline.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-5 flex items-center gap-2 text-xs text-text-muted">
        <Loader2 size={14} className="animate-spin" />
        Loading pipeline…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 flex items-center gap-2 text-xs text-status-error">
        <AlertCircle size={14} />
        Failed to load pipeline: {(error as Error).message}
      </div>
    );
  }

  if (!activePipeline) {
    return (
      <div className="p-5 text-xs text-text-muted">
        No pipeline found for this project.
      </div>
    );
  }

  return (
    <div className="p-5 space-y-2 max-w-2xl">
      {stages && stages.length > 0 ? (
        stages.map((stage) => <StageRow key={stage.id} stage={stage} />)
      ) : (
        <div className="text-xs text-text-muted">No stages in this pipeline.</div>
      )}
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
