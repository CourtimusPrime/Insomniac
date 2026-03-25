import { lazy, Suspense } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProjects } from '../../api/projects';
import { useLayoutStore } from '../../stores/layout';
import { useProjectsStore } from '../../stores/projects';
import { AbilityDetailView } from '../views/AbilityDetailView';
import { BackseatView } from '../views/BackseatView';
import { GraphView } from '../views/GraphView';
import { MarketplaceView } from '../views/MarketplaceView';
import { PipelineView } from '../views/PipelineView';
import { SettingsView } from '../views/SettingsView';

const AgentBuilder = lazy(() =>
  import('../builders/agent/AgentBuilder').then((m) => ({
    default: m.AgentBuilder,
  })),
);
const WorkflowBuilder = lazy(() =>
  import('../builders/workflow/WorkflowBuilder').then((m) => ({
    default: m.WorkflowBuilder,
  })),
);

export function MainView() {
  const activeMain = useLayoutStore((s) => s.activeMain);
  const setActiveMain = useLayoutStore((s) => s.setActiveMain);
  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const { data: projects } = useProjects();
  const activeProject = projects?.find((p) => p.id === activeProjectId);

  return (
    <div className="flex flex-col overflow-hidden h-full w-full">
      {/* Project header */}
      <div className="px-6 py-3 border-b border-border-default flex items-center gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-text-primary font-heading">
              {activeProject?.name ?? 'No project selected'}
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0.5 border-accent-primary/30 bg-accent-primary/5 text-accent-primary font-normal"
            >
              {activeProject?.status ?? 'idle'}
            </Badge>
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">
            Decentralized OS kernel · Rust · 3 agents running
          </p>
        </div>
        <div className="ml-auto flex items-center">
          <Tabs
            value={activeMain}
            onValueChange={(value) =>
              setActiveMain(
                value as
                  | 'pipeline'
                  | 'graph'
                  | 'backseat'
                  | 'ability-detail'
                  | 'settings'
                  | 'marketplace',
              )
            }
          >
            <TabsList className="h-8 bg-transparent p-0 gap-1">
              {(['pipeline', 'graph', 'backseat'] as const).map((view) => (
                <TabsTrigger
                  key={view}
                  value={view}
                  className="px-3 py-1.5 text-[11px] capitalize data-[state=active]:bg-accent-primary/15 data-[state=active]:text-accent-primary data-[state=active]:shadow-none text-text-muted hover:text-text-default hover:bg-bg-hover rounded transition"
                >
                  {view === 'backseat' ? 'Backseat Driver' : view}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {activeMain === 'pipeline' && <PipelineView />}
        {activeMain === 'graph' && <GraphView />}
        {activeMain === 'backseat' && <BackseatView />}
        {activeMain === 'ability-detail' && <AbilityDetailView />}
        {activeMain === 'agent-builder' && (
          <Suspense
            fallback={
              <div className="p-8 text-center text-text-muted text-xs">
                Loading builder...
              </div>
            }
          >
            <AgentBuilder />
          </Suspense>
        )}
        {activeMain === 'workflow-builder' && (
          <Suspense
            fallback={
              <div className="p-8 text-center text-text-muted text-xs">
                Loading builder...
              </div>
            }
          >
            <WorkflowBuilder />
          </Suspense>
        )}
        {activeMain === 'settings' && <SettingsView />}
        {activeMain === 'marketplace' && <MarketplaceView />}
      </div>
    </div>
  );
}
