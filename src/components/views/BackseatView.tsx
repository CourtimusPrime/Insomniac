import { Play, RefreshCw, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  useRecommendations,
  useRunRecommendation,
  useScanProject,
} from '../../api/backseat';
import { useProjects } from '../../api/projects';
import { useProjectsStore } from '../../stores/projects';

const severityVariant = (s: string) =>
  ({
    critical: 'destructive' as const,
    warning: 'warning' as const,
    info: 'info' as const,
  })[s];

const severityCardColor = (s: string) =>
  ({
    critical: 'border-status-error/30 bg-status-error/10',
    warning: 'border-status-warning/30 bg-status-warning/10',
    info: 'border-sky-500/30 bg-sky-500/10',
  })[s];

function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

export function BackseatView() {
  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const { data: projects } = useProjects();
  const activeProject = projects?.find((p) => p.id === activeProjectId);

  const { data } = useRecommendations(activeProjectId);
  const scanMutation = useScanProject();
  const runMutation = useRunRecommendation();

  const recommendations = data?.recommendations ?? [];
  const scannedAt = data?.scannedAt ?? null;

  return (
    <div className="p-5 space-y-3 max-w-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={14} className="text-accent-secondary" />
        <span className="text-xs text-text-secondary">
          Monitoring{' '}
          <span className="text-text-primary">
            {activeProject?.name ?? 'No project'}
          </span>{' '}
          · Last scan {timeAgo(scannedAt)} · {recommendations.length}{' '}
          recommendations
        </span>
        <Button
          variant="outline"
          size="xs"
          onClick={() =>
            activeProjectId && scanMutation.mutate(activeProjectId)
          }
          disabled={scanMutation.isPending}
          className="ml-auto"
        >
          <RefreshCw
            size={10}
            className={scanMutation.isPending ? 'animate-spin' : ''}
          />
          {scanMutation.isPending ? 'Scanning...' : 'Scan now'}
        </Button>
      </div>
      {recommendations.length === 0 && (
        <div className="text-xs text-text-muted py-8 text-center">
          {scannedAt
            ? 'No recommendations found.'
            : 'Click "Scan now" to analyze the project.'}
        </div>
      )}
      {recommendations.map((r) => (
        <Card
          key={r.id}
          className={cn('shadow-none', severityCardColor(r.severity))}
        >
          <CardContent className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant={severityVariant(r.severity)}
                    className="text-[10px] px-1.5 py-0.5 uppercase font-bold"
                  >
                    {r.severity}
                  </Badge>
                  <span className="text-[10px] text-text-muted">{r.type}</span>
                  <span className="text-[10px] font-mono text-text-muted">
                    {r.file}
                    {r.line ? `:${r.line}` : ''}
                  </span>
                </div>
                <p className="text-xs text-text-default">{r.message}</p>
              </div>
              <Button
                variant="outline"
                size="xs"
                onClick={() =>
                  activeProjectId &&
                  runMutation.mutate({
                    recommendationId: r.id,
                    projectId: activeProjectId,
                  })
                }
                disabled={runMutation.isPending}
              >
                <Play size={10} />
                Run this
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
