import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Loader2,
  Pause,
  Play,
  SkipForward,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Pipeline, PipelineStage } from '../../api/pipelines';
import {
  useAddStage,
  useCancelPipeline,
  usePausePipeline,
  usePipelineStages,
  usePipelines,
  useProjectPreferences,
  useResumePipeline,
  useSteerPipeline,
} from '../../api/pipelines';
import { useProjectsStore } from '../../stores/projects';
import { ModelSelector } from '../ui/ModelSelector';

const stageColor = (s: string) =>
  ({
    done: 'border-status-success/30 bg-status-success/5',
    running: 'border-accent-primary/50 bg-accent-primary/8',
    queued: 'border-border-muted bg-transparent opacity-50',
    'needs-you': 'border-status-warning/60 bg-status-warning/8',
    error: 'border-status-error/50 bg-status-error/8',
    skipped: 'border-border-muted bg-transparent opacity-30',
  })[s];

const stageIcon = (s: string) => {
  if (s === 'done')
    return <CheckCircle2 size={14} className="text-status-success shrink-0" />;
  if (s === 'running')
    return (
      <Circle
        size={14}
        className="text-accent-primary shrink-0 animate-pulse fill-accent-primary"
      />
    );
  if (s === 'needs-you')
    return <AlertCircle size={14} className="text-status-warning shrink-0" />;
  if (s === 'error')
    return <AlertCircle size={14} className="text-status-error shrink-0" />;
  if (s === 'skipped')
    return <SkipForward size={14} className="text-text-faint shrink-0" />;
  return <Circle size={14} className="text-text-faint shrink-0" />;
};

const statusBadgeProps = (s: string) => {
  if (s === 'needs-you')
    return {
      text: 'needs you',
      variant: 'warning' as const,
      className: '',
    };
  if (s === 'running')
    return {
      text: 'running',
      variant: 'outline' as const,
      className:
        'bg-accent-primary/20 text-accent-primary border-accent-primary/30',
    };
  if (s === 'error')
    return {
      text: 'error',
      variant: 'destructive' as const,
      className: '',
    };
  if (s === 'skipped')
    return {
      text: 'skipped',
      variant: 'outline' as const,
      className: 'bg-text-faint/20 text-text-faint border-text-faint/30',
    };
  return null;
};

function StageRow({ stage }: { stage: PipelineStage }) {
  const badgeProps = statusBadgeProps(stage.status);
  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3 flex items-start gap-3',
        stageColor(stage.status),
      )}
    >
      <div className="mt-0.5">{stageIcon(stage.status)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-primary">
            {stage.name}
          </span>
          {badgeProps && (
            <Badge
              variant={badgeProps.variant}
              className={cn(
                'text-[10px] px-1.5 py-0.5 font-normal',
                badgeProps.className,
              )}
            >
              {badgeProps.text}
            </Badge>
          )}
        </div>
        <div className="text-[11px] text-text-muted mt-0.5">
          {stage.agentId ?? 'Agent'} · {stage.model ?? '—'}
        </div>
        {stage.description && (
          <div className="text-[11px] text-text-secondary mt-1">
            {stage.description}
          </div>
        )}
      </div>
      {stage.status === 'needs-you' && (
        <Button
          variant="outline"
          size="xs"
          className="shrink-0 bg-status-warning/20 hover:bg-status-warning/30 text-status-warning border-status-warning/30"
        >
          Decide
        </Button>
      )}
    </div>
  );
}

function PipelineToolbar({
  pipeline,
  projectId,
}: {
  pipeline: Pipeline;
  projectId: string;
}) {
  const pause = usePausePipeline(projectId);
  const resume = useResumePipeline(projectId);
  const cancel = useCancelPipeline(projectId);

  const status = pipeline.status;
  const canPause = status === 'running';
  const canResume = status === 'paused';
  const canCancel = status === 'running' || status === 'paused';
  const isBusy = pause.isPending || resume.isPending || cancel.isPending;

  const statusBadgeConfig: Record<
    string,
    {
      text: string;
      variant:
        | 'outline'
        | 'default'
        | 'secondary'
        | 'destructive'
        | 'success'
        | 'warning'
        | 'info';
      className?: string;
    }
  > = {
    idle: {
      text: 'Idle',
      variant: 'outline',
      className: 'text-text-muted border-border-muted',
    },
    running: {
      text: 'Running',
      variant: 'outline',
      className:
        'text-accent-primary border-accent-primary/30 bg-accent-primary/10',
    },
    completed: {
      text: 'Completed',
      variant: 'success',
    },
    error: {
      text: 'Error',
      variant: 'destructive',
    },
    paused: {
      text: 'Paused',
      variant: 'warning',
    },
    cancelled: {
      text: 'Cancelled',
      variant: 'outline',
      className: 'text-text-muted border-border-muted bg-bg-muted',
    },
  };

  const badge = statusBadgeConfig[status] ?? statusBadgeConfig.idle;

  return (
    <div className="flex items-center gap-2 mb-3">
      <Badge
        variant={badge.variant}
        className={cn('text-[10px] font-medium px-2 py-0.5', badge.className)}
      >
        {badge.text}
      </Badge>
      <div className="flex-1" />
      <Button
        variant="outline"
        size="xs"
        disabled={!canPause || isBusy}
        onClick={() => pause.mutate(pipeline.id)}
      >
        <Pause size={11} /> Pause
      </Button>
      <Button
        variant="outline"
        size="xs"
        disabled={!canResume || isBusy}
        onClick={() => resume.mutate(pipeline.id)}
        className="border-accent-primary/30 text-accent-primary hover:bg-accent-primary/10"
      >
        <Play size={11} /> Resume
      </Button>
      <Button
        variant="outline"
        size="xs"
        disabled={!canCancel || isBusy}
        onClick={() => cancel.mutate(pipeline.id)}
        className="border-status-error/30 text-status-error hover:bg-status-error/10"
      >
        <XCircle size={11} /> Cancel
      </Button>
    </div>
  );
}

function SteeringInput({
  pipelineId,
  projectId,
}: {
  pipelineId: string;
  projectId: string;
}) {
  const [text, setText] = useState('');
  const steer = useSteerPipeline(projectId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    steer.mutate({ pipelineId, message: trimmed });
    setText('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 flex items-center gap-3 px-4 py-3 rounded-lg border border-border-muted bg-bg-base"
    >
      <ArrowRight size={13} className="text-accent-primary shrink-0" />
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={steer.isPending}
        className="h-8 text-xs flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 placeholder-text-faint"
        placeholder="Steer the pipeline — 'skip Stripe for now', 'add dark mode first'…"
      />
      {steer.isPending && (
        <Loader2 size={12} className="animate-spin text-text-muted shrink-0" />
      )}
    </form>
  );
}

function AddStageForm({
  pipelineId,
  projectId,
  onClose,
}: {
  pipelineId: string;
  projectId: string;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const addStage = useAddStage(pipelineId);
  const { data: prefs } = useProjectPreferences(projectId);

  // Default model from project preferences if user hasn't selected one yet
  const effectiveModel = model || prefs?.defaultModel || '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    addStage.mutate(
      {
        name: trimmed,
        model: effectiveModel || undefined,
        description: description.trim() || undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border-muted bg-bg-base p-4 space-y-3"
    >
      <div className="text-xs font-medium text-text-primary">Add Stage</div>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Stage name"
        className="h-8 text-xs"
      />
      <div>
        <Label className="text-[11px] text-text-muted mb-1 block">Model</Label>
        <ModelSelector
          value={effectiveModel}
          onChange={setModel}
          className="w-full"
        />
      </div>
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="h-8 text-xs"
      />
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          size="xs"
          disabled={!name.trim() || addStage.isPending}
        >
          {addStage.isPending ? 'Adding…' : 'Add'}
        </Button>
        <Button type="button" variant="outline" size="xs" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function PipelineView() {
  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const {
    data: pipelines,
    isLoading: pipelinesLoading,
    error: pipelinesError,
  } = usePipelines(activeProjectId);
  const [showAddStage, setShowAddStage] = useState(false);

  // Use the first pipeline for the active project
  const activePipeline = pipelines?.[0] ?? null;

  const {
    data: stages,
    isLoading: stagesLoading,
    error: stagesError,
  } = usePipelineStages(activePipeline?.id ?? null);

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
      <PipelineToolbar pipeline={activePipeline} projectId={activeProjectId!} />
      {stages && stages.length > 0 ? (
        stages.map((stage) => <StageRow key={stage.id} stage={stage} />)
      ) : (
        <div className="text-xs text-text-muted">
          No stages in this pipeline.
        </div>
      )}
      {/* Add Stage */}
      {showAddStage ? (
        <AddStageForm
          pipelineId={activePipeline.id}
          projectId={activeProjectId!}
          onClose={() => setShowAddStage(false)}
        />
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowAddStage(true)}
          className="w-full rounded-lg border-dashed border-border-muted text-xs text-text-muted hover:border-accent-primary hover:text-accent-primary"
        >
          + Add Stage
        </Button>
      )}
      {/* Steering input */}
      <SteeringInput
        pipelineId={activePipeline.id}
        projectId={activeProjectId!}
      />
    </div>
  );
}
