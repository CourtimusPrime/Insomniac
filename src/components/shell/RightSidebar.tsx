import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useActiveAgents } from '../../api/agents';
import type { Decision } from '../../api/decisions';
import { useDecisions, useResolveDecision } from '../../api/decisions';
import { useLayoutStore } from '../../stores/layout';
import { useProjectsStore } from '../../stores/projects';

const TIMELINE = [
  { label: 'Initialize repo', done: true },
  { label: 'Architecture draft', done: true },
  { label: 'Core logic sync', current: true },
  { label: 'Load balancing', done: false },
  { label: 'Security audit', done: false },
];

function DecisionCard({
  decision,
  projectId,
}: {
  decision: Decision;
  projectId: string;
}) {
  const resolveDecision = useResolveDecision(projectId);
  const options = (decision.options as string[] | null) ?? [];

  const handleResolve = (resolution: string, autoDecide?: boolean) => {
    resolveDecision.mutate({ decisionId: decision.id, resolution, autoDecide });
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle size={12} className="text-status-warning" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-status-warning/80">
          Decision needed
        </span>
      </div>
      <p className="text-[11px] text-text-default leading-relaxed mb-3">
        {decision.question}
      </p>
      <div className="space-y-1.5">
        {options.map((opt: string) => (
          <Button
            key={opt}
            variant="outline"
            size="xs"
            disabled={resolveDecision.isPending}
            onClick={() => handleResolve(opt)}
            className="w-full justify-start text-text-default hover:border-accent-primary/50 hover:bg-accent-primary/5"
          >
            {opt}
          </Button>
        ))}
        <Button
          variant="outline"
          size="xs"
          disabled={resolveDecision.isPending}
          onClick={() => handleResolve(options[0] ?? 'auto', true)}
          className="w-full justify-start border-border-muted/50 text-text-faint hover:border-border-default hover:text-text-muted"
        >
          Let agent decide
        </Button>
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
    <aside className="flex flex-col overflow-hidden h-full w-full">
      <div className="min-w-0 flex flex-col overflow-hidden h-full">
        {/* Collapse button */}
        <div className="flex items-center justify-end px-2 pt-1 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => togglePanel('rightSidebar')}
                className="text-text-faint hover:text-text-default"
              >
                {collapsed ? (
                  <ChevronLeft size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Decision queue */}
        {isLoading && (
          <div className="p-4 flex items-center justify-center">
            <Loader2 size={16} className="animate-spin text-text-faint" />
          </div>
        )}
        {isLoading && <Separator />}
        {isError && (
          <div className="p-4">
            <p className="text-[11px] text-status-error">
              Failed to load decisions
            </p>
          </div>
        )}
        {isError && <Separator />}
        {!isLoading &&
          !isError &&
          decisions &&
          decisions.length > 0 &&
          activeProjectId &&
          decisions.map((decision, i) => (
            <div key={decision.id}>
              <DecisionCard decision={decision} projectId={activeProjectId} />
              {(i < decisions.length - 1 ||
                !decisions ||
                decisions.length > 0) && <Separator />}
            </div>
          ))}
        {!isLoading && !isError && (!decisions || decisions.length === 0) && (
          <>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 size={12} className="text-status-success" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                  No decisions pending
                </span>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Timeline */}
        <div className="p-4 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-3">
            Pipeline stages
          </div>
          <ul className="space-y-2.5">
            {TIMELINE.map((item, i) => (
              <li key={i} className="flex items-center gap-3">
                {item.done ? (
                  <CheckCircle2
                    size={13}
                    className="text-status-success shrink-0"
                  />
                ) : item.current ? (
                  <Circle
                    size={13}
                    className="text-accent-primary fill-accent-primary shrink-0 animate-pulse"
                  />
                ) : (
                  <Circle size={13} className="text-text-faint shrink-0" />
                )}
                <span
                  className={`text-[11px] ${item.done ? 'line-through text-text-faint' : item.current ? 'text-text-primary font-medium' : 'text-text-faint'}`}
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Agent status strip */}
        <div className="p-4 border-t border-border-default space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
            Active agents
          </div>
          {(!activeAgents || activeAgents.length === 0) && (
            <div className="text-[10px] text-text-faint">No active agents</div>
          )}
          {activeAgents?.map((agent) => {
            const badgeVariant =
              agent.status === 'error'
                ? 'destructive'
                : agent.status === 'paused'
                  ? 'warning'
                  : 'success';
            const statusLabel =
              agent.status === 'error'
                ? 'error'
                : agent.status === 'paused'
                  ? 'blocked'
                  : 'running';
            return (
              <Card key={agent.id} className="bg-bg-base shadow-none">
                <CardContent className="px-3 py-2 p-0">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-medium text-text-primary">
                      {agent.name}
                    </span>
                    <Badge
                      variant={
                        badgeVariant as 'destructive' | 'warning' | 'success'
                      }
                      className="text-[10px] px-1.5 py-0"
                    >
                      {statusLabel}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-text-faint mt-0.5">
                    {agent.currentTask ?? 'No task'} ·{' '}
                    {agent.model ?? 'Unknown'}
                  </div>
                  {agent.progress > 0 && (
                    <Progress
                      value={agent.progress}
                      className="mt-2 h-0.5 bg-bg-hover"
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
