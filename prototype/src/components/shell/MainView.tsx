import { useLayoutStore } from '../../stores/layout';
import { useProjectsStore } from '../../stores/projects';
import { useProjects } from '../../api/projects';
import { PipelineView } from '../views/PipelineView';
import { GraphView } from '../views/GraphView';
import { BackseatView } from '../views/BackseatView';
import { AbilityDetailView } from '../views/AbilityDetailView';

export function MainView() {
  const activeMain = useLayoutStore((s) => s.activeMain);
  const setActiveMain = useLayoutStore((s) => s.setActiveMain);
  const activeProject = useProjectsStore((s) => s.activeProject);
  const { data: projects } = useProjects();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Project header */}
      <div className="px-6 py-3 border-b border-border-default flex items-center gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-text-primary font-heading">{activeProject}</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-accent-primary/30 bg-accent-primary/5 text-accent-primary">
              {projects?.find(p => p.name === activeProject)?.status ?? 'loading'}
            </span>
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">Decentralized OS kernel · Rust · 3 agents running</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {(['pipeline', 'graph', 'backseat'] as const).map(view => (
            <button
              key={view}
              onClick={() => setActiveMain(view)}
              className={`px-3 py-1.5 text-[11px] rounded transition capitalize ${
                activeMain === view
                  ? 'bg-accent-primary/15 text-accent-primary'
                  : 'text-text-muted hover:text-text-default hover:bg-bg-hover'
              }`}>
              {view === 'backseat' ? 'Backseat Driver' : view}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {activeMain === 'pipeline' && <PipelineView />}
        {activeMain === 'graph' && <GraphView />}
        {activeMain === 'backseat' && <BackseatView />}
        {activeMain === 'ability-detail' && <AbilityDetailView />}
      </div>
    </div>
  );
}
